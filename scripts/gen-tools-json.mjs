#!/usr/bin/env node
/**
 * 生成 mcp/tools.json —— 面向外部 agent / MCP client 的工具清单。
 *
 * 学习点：manifest 不是手写的，而是 boot 插件后从 `ctx.tools.schemas()` 提取，
 * 所以它**永远与代码一致**（不会出现手写 schema 与实现漂移）。
 *
 * 与 dsh-quant/scripts/gen-tools-json.ts 同机制，两处差异是为"最小 + 可直接跑"：
 *   1. 用 .mjs（纯 ESM）：脚本本身不需要 TS 工具链；Node 直接可执行。
 *   2. import 构建产物 `../lib/index.js`：所以要先 `npm run build`。
 *
 * 运行：npm run gen:tools   （= node scripts/gen-tools-json.mjs）
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { name, inject, apply } from '../lib/index.js'

// 1. 起一个最小 cordis 运行时，装配 tools 服务，再装上本插件
const ctx = new Context()
await ctx.plugin(SystemPrompt)
await ctx.plugin(ToolRuntime)
await ctx.plugin({ name, inject, apply })

// 2. 从注册表提取"模型可见"的 schema（只含 name/description/parameters）
const schemas = ctx.tools.schemas()
const tools = schemas.map((s) => ({
  name: s.name,
  description: s.description,
  parameters: s.parameters ?? {},
}))

// 3. 写出清单
const manifest = {
  generator: 'scripts/gen-tools-json.mjs',
  package: 'dsh-quant-mini',
  generatedAt: new Date().toISOString(),
  toolCount: tools.length,
  note: 'Model-visible schemas extracted from ctx.tools.schemas() at runtime — always matches the shipped code.',
  tools,
}
mkdirSync(new URL('../mcp/', import.meta.url), { recursive: true })
writeFileSync(new URL('../mcp/tools.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n')
console.log(`generated mcp/tools.json with ${tools.length} tools`)

// 4. 释放 fiber（可逆 effect 的收尾）
await ctx.fiber.dispose()
