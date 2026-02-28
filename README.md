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
