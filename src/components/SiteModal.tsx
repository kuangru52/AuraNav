import React, { useState } from 'react'

type SiteForm = {
  title: string
  url: string
  description: string
  icon: string
  category: string
  accent: string
}

type SiteModalProps = {
  isOpen: boolean
  editingCardId: string | null
  form: SiteForm
  groups: string[]
  storedIcons?: string[]
  cards?: { id: string; title: string; icon: string }[]
  onFormChange: React.Dispatch<React.SetStateAction<SiteForm>>
  onClose: () => void
  onSave: () => void
  onIconFileChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

export function SiteModal({
  isOpen,
  editingCardId,
  form,
  groups,
  storedIcons = [],
  cards = [],
  onFormChange,
  onClose,
  onSave,
  onIconFileChange,
}: SiteModalProps) {
  const [showGallery, setShowGallery] = useState(false)
  const [isFetchingIcon, setIsFetchingIcon] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(true)

  if (!isOpen) return null

  // Check if current icon is an image URL/data
  const isImageIcon =
    /^data:image\//i.test(form.icon) || /^blob:/i.test(form.icon) || /^https?:\/\//i.test(form.icon)

  // 仅收集用户本地上传保存的图片图标（过滤掉从网站直接拉取的网络 URL 图标）
  const cardImageIcons = cards
    .map((c) => c.icon)
    .filter((icon) => /^data:image\//i.test(icon) || /^blob:/i.test(icon))

  const allAvailableIcons = Array.from(new Set([...storedIcons, ...cardImageIcons]))

  // Direct Site Favicon Fetcher (points directly to site's own origin/favicon.ico)
  const handleFetchOnlineFavicon = async () => {
    let rawUrl = form.url.trim()
    if (!rawUrl) {
      alert('请先在下方“网址”框输入站点网址！')
      return
    }
    if (!/^https?:\/\//i.test(rawUrl)) {
      rawUrl = 'https://' + rawUrl
    }
    try {
      setIsFetchingIcon(true)
      const urlObj = new URL(rawUrl)
      // Directly point to the website's own favicon on its own origin server
      const directFaviconUrl = `${urlObj.origin}/favicon.ico`
      onFormChange((prev) => ({ ...prev, icon: directFaviconUrl }))
    } catch {
      alert('无法解析输入的网址，请检查网址格式')
    } finally {
      setIsFetchingIcon(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        {/* 陷阱表单：拦截并捕获浏览器的暴力密码自动填充 */}
        <div style={{ display: 'none', position: 'absolute', opacity: 0, height: 0, width: 0, overflow: 'hidden' }} aria-hidden="true">
          <input type="text" name="fake_username_trap" tabIndex={-1} autoComplete="off" />
          <input type="password" name="fake_password_trap" tabIndex={-1} autoComplete="new-password" />
        </div>

        <div className="panel-header">
          <h3>{editingCardId ? '编辑站点' : '添加站点'}</h3>
        </div>

        {/* 顶部实时卡片效果预览 */}
        <div
          style={{
            marginBottom: '16px',
            padding: '14px',
            borderRadius: '16px',
            background: 'rgba(15, 23, 42, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'rgba(226, 232, 240, 0.5)', alignSelf: 'flex-start' }}>
            实时卡片效果预览
          </span>
          <div
            style={{
              width: '100%',
              maxWidth: '280px',
              height: '68px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              gap: '12px',
            }}
          >
            {/* 预览图标区 */}
            <div
              style={{
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: isImageIcon ? 'transparent' : 'rgba(255, 255, 255, 0.94)',
                color: form.accent || '#38bdf8',
                fontWeight: 700,
                fontSize: '1.1rem',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {isImageIcon ? (
                <img
                  src={form.icon}
                  alt="preview-icon"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
                />
              ) : (
                form.icon || (form.title.trim() ? form.title.trim().slice(0, 2) : '?')
              )}
            </div>
            {/* 预览文字区 */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, flex: 1 }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {form.title.trim() || '站点标题'}
              </h4>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.75rem',
                  color: 'rgba(255, 255, 255, 0.65)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {form.description.trim() || form.url.trim() || '实用快捷入口'}
              </p>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <label>
            <span>标题</span>
            <input
              type="text"
              name="site_title_field"
              autoComplete="off"
              readOnly={isReadOnly}
              onFocus={() => setIsReadOnly(false)}
              value={form.title}
              onChange={(event) => onFormChange((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="输入站点名称"
            />
          </label>
          <label>
            <span>网址</span>
            <input
              type="text"
              name="site_url_field"
              autoComplete="off"
              readOnly={isReadOnly}
              onFocus={() => setIsReadOnly(false)}
              value={form.url}
              onChange={(event) => onFormChange((prev) => ({ ...prev, url: event.target.value }))}
              placeholder="example.com"
            />
          </label>

          {/* 图标栏 */}
          <label className="full-width">
            <span style={{ display: 'block', marginBottom: '6px' }}>图标 (支持文本、自定义URL或按钮选择)</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                name="site_icon_field"
                autoComplete="off"
                readOnly={isReadOnly}
                onFocus={() => setIsReadOnly(false)}
                value={/^data:image\//i.test(form.icon) ? '[已选择图片图标]' : form.icon}
                onChange={(event) => onFormChange((prev) => ({ ...prev, icon: event.target.value }))}
                placeholder="输入文字/URL"
                style={{ flex: '1 1 120px', minWidth: '100px' }}
              />
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                id="icon-file-input"
                onChange={onIconFileChange}
              />

              {/* 按钮 1: 本地文件上传 📤 */}
              <label
                htmlFor="icon-file-input"
                title="1. 本地文件上传"
                style={{
                  cursor: 'pointer',
                  width: '42px',
                  height: '42px',
                  minWidth: '42px',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: '12px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  transition: 'background 0.2s ease',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </label>

              {/* 按钮 2: 服务器/数据目录已有图标选择 🗂️ */}
              <button
                type="button"
                title="2. 从服务器/数据目录已有图标中选择"
                onClick={() => setShowGallery((prev) => !prev)}
                style={{
                  cursor: 'pointer',
                  width: '42px',
                  height: '42px',
                  minWidth: '42px',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: '12px',
                  background: showGallery ? 'rgba(168, 85, 247, 0.35)' : 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                  transition: 'background 0.2s ease',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>

              {/* 按钮 3: 在线获取网站官方Logo图标 🌐 */}
              <button
                type="button"
                title="3. 在线获取网站官方Logo图标"
                onClick={handleFetchOnlineFavicon}
                disabled={isFetchingIcon}
                style={{
                  cursor: 'pointer',
                  width: '42px',
                  height: '42px',
                  minWidth: '42px',
                  display: 'grid',
                  placeItems: 'center',
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  opacity: isFetchingIcon ? 0.5 : 1,
                  transition: 'background 0.2s ease',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </button>
            </div>

            {/* 服务器/数据目录已有图标选择抽屉 */}
            {showGallery && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.8)', fontWeight: 600 }}>
                    选择服务器/数据目录已有图标 ({allAvailableIcons.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGallery(false)}
                    style={{ background: 'transparent', border: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    关闭
                  </button>
                </div>
                {allAvailableIcons.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.45)', margin: 0, padding: '8px 0' }}>
                    暂无保存的图片图标，您可在设置-数据目录中批量上传。
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))',
                      gap: '8px',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      padding: '2px',
                    }}
                  >
                    {allAvailableIcons.map((iconUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onFormChange((prev) => ({ ...prev, icon: iconUrl }))
                          setShowGallery(false)
                        }}
                        style={{
                          padding: '3px',
                          borderRadius: '10px',
                          border: form.icon === iconUrl ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <img
                          src={iconUrl}
                          alt={`icon-${idx}`}
                          style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </label>

          <label>
            <span>分类</span>
            <select
              value={form.category}
              onChange={(event) => onFormChange((prev) => ({ ...prev, category: event.target.value }))}
            >
              {groups.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>卡片背景色</span>
            <input
              type="color"
              value={form.accent}
              onChange={(event) => onFormChange((prev) => ({ ...prev, accent: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span>描述</span>
            <input
              type="text"
              name="site_desc_field"
              autoComplete="off"
              readOnly={isReadOnly}
              onFocus={() => setIsReadOnly(false)}
              value={form.description}
              onChange={(event) => onFormChange((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="实用快捷入口"
            />
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="action-button ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="action-button primary" onClick={onSave}>
            {editingCardId ? '保存修改' : '保存站点'}
          </button>
        </div>
      </div>
    </div>
  )
}
