import { describe, expect, it } from 'vitest'
import { LocalBrandRepository } from '../repositories/brandRepository'
import type { StorageService } from '../services/storageService'

class MemoryStorageService implements StorageService {
  constructor(public value: string | null = null) {}
  read(): string | null { return this.value }
  write(value: string): void { this.value = value }
}

describe('LocalBrandRepository', () => {
  it('migrates documents and saved versions created before semantic tokens', () => {
    const storage = new MemoryStorageService(JSON.stringify({
      version: 1,
      theme: 'studio',
      tokens: { primary: '#123456', secondary: '#654321', radiusScale: [8, 12, 18, 28], spacingScale: [4, 8, 12, 20, 32], typeScale: [12, 14, 16, 20, 28, 40] },
      versions: [{
        id: 'version-old',
        label: 'Version A',
        tokens: { primary: '#123456', secondary: '#654321', radiusScale: [8, 12, 18, 28], spacingScale: [4, 8, 12, 20, 32], typeScale: [12, 14, 16, 20, 28, 40] },
        createdAt: '2026-10-01T00:00:00.000Z',
      }],
    }))
    const document = new LocalBrandRepository(storage).load()
    expect(document?.semanticTokens.accent).toBe('base.color.primary')
    expect(document?.versions[0].semanticTokens.background).toBe('base.color.canvas')
  })

  it('preserves semantic references exactly, even when they are invalid', () => {
    const storage = new MemoryStorageService()
    const repository = new LocalBrandRepository(storage)
    const document = {
      version: 1 as const,
      theme: 'studio' as const,
      tokens: { primary: '#123456', secondary: '#654321', radiusScale: [8, 12, 18, 28], spacingScale: [4, 8, 12, 20, 32], typeScale: [12, 14, 16, 20, 28, 40] },
      semanticTokens: {
        background: 'base.color.typo',
        surface: 'base.color.surface',
        text: 'base.color.ink',
        textMuted: 'base.color.muted',
        border: 'base.color.border',
        accent: 'base.color.primary',
        accentStrong: 'base.color.secondary',
      },
      versions: [],
    }
    repository.save(document)
    expect(repository.load()?.semanticTokens.background).toBe('base.color.typo')
  })
})
