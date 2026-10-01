import { describe, expect, it } from 'vitest'
import { BrandMirrorViewModel } from '../viewmodels/brandMirrorViewModel'
import { DEFAULT_SEMANTIC_TOKENS, INITIAL_TOKENS, type BrandDocument } from '../models/brandMirrorModels'
import type { BrandRepository } from '../repositories/brandRepository'
import { buildBrandGuidelinesMarkdown, type BrandGuidelinesExporter } from '../services/exportService'

const nightDocument: BrandDocument = {
  version: 1,
  theme: 'night',
  tokens: { primary: '#A98BFF', secondary: '#191829', radiusScale: [6, 10, 14, 22], spacingScale: [4, 8, 12, 18, 28], typeScale: [12, 14, 16, 20, 28, 38] },
  semanticTokens: {
    background: 'base.color.nightCanvas',
    surface: 'base.color.nightSurface',
    text: 'base.color.nightInk',
    textMuted: 'base.color.nightMuted',
    border: 'base.color.nightBorder',
    accent: 'base.color.primary',
    accentStrong: 'base.color.purpleStrong',
  },
  versions: [],
}

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

  it('updates semantic references and exposes resolved values', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.updateSemanticReference('accent', 'base.color.secondary')
    expect(viewModel.getSnapshot().semanticTokens.accent).toBe('base.color.secondary')
    expect(viewModel.getSnapshot().resolvedSemanticTokens.accent).toBe(INITIAL_TOKENS.secondary)
    expect(repository.document?.semanticTokens.accent).toBe('base.color.secondary')
  })

  it('keeps an invalid semantic reference, reports it and uses a fallback preview value', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.updateSemanticReference('background', 'base.color.missing')
    const snapshot = viewModel.getSnapshot()
    expect(snapshot.semanticTokens.background).toBe('base.color.missing')
    expect(snapshot.resolvedSemanticTokens.background).toBe('#F5F6F8')
    expect(snapshot.semanticIssues[0].message).toContain('不存在')
    expect(snapshot.message).toContain('默认值兜底')
  })

  it('reports semantic aliases that are circular', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.updateSemanticReference('background', 'surface')
    viewModel.updateSemanticReference('surface', 'background')
    expect(viewModel.getSnapshot().semanticIssues.some((issue) => issue.code === 'circular')).toBe(true)
  })

  it('saves two versions with semantic tokens and enters comparison mode', () => {
    const repository = new MemoryRepository()
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    viewModel.saveVersion()
    viewModel.updateColor('primary', '#238B73')
    viewModel.updateSemanticReference('accent', 'base.color.primary')
    viewModel.saveVersion()
    viewModel.toggleCompare()
    expect(viewModel.getSnapshot().versions.map((version) => version.label)).toEqual(['Version A', 'Version B'])
    expect(viewModel.getSnapshot().versions[1].semanticTokens.accent).toBe('base.color.primary')
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
    repository.document = nightDocument
    const viewModel = new BrandMirrorViewModel(repository)
    viewModel.initialize()
    expect(viewModel.getSnapshot().theme).toBe('night')
    expect(viewModel.getSnapshot().resolvedSemanticTokens.background).toBe('#12131F')
    expect(viewModel.getSnapshot().message).toContain('恢复')
  })

  it('exports resolved semantic tokens as brand guidelines', () => {
    const repository = new MemoryRepository()
    const exporter = new MemoryExporter()
    const viewModel = new BrandMirrorViewModel(repository, exporter)
    viewModel.initialize()
    viewModel.exportBrandGuidelines()
    expect(exporter.received).toContain('# BrandMirror 品牌规范')
    expect(exporter.received).toContain('语义令牌（已解析）')
    expect(exporter.received).toContain(DEFAULT_SEMANTIC_TOKENS.background)
    expect(exporter.received).toContain(INITIAL_TOKENS.secondary)
    expect(viewModel.getSnapshot().message).toContain('导出')
  })
})
