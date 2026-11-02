# 大模型API协议说明和区分

> 你有没有遇到过这种情况：用OpenAI的API写好的代码，换成Claude就报错；换成DeepSeek又要改一版；接入Gemini还得再学一套？这不是你代码写得烂，而是**每家大模型的"接口语言"不一样**。

---

## 从一个真实的崩溃场景说起

假设你要写一个最简单的AI对话功能——用户问一句，模型答一句。

**用OpenAI的协议**，你发的是这样的请求：

```json
{
  "model": "gpt-5.6-terra",
  "messages": [
    {"role": "system", "content": "你是一个助手"},
    {"role": "user", "content": "你好"}
  ]
}
```

**用Anthropic的协议**，同样的事你得这样写：

```json
{
  "model": "claude-opus-4-7",
  "system": "你是一个助手",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

看到区别了吗？OpenAI把系统提示（system prompt）放在 messages 列表里，Anthropic 把它单独拎出来放在顶层。就这么一个"放哪"的差别，你换了模型就得改代码。

这只是冰山一角。**三大协议在消息格式、工具调用、流式输出、鉴权方式上都有差异。** 这篇文章就把这些差异讲清楚，并回答一个更深层的问题：**为什么各家不统一？为什么要搞出这么多协议？**

---

## 先搞清三个概念

在展开之前，先区分三个容易混淆的层次：

| 层次 | 是什么 | 类比 |
|------|--------|------|
| **API协议** | 调用大模型的"接口格式"——请求怎么写、响应怎么读 | 充电线的形状（USB-C、Lightning、Micro-USB） |
| **SDK** | 对API协议的封装，让你用更少的代码调用 | 充电头（把各种线统一成一个插头） |
| **MCP** | 模型与外部工具/数据源的连接协议 | USB-C的数据传输标准（跨设备统一连接，不同于各家搞各的快充协议） |

本文主要讲**API协议**这一层。SDK和MCP会在后面简要提及。

---

## 三大主流API协议逐个拆

### 一、OpenAI协议 —— AI界的"USB-C"

OpenAI是最早提供大模型API的厂商，它的 `Chat Completions API`（`/v1/chat/completions`）在2023年成为了**事实上的行业标准**。就像USB-C一样——不是谁定的官方标准，但大家都跟着用。

#### 核心特征

| 特征 | OpenAI的做法 |
|------|------------|
| **端点** | `/v1/chat/completions`（2025年3月起新增 `/v1/responses`） |
| **消息格式** | messages列表，每条包含 role + content |
| **角色类型** | system、user、assistant、tool（4种） |
| **系统提示** | 放在messages列表里，role="system" |
| **工具调用** | 叫 Function Calling，工具定义放在 tools 参数里 |
| **鉴权方式** | Bearer Token（Authorization: Bearer sk-xxx） |
| **流式输出** | stream: true，返回 SSE（Server-Sent Events） |
| **结构化输出** | 支持 JSON Mode 和 Structured Outputs |
| **推理暴露** | reasoning.effort参数（6级：none→low→medium→high→xhigh→max）+ reasoning.summary摘要 + encrypted_content加密推理项 |

#### 一个完整的请求示例

```json
{
  "model": "gpt-5.6-terra",
  "messages": [
    {"role": "system", "content": "你是一个翻译助手"},
    {"role": "user", "content": "把'hello world'翻译成中文"},
    {"role": "assistant", "content": "你好世界"},
    {"role": "user", "content": "再翻一次'good morning'"}
  ],
  "temperature": 0.7,
  "stream": true,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "获取天气",
        "parameters": {"type": "object", "properties": {"city": {"type": "string"}}}
      }
    }
  ]
}
```

#### 为什么它成了"行业标准"？

因为**先发优势**。OpenAI在2023年率先推出Chat Completions API时，市面上还没有成熟的替代方案。所有开发者都按这个格式写代码，所有框架（LangChain、LlamaIndex等）都优先适配它。后来DeepSeek、通义千问、智谱等国内厂商为了让开发者"零成本迁移"，纷纷选择**兼容OpenAI协议**——你只需要改一个base_url，代码不用动。

---

### 二、Anthropic协议 —— "我觉得OpenAI的设计不够好"

Anthropic（Claude的母公司）在设计API时，明确认为OpenAI的某些设计有缺陷，于是做了不同的选择。

#### 核心特征

| 特征 | Anthropic的做法 |
|------|---------------|
| **端点** | `/v1/messages` |
| **消息格式** | messages列表，但content支持"内容块"（Content Blocks） |
| **角色类型** | user、assistant（只有2种！） |
| **系统提示** | 单独放在顶层的 system 参数，不在messages里 |
| **工具调用** | 叫 Tool Use，格式与OpenAI不同 |
| **鉴权方式** | x-api-key 请求头 + anthropic-version 版本号（当前仍为 `2023-06-01`） |
| **流式输出** | stream: true，但事件格式与OpenAI不同 |
| **扩展思考** | 支持 thinking 内容块（暴露推理过程） |
| **代码执行** | 支持 Claude 在沙箱中运行代码、生成文件（2025年新增） |
| **托管Agent** | Claude Managed Agents 平台（2025年公开测试） |

#### 与OpenAI的关键差异

**差异1：系统提示的位置**

OpenAI把系统提示塞在messages列表里，Anthropic把它单独拎出来：

```json
{
  "model": "claude-opus-4-7",
  "system": "你是一个翻译助手",
  "messages": [
    {"role": "user", "content": "你好"}
  ]
}
```

Anthropic的理由是：系统提示和用户消息**本质不同**——系统提示是"行为指令"，用户消息是"对话内容"，混在一起容易出问题（比如模型把system消息当成对话的一部分来回复）。

**差异2：内容块（Content Blocks）**

OpenAI的content通常是一个字符串。Anthropic的content是一个**数组**，可以包含多种类型的内容块：

```json
{
  "role": "assistant",
  "content": [
    {"type": "thinking", "thinking": "让我想想这个问题..."},
    {"type": "text", "text": "答案是42"},
    {"type": "tool_use", "id": "toolu_01", "name": "calculator", "input": {"expr": "6*7"}}
  ]
}
```

这种设计让一条消息可以**同时包含推理过程、文本回答和工具调用**，而不是像OpenAI那样把工具调用放在单独的message里。

**差异3：工具调用的格式**

| 方面 | OpenAI (Function Calling) | Anthropic (Tool Use) |
|------|-------------------------|---------------------|
| 工具定义位置 | 请求的 tools 参数 | 请求的 tools 参数（格式不同） |
| 调用结果返回 | role="tool" 的消息，含 tool_call_id | role="user" 的消息，含 tool_result 内容块（需带 tool_use_id 关联） |
| 调用请求格式 | assistant消息里的 tool_calls 数组 | assistant消息里的 tool_use 内容块 |
| 工具ID字段 | tool_call_id | tool_use_id |

看起来只是字段名不同，但实际开发中，**这足以让你的代码在两个协议间完全不兼容**。

**差异4：扩展思考（Extended Thinking）**

Anthropic独有：可以在响应中返回 `thinking` 类型的内容块，展示Claude的推理过程。这是Claude推理模型（如Claude Opus 4.7）的核心能力。

对比OpenAI：OpenAI的推理模型（GPT-5.6系列）也支持推理暴露，但方式不同——通过 `reasoning.effort` 参数（6级深度控制）、`reasoning.summary`（推理摘要）和 `reasoning.encrypted_content`（加密推理项，用于跨轮次推理保留）。OpenAI不公开原始推理token，而是通过摘要和加密机制提供可观察性。两种方案各有取舍：Anthropic更透明，OpenAI更可控。

**差异5：鉴权方式**

OpenAI用 `Authorization: Bearer sk-xxx`，Anthropic用 `x-api-key: sk-ant-xxx` 加上必须的 `anthropic-version: 2023-06-01` 版本头（截至2026年7月，此版本号仍未变更，新功能通过 `anthropic-beta` 头引入）。这意味着你连"怎么认证"都得改。

---

### 三、Google Gemini协议 —— "我有自己的生态，但我也兼容OpenAI了"

Google的Gemini API走了一条独特的路线：**原生格式与OpenAI兼容格式并行**。

#### 双格式策略

截至2026年7月，Gemini API同时提供两种调用方式：

| 方式 | 端点 | 鉴权 | 适用场景 |
|------|------|------|---------|
| **Gemini原生格式** | `/v1beta/models/{model}:generateContent` | URL参数 `?key=xxx` 或 OAuth 2.0 | 使用Gemini独有功能 |
| **OpenAI兼容格式** | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | `Authorization: Bearer xxx` | 从OpenAI迁移、快速接入 |

> 注意：Gemini的OpenAI兼容端点路径是 `/v1beta/openai/`，不是标准的 `/v1/`，迁移时需要留意base_url的差异。

当前Gemini最新模型为**Gemini 3.5 Flash**（2025年底发布，主打低延迟高吞吐）。Gemini 3.5 Pro原定2026年7月17日发布，但截至7月15日已有跳票消息，最新checkpoint质量未达预期。此前Gemini 3.1 Pro（2026年2月发布）仍可作为稳定选择。

#### Gemini原生格式的核心特征

| 特征 | Gemini原生做法 |
|------|------------|
| **端点** | `/v1beta/models/{model}:generateContent` |
| **消息格式** | contents数组，每条包含 role + parts |
| **角色类型** | user、model（注意：不是assistant，是model！） |
| **系统提示** | 放在 systemInstruction 参数里 |
| **工具调用** | 叫 Function Calling，但格式完全不同 |
| **鉴权方式** | API Key via URL参数（开发测试）或 OAuth 2.0（生产环境） |
| **推理控制** | `thinking_level` 参数（low/medium/high，Gemini 3新增） |
| **思考签名** | Thought Signatures，多轮对话中维持推理状态 |
| **多模态** | 原生支持，parts里可以放 text、inlineData、fileData 等 |

#### 与OpenAI的关键差异

**差异1：角色叫法不同**

OpenAI/Anthropic用 `assistant`，Gemini原生格式用 `model`。你的代码里如果硬编码了 `role === "assistant"` 的判断逻辑，换成Gemini原生格式就会漏掉。但如果用Gemini的OpenAI兼容端点，则正常使用 `assistant`。

**差异2：内容用 parts 而非 content**

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [{"text": "你好"}]
    }
  ],
  "systemInstruction": {"parts": [{"text": "你是翻译助手"}]}
}
```

