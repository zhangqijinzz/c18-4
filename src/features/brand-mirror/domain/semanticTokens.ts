import {
  DEFAULT_SEMANTIC_TOKENS,
  SEMANTIC_FALLBACK,
  SEMANTIC_ROLE_LABELS,
  type BrandTokens,
  type ResolvedSemanticTokens,
  type SemanticColorRole,
  type SemanticIssue,
  type SemanticRole,
  type SemanticScaleRole,
  type SemanticTokens,
} from '../models/brandMirrorModels'

const HEX_COLOR = /^#[0-9A-F]{6}$/i
const COLOR_ROLES: SemanticColorRole[] = ['background', 'surface', 'text', 'accent']
const SCALE_ROLES: SemanticScaleRole[] = ['radius', 'fontSize']

type ResolveFailure = { ok: false; kind: SemanticIssue['kind']; message: string }
type ResolveSuccess<T> = { ok: true; value: T }
type ColorResult = ResolveSuccess<string> | ResolveFailure
type ScaleResult = ResolveSuccess<number> | ResolveFailure

function isSemanticRole(value: string): value is SemanticRole {
  return (COLOR_ROLES as string[]).includes(value) || (SCALE_ROLES as string[]).includes(value)
}

/** 解析非语义引用（基础令牌 / 裸色值 / HEX），不存在或层级越界时返回 null */
function resolveBaseColor(ref: string, tokens: BrandTokens): string | null {
  const normalized = ref.trim()
  if (normalized === 'color.primary') return tokens.primary
  if (normalized === 'color.secondary') return tokens.secondary
  if (normalized === 'white') return '#FFFFFF'
  if (normalized === 'black') return '#000000'
  if (HEX_COLOR.test(normalized)) return normalized.toUpperCase()
  return null
}

function resolveScaleIndex(prefix: 'radius' | 'spacing' | 'type', ref: string, tokens: BrandTokens): number | null {
  const match = new RegExp(`^${prefix}\\.(\\d+)$`).exec(ref.trim())
  if (!match) return null
  const index = Number(match[1]) - 1
  const scale = prefix === 'radius' ? tokens.radiusScale : prefix === 'spacing' ? tokens.spacingScale : tokens.typeScale
  return index >= 0 && index < scale.length ? scale[index] : null
}

function familyOf(ref: string): 'radius' | 'type' | 'spacing' | null {
  if (/^radius\.\d+$/.test(ref)) return 'radius'
  if (/^type\.\d+$/.test(ref)) return 'type'
  if (/^spacing\.\d+$/.test(ref)) return 'spacing'
  return null
}

function unknownIssue(key: SemanticRole, reference: string, message: string, fallback: string): SemanticIssue {
  return { key, reference, kind: 'unknown', message, fallback }
}

function cycleIssue(key: SemanticRole, reference: string, fallback: string): SemanticIssue {
  return { key, reference, kind: 'cycle', message: `语义引用在「${SEMANTIC_ROLE_LABELS[key]}」处绕成了环，已改用默认值`, fallback }
}

export interface SemanticResolution {
  resolved: ResolvedSemanticTokens
  issues: SemanticIssue[]
}

/**
 * 把语义令牌解析成可直接使用的基础值。
 * - 颜色角色可引用 color.* / white / black / HEX / 其他颜色语义角色
 * - 尺度角色可引用对应基础尺度（radius.* / type.*）或其他尺度语义角色
 * - 引用缺失、写错、家族不符或互相绕环时，记录可读问题并按默认映射 → 硬兜底逐级降级
 */
