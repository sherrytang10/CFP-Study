#!/bin/bash
# 书籍推荐脚本
# 由 Windows Task Scheduler 每 10 分钟调用一次
# 流程：生成完整 MD → 重命名为书名 → 生成 HTML → 推送钉钉（零 token）

REPO_DIR="d:/code/AISkills/CFP-Study"
TEMP_FILE="$REPO_DIR/recommendations/today.md"
RECOMMEND_DIR="$REPO_DIR/recommendations"
CONFIG_FILE="$REPO_DIR/scripts/dingtalk-config.env"
DATE=$(date +%Y-%m-%d)
LOG_FILE="$REPO_DIR/recommendations/recommend.log"

# 确保 Task Scheduler 环境下能找到 claude 和 python3
export PATH="/d/nvm4w/nodejs:/c/Users/pc/AppData/Local/Programs/Python/Python311:/c/Users/pc/AppData/Local/Programs/Python/Python312:/usr/bin:$PATH"

# 先确保日志目录存在
mkdir -p "$RECOMMEND_DIR"

log() {
    echo "[$DATE $(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

cd "$REPO_DIR" || { echo "Failed to cd $REPO_DIR" >> "$LOG_FILE"; exit 1; }
log "Script started."

# 读取钉钉配置
if [ ! -f "$CONFIG_FILE" ]; then
    log "Error: config file not found: $CONFIG_FILE"
    exit 1
fi
source "$CONFIG_FILE"

if [ -z "$DINGTALK_WEBHOOK_URL" ]; then
    log "Error: DINGTALK_WEBHOOK_URL not set"
    exit 1
fi

# ============================================================
# Step 1: 调用 Claude CLI 生成完整推荐（消耗 token）
# ============================================================
log "Step 1: Generating recommendation via Claude CLI..."
claude --print "/recommend" > "$TEMP_FILE" 2>&1

if [ $? -ne 0 ]; then
    log "Error: Claude CLI failed"
    exit 1
fi

# 验证生成的内容是否完整（至少包含 --- 分隔的多个部分）
SECTION_COUNT=$(grep -c '^---$' "$TEMP_FILE" 2>/dev/null || echo 0)
LINE_COUNT=$(wc -l < "$TEMP_FILE" 2>/dev/null || echo 0)
log "Generated: $LINE_COUNT lines, $SECTION_COUNT sections"

if [ "$LINE_COUNT" -lt 50 ]; then
    log "Warning: Content seems too short ($LINE_COUNT lines), may be incomplete"
fi

# ============================================================
# Step 2: 用书名重命名 MD 文件（today.md → 书名.md）
# ============================================================
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
CONVERTER="$SCRIPT_DIR/md2wechat.py"
MD_FILE="$TEMP_FILE"

if [ -f "$CONVERTER" ]; then
    log "Step 2: Renaming MD by book title..."
    MD_FILE=$(python3 "$CONVERTER" --rename "$TEMP_FILE")
    if [ $? -eq 0 ] && [ -n "$MD_FILE" ]; then
        log "Renamed to: $MD_FILE"
    else
        MD_FILE="$TEMP_FILE"
        log "Rename skipped, keeping: $MD_FILE"
    fi

    # ========================================================
    # Step 3: 生成微信公众号 HTML 文章（零 token）
    # ========================================================
    log "Step 3: Generating WeChat HTML..."
    python3 "$CONVERTER" "$MD_FILE" "$RECOMMEND_DIR/"
    if [ $? -eq 0 ]; then
        log "WeChat HTML generated in $RECOMMEND_DIR/"
    else
        log "Warning: WeChat HTML generation failed"
    fi
else
    log "Warning: md2wechat.py not found, skipping rename and HTML"
fi

# ============================================================
# Step 4: 推送完整内容到钉钉（零 token，纯 HTTP 请求）
# ============================================================
log "Step 4: Sending to DingTalk..."
python3 -c "
import json, urllib.request, re, time, sys

WEBHOOK = '$DINGTALK_WEBHOOK_URL'
md_file = '$MD_FILE'

with open(md_file, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Extract book title
m = re.search(r'\u300a([^\u300b]+)\u300b', content)
book_name = m.group(1) if m else 'unknown'

# Split by --- sections to respect DingTalk message size limit (~6KB)
parts = re.split(r'\n-{3,}\n', content)
chunks, current = [], ''
for p in parts:
    candidate = current + '\n\n---\n\n' + p if current else p
    if len(candidate) > 5000 and current:
        chunks.append(current)
        current = p
    else:
        current = candidate
if current:
    chunks.append(current)

fail = 0
for i, chunk in enumerate(chunks, 1):
    title = f'\u6bcf\u65e5\u63a8\u8350\uff1a{book_name}\uff08{i}/{len(chunks)}\uff09'
    text = f'## \u6bcf\u65e5\u4e66\u7c4d\u63a8\u8350 \u2014 {book_name}\uff08{i}/{len(chunks)}\uff09\n\n{chunk}'
    payload = json.dumps({'msgtype': 'markdown', 'markdown': {'title': title, 'text': text}}).encode('utf-8')
    req = urllib.request.Request(WEBHOOK, data=payload, headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read().decode('utf-8'))
        if result.get('errcode', -1) != 0:
            fail += 1
            print(f'Part {i} error: {result}', file=sys.stderr)
    except Exception as e:
        fail += 1
        print(f'Part {i} exception: {e}', file=sys.stderr)
    if i < len(chunks):
        time.sleep(1)

print(f'{book_name}|{len(chunks)}|{fail}')
sys.exit(1 if fail > 0 else 0)
"

RESULT=$?
if [ $RESULT -eq 0 ]; then
    log "Sent to DingTalk successfully"
else
    log "Warning: Some DingTalk messages failed"
fi

log "Done."