Gemini用 `parts` 数组代替 `content`，每个part可以是文本、图片、文件等。设计理念类似Anthropic的内容块，但格式完全不同。

**差异3：鉴权方式有多种选择**

- **API Key via URL**：`?key=xxx`（最简单，适合开发测试和快速上手）
- **OAuth 2.0 via 请求头**：`Authorization: Bearer <access_token>`（更安全，适合生产环境）

**差异4：Gemini 3独有的推理控制**

Gemini 3系列引入了 `thinking_level`（low/medium/high）替代旧的 `thinking_budget`，并通过 Thought Signatures 在多轮对话和函数调用场景中维持推理状态——概念上类似OpenAI的 `encrypted_content`，但实现方式不同。

---

## 一张总表：三大协议核心差异（2026年7月版）

| 维度 | OpenAI | Anthropic | Gemini原生 | Gemini兼容 |
|------|--------|-----------|-----------|-----------|
| **端点** | /v1/chat/completions + /v1/responses | /v1/messages | :generateContent | /v1beta/openai/chat/completions |
| **系统提示** | messages里的role=system | 顶层system参数 | systemInstruction参数 | messages里的role=system |
| **助手角色** | assistant | assistant | model | assistant |
| **内容格式** | content: 字符串 | content: 内容块数组 | parts: 数组 | content: 字符串 |
| **工具调用** | Function Calling | Tool Use | Function Calling（格式不同） | Function Calling |
| **鉴权** | Bearer Token | x-api-key + 版本号 | URL参数key / OAuth | Bearer Token |
| **流式输出** | SSE（data: [DONE]） | SSE（message_stop事件） | SSE（不同事件格式） | SSE（data: [DONE]） |
| **推理暴露** | reasoning.effort(6级) + summary + encrypted_content | thinking内容块 | thinking_level + Thought Signatures | 不支持 |
| **代码执行** | 内置code_interpreter（Responses API） | 沙箱代码执行+文件创建 | 内置code execution | 不支持 |
| **多模态** | content里放image_url | content块里放image | parts里放inlineData | content里放image_url |

