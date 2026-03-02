#!/usr/bin/env python3
"""
update-history.py — 自动更新推荐历史记录（零 token）

从生成的推荐 MD 文件中提取书名/作者/类别，
追加到 recommendations/history.md，替代 Claude 手动更新这一步。

用法：
  python3 scripts/update-history.py recommendations/today.md
  python3 scripts/update-history.py recommendations/深度工作.md
"""

import re
import sys
import os
from datetime import date
from pathlib import Path

# Windows 终端强制 UTF-8 输出
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REPO_DIR = Path(__file__).parent.parent
HISTORY_FILE = REPO_DIR / "recommendations" / "history.md"


def extract_metadata(md_content: str) -> dict | None:
    """从推荐 MD 内容中提取日期、书名、作者、类别。"""
    result = {}

    # 日期：# 每日书籍推荐 — 2026-03-02
    m = re.search(r'#\s*每日书籍推荐\s*[—-]\s*(\d{4}-\d{2}-\d{2})', md_content)
    result['date'] = m.group(1) if m else date.today().strftime('%Y-%m-%d')

    # 书名：## 《书名》 或 ## 《书名》（English）
    m = re.search(r'##\s*[《「]([^》」\n（(]+)[》」]', md_content)
    if not m:
        # 兜底：**今日推荐：《书名》**
        m = re.search(r'[《「]([^》」\n（(]+)[》」]', md_content)
    result['title'] = f"《{m.group(1)}》" if m else None

    # 作者：**作者**：XXX
    m = re.search(r'\*\*作者\*\*[：:]\s*(.+)', md_content)
    if m:
        # 去掉括号内英文名（保留中文名）
        author = re.sub(r'（[^）]+）', '', m.group(1)).strip()
        result['author'] = author
    else:
        result['author'] = '未知'

    # 类别：**类别**：XXX
    m = re.search(r'\*\*类别\*\*[：:]\s*(.+)', md_content)
    result['category'] = m.group(1).strip() if m else '未分类'

    return result if result.get('title') else None


def is_already_recorded(title: str) -> bool:
    """检查书名是否已在 history.md 中。"""
    if not HISTORY_FILE.exists():
        return False
    content = HISTORY_FILE.read_text(encoding='utf-8')
    # 去掉书名号比较
    clean_title = title.replace('《', '').replace('》', '')
    return clean_title in content


def append_to_history(meta: dict) -> bool:
    """将新记录追加到 history.md。"""
    if not HISTORY_FILE.exists():
        print(f"Error: {HISTORY_FILE} not found")
        return False

    row = f"| {meta['date']}   | {meta['title']}   | {meta['author']}   | {meta['category']}   |"
    content = HISTORY_FILE.read_text(encoding='utf-8')

    # 避免重复写入（同一书同一日期）
    if meta['title'].replace('《', '').replace('》', '') in content:
        print(f"Already recorded: {meta['title']}")
        return False

    # 在最后一行追加（确保末尾有换行）
    if not content.endswith('\n'):
        content += '\n'
    content += row + '\n'

    HISTORY_FILE.write_text(content, encoding='utf-8')
    print(f"Recorded: {meta['title']} ({meta['date']})")
    return True


def main():
    if len(sys.argv) < 2:
        print("Usage: update-history.py <recommendation.md>")
        sys.exit(1)

    md_path = Path(sys.argv[1])
    if not md_path.exists():
        print(f"Error: {md_path} not found")
        sys.exit(1)

    try:
        content = md_path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        print(f"Error: encoding issue in {md_path}")
        sys.exit(1)

    meta = extract_metadata(content)
    if not meta:
        print(f"Error: could not extract book metadata from {md_path}")
        sys.exit(1)

    print(f"Extracted: {meta['title']} | {meta['author']} | {meta['category']} | {meta['date']}")
    append_to_history(meta)


if __name__ == '__main__':
    main()
