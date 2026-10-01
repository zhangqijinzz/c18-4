import type { BrandMirrorSnapshot } from '../models/brandMirrorModels'
import { SEMANTIC_TOKEN_ROLES } from '../models/brandMirrorModels'
import { resolveSemanticTokens } from '../domain/semanticTokenRules'

export interface BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void
}

export function buildBrandGuidelinesMarkdown(snapshot: BrandMirrorSnapshot): string {
  const { tokens, resolvedSemanticTokens, semanticTokens } = snapshot
  const versions = snapshot.versions.length === 0
    ? '- 暂无保存版本'
    : snapshot.versions.map((version) => {
      const accent = resolveSemanticTokens(version.tokens, version.semanticTokens).values.accent
      return `- ${version.label} · ${version.createdAt.slice(0, 10)} · 强调 \`${version.semanticTokens.accent} → ${accent}\``
    }).join('\n')
  const semanticRows = SEMANTIC_TOKEN_ROLES.map((role) => `| ${role.label} \`semantic.${role.id}\` | \`${semanticTokens[role.id]}\` | \`${resolvedSemanticTokens[role.id]}\` |`).join('\n')
  const issues = snapshot.semanticIssues.length === 0
    ? '- 所有语义引用均可正常解析'
    : snapshot.semanticIssues.map((issue) => `- ${issue.message}`).join('\n')
  return `# BrandMirror 品牌规范

> 导出时间：${new Date().toISOString().slice(0, 10)}
> 当前主题：${snapshot.theme}

## 基础品牌色

| 令牌 | 值 |
| --- | --- |
| 主色 \`primary\` | \`${tokens.primary}\` |
| 辅助色 \`secondary\` | \`${tokens.secondary}\` |
| 对比度 | ${snapshot.contrastRatio.toFixed(1)}:1 |

## 语义令牌（已解析）

| 角色 | 引用 | 导出值 |
| --- | --- | --- |
${semanticRows}

### 解析状态

${issues}

## 圆角尺度

${tokens.radiusScale.map((value, index) => `- \`radius.${index + 1}\`: ${value}px`).join('\n')}

## 间距体系

${tokens.spacingScale.map((value, index) => `- \`spacing.${index + 1}\`: ${value}px`).join('\n')}

## 字体比例

${tokens.typeScale.map((value, index) => `- \`type.${index + 1}\`: ${value}px`).join('\n')}

## 保存版本

${versions}

---
由 BrandMirror 品牌视觉实验室生成。
`
}

export class BrowserBrandGuidelinesExporter implements BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void {
    const content = buildBrandGuidelinesMarkdown(snapshot)
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `BrandMirror-Brand-Guidelines-${new Date().toISOString().slice(0, 10)}.md`
    link.click()
    URL.revokeObjectURL(url)
  }
}
