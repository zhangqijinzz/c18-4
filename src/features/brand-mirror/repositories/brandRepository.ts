import type { BrandDocument, SavedVersion } from '../models/brandMirrorModels'
import { clampTokenValues, validateTokens } from '../domain/brandRules'
import { normalizeSemanticTokens } from '../domain/semanticTokenRules'
import type { StorageService } from '../services/storageService'

export interface BrandRepository {
  load(): BrandDocument | null
  save(document: BrandDocument): void
}

export class LocalBrandRepository implements BrandRepository {
  constructor(private readonly storage: StorageService) {}

  load(): BrandDocument | null {
    const raw = this.storage.read()
    if (!raw) return null
    try {
      const candidate: unknown = JSON.parse(raw)
      if (!isDocument(candidate)) return null
      const tokens = clampTokenValues(candidate.tokens)
      const versions = candidate.versions.filter(isSavedVersion).map((version) => ({
        ...version,
        tokens: clampTokenValues(version.tokens),
        semanticTokens: normalizeSemanticTokens(version.semanticTokens),
      }))
      return {
        version: 1,
        tokens,
        semanticTokens: normalizeSemanticTokens(candidate.semanticTokens),
        theme: candidate.theme,
        versions,
      }
    } catch {
      return null
    }
  }

  save(document: BrandDocument): void {
    const validationError = validateTokens(document.tokens)
    if (validationError) throw new Error(validationError)
    this.storage.write(JSON.stringify(document))
  }
}

function isDocument(value: unknown): value is BrandDocument {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<BrandDocument>
  return candidate.version === 1 && !!candidate.tokens && Array.isArray(candidate.versions) && typeof candidate.theme === 'string'
}

function isSavedVersion(value: unknown): value is SavedVersion {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SavedVersion>
  return typeof candidate.id === 'string' && typeof candidate.label === 'string' && !!candidate.tokens && typeof candidate.createdAt === 'string'
}
