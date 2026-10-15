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
export declare function rollingSum(values: readonly number[], window: number): (number | null)[];
/** 序列描述统计。空序列是合法结果：count=0，其余为 null。 */
export interface SeriesStats {
    count: number;
    mean: number | null;
    min: number | null;
    max: number | null;
}
export declare function seriesStats(values: readonly number[]): SeriesStats;
