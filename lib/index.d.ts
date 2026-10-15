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
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "dsh-quant-mini";
export declare const inject: readonly ["tools"];
export declare function apply(ctx: Context): void;
