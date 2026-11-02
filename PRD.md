# JLX 个人主页 PRD

> 版本：v1.0 | 日期：2026-06-17 | 状态：已实施

## 一、项目背景

### 1.1 项目目标
打造一个个人学术主页，展示个人简介、技术成果、学习笔记等内容，最后实现公网访问，并且支持更新。

### 1.2 当前状态
- 技术栈：Astro v5 + Tailwind CSS + TypeScript
- 设计风格：V3 Ocean Mist（海雾蓝磨砂玻璃风格）
- 已实现：基础页面结构、飞书文档同步、内容集合
- 已完成：内容可配置化、GitHub 项目同步、技术栈展示、移动端适配、配置整合

### 1.3 已确认配置
| 配置项 | 值 |
|--------|-----|
| GitHub 用户名 | `jianglixin85` |
| GitHub Token | 不需要（公开 API 够用） |
| 飞书笔记跳转 URL | `https://my.feishu.cn/drive/me/` |
| 技术栈展示 | 技术能力 + 笔记分类（两个板块） |

---

## 二、功能需求

### 2.1 首页内容可配置化

**需求描述**：首页除「近期笔记」和「近期成果」外的所有文字内容，应支持在配置文件中编辑调整，无需修改代码。

**涉及内容**：
- Hero 区域：姓名、头像、个人简介
- 工作经历：公司、职位、时间、描述（多条）
- 教育背景：学校、院系、专业、时间
- 技能标签：技能列表
- 联系方式：邮箱、社交链接

**实现方案**：
- 新建 `src/data/profile.ts` 配置文件，导出结构化数据对象
- `index.astro` 从该文件读取数据渲染
- 支持多语言扩展（预留 `lang` 字段）

**数据结构**：
```typescript
// src/data/profile.ts
export default {
  hero: {
    name: string;
    avatar: string;
    bio: string;
  };
  experience: Array<{
    company: string;
    role: string;
    period: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    department: string;
    major: string;
    period: string;
    degree: string;
  }>;
  skills: string[];
  contact: Array<{
    label: string;
    href: string;
    type: 'email' | 'link';
  }>;
};
```

---

### 2.2 GitHub 项目同步

**需求描述**：首页「近期成果」展示个人 GitHub 最近更新的 2 个项目，支持手动触发更新。

**功能要点**：
| 功能 | 说明 |
|------|------|
| 数据来源 | GitHub API (`/users/jianglixin85/repos`) |
| 展示数量 | 最近更新的 2 个项目 |
| 展示信息 | 项目名、描述、语言、星标数、更新时间、仓库链接 |
| 更多跳转 | 点击「查看全部」跳转 `https://github.com/jianglixin85` |
| 嵌入方案 | 不嵌入（GitHub 不支持 iframe），采用跳转方式 |
| 手动更新 | 提供 `pnpm sync:github` 命令手动拉取最新数据 |

**实现方案**：
1. 新建 `scripts/sync-github.ts` 脚本，调用 GitHub API 获取仓库列表
2. 将数据写入 `src/content/projects-gh/` 目录（新建 content collection）
3. 首页合并展示本地项目 + GitHub 同步项目

**API 调用**：
```bash
GET https://api.github.com/users/jianglixin85/repos?sort=updated&per_page=10
```

---

### 2.3 飞书笔记同步优化

**需求描述**：首页「近期笔记」展示飞书云文档最新更新的 2 篇笔记，点击「更多」跳转飞书云文档页面。

**功能要点**：
| 功能 | 说明 |
|------|------|
| 数据来源 | 已实现的飞书同步脚本 |
| 展示数量 | 最新更新的 2 篇笔记 |
| 展示信息 | 标题、描述、标签、更新时间、飞书链接 |
| 更多跳转 | 点击「查看全部」跳转 `https://my.feishu.cn/drive/me/` |
| 嵌入方案 | 不嵌入（飞书不支持外部 iframe），采用跳转方式 |
| 手动更新 | 已有 `pnpm sync:feishu` 命令 |

**实现方案**：
1. 首页按 `modified_time` 排序取最新 2 篇
2. 配置项 `feishu.driveUrl` 设置为 `https://my.feishu.cn/drive/me/`
3. NoteCard 组件已有 `feishuUrl` 字段，点击可跳转原文

