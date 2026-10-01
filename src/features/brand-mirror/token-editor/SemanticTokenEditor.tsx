import type { BrandTokens, BrandMirrorSnapshot, SemanticTokenRole } from '../models/brandMirrorModels'
import { SEMANTIC_TOKEN_ROLES } from '../models/brandMirrorModels'
import { baseTokenReferences } from '../domain/semanticTokenRules'

interface SemanticTokenEditorProps {
  tokens: BrandTokens
  snapshot: BrandMirrorSnapshot
  onChange: (role: SemanticTokenRole, reference: string) => void
}

export function SemanticTokenEditor({ tokens, snapshot, onChange }: SemanticTokenEditorProps) {
  const references = baseTokenReferences(tokens)
  const issueByRole = new Map(snapshot.semanticIssues.map((issue) => [issue.role, issue]))

  return (
    <section className="control-section semantic-section">
      <div className="section-label">
        <span>语义令牌</span>
        <span className="muted">{snapshot.semanticIssues.length === 0 ? '引用已解析' : `${snapshot.semanticIssues.length} 项需检查`}</span>
      </div>
      <div className="semantic-role-list">
        {SEMANTIC_TOKEN_ROLES.map((role) => {
          const issue = issueByRole.get(role.id)
          const resolved = snapshot.resolvedSemanticTokens[role.id]
          const reference = snapshot.semanticTokens[role.id]
          return (
            <label className={`semantic-role ${issue ? 'invalid' : ''}`} key={role.id}>
              <span className="semantic-role-info">
                <span className="semantic-swatch" style={{ background: resolved }} />
                <span>
                  <strong>{role.label}</strong>
                  <small>{role.description}</small>
                </span>
              </span>
              <span className="semantic-value-control">
                <code>{resolved}</code>
                <input
                  aria-label={`${role.label}语义引用`}
                  list="semantic-reference-options"
                  value={reference}
                  onChange={(event) => onChange(role.id, event.target.value)}
                  spellCheck={false}
                />
                {issue && <small className="semantic-error" title={issue.message}>！ {issue.message}</small>}
              </span>
            </label>
          )
        })}
      </div>
      <datalist id="semantic-reference-options">
        {references.map((reference) => <option key={reference.key} value={reference.key}>{reference.label} · {reference.value}</option>)}
        {SEMANTIC_TOKEN_ROLES.map((role) => <option key={role.id} value={role.id}>语义 · {role.label}</option>)}
      </datalist>
    </section>
  )
}
