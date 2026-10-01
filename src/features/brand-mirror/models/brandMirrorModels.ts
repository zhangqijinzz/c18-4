export type BrandTheme = 'studio' | 'editorial' | 'night'
export type MirrorStatus = 'loading' | 'ready' | 'editing' | 'error'

/** 语义令牌角色：界面通过这些角色消费令牌，而不是直接记住基础值 */
export type SemanticColorRole = 'background' | 'surface' | 'text' | 'accent'
export type SemanticScaleRole = 'radius' | 'fontSize'
export type SemanticRole = SemanticColorRole | SemanticScaleRole

/**
 * 语义令牌 = 角色 → 引用。
 * 引用可以指向基础令牌（color.primary / radius.2 / type.3 …），
 * 颜色角色还可以指向其他语义角色（semantic.background …），因此可能成环。
 * 引用是否合法由 resolveSemanticTokens 解析时判定。
 */
export interface SemanticTokens {
  /** 页面背景 */
  background: string
  /** 卡片 / 组件表面 */
  surface: string
  /** 正文文字 */
  text: string
  /** 强调 / 主行动 */
  accent: string
  /** 表面圆角，期望解析为 radius 尺度中的一档 */
  radius: string
  /** 正文字号，期望解析为 type 尺度中的一档 */
  fontSize: string
}

/** 语义引用解析问题，key 为语义角色（background/surface/...） */
export interface SemanticIssue {
  key: SemanticRole
  /** 原始引用（可能写错、指向缺失值或参与成环） */
  reference: string
  kind: 'unknown' | 'cycle'
  /** 清楚的中文提示 */
  message: string
  /** 已套用的兜底值（可直接使用） */
  fallback: string
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
  semanticTokens: SemanticTokens
  createdAt: string
}

export interface BrandDocument {
  version: 1
  tokens: BrandTokens
  semanticTokens: SemanticTokens
  theme: BrandTheme
  versions: SavedVersion[]
}

/** 语义令牌解析后的结果，预览与导出统一消费这一层 */
export interface ResolvedSemanticTokens {
  background: string
  surface: string
  text: string
  accent: string
  radius: number
  fontSize: number
}

export interface BrandMirrorSnapshot {
  status: MirrorStatus
  tokens: BrandTokens
  semanticTokens: SemanticTokens
  /** 语义令牌解析后的实际值（背景/表面/正文/强调/圆角/字号） */
  resolved: ResolvedSemanticTokens
  /** 解析过程中发现的引用问题，空数组表示全部正常 */
  semanticIssues: SemanticIssue[]
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

/** 默认语义映射：角色 → 基础引用，也是引用失效时的兜底来源 */
export const DEFAULT_SEMANTIC_TOKENS: SemanticTokens = {
  background: 'white',
  surface: 'white',
  text: 'color.secondary',
  accent: 'color.primary',
  radius: 'radius.2',
  fontSize: 'type.3',
}

/** 解析失败且默认映射也无法使用时的硬兜底，保证界面始终可用 */
export const SEMANTIC_FALLBACK = {
  color: {
    background: '#F5F6F8',
    surface: '#FFFFFF',
    text: '#20252C',
    accent: INITIAL_TOKENS.primary,
  },
  radius: 12,
  fontSize: 16,
} as const

/** 基础颜色引用名（除 HEX 外，white / black 为内置裸值） */
export const BASE_COLOR_REFS = ['color.primary', 'color.secondary', 'white', 'black'] as const
/** 语义角色引用前缀 */
export const SEMANTIC_REF_PREFIX = 'semantic.'

/** 语义颜色角色的展示信息 */
export const SEMANTIC_COLOR_ROLE_META: { key: SemanticColorRole; label: string; hint: string }[] = [
  { key: 'background', label: '页面背景', hint: 'background' },
  { key: 'surface', label: '组件表面', hint: 'surface' },
  { key: 'text', label: '正文文字', hint: 'text' },
  { key: 'accent', label: '强调行动', hint: 'accent' },
]

export const SEMANTIC_SCALE_ROLE_META: { key: SemanticScaleRole; label: string; hint: string; basePrefix: 'radius' | 'type'; unit: string }[] = [
  { key: 'radius', label: '表面圆角', hint: 'radius', basePrefix: 'radius', unit: 'px' },
  { key: 'fontSize', label: '正文字号', hint: 'fontSize', basePrefix: 'type', unit: 'px' },
]

export const SEMANTIC_ROLE_LABELS: Record<SemanticRole, string> = {
  background: '页面背景',
  surface: '组件表面',
  text: '正文文字',
  accent: '强调行动',
  radius: '表面圆角',
  fontSize: '正文字号',
}

export const THEME_PRESETS: Record<BrandTheme, { label: string; tokens: BrandTokens }> = {
  studio: {
    label: 'Studio warm',
    tokens: INITIAL_TOKENS,
  },
  editorial: {
    label: 'Editorial green',
    tokens: {
      primary: '#238B73', secondary: '#173C35', radiusScale: [4, 8, 12, 18], spacingScale: [4, 8, 16, 24, 40], typeScale: [12, 14, 16, 22, 30, 44],
    },
  },
  night: {
    label: 'Night signal',
    tokens: {
      primary: '#A98BFF', secondary: '#191829', radiusScale: [6, 10, 14, 22], spacingScale: [4, 8, 12, 18, 28], typeScale: [12, 14, 16, 20, 28, 38],
    },
  },
}
