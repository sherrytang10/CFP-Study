#!/bin/bash
# 每晚批量补全推荐文件脚本
# 由 Windows Task Scheduler 在 21:30 调用
# 每次补全 10 个不达标文件（< 200 行），134 个文件约 14 晚完成

REPO_DIR="d:/code/AISkills/CFP-Study"
RECOMMEND_DIR="$REPO_DIR/recommendations"
LOG_FILE="$RECOMMEND_DIR/supplement.log"
BATCH_SIZE=10
DATE=$(date +%Y-%m-%d)

# 确保 Task Scheduler 环境下能找到 claude / python3
export PATH="/d/nvm4w/nodejs:/c/Users/pc/AppData/Local/Programs/Python/Python311:/c/Users/pc/AppData/Local/Programs/Python/Python312:/usr/bin:$PATH"

log() {
    echo "[$DATE $(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

cd "$REPO_DIR" || { echo "Failed to cd $REPO_DIR" >> "$LOG_FILE"; exit 1; }
log "=========================================="
log "Nightly supplement started (batch=$BATCH_SIZE)"

# ============================================================
# Step 1: 找出行数 < 200 的文件，按行数从小到大排（最烂的先补）
# ============================================================
mapfile -t FILES < <(
    wc -l "$RECOMMEND_DIR"/*.md 2>/dev/null | sort -n | \
    awk '$1 < 200 && $2 !~ /history\.md/ && $2 !~ /today\.md/ && $2 !~ /total/ {print $2}' | \
    head -n "$BATCH_SIZE"
)

TOTAL_REMAINING=$(wc -l "$RECOMMEND_DIR"/*.md 2>/dev/null | sort -n | \
    awk '$1 < 200 && $2 !~ /history\.md/ && $2 !~ /today\.md/ && $2 !~ /total/ {count++} END {print count+0}')

if [ ${#FILES[@]} -eq 0 ]; then
    log "🎉 No files need supplementing. All done!"
    exit 0
fi

log "Queue: ${#FILES[@]} files this batch, $TOTAL_REMAINING total remaining"

# ============================================================
# Step 2: 逐个补全
# ============================================================
DONE=0
FAIL=0

for filepath in "${FILES[@]}"; do
    INDEX=$((DONE + FAIL + 1))
    # 从文件名提取书名（去路径、去 .md 后缀）
    bookname=$(basename "$filepath" .md)
    OLD_LINES=$(wc -l < "$filepath" 2>/dev/null || echo 0)

    log "[$INDEX/${#FILES[@]}] Supplementing: $bookname ($OLD_LINES lines)"

    # 清除嵌套会话保护变量
    unset CLAUDECODE

    # 调用 Claude CLI 执行 /supplement skill
    claude --print "/supplement $bookname" >> "$LOG_FILE" 2>&1
    EXIT_CODE=$?

    # 验证补全结果
    NEW_LINES=$(wc -l < "$filepath" 2>/dev/null || echo 0)

    if [ $EXIT_CODE -eq 0 ] && [ "$NEW_LINES" -ge 200 ]; then
        log "  ✅ $bookname: $OLD_LINES → $NEW_LINES lines"
        DONE=$((DONE + 1))
    elif [ $EXIT_CODE -eq 0 ] && [ "$NEW_LINES" -gt "$OLD_LINES" ]; then
        log "  ⚠️  $bookname: $OLD_LINES → $NEW_LINES lines (improved but still < 200)"
        DONE=$((DONE + 1))
    else
        log "  ❌ $bookname: failed (exit=$EXIT_CODE, lines=$NEW_LINES)"
        FAIL=$((FAIL + 1))
    fi

    # 请求间冷却，避免 rate limit
    sleep 10
done

# ============================================================
# Step 3: 汇总 & Git 提交
# ============================================================
REMAINING_AFTER=$(wc -l "$RECOMMEND_DIR"/*.md 2>/dev/null | sort -n | \
    awk '$1 < 200 && $2 !~ /history\.md/ && $2 !~ /today\.md/ && $2 !~ /total/ {count++} END {print count+0}')

log "=========================================="
log "Batch result: $DONE success, $FAIL failed"
log "Remaining: $REMAINING_AFTER files (was $TOTAL_REMAINING)"
NIGHTS_LEFT=$(( (REMAINING_AFTER + BATCH_SIZE - 1) / BATCH_SIZE ))
log "ETA: ~$NIGHTS_LEFT more nights"

# 有成功的就提交
if [ "$DONE" -gt 0 ]; then
    cd "$REPO_DIR"
    git add recommendations/
    git commit -m "docs: supplement $DONE book recommendations ($DATE)

Batch: $DONE success, $FAIL failed, $REMAINING_AFTER remaining

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
    log "Git committed $DONE supplemented files"
fi

log "Nightly supplement done."
