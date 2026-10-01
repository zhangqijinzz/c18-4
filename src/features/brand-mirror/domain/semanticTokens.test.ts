import { describe, expect, it } from 'vitest'
import { normalizeSemanticTokens, resolveSemanticTokens, summarizeSemanticIssues } from './semanticTokens'
import { DEFAULT_SEMANTIC_TOKENS, INITIAL_TOKENS, type SemanticTokens } from '../models/brandMirrorModels'

const tokens = { ...INITIAL_TOKENS }

describe('resolveSemanticTokens', () => {
  it('resolves the default mapping to concrete base values', () => {
    const { resolved, issues } = resolveSemanticTokens(tokens, DEFAULT_SEMANTIC_TOKENS)
    expect(resolved).toEqual({
      background: '#FFFFFF',
      surface: '#FFFFFF',
      text: '#24324A',
      accent: '#F15A47',
      radius: 12,
      fontSize: 16,
    })
    expect(issues).toEqual([])
  })

  it('follows semantic-to-semantic references through the chain', () => {
    const semantic: SemanticTokens = {
      ...DEFAULT_SEMANTIC_TOKENS,
      surface: 'semantic.background',
      text: 'semantic.accent',
      background: 'black',
      accent: 'color.secondary',
    }
    const { resolved, issues } = resolveSemanticTokens(tokens, semantic)
    expect(resolved.surface).toBe('#000000')
    expect(resolved.text).toBe('#24324A')
    expect(issues).toEqual([])
  })

  it('accepts raw HEX values as references', () => {
    const { resolved, issues } = resolveSemanticTokens(tokens, { ...DEFAULT_SEMANTIC_TOKENS, accent: '#36AE7B' })
    expect(resolved.accent).toBe('#36AE7B')
    expect(issues).toEqual([])
  })

  it('reports an unknown reference and falls back to the default mapping', () => {
    const { resolved, issues } = resolveSemanticTokens(tokens, { ...DEFAULT_SEMANTIC_TOKENS, accent: 'color.brand' })
    expect(issues).toHaveLength(1)
    expect(issues[0].key).toBe('accent')
    expect(issues[0].kind).toBe('unknown')
    expect(issues[0].message).toContain('color.brand')
    expect(resolved.accent).toBe(INITIAL_TOKENS.primary)
    expect(issues[0].fallback).toBe(INITIAL_TOKENS.primary)
  })

  it('reports an out-of-range scale level and falls back to the default level', () => {
    const { resolved, issues } = resolveSemanticTokens(tokens, { ...DEFAULT_SEMANTIC_TOKENS, radius: 'radius.9' })
    expect(issues[0].kind).toBe('unknown')
    expect(issues[0].message).toContain('层级不存在')
    expect(resolved.radius).toBe(12)
  })

  it('rejects scale family mismatches such as type.* for the radius role', () => {
    const { resolved, issues } = resolveSemanticTokens(tokens, { ...DEFAULT_SEMANTIC_TOKENS, radius: 'type.2' })
    expect(issues[0].message).toContain('同一尺度族')
    expect(resolved.radius).toBe(12)
  })

  it('detects direct and indirect reference cycles and falls back per role', () => {
    const cyclic: SemanticTokens = {
      background: 'semantic.surface',
      surface: 'semantic.text',
      text: 'semantic.background',
      accent: 'semantic.accent',
      radius: 'semantic.radius',
      fontSize: 'type.1',
    }
    const { resolved, issues } = resolveSemanticTokens(tokens, cyclic)
    const kinds = issues.map((issue) => issue.kind)
    expect(kinds.filter((kind) => kind === 'cycle').length).toBeGreaterThanOrEqual(4)
    expect(issues.every((issue) => issue.message.length > 0)).toBe(true)
    // 未参与成环的角色仍正常解析
    expect(resolved.fontSize).toBe(12)
    // 成环角色全部落到可用默认值
    expect(resolved.background).toBe('#FFFFFF')
    expect(resolved.accent).toBe(INITIAL_TOKENS.primary)
    expect(resolved.radius).toBe(12)
  })

  it('marks a semantic alias invalid when its target is itself broken', () => {
    const semantic: SemanticTokens = { ...DEFAULT_SEMANTIC_TOKENS, surface: 'semantic.accent', accent: 'color.missing' }
    const { resolved, issues } = resolveSemanticTokens(tokens, semantic)
    expect(issues.map((issue) => issue.key).sort()).toEqual(['accent', 'surface'])
    // accent 兜底到自己的默认值（主色），surface 兜底到自己的默认值（白）
    expect(resolved.accent).toBe(INITIAL_TOKENS.primary)
    expect(resolved.surface).toBe('#FFFFFF')
  })

  it('summarizes issues for the status message', () => {
    const { issues } = resolveSemanticTokens(tokens, { ...DEFAULT_SEMANTIC_TOKENS, accent: 'nope', radius: 'radius.x' })
    expect(summarizeSemanticIssues(issues)).toContain('2 处')
  })

  it('normalizes missing or malformed semantic token documents back to defaults', () => {
    expect(normalizeSemanticTokens(undefined)).toEqual(DEFAULT_SEMANTIC_TOKENS)
    expect(normalizeSemanticTokens({ accent: 42 })).toEqual(DEFAULT_SEMANTIC_TOKENS)
    expect(normalizeSemanticTokens({ accent: ' black ' }).accent).toBe('black')
  })
})
