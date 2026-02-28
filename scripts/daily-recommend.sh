#!/bin/bash
# 每日书籍推荐脚本
# 由 Windows Task Scheduler 每天 8:30 调用
# 使用 Claude CLI 执行 /recommend skill，结果推送到钉钉群

REPO_DIR="d:/code/AISkills/CFP-Study"
TEMP_FILE="$REPO_DIR/recommendations/today.md"
RECOMMEND_DIR="$REPO_DIR/recommendations"
JSON_FILE="/tmp/dingtalk_payload.json"
CONFIG_FILE="$REPO_DIR/scripts/dingtalk-config.env"
DATE=$(date +%Y-%m-%d)

cd "$REPO_DIR" || exit 1

# 读取钉钉配置
if [ ! -f "$CONFIG_FILE" ]; then
    echo "[$DATE] Error: config file not found: $CONFIG_FILE"
    echo "Copy dingtalk-config.env.example to dingtalk-config.env and set your Webhook URL"
    exit 1
fi
source "$CONFIG_FILE"

if [ -z "$DINGTALK_WEBHOOK_URL" ]; then
    echo "[$DATE] Error: DINGTALK_WEBHOOK_URL not set"
    exit 1
fi

# Step 1: 调用 Claude CLI 生成推荐
echo "[$DATE] Generating daily recommendation..."
claude --print "/recommend" > "$TEMP_FILE" 2>&1

if [ $? -ne 0 ]; then
    echo "[$DATE] Error: Claude CLI failed"
    exit 1
fi

# Step 2: 读取推荐内容并转义 JSON 特殊字符
CONTENT=$(cat "$TEMP_FILE")
ESCAPED_CONTENT=$(echo "$CONTENT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read())[1:-1])")

# Step 3: 构建 JSON payload 写入临时文件（避免 Windows 命令行编码问题）
cat > "$JSON_FILE" << EOJSON
{
    "msgtype": "markdown",
    "markdown": {
        "title": "每日书籍推荐",
        "text": "## 每日书籍推荐 — ${DATE}\n\n${ESCAPED_CONTENT}"
    }
}
EOJSON

# Step 4: 通过文件发送到钉钉（解决 Windows curl 中文编码问题）
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json; charset=utf-8" \
    -d @"$JSON_FILE" \
    "$DINGTALK_WEBHOOK_URL")

# 检查发送结果
ERRCODE=$(echo "$RESPONSE" | grep -o '"errcode":[0-9]*' | grep -o '[0-9]*')

if [ "$ERRCODE" = "0" ]; then
    echo "[$DATE] Sent to DingTalk successfully"
else
    echo "[$DATE] DingTalk send failed: $RESPONSE"
    exit 1
fi

# 清理临时文件
rm -f "$JSON_FILE"

# Step 5: 用书名重命名 MD 文件（today.md → 书名.md）
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
CONVERTER="$SCRIPT_DIR/md2wechat.py"

if [ -f "$CONVERTER" ]; then
    MD_FILE=$(python3 "$CONVERTER" --rename "$TEMP_FILE")
    if [ $? -eq 0 ] && [ -n "$MD_FILE" ]; then
        echo "[$DATE] Recommendation saved: $MD_FILE"
    else
        MD_FILE="$TEMP_FILE"
        echo "[$DATE] Recommendation saved: $MD_FILE (rename skipped)"
    fi

    # Step 6: 生成微信公众号 HTML 文章（自动用书名命名）
    python3 "$CONVERTER" "$MD_FILE" "$RECOMMEND_DIR/"
    if [ $? -eq 0 ]; then
        echo "[$DATE] WeChat article generated in $RECOMMEND_DIR/"
        echo "[$DATE] Open in browser, select all, copy and paste to WeChat editor"
    else
        echo "[$DATE] Warning: WeChat HTML generation failed"
    fi
else
    echo "[$DATE] Warning: md2wechat.py not found, skipping rename and HTML generation"
    echo "[$DATE] Recommendation saved: $TEMP_FILE"
fi