export function resolveSemanticTokens(tokens: BrandTokens, semanticInput: SemanticTokens): SemanticResolution {
  const semantic = normalizeSemanticTokens(semanticInput)
  const issues: SemanticIssue[] = []
  const cache = new Map<SemanticRole, string | number>()
  const failed = new Set<SemanticRole>()
  const visiting = new Set<SemanticRole>()

  function fallbackColor(role: SemanticColorRole): string {
    const viaDefault = resolveBaseColor(DEFAULT_SEMANTIC_TOKENS[role], tokens)
    return viaDefault ?? SEMANTIC_FALLBACK.color[role]
  }

  function fallbackScale(role: SemanticScaleRole): number {
    const family = role === 'radius' ? 'radius' : 'type'
    const viaDefault = resolveScaleIndex(family, DEFAULT_SEMANTIC_TOKENS[role], tokens)
    return viaDefault ?? (role === 'radius' ? SEMANTIC_FALLBACK.radius : SEMANTIC_FALLBACK.fontSize)
  }

  function recordIssue(role: SemanticRole, reference: string, failure: ResolveFailure, fallback: string): void {
    issues.push(failure.kind === 'cycle' ? cycleIssue(role, reference, fallback) : unknownIssue(role, reference, failure.message, fallback))
  }

  function resolveColorRole(role: SemanticColorRole): ColorResult {
    if (cache.has(role)) {
      return failed.has(role)
        ? { ok: false, kind: 'unknown', message: `「${SEMANTIC_ROLE_LABELS[role]}」的引用无法解析` }
        : { ok: true, value: cache.get(role) as string }
    }
    const reference = semantic[role]
    const fallback = fallbackColor(role)
    if (visiting.has(role)) {
      return { ok: false, kind: 'cycle', message: `语义引用在「${SEMANTIC_ROLE_LABELS[role]}」处绕成了环` }
    }
    visiting.add(role)
    let result: ColorResult
    if (reference.startsWith('semantic.')) {
      const target = reference.slice('semantic.'.length)
      if (!isSemanticRole(target) || !(COLOR_ROLES as string[]).includes(target)) {
        result = { ok: false, kind: 'unknown', message: `「${reference}」不是可引用的颜色语义角色` }
      } else {
        const child = resolveColorRole(target as SemanticColorRole)
        result = child.ok ? child : { ok: false, kind: child.kind, message: `引用的「${SEMANTIC_ROLE_LABELS[target as SemanticRole]}」无法解析：${child.message}` }
      }
    } else {
      const value = resolveBaseColor(reference, tokens)
      result = value === null
        ? { ok: false, kind: 'unknown', message: `「${reference}」不是可用的颜色引用（color.primary / color.secondary / white / black / #RRGGBB）` }
        : { ok: true, value }
    }
    visiting.delete(role)
    if (result.ok) {
      cache.set(role, result.value)
    } else {
      recordIssue(role, reference, result, fallback)
      failed.add(role)
      cache.set(role, fallback)
    }
    return result
  }

  function resolveScaleRole(role: SemanticScaleRole): ScaleResult {
    if (cache.has(role)) {
      return failed.has(role)
        ? { ok: false, kind: 'unknown', message: `「${SEMANTIC_ROLE_LABELS[role]}」的引用无法解析` }
        : { ok: true, value: cache.get(role) as number }
    }
    const reference = semantic[role]
    const expectedFamily = role === 'radius' ? 'radius' : 'type'
    const fallback = fallbackScale(role)
    if (visiting.has(role)) {
      return { ok: false, kind: 'cycle', message: `语义引用在「${SEMANTIC_ROLE_LABELS[role]}」处绕成了环` }
    }
    visiting.add(role)
    let result: ScaleResult
    if (reference.startsWith('semantic.')) {
      const target = reference.slice('semantic.'.length)
      if (!isSemanticRole(target) || !(SCALE_ROLES as string[]).includes(target)) {
        result = { ok: false, kind: 'unknown', message: `「${reference}」不是可引用的尺度语义角色` }
      } else {
        const child = resolveScaleRole(target as SemanticScaleRole)
        result = child.ok ? child : { ok: false, kind: child.kind, message: `引用的「${SEMANTIC_ROLE_LABELS[target as SemanticRole]}」无法解析：${child.message}` }
      }
    } else {
      const family = familyOf(reference)
      if (family === null) {
        result = { ok: false, kind: 'unknown', message: `「${reference}」不是可用的尺度引用（${expectedFamily}.1 …）` }
      } else if (family !== expectedFamily) {
        result = { ok: false, kind: 'unknown', message: `「${SEMANTIC_ROLE_LABELS[role]}」只能引用 ${expectedFamily}.* 尺度，「${reference}」不在同一尺度族` }
      } else {
        const value = resolveScaleIndex(expectedFamily, reference, tokens)
        result = value === null
          ? { ok: false, kind: 'unknown', message: `「${reference}」指向的层级不存在` }
          : { ok: true, value }
      }
    }
    visiting.delete(role)
    if (result.ok) {
      cache.set(role, result.value)
    } else {
      recordIssue(role, reference, result, `${fallback}px`)
      failed.add(role)
      cache.set(role, fallback)
    }
    return result
  }

  // 依次解析以填充缓存（失败会自动写兜底值并登记问题）
  COLOR_ROLES.forEach(resolveColorRole)
  SCALE_ROLES.forEach(resolveScaleRole)

  const resolved: ResolvedSemanticTokens = {
    background: cache.get('background') as string,
    surface: cache.get('surface') as string,
    text: cache.get('text') as string,
    accent: cache.get('accent') as string,
    radius: cache.get('radius') as number,
    fontSize: cache.get('fontSize') as number,
  }
  return { resolved, issues }
}

/** 容错地把任意输入收敛为完整的语义令牌记录：缺失 / 类型错误的键保留场景由默认值补上 */
export function normalizeSemanticTokens(input: unknown): SemanticTokens {
  const source = (input ?? {}) as Partial<Record<SemanticRole, unknown>>
  const read = (role: SemanticRole): string => {
    const value = source[role]
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : DEFAULT_SEMANTIC_TOKENS[role]
  }
  return {
    background: read('background'),
    surface: read('surface'),
    text: read('text'),
    accent: read('accent'),
    radius: read('radius'),
    fontSize: read('fontSize'),
  }
}

export function cloneSemanticTokens(semantic: SemanticTokens): SemanticTokens {
  return { ...semantic }
}

/** 问题摘要，供界面以一句话提示当前语义层状态 */
export function summarizeSemanticIssues(issues: SemanticIssue[]): string {
  if (issues.length === 0) return ''
  const cycleCount = issues.filter((issue) => issue.kind === 'cycle').length
  if (cycleCount === issues.length) return `检测到 ${cycleCount} 处语义引用成环，已全部按默认值兜底`
  if (cycleCount > 0) return `检测到 ${issues.length} 处语义引用问题（${cycleCount} 处成环），已按可用默认值兜底`
  return `检测到 ${issues.length} 处语义引用无效，已按可用默认值兜底`
}
