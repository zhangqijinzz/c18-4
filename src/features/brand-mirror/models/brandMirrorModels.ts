export type BrandTheme = 'studio' | 'editorial' | 'night'
export type MirrorStatus = 'loading' | 'ready' | 'editing' | 'error'

export type SemanticTokenRole =
  | 'background'
  | 'surface'
  | 'text'
  | 'textMuted'
  | 'border'
  | 'accent'
  | 'accentStrong'

export type SemanticTokenMap = Record<SemanticTokenRole, string>

export type SemanticTokenIssueCode = 'missing' | 'circular' | 'invalid-role'

export interface SemanticTokenIssue {
  role: SemanticTokenRole
  code: SemanticTokenIssueCode
  reference: string
  path?: SemanticTokenRole[]
  message: string
}

export interface BrandTokens {
  primary: string
  secondary: string
  radiusScale: number[]
  spacingScale: number[]
  typeScale: number[]
}

export interface SavedVersion {
  id: string
  label: string
  tokens: BrandTokens
  semanticTokens: SemanticTokenMap
  createdAt: string
}

export interface BrandDocument {
  version: 1
  tokens: BrandTokens
  semanticTokens: SemanticTokenMap
  theme: BrandTheme
  versions: SavedVersion[]
}

export interface BrandMirrorSnapshot {
  status: MirrorStatus
  tokens: BrandTokens
  semanticTokens: SemanticTokenMap
  resolvedSemanticTokens: SemanticTokenMap
  semanticIssues: SemanticTokenIssue[]
  theme: BrandTheme
  versions: SavedVersion[]
  compareMode: boolean
  activeVersionId: string | null
  contrastRatio: number
  contrastWarning: boolean
  message: string
}

export const INITIAL_TOKENS: BrandTokens = {
  primary: '#F15A47',
  secondary: '#24324A',
  radiusScale: [8, 12, 18, 28],
  spacingScale: [4, 8, 12, 20, 32],
  typeScale: [12, 14, 16, 20, 28, 40],
}

export const SEMANTIC_TOKEN_ROLES: { id: SemanticTokenRole; label: string; description: string }[] = [
  { id: 'background', label: '背景', description: '页面底色' },
  { id: 'surface', label: '表面', description: '卡片与组件底色' },
  { id: 'text', label: '正文', description: '主要文字与图标' },
  { id: 'textMuted', label: '次要正文', description: '说明与辅助信息' },
  { id: 'border', label: '边框', description: '分割线与描边' },
  { id: 'accent', label: '强调', description: '主操作与高亮' },
  { id: 'accentStrong', label: '强强调', description: '深色重点与高对比操作' },
]

export const DEFAULT_SEMANTIC_TOKENS: SemanticTokenMap = {
  background: 'base.color.canvas',
  surface: 'base.color.surface',
  text: 'base.color.ink',
  textMuted: 'base.color.muted',
  border: 'base.color.border',
  accent: 'base.color.primary',
  accentStrong: 'base.color.secondary',
}

export const THEME_PRESETS: Record<BrandTheme, { label: string; tokens: BrandTokens; semanticTokens: SemanticTokenMap }> = {
  studio: {
    label: 'Studio warm',
    tokens: INITIAL_TOKENS,
    semanticTokens: DEFAULT_SEMANTIC_TOKENS,
  },
  editorial: {
    label: 'Editorial green',
    tokens: {
      primary: '#238B73', secondary: '#173C35', radiusScale: [4, 8, 12, 18], spacingScale: [4, 8, 16, 24, 40], typeScale: [12, 14, 16, 22, 30, 44],
    },
    semanticTokens: {
      background: 'base.color.editorialCanvas',
      surface: 'base.color.surface',
      text: 'base.color.editorialInk',
      textMuted: 'base.color.editorialMuted',
      border: 'base.color.editorialBorder',
      accent: 'base.color.primary',
      accentStrong: 'base.color.secondary',
    },
  },
  night: {
    label: 'Night signal',
    tokens: {
      primary: '#A98BFF', secondary: '#191829', radiusScale: [6, 10, 14, 22], spacingScale: [4, 8, 12, 18, 28], typeScale: [12, 14, 16, 20, 28, 38],
    },
    semanticTokens: {
      background: 'base.color.nightCanvas',
      surface: 'base.color.nightSurface',
      text: 'base.color.nightInk',
      textMuted: 'base.color.nightMuted',
      border: 'base.color.nightBorder',
      accent: 'base.color.primary',
      accentStrong: 'base.color.purpleStrong',
    },
  },
}
