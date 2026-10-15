#!/usr/bin/env node
/**
 * dsh-quant-mini CLI —— 最小命令行界面（零依赖：纯 Node + ANSI 转义）。
 *
 * 学习点：CLI 是"绕过 harness 的第二条消费路径"。
 *   - 它不启动 cordis / 不注册工具，而是直接 import `../lib/**.js`（构建产物）
 *     里的纯函数来跑 —— 这正是 dsh-quant 的 cli/main.mjs 的做法。
 *   - 也解释了为什么 `lib/` 必须存在：package.json 的 main/exports 与 cli 都指向它。
 *
 * 用法：
 *   dsh-quant-mini tools                                   列出插件注册的工具
 *   dsh-quant-mini rolling 1,2,3,4,5 --window 3            滚动求和（--json 输出原始值）
 *   dsh-quant-mini stats 1,2,3,4,5                         序列统计
 *   dsh-quant-mini version
 *
 * 运行前需先构建：node node_modules/typescript/bin/tsc -p tsconfig.json
 */
import { rollingSum, seriesStats } from '../lib/dsh-demo/rolling.js'

// ── ANSI helpers（与 dsh-quant/cli/main.mjs 同风格）────────────────
const A = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m', magenta: '\x1b[35m',
}
const paint = (color, text) => `${A[color]}${text}${A.reset}`

// ── 工具清单（静态表；真实插件由 ctx.tools.schemas() 运行时提取）────
const TOOLS = [
  { name: 'demo_rolling_sum', domain: 'demo', desc: '滚动求和（等长 null 对齐 + oneOf）' },
  { name: 'demo_series_stats', domain: 'demo', desc: '序列描述统计（空序列是合法结果）' },
]

// ── 参数解析：CSV 数值 ────────────────────────────────────────────
function parseCsv(raw) {
  if (!raw) return null
  const values = []
  for (const token of raw.split(',')) {
    const t = token.trim()
    const n = Number(t)
    if (t === '' || !Number.isFinite(n)) return null // 本示例只接受有限数字
    values.push(n)
  }
  return values
}

function flagValue(argv, flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

// ── 命令实现 ─────────────────────────────────────────────────────
function cmdTools() {
  console.log('')
  console.log(`${paint('bold', paint('cyan', 'dsh-quant-mini'))} ${paint('dim', '— 工具仓库')}`)
  console.log(paint('dim', `${TOOLS.length} tools · 1 domain · 教学最小示例`))
  console.log('')
  for (const tool of TOOLS) {
    console.log(` ${paint('cyan', tool.name.padEnd(22))} ${paint('dim', tool.desc)}`)
  }
  console.log('')
}

function cmdRolling(argv) {
  const values = parseCsv(argv.find((a) => !a.startsWith('--')))
  const window = Number(flagValue(argv, '--window') ?? 3)
  if (values === null || values.length === 0) {
    console.error(paint('red', '用法: dsh-quant-mini rolling <csv数值> [--window 3] [--json]'))
    process.exit(1)
  }
  const out = rollingSum(values, window)
  if (argv.includes('--json')) {
    console.log(JSON.stringify(out))
    return
  }
  console.log('')
  console.log(`${paint('bold', paint('cyan', `rolling sum`))} ${paint('dim', `· window=${window} · 等长 null 对齐`)}`)
  console.log(`  in   ${values.join(', ')}`)
  console.log(`  out  ${out.map((v) => (v === null ? paint('dim', 'null') : v)).join(', ')}`)
  console.log('')
}

function cmdStats(argv) {
  const values = parseCsv(argv.find((a) => !a.startsWith('--')))
  if (values === null) {
    console.error(paint('red', '用法: dsh-quant-mini stats <csv数值>'))
    process.exit(1)
  }
  const s = seriesStats(values)
  console.log('')
  console.log(`${paint('bold', paint('cyan', 'series stats'))}`)
  console.log(`  count  ${s.count}`)
  console.log(`  mean   ${s.mean === null ? paint('dim', 'null') : s.mean}`)
  console.log(`  min    ${s.min === null ? paint('dim', 'null') : s.min}`)
  console.log(`  max    ${s.max === null ? paint('dim', 'null') : s.max}`)
  console.log('')
}

function usage() {
  console.log(`${paint('bold', paint('cyan', 'dsh-quant-mini CLI'))} ${paint('dim', '— 最小量化终端（零依赖）')}`)
  console.log('')
  console.log(`  ${paint('cyan', 'tools')}                        ${paint('dim', '列出插件注册的工具')}`)
  console.log(`  ${paint('cyan', 'rolling <csv> [--window N]')}  ${paint('dim', '滚动求和')}`)
  console.log(`  ${paint('cyan', 'stats <csv>')}                 ${paint('dim', '序列统计')}`)
  console.log(`  ${paint('cyan', 'version')}                     ${paint('dim', '版本')}`)
  console.log('')
  console.log(paint('dim', ' 示例: dsh-quant-mini rolling 1,2,3,4,5 --window 3'))
  console.log('')
}

// ── 入口 ─────────────────────────────────────────────────────────
const [, , command, ...rest] = process.argv

function main() {
  switch (command) {
    case 'tools': return cmdTools()
    case 'rolling': return cmdRolling(rest)
    case 'stats': return cmdStats(rest)
    case 'version':
    case '--version': return console.log('dsh-quant-mini CLI 0.1.0')
    default: return usage()
  }
}

try {
  main()
} catch (err) {
  console.error(paint('red', `✗ ${err.message}`))
  process.exit(1)
}
