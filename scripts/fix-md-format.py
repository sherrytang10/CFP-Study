#!/usr/bin/env python3
"""
fix-md-format.py — 本地 Markdown 格式修复脚本（零 token）

修复规则：
1. 相邻的 **字段**：值 行之间插入空行（作者/类别/适读人群等元数据字段换行显示）
2. 标题（## / ###）前后确保有空行
3. 列表（- / 数字.）前后确保有空行

用法：
  python3 scripts/fix-md-format.py recommendations/today.md        # 修复单个文件
  python3 scripts/fix-md-format.py recommendations/               # 修复整个目录
"""

import re
import sys
import os
from pathlib import Path


def fix_metadata_spacing(content: str) -> str:
    """在相邻的 **字段**：值 行之间插入空行。"""
    # 匹配 **任意文字**：或 **任意文字**:（中英文冒号）开头的行
    bold_field = r'^\*\*[^*\n]+\*\*[：:]'
    lines = content.split('\n')
    result = []
    for i, line in enumerate(lines):
        result.append(line)
        # 当前行是元数据字段，且下一行也是元数据字段，且中间没有空行
        if (re.match(bold_field, line)
                and i + 1 < len(lines)
                and re.match(bold_field, lines[i + 1])):
            result.append('')  # 插入空行
    return '\n'.join(result)


def fix_heading_spacing(content: str) -> str:
    """确保 ## / ### 标题前后各有一个空行。"""
    # 标题前加空行（如果前面不是空行或文件开头）
    content = re.sub(r'([^\n])\n(#{1,6} )', r'\1\n\n\2', content)
    # 标题后加空行（如果后面不是空行）
    content = re.sub(r'(#{1,6} [^\n]+)\n([^\n#])', r'\1\n\n\2', content)
    return content


def fix_list_spacing(content: str) -> str:
    """确保列表块前后各有一个空行。"""
    # 列表前（非空行之后跟 - 或数字. 开头）
    content = re.sub(r'([^\n])\n([-*] |\d+\. )', r'\1\n\n\2', content)
    # 列表后（列表行后面跟非列表、非空行）
    content = re.sub(r'([-*] [^\n]+|\d+\. [^\n]+)\n([^\n\-*\d\s])', r'\1\n\n\2', content)
    return content


def deduplicate_blank_lines(content: str) -> str:
    """将连续 3 个以上空行压缩为 2 个空行。"""
    return re.sub(r'\n{3,}', '\n\n', content)


def fix_file(filepath: str) -> bool:
    """修复单个文件，返回是否有改动。"""
    path = Path(filepath)
    if not path.exists() or path.suffix != '.md':
        return False

    try:
        original = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        print(f"Skip (encoding error): {filepath}")
        return False
    fixed = original
    fixed = fix_metadata_spacing(fixed)
    fixed = fix_heading_spacing(fixed)
    fixed = fix_list_spacing(fixed)
    fixed = deduplicate_blank_lines(fixed)

    if fixed != original:
        path.write_text(fixed, encoding='utf-8')
        print(f"Fixed: {filepath}")
        return True
    else:
        print(f"No change: {filepath}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: fix-md-format.py <file.md | directory>")
        sys.exit(1)

    target = sys.argv[1]

    if os.path.isdir(target):
        md_files = list(Path(target).glob('*.md'))
        if not md_files:
            print(f"No .md files found in {target}")
            sys.exit(0)
        changed = sum(fix_file(str(f)) for f in sorted(md_files))
        print(f"\nDone: {changed}/{len(md_files)} files updated.")
    elif os.path.isfile(target):
        fix_file(target)
    else:
        print(f"Error: {target} not found")
        sys.exit(1)


if __name__ == '__main__':
    main()
