/**
 * 插件入口（外壳层）—— 一个 dsh 插件只有三个必填导出：
 *
 *   export const name   插件唯一名字（对应 cordis.patch.yml 里的 name）
 *   export const inject 依赖的 harness 服务；'tools' 表示需要工具注册表
 *   export function apply(ctx)  插件主体：在这里把工具注册进 ctx.tools
 *
 * 工具定义用 defineTool：一套 schema DSL，一次声明
 *   - parameters：给模型的入参 schema（含 required）
 *   - output.schema：canonical JSON（机器读，每个字段要 required: true）
 *   - output.render：给人读的投影 —— 这就是「canonical JSON + render 分离」
 *   - isConcurrencySafe：纯函数填 true，模型才能并行调用
 *
 * 注册是可逆的：ctx.tools.register() 返回 disposer，fiber 释放即自动注销，
 * 所以插件可热插拔、不污染 harness 全局状态。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { rollingSum, seriesStats } from './dsh-demo/rolling.js'

// ── 三件套（缺一不可）──────────────────────────────────────────────
export const name = 'dsh-quant-mini'
export const inject = ['tools'] as const

// 复用的参数片段：数字序列
const numberArrayParam = {
  type: 'array' as const,
  items: { type: 'number' as const },
  description: 'Number series, oldest first',
}

// ── 插件主体 ───────────────────────────────────────────────────────
export function apply(ctx: Context) {
  // 工具 1：演示「等长 null 对齐」+ 联合类型 oneOf
  ctx.tools.register(defineTool({
    name: 'demo_rolling_sum',
    description:
      'Sum the last `window` values at each index (rolling sum). ' +
      'Output length equals input length; the first window-1 positions are null. ' +
      'An empty series is a legal result, not an error.',
    parameters: {
      values: { ...numberArrayParam, required: true },
      window: { type: 'integer', required: true, description: 'Window size (>= 1)' },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          // oneOf 表达「数字或 null」的联合类型
          values: {
            type: 'array',
            items: { oneOf: [{ type: 'number' }, { type: 'null' }] },
            required: true,
          },
          window: { type: 'integer', required: true },
        },
        additionalProperties: false,
      },
      // render 与 schema 分离：机器拿结构，人看文本
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value.values) }],
    },
    isConcurrencySafe: () => true, // 纯函数、无共享状态 → 可并行
    async execute(args) {
      return { values: rollingSum(args.values, args.window), window: args.window }
    },
  }))

  // 工具 2：演示「对象输出 + canonical/render 分离」
  ctx.tools.register(defineTool({
    name: 'demo_series_stats',
    description:
      'Compute count/mean/min/max of a number series. An empty series is legal: ' +
      'count=0 and the statistics are null.',
    parameters: {
      values: { ...numberArrayParam, required: true },
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          count: { type: 'integer', required: true },
          mean: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
          min: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
          max: { oneOf: [{ type: 'number' }, { type: 'null' }], required: true },
        },
        additionalProperties: false,
      },
      // 同一个 value，这里渲染成人读的一行文本
      render: (_args, value) =>
        [{ type: 'text', text: `count=${value.count} mean=${value.mean} min=${value.min} max=${value.max}` }],
    },
    isConcurrencySafe: () => true,
    async execute(args) {
      return seriesStats(args.values)
    },
  }))
}
