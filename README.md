# dsh-quant-mini —— 最小 dsh 插件教学包

这是一个**可运行的最小 dsh 插件**，把 [dsh-quant](https://github.com/pengpengyi92/dsh-quant)
的架构压到最小：**3 个必填导出 + 2 个工具 + 1 个纯函数层 + 手算基准测试 + CLI/Skill/MCP 外围三件**。
目的是让你照着它，学会「怎么构建一个插件」。

## 目录结构（核心四层 ①–⑤ + 外围三件 ⑥–⑧）

```
minimal-plugin/
├── package.json          # ① 外壳声明：dsh.bundle.patch + bin + files + scripts
├── cordis.patch.yml      # ② 接入点：往 profile insert 一行
├── tsconfig.json         #    tsc 构建配置（同 dsh-quant）
├── src/
│   ├── index.ts          # ③ 插件主体：name / inject / apply(ctx) + 2 个 defineTool
│   └── dsh-demo/
│       └── rolling.ts    # ④ 领域层：纯函数，零依赖、可离线测试
├── tests/
│   └── rolling.spec.ts   # ⑤ 验证层：手算基准 + 假 ctx 验证 apply()
├── cli/
│   └── main.mjs          # ⑥ CLI：绕过 harness，直接调 lib 纯函数（零依赖）
├── skill/
│   └── dsh-quant-mini/
│       └── SKILL.md      # ⑦ Skill：模型可加载的工作流指南（frontmatter + 两平面）
├── scripts/
│   └── gen-tools-json.mjs # ⑧ 清单生成器：boot 插件 → ctx.tools.schemas() → mcp/
└── mcp/
    └── tools.json        #    产物：模型可见 schema 快照，随包发布给外部 agent
```

## 五步搭建（这就是全部）

**Step 1 · 插件只有三个必填导出**（`src/index.ts`）

```ts
export const name = 'dsh-quant-mini'   // 唯一名字
export const inject = ['tools'] as const // 依赖的工具注册表服务
export function apply(ctx: Context) { /* 注册工具 */ }
```

`inject: ['tools']` 是关键：harness 必须先装配好 `tools` 服务，插件才会被激活 ——
这就是「零胶水」的由来。

**Step 2 · 用 `defineTool` 声明工具**（`src/index.ts`）

每个工具一次声明四件事：`parameters`（入参 schema）、`output.schema`（canonical JSON）、
`output.render`（给人读的投影）、`isConcurrencySafe`。

**Step 3 · 把算法放进领域层**（`src/dsh-demo/rolling.ts`）

工具层只做「校验 + 调纯函数 + 组装输出」的薄包装；真正的算法在领域层，
零依赖、可独立测试、可被别的工具复用。这正是 dsh-quant 的六域结构。

**Step 4 · 注册（可逆）**

```ts
ctx.tools.register(defineTool({ ... }))   // 返回 disposer
```

`register` 返回 disposer，fiber 释放即自动注销 —— 插件可热插拔，不污染全局。

**Step 5 · 声明接入点**（`package.json` + `cordis.patch.yml`）

```json
"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
```

```yaml
- insert:
    - id: quant-mini
      name: 'dsh-quant-mini'
```

用户 `dsh plugin add dsh-quant-mini`（或在自己 profile 的 `cordis.patch.yml` 里
按 `id` 覆写/禁用这一行）即完成安装。

## 契约速查（dsh-quant 的三条铁律）

1. **等长 null 对齐**：输出长度 === 输入长度，算不出的窗口位是 `null`；
   **空序列是合法结果，不是错误**（本包 `demo_series_stats([])` 返回 `count:0`）。
2. **无未来函数**：只用当前及之前的数据。
3. **canonical JSON + render 分离**：机器读 `output.schema` 的值，人读 `output.render` 的文本。
   联合类型（数字或 null）用 `oneOf`；输出对象每个字段都要 `required: true`。

## 外围三件：CLI · Skill · MCP 清单（与 dsh-quant 同构）

工具本体之外，真实插件还有三条外围路径。这里各给一个最小实现，都能跑。

**⑥ CLI**（`cli/main.mjs`）—— 绕过 harness 的第二条消费路径

```sh
node examples/minimal-plugin/cli/main.mjs tools
node examples/minimal-plugin/cli/main.mjs rolling 1,2,3,4,5 --window 3
node examples/minimal-plugin/cli/main.mjs stats 1,2,3,4
```

它**不启动 cordis、不注册工具**，直接 `import '../lib/dsh-demo/rolling.js'` 调纯函数。
这也解释了为什么必须 `npm run build` 出 `lib/`：CLI 与 package 的 `main`/`exports` 都指向它。

**⑦ Skill**（`skill/dsh-quant-mini/SKILL.md`）—— 模型可加载的工作流知识

frontmatter 两个字段（`name` + `description`）+ 两个平面（planning / tool use）。
当"工具怎么用"比"工具能不能用"更重要时，就写成 skill —— 模型用
`skill(name="dsh-quant-mini")` 加载后，按里面的链路与契约执行。

**⑧ MCP 清单**（`scripts/gen-tools-json.mjs` → `mcp/tools.json`）—— 面向外部 agent

```sh
node examples/minimal-plugin/scripts/gen-tools-json.mjs
```

它 boot 插件后从 `ctx.tools.schemas()` **运行时提取** schema，所以永远与代码一致
（手写 schema 会漂移）。产物 `mcp/tools.json` 随包发布，供 Claude/OpenAI/MCP client 静态接入。

## 怎么运行 / 验证

依赖（`@deepseek-ai/cordis`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-system-prompt`、`tsx`）
直接继承自仓库根目录的 `node_modules`，**请在仓库根目录执行**：

```sh
# 1) 构建（纯 JS，跨平台）：产出 lib/，CLI 与 gen:tools 都依赖它
node node_modules/typescript/bin/tsc -p examples/minimal-plugin/tsconfig.json

# 2) 手算基准 + 假 ctx 验证（需要 tsx 可用）
npx tsx --test examples/minimal-plugin/tests/rolling.spec.ts

# 3) 生成外部 agent 用的工具清单
node examples/minimal-plugin/scripts/gen-tools-json.mjs

# 4) 跑 CLI
node examples/minimal-plugin/cli/main.mjs rolling 1,2,3,4,5 --window 3
```

测试里用了一个**假 ctx**（只实现 `tools.register`）来捕获 `apply()` 注册的工具，
再直接调 `execute` —— **不需要启动真实 harness 就能验证插件注册与执行**。
这是学习插件时最实用的一招；而 `gen-tools-json.mjs` 正好相反，它启动**真实** cordis 来提取 schema。

## 插件被谁消费（五种方式）

| 方式 | 入口 | 面向 |
|---|---|---|
| dsh 原生 | `cordis.patch.yml` + `apply()` | dsh agent（装完即用） |
| 通用 function-calling | `ctx.tools.schemas()` 生成的 `mcp/tools.json` | Claude / OpenAI / MCP client |
| Skill 加载 | `skill/dsh-quant-mini/SKILL.md` | 需要"怎么用"指南的模型会话 |
| CLI | `cli/main.mjs`（`bin` 暴露为 `dsh-quant-mini`） | 人 / 脚本，零 harness |
| 纯函数 import | `package.json` exports → `lib/index.js` | 任意 Node 项目，零 harness |

## 下一步

- 想加第 3 个工具：在 `apply()` 里再 `ctx.tools.register(defineTool({...}))`，
  算法写进 `src/dsh-demo/`。
- 想加一个「域」：新建 `src/dsh-xxx/` 目录，放纯函数，在 `index.ts` 里 import。
- 想加外围：CLI 加一个 `case`（`cli/main.mjs`）；Skill 补一节工作流；改完工具后
  重跑 `gen:tools` 同步 `mcp/tools.json` —— 这就是 dsh-quant 的「四处一起改」纪律。
- 真实规模参考：[dsh-quant](https://github.com/pengpengyi92/dsh-quant)
  = 6 个域 × 59 个工具，架构完全同构，只是放大。
