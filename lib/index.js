import { defineTool } from '@deepseek-ai/dsh-tools';
import { rollingSum, seriesStats } from './dsh-demo/rolling.js';
// ── 三件套（缺一不可）──────────────────────────────────────────────
export const name = 'dsh-quant-mini';
export const inject = ['tools'];
// 复用的参数片段：数字序列
const numberArrayParam = {
    type: 'array',
    items: { type: 'number' },
    description: 'Number series, oldest first',
};
// ── 插件主体 ───────────────────────────────────────────────────────
export function apply(ctx) {
    // 工具 1：演示「等长 null 对齐」+ 联合类型 oneOf
    ctx.tools.register(defineTool({
        name: 'demo_rolling_sum',
        description: 'Sum the last `window` values at each index (rolling sum). ' +
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
            return { values: rollingSum(args.values, args.window), window: args.window };
        },
    }));
    // 工具 2：演示「对象输出 + canonical/render 分离」
    ctx.tools.register(defineTool({
        name: 'demo_series_stats',
        description: 'Compute count/mean/min/max of a number series. An empty series is legal: ' +
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
            render: (_args, value) => [{ type: 'text', text: `count=${value.count} mean=${value.mean} min=${value.min} max=${value.max}` }],
        },
        isConcurrencySafe: () => true,
        async execute(args) {
            return seriesStats(args.values);
        },
    }));
}
