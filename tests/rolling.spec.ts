/**
 * 测试层 —— 学习插件最关键的一步：怎么证明你的插件是对的。
 *
 * 两种测法：
 *  A. 领域层纯函数：手算基准（不依赖 harness，离线可跑）
 *  B. 插件外壳：用一个「假 ctx」捕获 apply() 注册的工具，再直接调它的
 *     execute —— 不需要真正启动 harness 就能验证注册与执行。
 *
 * 运行（在仓库根目录，复用已有的 tsx）：
 *   npx tsx --test examples/minimal-plugin/tests/rolling.spec.ts
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'
import { rollingSum, seriesStats } from '../src/dsh-demo/rolling.ts'

// ── A. 纯函数手算基准 ─────────────────────────────────────────────
test('rollingSum: 已知答案（等长 + 头部 null）', () => {
  // 窗口 3：[1,2,3]现和=6，[2,3,4]=9，[3,4,5]=12
  assert.deepEqual(rollingSum([1, 2, 3, 4, 5], 3), [null, null, 6, 9, 12])
})

test('rollingSum: 边界（空序列/超窗都是合法结果）', () => {
  assert.deepEqual(rollingSum([], 3), [])            // 空 → 空
  assert.deepEqual(rollingSum([1, 2], 3), [null, null]) // window > len → 全 null
  assert.deepEqual(rollingSum([4], 1), [4])          // window=1 → 原序列
})

test('rollingSum: window 非法抛错', () => {
  assert.throws(() => rollingSum([1, 2, 3], 0), /positive integer/)
  assert.throws(() => rollingSum([1, 2, 3], 2.5), /positive integer/)
})

test('seriesStats: 手算 + 空序列合法', () => {
  assert.deepEqual(seriesStats([1, 2, 3, 4]), { count: 4, mean: 2.5, min: 1, max: 4 })
  assert.deepEqual(seriesStats([]), { count: 0, mean: null, min: null, max: null })
})

// ── B. 插件外壳：假 ctx 验证 apply() ──────────────────────────────
/** 极简假 ctx：只需实现 apply() 会用到的那一个方法。 */
function fakeCtx() {
  const registered: Array<{ name: string; execute: (a: unknown, e: unknown) => Promise<unknown>; output: { render: (a: unknown, v: unknown) => Array<{ type: string; text: string }> } }> = []
  const ctx = {
    tools: {
      // 真实实现同样返回 disposer（可逆注册）；这里返回一个空函数
      register: (def: (typeof registered)[number]) => {
        registered.push(def)
        return () => { const i = registered.indexOf(def); if (i >= 0) registered.splice(i, 1) }
      },
    },
  } as unknown as Context
  return { ctx, registered }
}

test('apply(): 注册了 2 个工具，名字正确', () => {
  const { ctx, registered } = fakeCtx()
  apply(ctx)
  assert.equal(registered.length, 2)
  assert.deepEqual(registered.map(t => t.name), ['demo_rolling_sum', 'demo_series_stats'])
})

test('apply(): 注册出来的工具能执行，且 render 与 canonical value 分离', async () => {
  const { ctx, registered } = fakeCtx()
  apply(ctx)
  const tool = registered.find(t => t.name === 'demo_rolling_sum')!

  const value = await tool.execute({ values: [1, 2, 3, 4, 5], window: 3 }, {})
  assert.deepEqual(value, { values: [null, null, 6, 9, 12], window: 3 })

  // 同一个 value，render 走的是另一条「给人读」的通道
  const blocks = tool.output.render({ values: [1, 2, 3, 4, 5], window: 3 }, value)
  assert.equal(blocks[0]!.text, '[null,null,6,9,12]')
})
