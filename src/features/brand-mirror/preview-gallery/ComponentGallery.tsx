import type { ResolvedSemanticTokens } from '../models/brandMirrorModels'

const componentNames = ['按钮', '输入框', '标签', '通知', '头像', '开关', '进度条', '选择器', '日期', '徽章', '卡片', '菜单', '分页', '工具提示', '筛选器', '上传', '骨架屏', '评价', '弹窗', '时间线']

export function ComponentGallery({ resolved }: { resolved: ResolvedSemanticTokens }) {
  return <section className="showcase-section"><div className="showcase-heading"><div><span className="eyebrow">02 / COMPONENTS</span><h2>组件样例</h2></div><span className="count-badge">{componentNames.length} 个响应中</span></div><div className="component-grid">{componentNames.map((name, index) => <ComponentCard key={name} name={name} index={index} resolved={resolved} />)}</div></section>
}

function ComponentCard({ name, index, resolved }: { name: string; index: number; resolved: ResolvedSemanticTokens }) {
  const variant = index % 4
  return <article className="component-card" style={{ background: resolved.surface, color: resolved.text, borderRadius: resolved.radius, fontSize: resolved.fontSize }}><div className="sample-meta"><span className="sample-index">{String(index + 1).padStart(2, '0')}</span><span>{name}</span></div><div className={`sample sample-${variant}`}>
    {variant === 0 && <><button style={{ background: resolved.accent, color: '#FFFFFF', borderRadius: resolved.radius }}>继续探索 <span>→</span></button><button className="ghost-button" style={{ borderRadius: resolved.radius, color: resolved.text }}>次要操作</button></>}
    {variant === 1 && <><div className="fake-input" style={{ borderRadius: resolved.radius, color: resolved.text }}>搜索品牌资产 <span>⌕</span></div><div className="tag-row"><span style={{ background: `${resolved.accent}18`, color: resolved.accent, borderRadius: resolved.radius }}>进行中</span><span className="neutral-tag" style={{ borderRadius: resolved.radius }}>设计系统</span></div></>}
    {variant === 2 && <><div className="avatar-row"><span className="avatar" style={{ background: resolved.text }}>BM</span><div><strong style={{ color: resolved.text }}>BrandMirror</strong><small>刚刚更新视觉令牌</small></div><span className="more">•••</span></div><div className="mini-progress"><span style={{ background: resolved.accent, width: `${55 + index * 2}%` }} /></div></>}
    {variant === 3 && <><div className="toggle-row"><span>实时同步预览</span><span className="toggle" style={{ background: resolved.accent, borderRadius: resolved.radius * 2 }}><i /></span></div><div className="metric-row"><strong style={{ color: resolved.text }}>{index + 8}.{index}</strong><span>一致性分</span></div></>}
  </div></article>
}