---

## 为什么各家不统一？—— 三个深层原因

### 原因一：技术理念不同 —— "我觉得你的设计有缺陷"

OpenAI把系统提示放在messages列表里，Anthropic认为这是设计缺陷——系统指令和用户消息本质不同，不该混在一起。Anthropic的内容块设计也更灵活，一条消息可以同时包含文本、推理、工具调用。

这不是"为了不同而不同"，而是**真的觉得自己的方案更好**。

### 原因二：商业竞争 —— "我不想被你锁定"

如果Anthropic完全兼容OpenAI协议，开发者换模型就只需要改一行base_url。那Anthropic就永远只是OpenAI的"替代品"，没有自己的技术身份。

**自建协议 = 建立生态壁垒。** 当你用Anthropic SDK写代码后，你的代码里就有了thinking内容块、tool_use格式等Anthropic独有的东西，再想换回OpenAI就不是改一行URL那么简单了。

### 原因三：功能差异 —— "我的模型能做你的协议表达不了的事"

Claude的扩展思考能力，Gemini 3的 `thinking_level` 和 Thought Signatures，都是各自协议独有字段。如果完全兼容别人的协议，这些能力就没法通过API暴露出来。

**当模型能力超越协议表达能力时，就必须扩展协议——而扩展的方向各不相同。**

