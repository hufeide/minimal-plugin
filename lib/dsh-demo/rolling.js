/**
 * 领域层（纯函数）—— 插件里真正干活的代码都在这一层。
 *
 * 这一层遵守 dsh-quant 的三条契约：
 *  1. 等长 null 对齐：输出长度 === 输入长度，算不出的窗口位是 null；
 *     空序列是合法结果（返回 [] 或 count=0），不是错误。
 *  2. 无未来函数：只用当前及之前的数据，不读未来。
 *  3. 零依赖：不 import 任何 harness / 网络 / 第三方包，可离线跑单测。
 *
 * 为什么单独放一层？因为工具层（src/index.ts）只做「参数校验 + 调这里 +
 * 组装输出」的薄包装；算法在这里，才能被独立测试、独立复用。
 */
/**
 * 滚动求和：每个位置返回「最近 window 个值之和」。
 * 头部 window-1 个位置算不出，返回 null（等长对齐）。
 */
export function rollingSum(values, window) {
    if (!Number.isInteger(window) || window < 1) {
        throw new Error('window must be a positive integer');
    }
    const out = [];
    for (let i = 0; i < values.length; i++) {
        if (i + 1 < window) {
            out.push(null); // 窗口还没满 → null，而不是丢数据
            continue;
        }
        let sum = 0;
        for (let j = i - window + 1; j <= i; j++)
            sum += values[j];
        out.push(sum);
    }
    return out;
}
export function seriesStats(values) {
    if (values.length === 0) {
        return { count: 0, mean: null, min: null, max: null };
    }
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    for (const v of values) {
        sum += v;
        if (v < min)
            min = v;
        if (v > max)
            max = v;
    }
    return { count: values.length, mean: sum / values.length, min, max };
}
