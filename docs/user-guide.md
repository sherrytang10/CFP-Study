# 书籍阅读学习系统 — 使用说明

> 本文档详细说明系统的所有功能、命令和自动化配置。

---

## 目录

- [系统概览](#系统概览)
- [快速开始](#快速开始)
- [Skill 命令速查表](#skill-命令速查表)
- [命令详细说明](#命令详细说明)
  - [/new-book — 开始新书](#new-book--开始新书)
  - [/review — 复习薄弱概念](#review--复习薄弱概念)
  - [/progress — 查看阅读进度](#progress--查看阅读进度)
  - [/save-session — 保存学习记录](#save-session--保存学习记录)
  - [/connect — 跨书概念关联](#connect--跨书概念关联)
  - [/recommend — 每日书籍推荐](#recommend--每日书籍推荐)
- [钉钉推送配置](#钉钉推送配置)
- [微信公众号文章生成](#微信公众号文章生成)
- [定时任务详细说明](#定时任务详细说明)
- [项目文件结构](#项目文件结构)
- [常见问题](#常见问题)

---

## 系统概览

本系统利用 Claude Code 作为交互式阅读伙伴，通过**苏格拉底式教学法**帮助你深入理解书籍内容。

核心特点：

- **引导式学习**：不直接给答案，通过提问引导你自己发现
- **进度追踪**：每本书独立追踪章节进度、已掌握概念、待复习内容
- **间隔复习**：记录每次复习时间，提醒你什么时候该重新复习
- **跨书关联**：发现不同书籍之间概念的联系，构建知识网络
- **每日推荐**：每天推送一本管理/沟通/心理类好书到钉钉群

---

## 快速开始

1. 在项目目录下打开 Claude Code
2. 输入 `/new-book 你想读的书名` 开始一本新书
3. 读完一章后，直接和 Claude 讨论
4. 讨论结束后输入 `/save-session` 保存记录
5. 随时输入 `/progress` 查看学习进度
6. 隔一段时间输入 `/review` 复习薄弱概念

---

## Skill 命令速查表

| 命令 | 用途 | 参数 | 示例 |
|------|------|------|------|
| `/new-book` | 开始一本新书 | 书名（必填） | `/new-book 非暴力沟通` |
| `/review` | 复习薄弱概念 | 书名（可选） | `/review` 或 `/review 金字塔原理` |
| `/progress` | 查看阅读进度 | 书名（可选） | `/progress` |
| `/save-session` | 保存当前讨论 | 书名（可选） | `/save-session` |
| `/connect` | 跨书概念关联 | 概念或书名（可选） | `/connect MECE` |
| `/recommend` | 推荐一本新书 | 无 | `/recommend` |

---

## 命令详细说明

### /new-book — 开始新书

**用法**：`/new-book 书名`

**执行流程**：

1. 在线搜索书籍信息（作者、目录、章节）
2. 创建书籍文件夹 `books/[英文书名]/`
3. 生成 `book-info.md`（书籍元数据、章节列表）
4. 生成 `reading-progress.md`（空白进度追踪）
5. 创建 `sessions/` 文件夹
6. 询问你的阅读目标和计划节奏

**生成的文件结构**：

```text
books/[book-name]/
├── book-info.md           # 书籍信息和章节目录
├── reading-progress.md    # 阅读进度（单一数据源）
└── sessions/              # 学习会话记录
```

---

### /review — 复习薄弱概念

**用法**：`/review` 或 `/review 书名`

**执行流程**：

1. 读取 `reading-progress.md` 中的待复习概念
2. 按优先级排序（高 > 中 > 低）
3. 查看距上次复习最久的概念
4. 通过苏格拉底式提问测试你的记忆
5. 每次聚焦 2-3 个概念
6. 完成后提醒你用 `/save-session` 保存记录

**复习策略**：

- 先问你还记得什么，不直接给答案
- 记住了 → 确认并标记为已掌握
- 忘了 → 换一种方式重新讲解，再次检验

---

### /progress — 查看阅读进度

**用法**：`/progress` 或 `/progress 书名`

**输出示例**：

```text
阅读进度总览

金字塔原理（The Pyramid Principle）
├── 模式：复习巩固
├── 章节：0/12 已完成
├── 会话：1 次
├── 已掌握：2 个概念
├── 待复习：4 个概念（高优先 2 / 中优先 2）
├── 上次学习：2026-02-28
└── 建议：优先复习 MECE 和 SCQA
```

不指定书名时显示所有书籍的摘要，并给出下一步学习建议。

---

### /save-session — 保存学习记录

**用法**：`/save-session` 或 `/save-session 书名`

**这是最重要的命令**。每次讨论结束后务必执行，它会完成两步操作：

**Step 1 — 保存会话详情**

创建 `books/[书名]/sessions/YYYY-MM-DD/session-notes.md`，记录：

- 讨论了哪些章节和概念
- 你的理解和回答
- 哪些概念掌握了、哪些还没掌握
- 下次讨论的计划

**Step 2 — 更新进度追踪**

更新 `books/[书名]/reading-progress.md`：

- 章节状态和理解程度
- 新掌握的概念（附日期和信心度）
- 新发现的薄弱点
- 复习记录表
- 整体统计数据

---

### /connect — 跨书概念关联

**用法**：`/connect` 或 `/connect 概念名`

**前提**：至少 2 本书有已掌握的概念。

**寻找的关联类型**：

| 类型 | 说明 |
|------|------|
| 相似概念 | 不同作者用不同方式描述相同道理 |
| 互补概念 | 不同书的概念互相强化、补充 |
| 矛盾观点 | 不同作者持相反立场，值得思考 |
| 递进关系 | 一本书是另一本书的基础或延伸 |

发现的关联会自动写入各书的 `reading-progress.md` 跨书连接部分。

---

### /recommend — 每日书籍推荐

**用法**：`/recommend`

**推荐范围**：管理类、沟通类、心理类书籍

**输出内容（8 个部分）**：

| 部分 | 内容 |
|------|------|
| 基本信息 | 书名、作者、类别、推荐理由 |
| 章节详解 | 每一章的主要内容概述（3-5 句/章） |
| 核心观点 | 5-8 个有深度解释的核心观点 |
| 经典案例 | 2-3 个书中或相关的真实案例 |
| 深度读后感 | 以阅读者视角写的个人见解和应用体会 |
| 苏格拉底式思考题 | 3 个开放式问题引导读者深入思考 |
| 费曼检验 | 用最通俗的语言总结全书（含"解释给小学生"版本） |
| 跨书关联 | 与已读书的关联 + 后续阅读推荐 |

**去重机制**：已推荐过的书记录在 `recommendations/history.md`，不会重复推荐。

---

## 钉钉推送配置

每日推荐可以自动推送到钉钉群。

### 第 1 步：创建钉钉群机器人

1. 打开钉钉群 → **设置** → **机器人** → **添加机器人**
2. 选择 **自定义（通过 Webhook 接入）**
3. 安全设置选择 **自定义关键词**，填入：`推荐`
4. 复制生成的 Webhook URL（格式：`https://oapi.dingtalk.com/robot/send?access_token=xxx`）

### 第 2 步：配置 Webhook URL

```bash
# 复制配置模板
cp scripts/dingtalk-config.env.example scripts/dingtalk-config.env

# 编辑配置文件，填入你的 Webhook URL
# DINGTALK_WEBHOOK_URL="https://oapi.dingtalk.com/robot/send?access_token=你的token"
```

> **注意**：`dingtalk-config.env` 已被 `.gitignore` 排除，不会被提交到 git，你的 Webhook URL 是安全的。

### 第 3 步：手动测试

在 Claude Code 中输入 `/recommend`，确认推荐内容正常生成。

---

## 微信公众号文章生成

每日推荐内容会自动生成一份微信公众号友好的 HTML 文章，可以直接粘贴到公众号编辑器中，无需额外排版。

### 工作流程

```text
daily-recommend.sh 执行完成后
    ↓
调用 md2wechat.py 转换 today.md
    ↓
生成 recommendations/wechat-article.html
    ↓
浏览器打开 HTML → Ctrl+A 全选 → Ctrl+C 复制
    ↓
粘贴到微信公众号编辑器 → 发布
```

### 手动生成

如果你想手动转换一个推荐文件：

```bash
python3 scripts/md2wechat.py recommendations/today.md recommendations/wechat-article.html
```

### 在浏览器中预览

```bash
# Windows
start recommendations/wechat-article.html

# 或直接在文件管理器中双击 wechat-article.html
```

### 粘贴到公众号

1. 在浏览器中打开生成的 HTML 文件
2. `Ctrl + A` 全选页面内容
3. `Ctrl + C` 复制
4. 打开微信公众号后台 → 新建图文 → `Ctrl + V` 粘贴
5. 样式会自动保留（标题层级、引用块、加粗、分割线等）
6. 检查无误后发布

### 样式说明

HTML 模板使用微信兼容的内联样式：

| 元素 | 样式 |
|------|------|
| 章节标题 | 绿色左边框 + 加粗（#07C160） |
| 章节详解 | 加粗章节名 + 灰色描述文字 |
| 核心观点 | 加粗标题 + 描述 |
| 经典案例 | 浅灰背景圆角卡片 |
| 深度读后感 | 绿色左边框 + 浅绿背景 + 斜体 |
| 思考题 | 暖黄背景圆角卡片 |
| 费曼检验 | 浅蓝背景圆角卡片 |
| 延伸阅读 | 灰色背景卡片 |

### 公众号相关文件

| 文件 | 用途 |
|------|------|
| `scripts/md2wechat.py` | Markdown → HTML 转换脚本 |
| `scripts/templates/wechat-article.html` | HTML 模板（含 CSS 样式） |
| `recommendations/wechat-article.html` | 生成的文章（.gitignore） |

---

## 定时任务详细说明

### 功能

每天早上 **8:30** 自动执行以下流程：

```text
Windows Task Scheduler (8:30 触发)
    ↓
daily-recommend.sh (bash 脚本)
    ↓
Claude CLI 执行 /recommend skill
    ↓
生成推荐内容 → 保存到 recommendations/today.md
    ↓
通过 curl 发送到钉钉群 Webhook
    ↓
钉钉群收到 Markdown 格式的推荐消息
    ↓
md2wechat.py 转换为公众号 HTML
    ↓
生成 recommendations/wechat-article.html（浏览器打开后可直接粘贴到公众号）
```

### 安装定时任务

以**管理员权限**打开 PowerShell，运行：

```powershell
powershell -ExecutionPolicy Bypass -File d:\code\AISkills\CFP-Study\scripts\setup-daily-task.ps1
```

成功后会显示：

```text
Done! Scheduled task created successfully.
  Task name : DailyBookRecommend
  Schedule  : Daily at 8:30 AM
  Output    : d:\code\AISkills\CFP-Study\recommendations\today.md
```

### 管理定时任务

**图形界面**：按 `Win + R` → 输入 `taskschd.msc` → 找到 `DailyBookRecommend`

**PowerShell 命令**：

```powershell
# 查看任务状态
Get-ScheduledTask -TaskName "DailyBookRecommend"

# 查看上次运行结果和时间
Get-ScheduledTaskInfo -TaskName "DailyBookRecommend"

# 手动触发一次（不用等到 8:30）
Start-ScheduledTask -TaskName "DailyBookRecommend"

# 暂停任务（保留配置，暂时不执行）
Disable-ScheduledTask -TaskName "DailyBookRecommend"

# 恢复任务
Enable-ScheduledTask -TaskName "DailyBookRecommend"

# 彻底删除任务
Unregister-ScheduledTask -TaskName "DailyBookRecommend"
```

### 运行条件

| 条件 | 说明 |
|------|------|
| 电脑必须开机 | 关机状态下任务不会执行 |
| 用户必须已登录 | 需要当前用户会话 |
| 开机补执行 | 如果 8:30 时电脑关着，开机后会自动补执行一次 |
| 电池模式可用 | 笔记本用电池也能执行 |
| 依赖 Claude CLI | 系统需要安装 Claude Code 且 `claude` 命令可用 |
| 依赖 python3 | 用于 JSON 转义处理 |

### 相关文件

| 文件 | 用途 |
|------|------|
| `scripts/setup-daily-task.ps1` | 创建 Windows 定时任务（运行一次即可） |
| `scripts/daily-recommend.sh` | 每日执行的推荐+推送脚本 |
| `scripts/dingtalk-config.env` | 钉钉 Webhook URL 配置（不提交 git） |
| `scripts/dingtalk-config.env.example` | 配置文件模板 |
| `recommendations/today.md` | 当天推荐内容的本地备份 |
| `recommendations/history.md` | 所有推荐历史记录 |

### 排查问题

**没收到钉钉消息？**

1. 检查 `dingtalk-config.env` 中的 URL 是否正确
2. 确认钉钉机器人关键词包含"推荐"
3. 手动运行脚本测试：`bash scripts/daily-recommend.sh`
4. 检查 `recommendations/today.md` 是否有内容

**定时任务没执行？**

1. 打开任务计划程序（`taskschd.msc`）查看状态
2. 检查"历史记录"标签页的错误信息
3. 确认 `bash` 命令可用（Git Bash 需在 PATH 中）
4. 确认 `claude` CLI 可用

---

## 项目文件结构

```text
CFP-Study/
├── .claude/skills/              # Claude Code 自定义命令
│   ├── new-book/SKILL.md       #   /new-book - 开始新书
│   ├── review/SKILL.md         #   /review - 复习概念
│   ├── progress/SKILL.md       #   /progress - 查看进度
│   ├── save-session/SKILL.md   #   /save-session - 保存记录
│   ├── connect/SKILL.md        #   /connect - 跨书关联
│   └── recommend/SKILL.md      #   /recommend - 每日推荐
│
├── books/                       # 书籍数据（每本书一个文件夹）
│   └── pyramid-principle/       #   金字塔原理
│       ├── book-info.md        #     书籍信息和章节目录
│       ├── reading-progress.md #     阅读进度（单一数据源）
│       └── sessions/           #     学习会话记录
│           └── 2026-02-28/
│               └── session-notes.md
│
├── recommendations/             # 每日推荐
│   ├── history.md              #   推荐历史（防重复）
│   ├── today.md                #   当天推荐内容（.gitignore）
│   └── wechat-article.html    #   公众号文章（.gitignore）
│
├── scripts/                     # 自动化脚本
│   ├── daily-recommend.sh      #   每日推荐+钉钉推送+公众号HTML生成
│   ├── md2wechat.py            #   Markdown → 公众号 HTML 转换
│   ├── setup-daily-task.ps1    #   Windows 定时任务安装
│   ├── dingtalk-config.env     #   钉钉配置（.gitignore）
│   ├── dingtalk-config.env.example  # 配置模板
│   └── templates/
│       └── wechat-article.html #   公众号 HTML 模板
│
├── templates/                   # 模板文件
│   ├── BOOK-SETUP-TEMPLATE.md  #   新书初始化模板
│   └── SESSION-TEMPLATE.md     #   会话记录模板
│
├── docs/                        # 文档
│   └── user-guide.md           #   本文件
│
├── CLAUDE.md                    # Claude Code 全局指令
├── README.md                    # 项目说明
└── .gitignore                   # Git 忽略规则
```

---

## 常见问题

**Q: 可以同时读多本书吗？**

可以。每本书有独立的文件夹和进度追踪，互不影响。讨论时告诉 Claude 你在读哪本书即可。

**Q: 如何修改每日推荐的推送时间？**

打开任务计划程序（`taskschd.msc`），找到 `DailyBookRecommend`，双击编辑触发器中的时间。或者修改 `setup-daily-task.ps1` 中的 `-At 8:30AM` 后重新运行。

**Q: 如何增加推荐的书籍类别？**

编辑 `.claude/skills/recommend/SKILL.md`，在"选择推荐书籍"部分添加新的类别。

**Q: 忘记执行 /save-session 了怎么办？**

下次开始讨论时告诉 Claude 你上次的讨论内容，它会帮你补录。

**Q: 换了电脑怎么迁移？**

将整个项目 git clone 到新电脑，重新运行 `setup-daily-task.ps1` 创建定时任务，复制 `dingtalk-config.env` 配置文件即可。