---

## 协议的演变：从"聊天"到"Agent"的范式迁移

### OpenAI Responses API：新一代事实标准

2025年3月11日，OpenAI正式发布 **Responses API**（`/v1/responses`），从"对话"设计转向"任务/响应"设计。

| 维度 | Chat Completions（旧） | Responses（新） |
|------|----------------------|----------------|
| 设计理念 | 围绕"对话" | 围绕"任务/响应" |
| 工具调用 | 需要自己管理多轮 | 内置工具（web_search、code_interpreter等） |
| 结构化输出 | 需要额外参数 | 原生支持 |
| Agent能力 | 需要外部框架 | 内置支持 |
| MCP支持 | 无 | 内置Connectors |
| 上下文管理 | 需要开发者自己维护历史 | 原生上下文管理，支持链式对话 |
| 推理暴露 | 有限 | 完整（effort + summary + encrypted_content） |

截至2026年7月的关键进展：

- **Assistants API**将于**2026年8月26日**正式停用，Responses API吸收了其核心能力
- **Chat Completions API**目前仍然可用且持续获得新模型支持，但高级能力（Programmatic Tool Calling、Multi-agent等）只在Responses API中提供
- **Codex CLI**在2026年初已彻底移除了对 `wire_api = "chat"` 的支持，**只走 `/v1/responses` 协议**——这意味着使用Codex的开发者必须用Responses API
- **openai SDK**最新版本v1.79.0，已全面支持 `client.responses.create(...)`

**"事实标准"正在从 `/v1/chat/completions` 走向 `/v1/responses`**，而这一次，国内厂商的跟进速度明显加快了。

---

## MCP：AI Agent时代的"USB-C接口"

2024年底，Anthropic提出了 **MCP（Model Context Protocol）**。

MCP解决的是不同层面的问题：

- **API协议**解决的是：你的代码怎么跟模型说话
- **MCP**解决的是：模型怎么跟外部工具/数据源说话

截至2026年7月，MCP已成为AI Agent生态的核心标准：

- **月下载量达1.1亿次**，被称为"AI Agent时代的USB-C接口"
- Claude、ChatGPT、VS Code Copilot、Cursor已原生支持
- GitHub Copilot在单一仓库内有6门语言的MCP Server Generator
- **OpenAI在Responses API中内置了MCP Connectors**——这是罕见的"对手采用对手的协议"

---

## 国内厂商的协议版图（2026年7月版）

国内大模型的API协议经历了"各搞各的 → 兼容OpenAI → 多协议兼容"三个阶段。

### 早期（2023年）：每家一套协议

#### 百度文心一言 —— 最复杂的鉴权

百度的千帆平台至今保留了两种接口风格：

**原生格式（千帆v1）—— 两步鉴权**

1. 先用AK（API Key）+ SK（Secret Key）调用鉴权接口，获取一个临时 `access_token`
2. 再用这个 `access_token` 调用模型接口，token有效期仅24小时

