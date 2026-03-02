#!/usr/bin/env python3
"""
progress.py — 本地阅读进度查看器（零 token，替代 /progress skill）

扫描 books/*/reading-progress.md，解析进度数据并格式化输出。
完全在本地运行，不需要调用 Claude。

用法：
  python3 scripts/progress.py              # 查看所有书籍进度
  python3 scripts/progress.py 金字塔原理   # 查看指定书籍
  python3 scripts/progress.py --stats      # 只看统计摘要
"""

import re
import sys
from pathlib import Path

# Windows 终端强制 UTF-8 输出，避免 emoji 报错
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
from datetime import date, datetime

REPO_DIR = Path(__file__).parent.parent
BOOKS_DIR = REPO_DIR / "books"
RECOMMEND_DIR = REPO_DIR / "recommendations"


# ──────────────────────────────────────────────
# 解析 reading-progress.md
# ──────────────────────────────────────────────

def parse_progress_file(path: Path) -> dict:
    """解析一本书的 reading-progress.md，返回结构化数据。"""
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        return {}

    data = {'path': str(path), 'book_dir': path.parent.name}

    # 书名
    m = re.search(r'#\s*(.+)', text)
    data['title'] = m.group(1).strip() if m else path.parent.name

    # 总进度（如：已完成 3/12 章，进度 25%）
    m = re.search(r'(\d+)\s*/\s*(\d+)\s*章', text)
    if m:
        data['chapters_done'] = int(m.group(1))
        data['chapters_total'] = int(m.group(2))
    else:
        data['chapters_done'] = 0
        data['chapters_total'] = 0

    # 进度百分比
    m = re.search(r'进度[：:\s]+(\d+)%', text)
    if m:
        data['progress_pct'] = int(m.group(1))
    elif data['chapters_total'] > 0:
        data['progress_pct'] = int(data['chapters_done'] / data['chapters_total'] * 100)
    else:
        data['progress_pct'] = 0

    # 已掌握概念数
    mastered = re.findall(r'高|Medium-High|Medium|中高|熟练', text)
    data['concepts_mastered'] = len(re.findall(r'\|\s*(?:高|中高|High|Medium-High)\s*\|', text))

    # 待复习概念数（查找"待复习"区块中的条目）
    review_section = re.search(r'(?:待复习|需要复习|Concepts to Review)(.*?)(?:##|\Z)', text, re.S)
    if review_section:
        items = re.findall(r'^\s*[-*]\s+\S', review_section.group(1), re.M)
        data['concepts_to_review'] = len(items)
    else:
        data['concepts_to_review'] = 0

    # 学习会话次数（扫描 sessions 目录）
    sessions_dir = path.parent / 'sessions'
    if sessions_dir.exists():
        data['session_count'] = sum(1 for d in sessions_dir.iterdir() if d.is_dir())
    else:
        data['session_count'] = 0

    # 最后更新日期
    m = re.search(r'(?:最后更新|Last Updated)[：:\s]+(\d{4}-\d{2}-\d{2})', text)
    data['last_updated'] = m.group(1) if m else '未知'

    # 阅读模式（阅读中 / 复习中 / 已完成）
    if data['progress_pct'] >= 100:
        data['mode'] = '已完成'
    elif data['concepts_to_review'] > 0 and data['chapters_done'] == data['chapters_total']:
        data['mode'] = '复习巩固'
    else:
        data['mode'] = '阅读中'

    return data


# ──────────────────────────────────────────────
# 推荐历史统计
# ──────────────────────────────────────────────

def parse_recommend_history() -> dict:
    """解析 recommendations/history.md，返回已推荐书目统计。"""
    history_file = RECOMMEND_DIR / 'history.md'
    if not history_file.exists():
        return {'total': 0, 'by_category': {}, 'recent': []}

    text = history_file.read_text(encoding='utf-8')
    rows = re.findall(r'\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|', text)

    by_category = {}
    recent = []
    for date_str, title, author, category in rows:
        cat = category.strip()
        by_category[cat] = by_category.get(cat, 0) + 1
        recent.append({'date': date_str.strip(), 'title': title.strip()})

    return {
        'total': len(rows),
        'by_category': by_category,
        'recent': recent[-5:],  # 最近 5 本
    }


# ──────────────────────────────────────────────
# 格式化输出
# ──────────────────────────────────────────────

def format_book(data: dict) -> str:
    if not data:
        return ''
    lines = []
    pct = data.get('progress_pct', 0)
    bar_filled = int(pct / 10)
    bar = '█' * bar_filled + '░' * (10 - bar_filled)

    lines.append(f"\n📖 {data['title']}")
    lines.append(f"   ├── 模式：{data.get('mode', '阅读中')}")
    lines.append(f"   ├── 进度：[{bar}] {pct}%  ({data.get('chapters_done', 0)}/{data.get('chapters_total', 0)} 章)")
    lines.append(f"   ├── 学习会话：{data.get('session_count', 0)} 次")
    lines.append(f"   ├── 已掌握概念：{data.get('concepts_mastered', 0)} 个")
    if data.get('concepts_to_review', 0) > 0:
        lines.append(f"   ├── 待复习：{data['concepts_to_review']} 个概念")
    lines.append(f"   └── 最后更新：{data.get('last_updated', '未知')}")
    return '\n'.join(lines)


def format_history_stats(stats: dict) -> str:
    lines = ["\n📚 已推荐书目统计"]
    lines.append(f"   总计：{stats['total']} 本")
    if stats['by_category']:
        lines.append("   分类：")
        for cat, count in sorted(stats['by_category'].items(), key=lambda x: -x[1]):
            lines.append(f"     • {cat}：{count} 本")
    if stats['recent']:
        lines.append("   最近推荐：")
        for item in reversed(stats['recent']):
            lines.append(f"     • {item['date']}  {item['title']}")
    return '\n'.join(lines)


# ──────────────────────────────────────────────
# 主程序
# ──────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    stats_only = '--stats' in args
    keyword = next((a for a in args if not a.startswith('--')), None)

    print("=" * 50)
    print("  书籍阅读进度总览")
    print("=" * 50)

    # 推荐历史统计
    hist = parse_recommend_history()
    print(format_history_stats(hist))

    if stats_only:
        return

    # 正在读的书
    if not BOOKS_DIR.exists():
        print("\n（未找到 books/ 目录，尚未开始精读任何书籍）")
    else:
        progress_files = sorted(BOOKS_DIR.glob('*/reading-progress.md'))
        if not progress_files:
            print("\n（books/ 目录中暂无 reading-progress.md）")
        else:
            print("\n\n正在阅读的书籍：")
            print("-" * 50)
            shown = 0
            for pf in progress_files:
                if keyword and keyword not in str(pf):
                    continue
                data = parse_progress_file(pf)
                if data:
                    print(format_book(data))
                    shown += 1
            if shown == 0:
                print(f"  （未找到匹配 '{keyword}' 的书籍）")

    print("\n" + "=" * 50)
    print("  提示：/progress 查看详细进度  /review 复习薄弱概念")
    print("=" * 50)


if __name__ == '__main__':
    main()
