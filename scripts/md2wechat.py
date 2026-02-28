#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert daily book recommendation Markdown to WeChat-friendly HTML.
Usage: python3 md2wechat.py <input.md> <output.html>
"""

import sys
import re
import os


def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def split_sections(text):
    """Split markdown by --- delimiters into named sections."""
    parts = re.split(r'\n-{3,}\n', text)
    sections = {}

    # Part 0: header info (date, title, author, category, reason)
    if len(parts) > 0:
        sections['header'] = parts[0].strip()

    # Remaining parts: identify by first meaningful line
    keywords = {
        'chapters': ['章节详解'],
        'insights': ['核心观点'],
        'cases': ['经典案例'],
        'review': ['深度读后感'],
        'questions': ['思考题'],
        'feynman': ['费曼检验'],
        'actions': ['读后输出行动', '读后输出'],
        'connections': ['与已读书籍的关联', '延伸阅读', '跨书关联'],
    }

    for part in parts[1:]:
        stripped = part.strip()
        if not stripped:
            continue
        first_line = stripped.split('\n')[0]
        matched = False
        for key, kws in keywords.items():
            for kw in kws:
                if kw in first_line:
                    # Remove the header line, keep the content
                    lines = stripped.split('\n', 1)
                    sections[key] = lines[1].strip() if len(lines) > 1 else ''
                    matched = True
                    break
            if matched:
                break
        if not matched:
            # Try to detect "想开始读" section as part of connections
            if '想开始读' in stripped or '推荐接着读' in stripped:
                existing = sections.get('connections', '')
                sections['connections'] = (existing + '\n\n' + stripped).strip()

    return sections


def parse_chapters(text):
    """Parse chapter entries into HTML."""
    if not text:
        return ''
    # Format: 第N章：标题\n本章主要内容：...\n\n第N+1章：...
    chapters = re.findall(
        r'第(\d+)章[：:]\s*([^\n]+)\n(.*?)(?=\n第\d+章|\Z)',
        text, re.DOTALL
    )
    if not chapters:
        return '<div class="section-content">{}</div>'.format(
            text.replace('\n', '<br>'))

    html = ''
    for ch_num, ch_title, ch_desc in chapters:
        # Clean up description
        ch_desc = ch_desc.strip()
        ch_desc = re.sub(r'^本章主要内容[：:]\s*', '', ch_desc)
        ch_desc = ch_desc.replace('\n', '<br>')
        html += (
            '<div class="chapter-item">\n'
            '  <div class="chapter-name">'
            '\u7b2c{}章\uff1a{}</div>\n'
            '  <div class="chapter-desc">{}</div>\n'
            '</div>\n'
        ).format(ch_num, ch_title.strip(), ch_desc)
    return html


def parse_insights(text):
    """Parse numbered insights into HTML."""
    if not text:
        return ''
    # Format: N. title — description
    items = re.findall(
        r'(\d+)\.\s*(.+?)\s*[—–\-]+\s*(.*?)(?=\n\d+\.\s|\Z)',
        text, re.DOTALL
    )
    if not items:
        return '<div class="section-content">{}</div>'.format(
            text.replace('\n', '<br>'))

    html = ''
    for num, title, desc in items:
        title = title.strip().replace('**', '')
        desc = desc.strip().replace('\n', ' ')
        html += (
            '<div class="insight-item">\n'
            '  <div class="insight-title">{}. {}</div>\n'
            '  <div class="insight-desc">{}</div>\n'
            '</div>\n'
        ).format(num, title, desc)
    return html


def parse_cases(text):
    """Parse case studies into HTML."""
    if not text:
        return ''
    # Format: 案例N：标题\n内容
    cases = re.findall(
        r'案例\d+[：:]\s*([^\n]+)\n(.*?)(?=\n案例\d+|\Z)',
        text, re.DOTALL
    )
    if not cases:
        return '<div class="section-content">{}</div>'.format(
            text.replace('\n', '<br>'))

    html = ''
    for title, content in cases:
        title = title.strip().replace('**', '')
        content = content.strip()
        # Try to extract structured insight line
        insight = ''
        insight_match = re.search(
            r'启示[：:]\s*(.+?)$', content, re.MULTILINE)
        if insight_match:
            insight = insight_match.group(1).strip()
            content = content[:insight_match.start()].strip()
        content = content.replace('\n', '<br>')
        case_html = (
            '<div class="case-box">\n'
            '  <div class="case-title">{}</div>\n'
            '  <div class="case-content">{}</div>\n'
        ).format(title, content)
        if insight:
            case_html += (
                '  <div class="case-insight">'
                '\u2192 {}</div>\n'
            ).format(insight)
        case_html += '</div>\n'
        html += case_html
    return html


def parse_actions(text):
    """Parse post-reading action items into HTML."""
    if not text:
        return ''
    # Format: 输出N：标题\n做法：...\n预计用时：...
    actions = re.findall(
        r'输出\d+[：:]\s*([^\n]+)\n(.*?)(?=\n输出\d+|\Z)',
        text, re.DOTALL
    )
    if not actions:
        # Fallback: numbered format
        actions = re.findall(
            r'(\d+)\.\s*([^\n]+)\n(.*?)(?=\n\d+\.|\Z)',
            text, re.DOTALL
        )
        if actions:
            actions = [(t, d) for _, t, d in actions]
    if not actions:
        return '<div class="section-content">{}</div>'.format(
            text.replace('\n', '<br>'))

    html = ''
    for i, (title, content) in enumerate(actions, 1):
        title = title.strip().replace('**', '')
        content = content.strip()
        # Extract time estimate
        time_est = ''
        time_match = re.search(
            r'预计用时[：:]\s*(.+?)$', content, re.MULTILINE)
        if time_match:
            time_est = time_match.group(1).strip()
            content = content[:time_match.start()].strip()
        # Extract method
        method = content
        method_match = re.search(
            r'做法[：:]\s*(.+)', content, re.DOTALL)
        if method_match:
            method = method_match.group(1).strip()
        method = method.replace('\n', '<br>')

        action_html = (
            '<div class="action-item">\n'
            '  <div class="action-title">{}{}</div>\n'
            '  <div class="action-desc">{}</div>\n'
        ).format('\u2709 ' if i == 1 else '\u270d ' if i == 2
                 else '\U0001f91d ', title, method)
        if time_est:
            action_html += (
                '  <div class="action-time">'
                '\u23f0 {}</div>\n'
            ).format(time_est)
        action_html += '</div>\n'
        html += action_html
    return html


def parse_questions(text):
    """Parse thinking questions into HTML."""
    if not text:
        return ''
    questions = re.findall(r'(\d+)\.\s*(.*?)(?=\n\d+\.|\Z)', text, re.DOTALL)
    if not questions:
        return '<div class="section-content">{}</div>'.format(
            text.replace('\n', '<br>'))

    html = ''
    for num, q in questions:
        q = q.strip().replace('\n', ' ')
        html += (
            '<div class="question-item">\n'
            '  <span class="question-num">Q{}.</span> {}\n'
            '</div>\n'
        ).format(num, q)
    return html


def parse_feynman(text):
    """Extract Feynman test parts."""
    if not text:
        return '', ''

    feynman_main = ''
    feynman_simple = ''

    # Main: everything before "如果要解释给小学生听"
    parts = re.split(r'如果要解释给小学生听[：:]?\s*\n?', text)
    if parts:
        feynman_main = parts[0].strip()
        # Remove leading label
        feynman_main = re.sub(
            r'^.*?一句话.*?[：:]\s*\n?', '', feynman_main).strip()
    if len(parts) > 1:
        feynman_simple = parts[1].strip()

    return feynman_main, feynman_simple


def parse_connections(text):
    """Parse connections and next reads."""
    if not text:
        return ''
    # Remove "想开始读这本书？" line
    text = re.sub(r'想开始读.*$', '', text, flags=re.MULTILINE).strip()
    return text.replace('\n', '<br>')


def extract_book_title(md_content):
    """Extract Chinese book title from markdown content."""
    match = re.search(r'\u300a([^\u300b]+)\u300b', md_content)
    return match.group(1) if match else ''


def md_to_wechat_html(md_content, template_path):
    """Convert markdown recommendation to WeChat-friendly HTML."""
    template = read_file(template_path)
    sections = split_sections(md_content)
    header = sections.get('header', '')

    # Extract metadata from header
    date_match = re.search(r'(\d{4}-\d{2}-\d{2})', header)
    date = date_match.group(1) if date_match else ''

    title_match = re.search(r'\u300a([^\u300b]+)\u300b', header)
    book_title = title_match.group(1) if title_match else ''

    en_match = re.search(r'[(\uff08]([A-Za-z][^)\uff09]+)[)\uff09]', header)
    book_title_en = en_match.group(1) if en_match else ''

    author_match = re.search(r'作者[：:]\s*(.+?)(?:\n|$)', header)
    author = author_match.group(1).strip() if author_match else ''

    cat_match = re.search(r'类别[：:]\s*(.+?)(?:\n|$)', header)
    category = cat_match.group(1).strip() if cat_match else ''

    reason_match = re.search(
        r'推荐理由[：:]\s*\n?(.*)', header, re.DOTALL)
    reason = reason_match.group(1).strip() if reason_match else ''

    # Parse each section
    feynman_main, feynman_simple = parse_feynman(
        sections.get('feynman', ''))

    # Build HTML from template
    html = template
    replacements = {
        '{{DATE}}': date,
        '{{BOOK_TITLE}}': book_title,
        '{{BOOK_TITLE_EN}}': book_title_en,
        '{{AUTHOR}}': author,
        '{{CATEGORY}}': category,
        '{{REASON}}': reason,
        '{{CHAPTERS}}': parse_chapters(sections.get('chapters', '')),
        '{{INSIGHTS}}': parse_insights(sections.get('insights', '')),
        '{{CASES}}': parse_cases(sections.get('cases', '')),
        '{{REVIEW}}': sections.get('review', '').replace('\n', '<br>'),
        '{{QUESTIONS}}': parse_questions(sections.get('questions', '')),
        '{{FEYNMAN_MAIN}}': feynman_main,
        '{{FEYNMAN_SIMPLE}}': feynman_simple,
        '{{ACTIONS}}': parse_actions(sections.get('actions', '')),
        '{{CONNECTIONS}}': parse_connections(
            sections.get('connections', '')),
    }

    for placeholder, value in replacements.items():
        html = html.replace(placeholder, value)

    return html


def rename_by_book_title(md_path):
    """Rename a markdown file using the book title found inside it.
    Returns the new path, or the original if no title found."""
    content = read_file(md_path)
    title = extract_book_title(content)
    if not title:
        return md_path
    directory = os.path.dirname(md_path)
    new_path = os.path.join(directory, title + '.md')
    if os.path.abspath(md_path) != os.path.abspath(new_path):
        if os.path.exists(new_path):
            os.remove(new_path)
        os.rename(md_path, new_path)
    return new_path


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python3 md2wechat.py <input.md> [output.html]")
        print("  python3 md2wechat.py --rename <input.md>")
        sys.exit(1)

    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(script_dir, 'templates', 'wechat-article.html')

    # --rename mode: rename md file by book title
    if sys.argv[1] == '--rename':
        if len(sys.argv) < 3:
            print("Usage: python3 md2wechat.py --rename <input.md>")
            sys.exit(1)
        new_path = rename_by_book_title(sys.argv[2])
        print(new_path)
        sys.exit(0)

    input_path = sys.argv[1]
    md_content = read_file(input_path)
    book_title = extract_book_title(md_content)

    # Determine output path
    if len(sys.argv) >= 3:
        output_path = sys.argv[2]
    else:
        # Auto-name from book title
        directory = os.path.dirname(input_path)
        name = book_title if book_title else 'output'
        output_path = os.path.join(directory, name + '.html')

    # If output is a directory, auto-name inside it
    if os.path.isdir(output_path):
        name = book_title if book_title else 'output'
        output_path = os.path.join(output_path, name + '.html')

    html = md_to_wechat_html(md_content, template_path)
    write_file(output_path, html)
    print("WeChat article generated: " + output_path)