而且原生格式的端点路径非常长——`/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro`，不同模型还有不同的子路径，模型名直接嵌在URL里。

**兼容格式（千帆v2）—— OpenAI兼容**

百度在2024年推出了千帆v2版本，支持 `/v1/chat/completions` 格式。但即使v2版，鉴权仍然要先获取access_token（两步鉴权不能完全省掉）。百度最新模型已更新为**ERNIE 4.5**和**ERNIE X1**系列（2025年3月发布，ERNIE 4.5已开源）。

#### 讯飞星火 —— 最奇葩的鉴权

讯飞星火的早期API用了**WebSocket协议**而不是HTTP，鉴权方式更复杂：

- 需要三个密钥：APPID、APISecret、APIKey
- 鉴权流程：用这三个密钥生成一个带时间戳的签名，拼成一个特殊的WebSocket URL
- 模型版本直接嵌在URL里

2024年后，讯飞终于推出了HTTP接口：`https://spark-api-open.xf-yun.com/v1/chat/completions`，格式终于兼容OpenAI了，鉴权也简化为Bearer Token。旧版WebSocket接口是否已正式下线尚无官方公告。

#### 智谱ChatGLM —— 最早兼容OpenAI的国内厂商

智谱AI在GLM-4发布时就直接采用了OpenAI兼容格式。2026年1月8日智谱在港交所主板上市。最新模型为**GLM-5.2**（2026年6月发布，MIT开源，MoE架构744B总参数激活40B，支持100万Token上下文）。智谱同时提供Anthropic兼容接口用于编程场景。

### 2026年7月：全面OpenAI兼容 + Responses API跟进

| 厂商 | 最新模型 | 发布时间 | OpenAI兼容 | Anthropic兼容 | Responses API |
|------|---------|---------|:----------:|:------------:|:------------:|
| **DeepSeek** | V4-Pro / V4-Flash | 2026.4 | ✅ | ✅ | ❌ |
| **阿里云** | Qwen3.7-Max | 2026.5 | ✅ | ❌ | ❌ |
| **智谱AI** | GLM-5.2 | 2026.6 | ✅ | ✅ | ❌ |
| **月之暗面** | K2.7 Code | 2026.6 | ✅ | ❌ | ❌ |
| **字节跳动** | Doubao-Seed-2.1 | 2026.6 | ✅ | ❌ | ✅ |
| **百度** | ERNIE 4.5 / X1 | 2025.3 | ✅（v2） | ❌ | ❌ |
| **讯飞** | 星火 | — | ✅ | ❌ | ❌ |
| **百川** | Baichuan | — | ✅ | ❌ | ❌ |

### DeepSeek：技术突破 + 多协议兼容

DeepSeek于2026年4月24日发布**DeepSeek-V4**系列（V3/R1已过时）：
- **V4-Pro**：1.6万亿参数，激活49B，采用全新MoE稀疏架构+混合注意力机制
- **V4-Flash**：轻量化版，部署门槛更低
- 支持100万Token无损上下文

API策略上，DeepSeek同时兼容OpenAI Chat Completions和Anthropic Messages两套协议，但**不支持Responses API**。由于Codex CLI已移除Chat Completions支持，开发者需要通过第三方转换层（如Moon Bridge）才能在Codex中调用DeepSeek。

### 字节跳动：模型平台 + 率先支持Responses API

字节跳动走了一条"模型平台"而非"模型厂商"的路：火山方舟（Ark）不仅提供豆包系列模型，还托管了DeepSeek-V4、Qwen3.7、GLM-5.2等主流开源模型，全部走统一接口。

**豆包模型更新**：当前最新为**Doubao-Seed-2.1**系列（2026年6月发布），包含Pro（旗舰深度思考）和Turbo（95%能力、价格减半）两个版本。

**Responses API支持**：火山引擎是国内**唯一原生支持OpenAI Responses API**的厂商。250615及之后版本的豆包模型默认支持Responses API，包含创建/查询/删除模型响应、获取响应上下文等完整接口。两大核心能力：
1. **原生上下文管理**：支持多轮对话链式管理，结合缓存能力可降低80%成本
2. **自主工具调用**：单次请求联动多个工具与模型组合

