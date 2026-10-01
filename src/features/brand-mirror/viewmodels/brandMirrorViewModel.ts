import { clampTokenValues, cloneTokens, contrastRatio, normalizeColor, themeTokens, validateTokens } from '../domain/brandRules'
import { cloneSemanticTokens, normalizeSemanticTokens, resolveSemanticTokens, summarizeSemanticIssues } from '../domain/semanticTokens'
import type { BrandRepository } from '../repositories/brandRepository'
import type { BrandGuidelinesExporter } from '../services/exportService'
import {
  DEFAULT_SEMANTIC_TOKENS,
  INITIAL_TOKENS,
  type BrandDocument,
  type BrandMirrorSnapshot,
  type BrandTheme,
  type SavedVersion,
  type SemanticRole,
  type SemanticTokens,
} from '../models/brandMirrorModels'

type Listener = () => void

export class BrandMirrorViewModel {
  private snapshot: BrandMirrorSnapshot = this.makeSnapshot({ tokens: cloneTokens(INITIAL_TOKENS), semanticTokens: cloneSemanticTokens(DEFAULT_SEMANTIC_TOKENS), theme: 'studio', versions: [] })
  private readonly listeners = new Set<Listener>()
  private readonly repository: BrandRepository
  private readonly exporter?: BrandGuidelinesExporter

  constructor(repository: BrandRepository, exporter?: BrandGuidelinesExporter) {
    this.repository = repository
    this.exporter = exporter
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot(): BrandMirrorSnapshot {
    return this.snapshot
  }

  initialize(): void {
    const stored = this.repository.load()
    if (stored) {
      this.snapshot = this.makeSnapshot(stored, '已恢复最近一次工作状态')
    } else {
      this.snapshot = this.makeSnapshot({ tokens: cloneTokens(INITIAL_TOKENS), semanticTokens: cloneSemanticTokens(DEFAULT_SEMANTIC_TOKENS), theme: 'studio', versions: [] }, '从 Studio warm 开始探索')
    }
    this.emit()
  }

  selectTheme(theme: BrandTheme): void {
    this.update({ tokens: themeTokens(theme), theme }, '已切换基础主题，语义角色映射保持不变')
  }

  updateColor(field: 'primary' | 'secondary', value: string): void {
    const color = normalizeColor(value)
    this.update({ tokens: { ...this.snapshot.tokens, [field]: color } }, '令牌已更新')
  }

  updateScale(field: 'radiusScale' | 'spacingScale' | 'typeScale', index: number, value: number): void {
    const values = [...this.snapshot.tokens[field]]
    values[index] = Number.isFinite(value) ? value : values[index]
    this.update({ tokens: clampTokenValues({ ...this.snapshot.tokens, [field]: values }) }, '令牌已更新')
  }

  /** 编辑某个语义角色的引用；写错或成环不会被拒绝，解析层会提示并兜底 */
  updateSemanticToken(role: SemanticRole, reference: string): void {
    const semanticTokens: SemanticTokens = { ...this.snapshot.semanticTokens, [role]: reference }
    const { issues } = resolveSemanticTokens(this.snapshot.tokens, semanticTokens)
    const message = issues.length > 0 ? summarizeSemanticIssues(issues) : `语义角色已指向 ${reference}`
    this.update({ semanticTokens }, message)
  }

  resetSemanticTokens(): void {
    this.update({ semanticTokens: cloneSemanticTokens(DEFAULT_SEMANTIC_TOKENS) }, '语义角色映射已恢复默认')
  }

  reset(): void {
    this.update({ tokens: cloneTokens(INITIAL_TOKENS), semanticTokens: cloneSemanticTokens(DEFAULT_SEMANTIC_TOKENS), theme: 'studio' }, '已恢复默认令牌')
  }

  saveVersion(): void {
    const validationError = validateTokens(this.snapshot.tokens)
    if (validationError) {
      this.snapshot = { ...this.snapshot, status: 'error', message: validationError }
      this.emit()
      return
    }
    const nextVersion: SavedVersion = {
      id: `version-${Date.now()}`,
      label: this.snapshot.versions.length === 0 ? 'Version A' : `Version ${String.fromCharCode(65 + this.snapshot.versions.length)}`,
      tokens: cloneTokens(this.snapshot.tokens),
      semanticTokens: cloneSemanticTokens(this.snapshot.semanticTokens),
      createdAt: new Date().toISOString(),
    }
    const versions = [...this.snapshot.versions, nextVersion]
    this.persist({ tokens: this.snapshot.tokens, semanticTokens: this.snapshot.semanticTokens, theme: this.snapshot.theme, versions }, '版本已保存（含语义令牌）')
  }

  toggleCompare(): void {
    this.snapshot = { ...this.snapshot, compareMode: !this.snapshot.compareMode, message: this.snapshot.compareMode ? '已退出对比模式' : '正在对比最近两个版本' }
    this.emit()
  }

  exportBrandGuidelines(): void {
    if (!this.exporter) return
    try {
      this.exporter.export(this.snapshot)
      this.snapshot = { ...this.snapshot, message: '品牌规范已导出（按解析后的值）' }
    } catch {
      this.snapshot = { ...this.snapshot, status: 'error', message: '导出失败，请稍后重试' }
    }
    this.emit()
  }

  private update(partial: Partial<Pick<BrandDocument, 'tokens' | 'semanticTokens' | 'theme'>>, message: string): void {
    this.snapshot = this.makeSnapshot({
      tokens: partial.tokens ?? this.snapshot.tokens,
      semanticTokens: partial.semanticTokens ?? this.snapshot.semanticTokens,
      theme: partial.theme ?? this.snapshot.theme,
      versions: this.snapshot.versions,
    }, message, 'editing')
    this.persistCurrent()
  }

  private persistCurrent(): void {
    try {
      this.repository.save({ version: 1, tokens: this.snapshot.tokens, semanticTokens: this.snapshot.semanticTokens, theme: this.snapshot.theme, versions: this.snapshot.versions })
    } catch {
      this.snapshot = { ...this.snapshot, status: 'error', message: '本地保存失败，但当前编辑仍保留在页面中' }
    }
    this.emit()
  }

  private persist(document: Omit<BrandDocument, 'version'>, message: string): void {
    try {
      this.repository.save({ version: 1, ...document })
      this.snapshot = this.makeSnapshot(document, message, 'ready')
    } catch {
      this.snapshot = { ...this.snapshot, status: 'error', message: '版本保存失败，请稍后重试' }
    }
    this.emit()
  }

  private makeSnapshot(document: Omit<BrandDocument, 'version'>, message = '', status: BrandMirrorSnapshot['status'] = 'ready'): BrandMirrorSnapshot {
    const tokens = cloneTokens(document.tokens)
    const semanticTokens = cloneSemanticTokens(normalizeSemanticTokens(document.semanticTokens))
    const { resolved, issues } = resolveSemanticTokens(tokens, semanticTokens)
    const ratio = contrastRatio(tokens.primary, tokens.secondary)
    const latestVersion = document.versions[document.versions.length - 1]
    return {
      status,
      tokens,
      semanticTokens,
      resolved,
      semanticIssues: issues,
      theme: document.theme,
      versions: document.versions,
      compareMode: false,
      activeVersionId: latestVersion?.id ?? null,
      contrastRatio: ratio,
      contrastWarning: ratio < 3,
      message,
    }
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}
