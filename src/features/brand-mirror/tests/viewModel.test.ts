import { describe, expect, it } from 'vitest'
import { BrandMirrorViewModel } from '../viewmodels/brandMirrorViewModel'
import type { BrandDocument } from '../models/brandMirrorModels'
import type { BrandRepository } from '../repositories/brandRepository'
import { buildBrandGuidelinesMarkdown, type BrandGuidelinesExporter } from '../services/exportService'

class MemoryRepository implements BrandRepository {
  document: BrandDocument | null = null
  shouldFail = false
  load(): BrandDocument | null { return this.document }
  save(document: BrandDocument): void { if (this.shouldFail) throw new Error('offline'); this.document = document }
}

class MemoryExporter implements BrandGuidelinesExporter {
  received: string | null = null
  export(snapshot: Parameters<BrandGuidelinesExporter['export']>[0]): void { this.received = buildBrandGuidelinesMarkdown(snapshot) }
}

describe('BrandMirrorViewModel', () => {
  it('initializes, updates tokens and persists the latest state', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.updateColor('primary', '#123456')
    viewModel.updateScale('typeScale', 0, 18)
    expect(viewModel.getSnapshot().tokens.primary).toBe('#123456')
    expect(viewModel.getSnapshot().tokens.typeScale[0]).toBe(18)
    expect(repository.document?.tokens.primary).toBe('#123456')
  })

  it('saves two versions and enters comparison mode', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.saveVersion()
    viewModel.updateColor('primary', '#238B73')
    viewModel.saveVersion()
    viewModel.toggleCompare()
    expect(viewModel.getSnapshot().versions.map((version) => version.label)).toEqual(['Version A', 'Version B'])
    expect(viewModel.getSnapshot().compareMode).toBe(true)
  })

  it('keeps editing usable when persistence fails', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    repository.shouldFail = true
    viewModel.updateColor('secondary', '#FFFFFF')
    expect(viewModel.getSnapshot().status).toBe('error')
    expect(viewModel.getSnapshot().tokens.secondary).toBe('#FFFFFF')
  })

  it('recovers a previously persisted document on initialization', () => {
    const repository = new MemoryRepository()
    repository.document = { version: 1, theme: 'night', tokens: { primary: '#A98BFF', secondary: '#191829', radiusScale: [6, 10, 14, 22], spacingScale: [4, 8, 12, 18, 28], typeScale: [12, 14, 16, 20, 28, 38] }, semanticTokens: { background: 'black', surface: 'black', text: 'color.primary', accent: 'color.primary', radius: 'radius.1', fontSize: 'type.2' }, versions: [] }
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    expect(viewModel.getSnapshot().theme).toBe('night')
    expect(viewModel.getSnapshot().resolved.background).toBe('#000000')
    expect(viewModel.getSnapshot().resolved.accent).toBe('#A98BFF')
    expect(viewModel.getSnapshot().message).toContain('恢复')
  })

  it('updates semantic references and exposes resolved values with fallback on broken refs', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.updateSemanticToken('accent', 'color.secondary')
    expect(viewModel.getSnapshot().resolved.accent).toBe('#24324A')
    expect(repository.document?.semanticTokens.accent).toBe('color.secondary')

    viewModel.updateSemanticToken('background', 'semantic.surface')
    viewModel.updateSemanticToken('surface', 'semantic.background')
    const snapshot = viewModel.getSnapshot()
    expect(snapshot.semanticIssues.filter((issue) => issue.kind === 'cycle').length).toBeGreaterThan(0)
    expect(snapshot.message).toContain('成环')
    expect(snapshot.resolved.background).toBe('#FFFFFF')
  })

  it('persists semantic tokens inside saved versions and restores them', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.updateSemanticToken('accent', 'black')
    viewModel.saveVersion()
    expect(repository.document?.versions[0].semanticTokens.accent).toBe('black')
    const restored = new BrandMirrorViewModel(repository)
    restored.initialize()
    expect(restored.getSnapshot().resolved.accent).toBe('#000000')
  })

  it('exports resolved semantic values and warns about broken references', () => {
    const repository = new MemoryRepository()
    const exporter = new MemoryExporter()
    const viewModel = new BrandMirrorViewModel(repository, exporter)
    viewModel.initialize()
    viewModel.updateSemanticToken('surface', 'semantic.text')
    viewModel.exportBrandGuidelines()
    expect(exporter.received).toContain('## 语义令牌')
    expect(exporter.received).toContain('#F15A47')
    viewModel.updateSemanticToken('text', 'color.nope')
    viewModel.exportBrandGuidelines()
    expect(exporter.received).toContain('引用无效')
    expect(exporter.received).toContain('兜底')
  })


  it('exports the current token system as brand guidelines', () => {
    const repository = new MemoryRepository()
    const exporter = new MemoryExporter()
    const viewModel = new BrandMirrorViewModel(repository, exporter)
    viewModel.initialize()
    viewModel.exportBrandGuidelines()
    expect(exporter.received).toContain('# BrandMirror 品牌规范')
    expect(exporter.received).toContain('`color.primary`')
    expect(viewModel.getSnapshot().message).toContain('导出')
  })
})
