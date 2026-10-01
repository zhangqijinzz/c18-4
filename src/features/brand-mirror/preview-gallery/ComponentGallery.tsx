import { readableTextColor } from '../domain/brandRules'
import type { BrandTokens, SemanticTokenMap } from '../models/brandMirrorModels'

const componentNames = ['按钮', '输入框', '标签', '通知', '头像', '开关', '进度条', '选择器', '日期', '徽章', '卡片', '菜单', '分页', '工具提示', '筛选器', '上传', '骨架屏', '评价', '弹窗', '时间线']

interface ComponentGalleryProps {
  tokens: BrandTokens
  semantic: SemanticTokenMap
}

export function ComponentGallery({ tokens, semantic }: ComponentGalleryProps) {
  return <section className="showcase-section"><div className="showcase-heading"><div><span className="eyebrow">02 / COMPONENTS</span><h2>组件样例</h2></div><span className="count-badge">{componentNames.length} 个响应中</span></div><div className="component-grid">{componentNames.map((name, index) => <ComponentCard key={name} name={name} index={index} tokens={tokens} semantic={semantic} />)}</div></section>
}

function ComponentCard({ name, index, tokens, semantic }: { name: string; index: number; tokens: BrandTokens; semantic: SemanticTokenMap }) {
  const variant = index % 4
  const accentText = readableTextColor(semantic.accent)
  return <article className="component-card" style={{ background: semantic.surface, borderColor: semantic.border, color: semantic.text }}><div className="sample-meta" style={{ color: semantic.textMuted }}><span className="sample-index">{String(index + 1).padStart(2, '0')}</span><span>{name}</span></div><div className={`sample sample-${variant}`}>
    {variant === 0 && <><button style={{ background: semantic.accent, color: accentText, borderRadius: tokens.radiusScale[1] }}>继续探索 <span>→</span></button><button className="ghost-button" style={{ background: semantic.surface, color: semantic.text, border: `1px solid ${semantic.border}`, borderRadius: tokens.radiusScale[1] }}>次要操作</button></>}
    {variant === 1 && <><div className="fake-input" style={{ background: semantic.surface, color: semantic.textMuted, borderColor: semantic.border, borderRadius: tokens.radiusScale[0] }}>搜索品牌资产 <span>⌕</span></div><div className="tag-row"><span style={{ background: `${semantic.accent}18`, color: semantic.accent, borderRadius: tokens.radiusScale[3] }}>进行中</span><span className="neutral-tag" style={{ background: semantic.border, color: semantic.text, borderRadius: tokens.radiusScale[3] }}>设计系统</span></div></>}
    {variant === 2 && <><div className="avatar-row"><span className="avatar" style={{ background: semantic.accentStrong, color: readableTextColor(semantic.accentStrong) }}>BM</span><div><strong style={{ color: semantic.text }}>BrandMirror</strong><small style={{ color: semantic.textMuted }}>刚刚更新视觉令牌</small></div><span className="more" style={{ color: semantic.textMuted }}>•••</span></div><div className="mini-progress" style={{ background: semantic.border }}><span style={{ background: semantic.accent, width: `${55 + index * 2}%` }} /></div></>}
    {variant === 3 && <><div className="toggle-row" style={{ color: semantic.text }}><span>实时同步预览</span><span className="toggle" style={{ background: semantic.accent }}><i /></span></div><div className="metric-row"><strong style={{ color: semantic.text }}>{index + 8}.{index}</strong><span style={{ color: semantic.textMuted }}>一致性分</span></div></>}
  </div></article>
}
