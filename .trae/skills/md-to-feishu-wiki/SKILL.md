---
name: "md-to-feishu-wiki"
description: "Convert local Markdown files to Feishu wiki documents and place them under a target wiki node. Invoke when user wants to upload/publish markdown to Feishu cloud docs or wiki."
---

# Markdown 转飞书 Wiki 文档

将本地 Markdown 文件导入飞书云文档（docx），并移动到指定的 Wiki 知识库节点下。

## 触发场景

用户提到以下意图时立即调用：
- "上传到飞书"、"转飞书文档"、"导入飞书"
- "发布到飞书 Wiki"、"放到飞书知识库下"
- "markdown 转飞书"、"md 转飞书文档"
- 任何涉及将本地文件转为飞书在线文档的操作

## 前置条件

1. **lark-cli 已安装**：`which lark-cli` 应返回路径（本项目已安装在 `/opt/homebrew/bin/lark-cli`）
2. **Bot 身份可用**：`lark-cli auth status` 中 bot identity 状态为 `ready`
3. **用户身份已登录**（移动到 Wiki 时必需）：`lark-cli auth status` 中 user identity 状态为 `ready`
   - 如未登录，需先执行 `lark-cli auth login`（交互式，需用户在终端中完成）
   - 登录时至少选择 `docs`、`drive`、`wiki` 三个业务域

## 核心流程

### Step 1：导入 Markdown 为飞书 docx

```bash
# 将文件复制到项目目录（lark-cli 要求相对路径）
cp <源文件路径> ./<临时文件名>.md

# 导入为飞书 docx
lark-cli drive +import --file ./<临时文件名>.md --type docx --name "<文档标题>" --as bot
```

**关键参数：**
- `--file`：必须使用相对路径（如 `./filename.md`），不支持绝对路径
- `--type docx`：Markdown 文件只能导入为 docx 类型
- `--name`：导入后的飞书文档标题（建议使用内容中的主标题）
- `--as bot`：用 Bot 身份导入，Bot 自动成为文档 Owner

**导入结果解析：**
- 成功时返回 `token`（如 `KoUydMw9uovgAux5ZivclflNnug`）和 `url`（如 `https://my.feishu.cn/docx/KoUydMw9uovgAux5ZivclflNnug`）
- 自动为当前 CLI 用户授予 `full_access` 权限

### Step 2：获取目标 Wiki 文档信息

如果用户要求将文档放到某个 Wiki 文档下，需要获取目标 Wiki 的 space_id 和 node_token：

```bash
# 解析 Wiki URL
lark-cli drive +inspect --url "<飞书Wiki URL>" --as bot
```

**返回关键字段：**
- `wiki_node.node_token`：如 `PEnVwGSa2iuJpLkOyFkcGMoynad`
- `wiki_node.space_id`：如 `7541325950781440002`
- `wiki_node.obj_token`：底层文档 token
- `wiki_node.obj_type`：底层文档类型（通常为 docx）

**如果用户没有提供 URL：**
- Bot 身份无法搜索用户 Wiki（需 user 身份 + search scope）
- 需请用户提供目标文档的飞书 URL

### Step 3：转移文档 Owner 给用户

Bot 创建的文档，用户默认没有移动权限。必须先将 Owner 转给用户：

```bash
# 获取用户的 open_id（从 lark-cli auth status 中读取）
# 示例：ou_9c03f98d976f3e3900001a1cc6cf4cd8

# 转移 Owner
lark-cli drive permission.members transfer_owner \
  --token <导入文档token> \
  --type docx \
  --data '{"member_id":"<用户open_id>","member_type":"openid"}' \
  --as bot --yes
```

**注意：**
- 用户 open_id 从 `lark-cli auth status` 的 `identities.user.openId` 字段获取
- 本项目的用户 open_id 为 `ou_9c03f98d976f3e3900001a1cc6cf4cd8`

