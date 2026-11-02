---
name: "deploy-cloudbase"
description: "Update the personal site (jlx-academic-homepage) and publish it to BOTH GitHub Pages and Tencent CloudBase hosting. Invoke whenever the user asks to update/deploy/发布/上线 the website, or mentions either domain."
---

# 发布个人主页（GitHub Pages + CloudBase）

两个站点必须同步更新，**不要只发一个**。

| 站点 | 地址 | 用途 |
|---|---|---|
| GitHub Pages（主） | https://jianglixin85.github.io/ | 对外分享，无访问中间页 |
| CloudBase（备） | https://jlx-academic-homepage-jlx-academic-d1grsduhy159129c7.webapps.tcloudbase.com/ | 备份/国内访问，默认域名会有 16 秒提示页 |

仓库：`jianglixin85/jianglixin85.github.io`（源码 `main`，产物 `gh-pages`）。

## 一条命令发布（默认做法）

```bash
pnpm deploy:all
```

等价于：`pnpm build` → 用 GitHub Git Data API 推 `dist/` 到 `gh-pages` → 触发并等待 Pages 构建 → `tcb hosting deploy dist`。

其他入口：

```bash
pnpm deploy:pages      # 只更新 GitHub Pages（含构建）
pnpm deploy:pages --skip-build   # 复用当前 dist/
pnpm deploy:cloudbase  # 只更新 CloudBase（需先 build）
```

脚本：`scripts/deploy-pages.mjs`、`scripts/deploy-cloudbase.mjs`。

## 前置检查

1. `gh auth status` 显示已登录 `jianglixin85`（否则让用户在本机终端执行 `~/.local/bin/gh auth login --hostname github.com --git-protocol https --web`）。
2. `tcb --version` 可用；`tcb login status` 已登录。
3. `cloudbaserc.json` 存在且含真实 `envId`（可用 `TCB_ENV_ID` 覆盖）。该文件**不入库**。
4. `public/.nojekyll` 必须存在（构建时复制进 `dist/`）。

## 验证（发布后必做）

```bash
curl -s https://jianglixin85.github.io/ | grep -o '<改动关键词>' | head -1
curl -s -o /dev/null -w "%{http_code}\n" https://jianglixin85.github.io/_astro/<实际css文件>
```

CSS 必须 200。首页 200 但 CSS 404 ⇒ Jekyll 吞掉了 `_astro/`，检查 `.nojekyll` 后重新发布。

## 已知坑（都是实际踩过的）

- **Jekyll 吞资源**：GitHub Pages 默认跑 Jekyll，`_` 开头目录（`_astro/`）会被整目录丢弃，页面变无样式。修复：`public/.nojekyll`。
- **密钥扫描拦截**：仓库含明文密钥会被 Push Protection 拒绝。`.claude/`、`sync.config.ts`、`cloudbaserc.json` 已在 `.gitignore`，不要把它们加回仓库；如被拦截，检查报错里点名的文件并从提交中移除。
- **github.com 直连不稳**：`git push` 常因超时/断流失败，且本机全局 `insteadOf` 会把 github.com 改写成 `ghfast.top`（写操作无权限）。因此发布走 Git Data API（`deploy-pages.mjs`），不要再改回 `git push` 流程。
- **force push 到 gh-pages**：脚本用 API 更新 ref，天然全量覆盖，无需版本管理。
- **CloudBase 中间页**：默认域名必然出现，代码无法去掉；只有绑定已备案自定义域名才会消失。对外分享用 GitHub Pages 地址。
- **内容未变化**：`deploy-pages.mjs` 会比较 tree sha，相同则跳过提交，仍会触发一次 Pages 构建。

## 回滚

- 配色/样式：`src/styles/global.css.bak`、`src/layouts/Base.astro.bak`（本地备份，未入库）。
- 线上版本：`gh api repos/jianglixin85/jianglixin85.github.io/commits?sha=gh-pages` 找到上一个提交，用 Git Data API 把 ref 指回去，再触发 `pages/builds`。
