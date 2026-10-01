import type { BrandDocument } from '../models/brandMirrorModels'
import { clampTokenValues, validateTokens } from '../domain/brandRules'
import { normalizeSemanticTokens } from '../domain/semanticTokens'
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
      return {
        ...candidate,
        tokens: clampTokenValues(candidate.tokens),
        semanticTokens: normalizeSemanticTokens(candidate.semanticTokens),
        versions: candidate.versions.map((version) => ({
          ...version,
          tokens: clampTokenValues(version.tokens),
          semanticTokens: normalizeSemanticTokens(version.semanticTokens),
        })),
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
  if (candidate.version !== 1 || !candidate.tokens || !Array.isArray(candidate.versions) || typeof candidate.theme !== 'string') return false
  return candidate.versions.every((version) => !!version.tokens)
}