---

### 2.4 移动端适配

**需求描述**：确保页面在移动端（375px - 767px）有良好的展示效果。

**当前状态**：
- Header 已有移动端菜单（hamburger + 全屏 overlay）
- CSS 已有 `@media (max-width: 767px)` 适配
- Tailwind 已使用响应式类（`md:` 前缀）

**待优化项**：
| 区域 | 优化内容 |
|------|----------|
| Hero | 头像和简介在移动端垂直排列（已实现） |
| 卡片网格 | 移动端单列展示（已实现 `grid-cols-1 md:grid-cols-2`） |
| 工作经历 | 移动端公司名和时间分行显示（已实现） |
| 技术栈 | 新增区域，需确保移动端可滚动或换行 |
| 触摸目标 | 按钮最小 44px 高度（已实现） |
| 安全区域 | 适配 iPhone 刘海屏（已实现 `safe-area-inset`） |

**验收标准**：
- 在 375px 宽度下无横向滚动
- 所有可点击元素最小 44px
- 文字可读性良好（无过小字号）

---

### 2.5 技术栈展示

**需求描述**：首页新增两个板块：「技术能力」和「笔记分类」。

#### 2.5.1 技术能力板块

**展示内容**：按类别分组展示个人技术能力

| 类别 | 技术项 |
|------|--------|
| 前端开发 | TypeScript, React, Vue, Tailwind CSS |
| 后端开发 | Node.js, Python |
| 游戏引擎 | Cocos Creator, Unity |
| AI/大模型 | 大模型应用开发, 提示词工程, Agent 架构设计 |
| 产品运营 | PRD 撰写, Axure 原型, 产品运营 |
| 社区治理 | 开源社区治理, 技术布道 |

#### 2.5.2 笔记分类板块

**展示内容**：展示笔记分类，点击可跳转对应标签页

| 分类 | 说明 |
|------|------|
| AI学习笔记 | AI 相关学习笔记 |
| CDN学习笔记 | CDN 相关学习笔记 |
| AI漫剧 | AI 漫剧相关内容 |
| 产品经理 | 产品经理相关笔记 |
| 其他 | 其他类型笔记 |

**UI 设计**：
- 技术能力：分组卡片形式，每组有标题，组内用 `.tag` 样式展示
- 笔记分类：横向标签列表，点击跳转 `/notes?tag=xxx`
- 移动端：技术能力换行展示，笔记分类支持横向滚动

**数据结构**：
```typescript
// src/data/profile.ts 新增
techStack: Array<{
  category: string;
  items: Array<{
    name: string;
    icon?: string;
    level?: 'expert' | 'proficient' | 'familiar';
  }>;
}>;

noteCategories: Array<{
  name: string;
  tag: string; // 对应 notes 页面的 tag 参数
  icon?: string;
}>;
```

---

### 2.6 设计规范说明

**设计风格**：V3 Ocean Mist（海雾蓝磨砂玻璃风格）

**核心设计 Token**：

| Token | 用途 | 明亮模式 | 暗黑模式 |
|-------|------|----------|----------|
| `--color-bg` | 页面背景 | `#F5F7F9` | `#1A1E26` |
| `--color-bg-card` | 卡片背景 | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.06)` |
| `--color-text` | 主文字 | `#1E2D3D` | `#D8E0EE` |
| `--color-accent` | 强调色 | `#64829B` | `#7AA0C0` |
| `--blur-card` | 卡片模糊 | `blur(16px)` | `blur(16px)` |

**字体规范**：
- 主字体：Inter（Google Fonts）
- 等宽字体：JetBrains Mono
- 中文字体：系统回退（PingFang SC / Hiragino Sans GB / Microsoft YaHei）

**组件规范**：
| 组件 | 说明 |
|------|------|
| `.card` | 磨砂玻璃卡片，半透明背景 + 模糊 + 边框 |
| `.tag` | 等宽字体标签，圆角矩形 |
| `.sec-title` | 大写等宽字体章节标题 |
| `.btn-primary` / `.btn-secondary` / `.btn-tertiary` | 三级按钮层次 |

