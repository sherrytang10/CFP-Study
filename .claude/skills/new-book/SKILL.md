---
name: new-book
description: 开始阅读一本新书，自动创建文件夹结构和初始化文件
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Glob, WebSearch
argument-hint: "[书名]"
---

## 任务：为新书创建阅读学习环境

用户想开始阅读一本新书：**$ARGUMENTS**

### 执行步骤

1. **搜索书籍信息**
   - 用 WebSearch 搜索书名 + 作者 + 目录章节
   - 获取：书名（中英文）、作者、类别、章节列表

2. **确定文件夹名**
   - 使用英文短横线命名：`books/[english-name]/`
   - 例如："金字塔原理" → `books/pyramid-principle/`

3. **创建文件夹结构**

   ```
   books/[book-name]/
   ├── book-info.md
   ├── reading-progress.md
   └── sessions/
   ```

4. **创建 book-info.md**
   - 参考模板：`templates/BOOK-SETUP-TEMPLATE.md`
   - 填入搜索到的书籍信息（书名、作者、类别、章节列表）
   - 阅读目标先留空，询问用户

5. **创建 reading-progress.md**
   - 初始化章节进度表（所有章节状态为"未开始"）
   - 初始化空的已掌握概念和待复习概念区域

6. **输出确认**
   - 展示创建的文件结构
   - 展示章节概览
   - 询问用户的阅读目标和计划节奏

### 语言要求

- 所有文件内容以中文为主
- 英文专业术语附原文，格式如"金字塔原理（The Pyramid Principle）"
