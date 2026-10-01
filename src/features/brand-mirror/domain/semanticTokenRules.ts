import type { BrandTokens, SemanticTokenIssue, SemanticTokenMap, SemanticTokenRole } from '../models/brandMirrorModels'
import { DEFAULT_SEMANTIC_TOKENS, SEMANTIC_TOKEN_ROLES } from '../models/brandMirrorModels'

export interface BaseTokenReference {
  key: string
  label: string
  value: string
  editable: boolean
}

type Reference =
  | { kind: 'base'; key: string }
  | { kind: 'semantic'; role: SemanticTokenRole }

const FIXED_BASE_COLORS: Record<string, { label: string; value: string }> = {
  canvas: { label: '页面底色', value: '#F5F6F8' },
  surface: { label: '白色表面', value: '#FFFFFF' },
  ink: { label: '深色正文', value: '#20252C' },
  muted: { label: '中性辅助', value: '#8B929D' },
  border: { label: '中性边框', value: '#E1E4E8' },
  editorialCanvas: { label: 'Editorial 底色', value: '#F4F7F3' },
  editorialInk: { label: 'Editorial 正文', value: '#173C35' },
  editorialMuted: { label: 'Editorial 辅助', value: '#63746E' },
  editorialBorder: { label: 'Editorial 边框', value: '#DCE5DD' },
  nightCanvas: { label: 'Night 底色', value: '#12131F' },
  nightSurface: { label: 'Night 表面', value: '#1D1C2F' },
  nightInk: { label: 'Night 正文', value: '#F3F0FF' },
  nightMuted: { label: 'Night 辅助', value: '#A49FC0' },
  nightBorder: { label: 'Night 边框', value: '#34314B' },
  purpleStrong: { label: '夜间深紫强调', value: '#6F56C8' },
}

const roleLabels = new Map(SEMANTIC_TOKEN_ROLES.map((role) => [role.id, role.label]))

export function cloneSemanticTokens(tokens: SemanticTokenMap): SemanticTokenMap {
  return { ...tokens }
}

export function semanticTokenLabel(role: SemanticTokenRole): string {
  return roleLabels.get(role) ?? role
}

export function isSemanticTokenRole(value: string): value is SemanticTokenRole {
  return SEMANTIC_TOKEN_ROLES.some((role) => role.id === value)
}

export function baseTokenReferences(tokens: BrandTokens): BaseTokenReference[] {
  return [
    { key: 'base.color.primary', label: '主色', value: tokens.primary, editable: true },
    { key: 'base.color.secondary', label: '辅助色', value: tokens.secondary, editable: true },
    ...Object.entries(FIXED_BASE_COLORS).map(([name, item]) => ({ key: `base.color.${name}`, label: item.label, value: item.value, editable: false })),
  ]
}

export function getBaseTokenValue(key: string, tokens: BrandTokens): string | null {
  if (key === 'base.color.primary') return tokens.primary
  if (key === 'base.color.secondary') return tokens.secondary
  const name = key.startsWith('base.color.') ? key.slice('base.color.'.length) : ''
  return FIXED_BASE_COLORS[name]?.value ?? null
}

export function normalizeSemanticTokens(input: unknown): SemanticTokenMap {
  const source = input && typeof input === 'object' ? input as Partial<Record<SemanticTokenRole, unknown>> : {}
  return SEMANTIC_TOKEN_ROLES.reduce((result, { id }) => {
    const value = source[id]
    result[id] = typeof value === 'string' ? value.trim() : DEFAULT_SEMANTIC_TOKENS[id]
    return result
  }, {} as SemanticTokenMap)
}

export function resolveSemanticTokens(tokens: BrandTokens, semanticTokens: SemanticTokenMap): { values: SemanticTokenMap; issues: SemanticTokenIssue[] } {
  const issues: SemanticTokenIssue[] = []

  function fallback(role: SemanticTokenRole): string {
    if (role === 'accent') return tokens.primary
    if (role === 'accentStrong') return tokens.secondary
    return getBaseTokenValue(DEFAULT_SEMANTIC_TOKENS[role], tokens) ?? tokens.primary
  }

  function addIssue(issue: SemanticTokenIssue): void {
    const signature = `${issue.role}-${issue.code}-${issue.reference}-${issue.path?.join('>') ?? ''}`
    if (!issues.some((item) => `${item.role}-${item.code}-${item.reference}-${item.path?.join('>') ?? ''}` === signature)) {
      issues.push(issue)
    }
  }

  function parseReference(reference: string): Reference | null {
    const value = reference.trim()
    if (isSemanticTokenRole(value)) return { kind: 'semantic', role: value }
    if (value.startsWith('semantic.')) {
      const role = value.slice('semantic.'.length)
      return isSemanticTokenRole(role) ? { kind: 'semantic', role } : null
    }
    if (value.startsWith('base.color.')) return { kind: 'base', key: value }
    return null
  }

  function resolveRole(role: SemanticTokenRole, stack: SemanticTokenRole[], rootReference: string, rootRole: SemanticTokenRole): string | null {
    const existingCycle = stack.indexOf(role)
    if (existingCycle >= 0) {
      const path = [...stack, role]
      addIssue({
        role: rootRole,
        code: 'circular',
        reference: rootReference,
        path,
        message: `语义引用形成循环：${path.map(semanticTokenLabel).join(' → ')}，已使用${semanticTokenLabel(rootRole)}的默认值`,
      })
      return null
    }

    const reference = semanticTokens[role] ?? DEFAULT_SEMANTIC_TOKENS[role]
    if (!reference.trim()) {
      addIssue({ role, code: 'missing', reference, message: `${semanticTokenLabel(role)}的引用不能为空，已使用可用默认值` })
      return fallback(role)
    }

    const parsed = parseReference(reference)
    if (!parsed) {
      addIssue({ role, code: 'invalid-role', reference, message: `引用「${reference}」不存在或名称不正确，已使用${semanticTokenLabel(role)}的默认值` })
      return fallback(role)
    }

    if (parsed.kind === 'base') {
      const value = getBaseTokenValue(parsed.key, tokens)
      if (!value) {
        addIssue({ role, code: 'missing', reference, message: `基础引用「${reference}」不存在，已使用${semanticTokenLabel(role)}的默认值` })
        return fallback(role)
      }
      return value
    }

    const value = resolveRole(parsed.role, [...stack, role], stack.length === 0 ? reference : rootReference, stack.length === 0 ? role : rootRole)
    return value ?? (stack.length === 0 ? fallback(role) : null)
  }

  const values = SEMANTIC_TOKEN_ROLES.reduce((result, { id }) => {
    result[id] = resolveRole(id, [], semanticTokens[id] ?? DEFAULT_SEMANTIC_TOKENS[id], id) ?? fallback(id)
    return result
  }, {} as SemanticTokenMap)

  return { values, issues }
}
