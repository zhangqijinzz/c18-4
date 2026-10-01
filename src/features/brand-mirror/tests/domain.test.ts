import { describe, expect, it } from 'vitest'
import { clampTokenValues, contrastRatio, readableTextColor, validateTokens } from '../domain/brandRules'
import { normalizeSemanticTokens, resolveSemanticTokens } from '../domain/semanticTokenRules'
import { DEFAULT_SEMANTIC_TOKENS, INITIAL_TOKENS } from '../models/brandMirrorModels'
import type { SemanticTokenMap } from '../models/brandMirrorModels'

describe('brand token rules', () => {
  it('calculates a readable contrast ratio', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1)
    expect(contrastRatio('#F15A47', '#24324A')).toBeGreaterThan(3)
  })

  it('clamps extreme values to the supported design scale', () => {
    const clamped = clampTokenValues({ ...INITIAL_TOKENS, typeScale: [1, 80, 14, 20, 28, 40], radiusScale: [-4, 12, 18, 50], spacingScale: [0, 8, 12, 20, 99] })
    expect(clamped.typeScale).toEqual([10, 72, 14, 20, 28, 40])
    expect(clamped.radiusScale).toEqual([0, 12, 18, 40])
    expect(clamped.spacingScale).toEqual([2, 8, 12, 20, 64])
  })

  it('rejects invalid colors and unsupported scale lengths', () => {
    expect(validateTokens({ ...INITIAL_TOKENS, primary: 'red' })).toContain('HEX')
    expect(validateTokens({ ...INITIAL_TOKENS, typeScale: [12] })).toContain('数量')
  })

  it('selects readable text colors for accent backgrounds', () => {
    expect(readableTextColor('#FFFFFF')).toBe('#20252C')
    expect(readableTextColor('#191829')).toBe('#FFFFFF')
  })
})

describe('semantic token resolution', () => {
  it('resolves semantic references to concrete base token values', () => {
    const resolved = resolveSemanticTokens(INITIAL_TOKENS, DEFAULT_SEMANTIC_TOKENS)
    expect(resolved.issues).toEqual([])
    expect(resolved.values.accent).toBe(INITIAL_TOKENS.primary)
    expect(resolved.values.accentStrong).toBe(INITIAL_TOKENS.secondary)
  })

  it('normalizes incomplete stored semantic tokens with defaults', () => {
    const normalized = normalizeSemanticTokens({ accent: 'accentStrong', unknown: 'x' })
    expect(normalized.accent).toBe('accentStrong')
    expect(normalized.background).toBe(DEFAULT_SEMANTIC_TOKENS.background)
  })

  it('reports a missing reference and falls back to a usable value', () => {
    const semanticTokens: SemanticTokenMap = { ...DEFAULT_SEMANTIC_TOKENS, background: 'base.color.not-there' }
    const resolved = resolveSemanticTokens(INITIAL_TOKENS, semanticTokens)
    expect(resolved.issues[0].message).toContain('不存在')
    expect(resolved.values.background).toBe('#F5F6F8')
  })

  it('reports malformed references with clear text and keeps editing usable', () => {
    const semanticTokens: SemanticTokenMap = { ...DEFAULT_SEMANTIC_TOKENS, accent: 'base.colur.primary' }
    const resolved = resolveSemanticTokens(INITIAL_TOKENS, semanticTokens)
    expect(resolved.issues[0].message).toContain('名称不正确')
    expect(resolved.values.accent).toBe(INITIAL_TOKENS.primary)
  })

  it('detects semantic aliases that form a cycle', () => {
    const semanticTokens: SemanticTokenMap = { ...DEFAULT_SEMANTIC_TOKENS, background: 'surface', surface: 'background' }
    const resolved = resolveSemanticTokens(INITIAL_TOKENS, semanticTokens)
    expect(resolved.issues.some((issue) => issue.code === 'circular' && issue.message.includes('循环'))).toBe(true)
    expect(resolved.values.background).toBe('#F5F6F8')
    expect(resolved.values.surface).toBe('#FFFFFF')
  })
})
