import type { BrandMirrorSnapshot } from '../models/brandMirrorModels'
import { SEMANTIC_COLOR_ROLE_META, SEMANTIC_SCALE_ROLE_META, type SemanticRole } from '../models/brandMirrorModels'

interface SemanticTokenPanelProps {
  snapshot: BrandMirrorSnapshot
  onChange: (role: SemanticRole, reference: string) => void
  onReset: () => void
}

export function SemanticTokenPanel({ snapshot, onChange, onReset }: SemanticTokenPanelProps) {
  const issueByKey = new Map(snapshot.semanticIssues.map((issue) => [issue.key, issue]))
  return (
    <section className="control-section semantic-section">
      <div className="section-label">
        <span>语义令牌</span>
        <button className="text-button semantic-reset" type="button" onClick={onReset}>恢复默认映射</button>
      </div>
      <p className="semantic-intro">为界面角色指定引用，预览与导出都按解析后的值呈现。</p>

      <div className="semantic-rows">
        {SEMANTIC_COLOR_ROLE_META.map(({ key, label, hint }) => (
          <SemanticRow
            key={key}
            label={label}
            hint={hint}
            reference={snapshot.semanticTokens[key]}
            resolved={snapshot.resolved[key]}
            issue={issueByKey.get(key)}
            suggestions={['color.primary', 'color.secondary', 'white', 'black', '#RRGGBB', 'semantic.background', 'semantic.surface', 'semantic.text', 'semantic.accent']}
            onChange={(reference) => onChange(key, reference)}
          />
        ))}
        {SEMANTIC_SCALE_ROLE_META.map(({ key, label, hint, basePrefix, unit }) => {
          const scale = basePrefix === 'radius' ? snapshot.tokens.radiusScale : snapshot.tokens.typeScale
          return (
            <SemanticRow
              key={key}
              label={label}
              hint={hint}
              reference={snapshot.semanticTokens[key]}
              resolved={`${snapshot.resolved[key]}${unit}`}
              issue={issueByKey.get(key)}
              suggestions={[...scale.map((_, index) => `${basePrefix}.${index + 1}`), 'semantic.radius', 'semantic.fontSize']}
              onChange={(reference) => onChange(key, reference)}
            />
          )
        })}
      </div>

      {snapshot.semanticIssues.length > 0 && (
        <div className="semantic-issues">
          {snapshot.semanticIssues.map((issue) => (
            <div className="semantic-issue" key={`${issue.key}-${issue.reference}`}>
              <strong>{issue.kind === 'cycle' ? '引用成环' : '引用无效'} · {issue.key}</strong>
              <span>{issue.message}</span>
              <small>引用 “{issue.reference}” → 已兜底为 {issue.fallback}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SemanticRow({ label, hint, reference, resolved, issue, suggestions, onChange }: {
  label: string
  hint: string
  reference: string
  resolved: string
  issue?: { message: string }
  suggestions: string[]
  onChange: (reference: string) => void
}) {
  const listId = `semantic-suggest-${hint}`
  const isColor = resolved.startsWith('#')
  return (
    <div className={`semantic-row ${issue ? 'has-issue' : ''}`}>
      <div className="semantic-row-head">
        <span>{label}</span>
        <span className="semantic-resolved">
          {isColor && <i className="semantic-swatch" style={{ background: resolved }} />}
          <code>{resolved}</code>
        </span>
      </div>
      <div className="semantic-ref-input">
        <span className="semantic-ref-prefix">→</span>
        <input aria-label={`${label}引用`} list={listId} value={reference} spellCheck={false} onChange={(event) => onChange(event.target.value)} />
        <datalist id={listId}>
          {suggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
        </datalist>
      </div>
      {issue && <small className="semantic-row-warning">⚠ {issue.message}</small>}
    </div>
  )
}
