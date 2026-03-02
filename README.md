# Book Reading Learning System (书籍阅读学习系统)

An AI-powered guided learning system for deep reading and understanding of books, using Claude Code as an interactive reading companion with Socratic teaching methodology.

**Let's connect**: [LinkedIn](https://linkedin.com/in/chenran818) | [Twitter(X)](https://x.com/chenran818) | [知乎](https://www.zhihu.com/people/chenran)

---

## How This Works

This repository uses Claude Code as an interactive reading companion that:

- Teaches using the **Socratic method** (asking what you know first, guiding discovery)
- Engages in deep discussion of each chapter's concepts (~200 word focused explanations)
- Verifies your understanding with follow-up questions
- Adapts teaching style based on your responses
- **Tracks every reading session** to personalize your learning experience
- **Connects ideas across books** as your reading library grows
- **Supports bilingual interaction** (中英双语)

## Repository Structure

```text
/books/                         # One folder per book
  /[book-name]/
    book-info.md               # Book metadata, chapters, reading plan
    reading-progress.md        # Chapter-by-chapter progress tracker
    /sessions/
      /YYYY-MM-DD/
        session-notes.md       # Daily reading discussion notes

/templates/                     # Templates for new books and sessions
  SESSION-TEMPLATE.md
  BOOK-SETUP-TEMPLATE.md

CLAUDE.md                       # AI reading companion instructions
README.md                       # This file
```

## How to Use

### Start Reading a New Book

1. Open Claude Code in this repository
2. Tell Claude which book you want to read (e.g., "I want to start reading 金字塔原理")
3. Claude will set up the book folder, chapter listing, and reading plan for you

### Daily Reading Sessions

1. Read a chapter or section of your book
2. Open Claude Code and discuss what you read
3. Claude will:
   - Ask about your initial impressions
   - Guide you to deeper understanding through questions
   - Check your comprehension
   - Document the session automatically

### Review Sessions

Ask Claude anytime:

- "Let's review the concepts from Chapter 3"
- "What should I focus on before reading the next chapter?"
- "Quiz me on what I've learned so far"
- "How does this book connect to [other book]?"

### Track Your Progress

Each book has its own `reading-progress.md` showing:

- Chapter-by-chapter completion status
- Concepts mastered with confidence levels
- Areas that need review
- Cross-book connections discovered

## Reading Depth Levels

The system guides you through four levels of understanding:

1. **Surface Reading** - What does the author say?
2. **Analytical Reading** - Why does the author make these arguments?
3. **Critical Reading** - Do you agree? What's your own take?
4. **Connective Reading** - How do ideas link across chapters and books?

## Use This Repository for Your Own Reading

1. **Clone this repository**:

   ```bash
   git clone https://github.com/chenran818/CFP-Study.git
   cd CFP-Study
   ```

2. **Run Claude Code**:

   ```bash
   claude
   ```

3. **Start reading!** Tell Claude which book you want to begin, and the system handles the rest.

The `CLAUDE.md` file contains all the instructions for how Claude should guide your reading.

---

## About

After successfully using this AI-powered learning system to pass the CFP exam in November 2025, I adapted the same Socratic teaching methodology for general book reading and deep learning. The guided discussion approach transforms passive reading into active understanding.

**Connect with me**: [linkedin.com/in/chenran818](https://linkedin.com/in/chenran818)


执行流程：
Claude 生成 1 本推荐 → Python 分段推送钉钉 → 重命名为 书名.md → 生成 书名.html

要启用定时任务需以管理员权限运行：
任务名称：BookRecommend
powershell -ExecutionPolicy Bypass -File scripts\setup-daily-task.ps1

停掉定时任务：
方法一：打开 PowerShell 再执行
1️⃣ 按 Win + R
2️⃣ 输入：powershell
3️⃣ 在 PowerShell 里执行：
Unregister-ScheduledTask -TaskName "BookRecommend" -Confirm:$false

方法二：在 CMD 里强制调用 PowerShell
powershell -Command "Unregister-ScheduledTask -TaskName 'BookRecommend' -Confirm:$false"

方法三（用纯 CMD 命令删除）
schtasks /Delete /TN "BookRecommend" /F


## 总结新增的本地脚本体系：

脚本	替代了什么	节省 token
fix-md-format.py	Claude 手动修复格式	每次修复节省 ~200 token
update-history.py	SKILL.md Step 5（Claude 写 history.md）	每次推荐节省 ~300 token
progress.py	/progress skill	完全替代，每次节省 ~500 token
自动流程（daily-recommend.sh 每 10 分钟）：


Step 1:   claude --print "/recommend"  ← 唯一需要 token 的步骤
Step 1.5: fix-md-format.py            ← 本地格式修复
Step 1.6: update-history.py           ← 本地更新历史
Step 2:   重命名 MD 文件              ← 本地
Step 3:   生成微信 HTML               ← 本地
Step 4:   推送钉钉                    ← 本地
查看阅读进度不再需要 Claude：


python3 scripts/progress.py
python3 scripts/progress.py --stats