import { resolveSemanticTokens } from '../domain/semanticTokens'
import type { BrandMirrorSnapshot, ResolvedSemanticTokens, SemanticIssue, SemanticTokens } from '../models/brandMirrorModels'
import { SEMANTIC_COLOR_ROLE_META, SEMANTIC_SCALE_ROLE_META } from '../models/brandMirrorModels'

export interface BrandGuidelinesExporter {
  export(snapshot: BrandMirrorSnapshot): void
}

function semanticRows(semanticTokens: SemanticTokens, resolved: ResolvedSemanticTokens, issues: SemanticIssue[]): string[] {
  const issueByKey = new Map(issues.map((issue) => [issue.key, issue]))
  const statusOf = (key: SemanticIssue['key']): string => {
    const issue = issueByKey.get(key)
    if (!issue) return '正常'
    return `⚠️ ${issue.kind === 'cycle' ? '引用成环' : '引用无效'}，已兜底`
  }
  const colorRows = SEMANTIC_COLOR_ROLE_META.map(({ key, label }) =>
    `| ${label} \`${key}\` | \`${semanticTokens[key]}\` | \`${resolved[key]}\` | ${statusOf(key)} |`)
  const scaleRows = SEMANTIC_SCALE_ROLE_META.map(({ key, label, unit }) =>
    `| ${label} \`${key}\` | \`${semanticTokens[key]}\` | ${resolved[key]}${unit} | ${statusOf(key)} |`)
  return [...colorRows, ...scaleRows]
}

export function buildBrandGuidelinesMarkdown(snapshot: BrandMirrorSnapshot): string {
  const { tokens, resolved, semanticTokens, semanticIssues } = snapshot
  const issuesBlock = semanticIssues.length > 0
    ? ['> ⚠️ 以下语义引用存在问题，导出使用兜底后的解析值：', ...semanticIssues.map((issue) => `> - \`${issue.key}\` → \`${issue.reference}\`：${issue.message}，兜底为 \`${issue.fallback}\``), ''].join('\n')
    : ''
  const versions = snapshot.versions.length === 0 ? '- 暂无保存版本' : snapshot.versions.map((version) => {
    const versionResolved = resolveSemanticTokens(version.tokens, version.semanticTokens).resolved
    return `- ${version.label} · ${version.createdAt.slice(0, 10)} · 主色 ${version.tokens.primary} · 辅助色 ${version.tokens.secondary} · 强调 ${versionResolved.accent} · 正文 ${versionResolved.text}`
  }).join('\n')
  return `# BrandMirror 品牌规范\n\n> 导出时间：${new Date().toISOString().slice(0, 10)}\n> 当前主题：${snapshot.theme}\n\n## 语义令牌（界面实际消费）\n\n界面直接消费的解析结果：背景 \`${resolved.background}\`、表面 \`${resolved.surface}\`、正文 \`${resolved.text}\`、强调 \`${resolved.accent}\`、圆角 ${resolved.radius}px、正文字号 ${resolved.fontSize}px。\n\n| 语义角色 | 引用 | 解析后的值 | 状态 |\n| --- | --- | --- | --- |\n${semanticRows(semanticTokens, resolved, semanticIssues).join('\n')}\n\n${issuesBlock}## 基础颜色\n\n| 令牌 | 值 |\n| --- | --- |\n| 主色 \`color.primary\` | \`${tokens.primary}\` |\n| 辅助色 \`color.secondary\` | \`${tokens.secondary}\` |\n| 对比度 | ${snapshot.contrastRatio.toFixed(1)}:1 |\n\n## 圆角尺度\n\n${tokens.radiusScale.map((value, index) => `- \`radius.${index + 1}\`: ${value}px`).join('\n')}\n\n## 间距体系\n\n${tokens.spacingScale.map((value, index) => `- \`spacing.${index + 1}\`: ${value}px`).join('\n')}\n\n## 字体比例\n\n${tokens.typeScale.map((value, index) => `- \`type.${index + 1}\`: ${value}px`).join('\n')}\n\n## 保存版本\n\n${versions}\n\n---\n由 BrandMirror 品牌视觉实验室生成。\n`
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