**矢量图规范**：
- 使用 SVG 格式
- 推荐来源：Heroicons、Feather Icons、Tabler Icons
- 颜色使用 `currentColor` 或 CSS 变量

**间距规范**：
- 基础单位：4px
- 卡片内边距：`p-6 md:p-8`（24px / 32px）
- 区块间距：`mb-10`（40px）

---

## 三、技术方案

### 3.1 文件结构变更

```
src/
├── data/
│   └── profile.ts          # 个人资料配置（含 techStack, noteCategories）
├── content/
│   ├── projects-gh/        # GitHub 同步项目
│   └── notes-feishu/       # 飞书同步笔记
├── components/
│   ├── GitHubCard.astro    # GitHub 项目卡片
│   ├── ProjectCard.astro   # 本地项目卡片
│   └── NoteCard.astro      # 笔记卡片
└── pages/
    └── index.astro         # 读取配置数据渲染首页

scripts/
├── sync-feishu.ts          # 飞书同步脚本
└── sync-github.ts          # GitHub 同步脚本

sync.config.ts              # 统一同步配置
```

### 3.2 命令

```json
{
  "sync:feishu": "tsx scripts/sync-feishu.ts",
  "sync:github": "tsx scripts/sync-github.ts",
  "sync:all": "pnpm sync:feishu && pnpm sync:github"
}
```

### 3.3 Content Collections

```typescript
// src/content.config.ts 新增
const projectsGitHub = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects-gh' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    language: z.string().optional(),
    stars: z.number().default(0),
    updated: z.string(),
    url: z.string(),
    source: z.literal('github'),
    date: z.coerce.date(),
  }),
});
```

---

## 四、实施计划

### Phase 1：内容配置化（优先级：高） ✅
1. 创建 `src/data/profile.ts`，迁移 index.astro 中的硬编码数据
2. 修改 `index.astro` 读取配置文件
3. 验证构建正常

### Phase 2：GitHub 项目同步（优先级：高） ✅
1. 创建 `scripts/sync-github.ts`
2. 创建 `src/content/projects-gh/` 目录和 collection
3. 创建 `GitHubCard.astro` 组件
4. 修改首页展示逻辑
5. 添加 `pnpm sync:github` 命令

### Phase 3：技术栈展示（优先级：中） ✅
1. 在 `profile.ts` 添加 `techStack` 和 `noteCategories` 数据
2. 在首页添加技术能力和笔记分类板块

### Phase 4：移动端优化（优先级：中） ✅
1. 检查各组件移动端表现
2. 添加 `darkMode: 'class'` 到 Tailwind 配置
3. 测试 375px 宽度下的展示效果

### Phase 5：配置整合与文档（优先级：低） ✅
1. 重命名 `feishu-sync.config.ts` 为 `sync.config.ts`
2. 更新 CLAUDE.md 文档
3. 更新 .gitignore

---

## 五、验证方案

### 5.1 构建验证
```bash
pnpm build
pnpm preview
```

### 5.2 同步验证
```bash
pnpm sync:feishu  # 验证飞书同步
pnpm sync:github  # 验证 GitHub 同步
```

### 5.3 移动端验证
- Chrome DevTools 模拟 iPhone 14 Pro (375px)
- Safari 响应式设计模式
- 真机测试（可选）

### 5.4 功能验收清单
- [x] 首页内容可通过 `profile.ts` 编辑
- [x] GitHub 项目正确同步并展示
- [x] 飞书笔记正确同步并展示
- [x] 技术栈板块正确展示
- [x] 笔记分类可点击跳转
- [x] 移动端无横向滚动
- [x] 暗黑模式正常切换
- [x] 所有链接可正常跳转

---

## 六、风险与备选方案

### 6.1 GitHub API 限额
**风险**：未认证请求限额 60 次/小时
**备选**：配置 GitHub Token 提升至 5000 次/小时

### 6.2 飞书嵌入限制
**风险**：飞书文档不支持 iframe 嵌入
**备选**：采用跳转方式，或使用飞书开放 API 渲染内容

### 6.3 技术栈图标
**风险**：部分技术无官方 SVG 图标
**备选**：使用 Iconify 或纯文字展示