### Step 4：移动文档到 Wiki 目标节点下

```bash
lark-cli wiki +move \
  --obj-token <导入文档token> \
  --obj-type docx \
  --target-space-id <目标space_id> \
  --target-parent-token <目标node_token> \
  --as user
```

**必须使用 `--as user`**：Bot 身份没有 Wiki 空间的操作权限（`permission denied: no destination parent node permission`）

**移动结果解析：**
- 成功时返回 `wiki_token`（新 Wiki 节点 token）和 `node_token`
- 移动是异步操作，lark-cli 自动轮询等待完成

### Step 5：清理临时文件

```bash
rm ./<临时文件名>.md
```

## 常见问题与解决

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `unsafe file path` | `--file` 使用了绝对路径 | 改用相对路径：先 `cp` 到项目目录，再用 `./filename.md` |
| `permission denied: no move permission` | 用户不是文档 Owner | 先 `transfer_owner` 转给用户 |
| `permission denied: no destination parent node permission` | Bot 没有 Wiki 空间权限 | 用 `--as user` 执行移动 |
| `User identity: missing` | 用户未登录 | 运行 `lark-cli auth login`，选择 docs/drive/wiki 域 |
| SSL 证书错误（feishu.py） | macOS 证书链问题 | 在脚本中添加 SSL context 跳过验证 |

## 快速参考：本项目飞书配置

- **App ID**：`cli_aaa177774dbb1bcb`（来源：`sync.config.ts`）
- **App Secret**：`FXOwGkV39QZaXaGjGxEh9g2H5nAGYOEV`（来源：`sync.config.ts`）
- **用户 open_id**：`ou_9c03f98d976f3e3900001a1cc6cf4cd8`（来源：`lark-cli auth status`）

## 完整示例：一键操作脚本

以下是将一个 Markdown 文件上传到飞书 Wiki 的完整命令序列：

```bash
# 1. 凍备文件
cp /path/to/source.md ./upload_temp.md

# 2. 导入为飞书 docx
lark-cli drive +import --file ./upload_temp.md --type docx --name "文档标题" --as bot
# → 记录返回的 token（如 TOKEN=KoUydMw9uovgAux5ZivclflNnug）

# 3. 解析目标 Wiki（如用户提供 URL）
lark-cli drive +inspect --url "https://my.feishu.cn/wiki/WIKI_TOKEN" --as bot
# → 记录 space_id 和 node_token

# 4. 转移 Owner 给用户
lark-cli drive permission.members transfer_owner \
  --token TOKEN --type docx \
  --data '{"member_id":"ou_9c03f98d976f3e3900001a1cc6cf4cd8","member_type":"openid"}' \
  --as bot --yes

# 5. 移动到 Wiki 目标节点下
lark-cli wiki +move \
  --obj-token TOKEN --obj-type docx \
  --target-space-id SPACE_ID \
  --target-parent-token NODE_TOKEN \
  --as user

# 6. 清理
rm ./upload_temp.md
```

## 仅导入到云盘根目录（不放 Wiki）

如果用户只需要上传到飞书云盘，不需要移动到 Wiki，只需执行 Step 1 + Step 5 即可：

```bash
cp /path/to/source.md ./upload_temp.md
lark-cli drive +import --file ./upload_temp.md --type docx --name "文档标题" --as bot
rm ./upload_temp.md
# → 文档在云盘根目录，URL 已返回
```

## 注意事项

- 飞书 Markdown 导入是自动转换的，表格、加粗等格式会保留，但排版细节（列宽、对齐、字体大小等）可能需要在飞书中手动微调
- Markdown 文件大小上限为 20MB
- 导入后如不指定 `--name`，默认使用文件名（去掉扩展名）
- `lark-cli drive +import` 支持 `.md`、`.docx`、`.doc`、`.txt`、`.html` 导入为 docx；`.xlsx`/`.csv` 导入为 sheet 或 bitable