**市场地位**：截至2025年12月，豆包大模型日均Token调用量突破50万亿，中国公有云大模型调用量市场份额46.4%，国内第一。

**MCP集成**：火山引擎在Responses API中原生支持"云部署MCP"工具调用，是国内在API层面集成MCP最深的厂商。

### 为什么国内厂商最终都走向了OpenAI兼容？

1. **开发者生态**：国内开发者绝大多数从OpenAI生态迁移过来，用LangChain等框架写的代码都是OpenAI格式
2. **工具链依赖**：几乎所有AI开发工具（Cursor、Continue、Aider等）都基于OpenAI格式
3. **DeepSeek的示范效应**：DeepSeek从一开始就完全兼容OpenAI格式，开发者体验极好

### 国内厂商的Responses API跟进情况

截至2026年7月，火山引擎是国内唯一原生支持Responses API的厂商。其他厂商（DeepSeek、Qwen、智谱等）尚未支持，开发者需要通过GodeX等本地网关工具将 `/v1/responses` 请求转换为Chat Completions格式来间接调用。

随着Codex CLI等工具只支持Responses协议，其他国内厂商跟进只是时间问题。**未来的竞争力之一就是"兼容多少种协议"**。

---

## 开发者怎么办？—— 三个生存策略

### 策略一：用统一封装层（推荐）

使用LiteLLM、OpenRouter、one-api等聚合层，在底层帮你做协议转换：

```python
from litellm import completion

# 同一套代码调用不同模型——只改模型名
response = completion(model="gpt-5.6-terra", messages=[...])        # OpenAI
response = completion(model="claude-opus-4-7", messages=[...])      # Anthropic
response = completion(model="gemini/gemini-3.5-flash", messages=[...]) # Gemini
response = completion(model="deepseek/deepseek-v4-pro", messages=[...]) # DeepSeek
```

### 策略二：用各家的官方SDK

OpenAI有openai SDK（v1.79.0），Anthropic有anthropic SDK，Google有google-genai SDK。SDK帮你处理协议差异，但切换模型时仍需改代码。

### 策略三：直接写原生HTTP请求

最灵活但也最痛苦。只在需要极致控制或协议的独有功能时才推荐。

---

## 未来会统一吗？

截至2026年7月，协议格局正在发生微妙但重要的变化：

1. **OpenAI兼容层仍是最低标准，但正在从Chat Completions向Responses迁移**：几乎所有厂商都兼容Chat Completions格式，火山引擎已率先跟进Responses API。随着Codex CLI只支持Responses协议，其他国内厂商跟进只是时间问题。

2. **多协议兼容成为新常态**：DeepSeek兼容了OpenAI和Anthropic两套，火山引擎兼容了Chat Completions和Responses两代，Gemini同时提供原生和OpenAI兼容两种格式——**兼容更多协议 = 吸引更多开发者**。

3. **MCP已成为AI Agent生态核心标准**：月下载1.1亿次，Claude/ChatGPT/Cursor/VS Code全面支持。在"模型连接外部工具"这个层面，MCP正在成为跨厂商统一标准。

4. **协议本身在快速进化**：OpenAI从Chat Completions走向Responses，推理暴露从无到有再到6级深度控制；Anthropic加了thinking、code_execution、Managed Agents；Gemini 3引入了thinking_level和Thought Signatures——**协议不是一成不变的，它们在响应Agent时代的需求而快速演变**。

最终的局面可能是：**API协议层面维持"一超多强"（OpenAI兼容为主，Anthropic/Gemini原生为辅），但"OpenAI兼容"本身的定义正在从Chat Completions扩展到Responses API。工具连接层面MCP走向统一。** 就像今天：USB-C统一了接口形状和数据传输标准，但各家手机厂商的快充协议（PD、QC、VOOC）仍然各搞各的——**接口标准统一了，不代表底层的实现细节和优化方向就完全一样。** API协议就像USB-C的接口形状（基本统一到OpenAI兼容），MCP就像USB-C的数据传输标准（正在统一），而各家模型的独有能力（Anthropic的thinking、Gemini的thinking_level等）就像快充协议（各有各的优化，但都跑在统一接口之上）。
