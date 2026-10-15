---
name: dsh-quant-mini
description: Use when computing rolling sums or series statistics with dsh-quant-mini — shows the canonical tool chain, the equal-length null-alignment convention (no look-ahead, empty series is legal) and how to verify with hand-computed baselines.
---

# Rolling Sum & Series Stats with dsh-quant-mini

一个**最小可加载 skill**：把某类工具的正确用法写成模型可读的工作流指南。
结构 = frontmatter（`name` + `description`）+ 两个平面（planning / tool use）。

## 1. 规划（planning）：先排链路

```
planning: 准备数值序列 → 描述统计 → 滚动求和 → 下游消费
tool use: (用户给数据)  → demo_series_stats → demo_rolling_sum → 指标/回测
```

- 只有一条序列时，先 `demo_series_stats` 摸清量纲，再决定 `window`。
- 多标的：每个标的独立算，互不依赖（两个工具都 `isConcurrencySafe: true`，可并行）。

## 2. Tool use 契约（不可违反）

- **等长 null 对齐**：输出长度 === 输入长度，算不出的窗口位是 `null`。
  按索引直接对齐，模型不需要补 padding。
- **空序列／超窗是合法结果**，不是错误：`demo_series_stats([])` → `count=0` 且统计为 `null`。
- **联合类型用 `oneOf`**：`items: { oneOf: [{ type: 'number' }, { type: 'null' }] }`；
  输出对象每个字段都要 `required: true`。
- **非有限数在 registry 层被拒绝**（lossless JSON），NaN/Infinity 不可达 `execute`。

## 3. 验证金标准

- 每个纯函数都必须有**手算基准**：见 `tests/rolling.spec.ts`
  （`rollingSum([1,2,3,4,5], 3) → [null, null, 6, 9, 12]`）。
- 边界必须覆盖：空序列、`window > length`、`window = 1`、非法 `window`。
- 想验证工具"注册 + 执行"而不启动 harness：用假 ctx 捕获 `apply()` 注册的
  definition，再直接调 `execute`（同一测试文件里有示例）。

## 4. 边界

教学示例，不含真实策略；生产策略/特征库属内部。真实规模见 dsh-quant。
