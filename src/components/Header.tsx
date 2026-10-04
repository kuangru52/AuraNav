import React from 'react'
import { LogoIcon } from './LogoIcon'
import type { PageLayoutSettings } from '../types'
import { getFormattedDateStrings } from '../utils/timeUtils'

type HeaderProps = {
  isEditing: boolean
  onToggleEditing: () => void
  onOpenSettings: () => void
  showQuickMenu: boolean
  onToggleQuickMenu: () => void
  quickMenuRef: React.RefObject<HTMLDivElement>
  style?: React.CSSProperties
  pageLayoutSettings?: PageLayoutSettings
}

export function Header({
  isEditing,
  onToggleEditing,
  onOpenSettings,
  showQuickMenu,
  onToggleQuickMenu,
  quickMenuRef,
  style,
  pageLayoutSettings,
}: HeaderProps) {
  const showLogo = pageLayoutSettings?.showLogo ?? true
  const logoUrl = pageLayoutSettings?.logoUrl ?? ''
  const logoSize = pageLayoutSettings?.logoSize ?? 38
  const showBrandName = pageLayoutSettings?.showBrandName ?? true
  const brandName = pageLayoutSettings?.brandName ?? '栖屿'
  const brandNameFontSize = pageLayoutSettings?.brandNameFontSize ?? 18
  const brandNameColor = pageLayoutSettings?.brandNameColor ?? '#f8fafc'
  const showBrandSubtitle = pageLayoutSettings?.showBrandSubtitle ?? true
  const brandSubtitle = pageLayoutSettings?.brandSubtitle ?? '个人导航'
  const brandSubtitleFontSize = pageLayoutSettings?.brandSubtitleFontSize ?? 12
  const brandSubtitleColor = pageLayoutSettings?.brandSubtitleColor ?? 'rgba(226, 232, 240, 0.7)'

  const showClock = pageLayoutSettings?.showClock ?? true
  const clockFontSize = pageLayoutSettings?.clockFontSize ?? 20
  const clockColor = pageLayoutSettings?.clockColor ?? '#f8fafc'
  const showDate = pageLayoutSettings?.showDate ?? true
  const dateFontSize = pageLayoutSettings?.dateFontSize ?? 12
  const dateColor = pageLayoutSettings?.dateColor ?? 'rgba(226, 232, 240, 0.75)'

  const [timeData, setTimeData] = React.useState(() => getFormattedDateStrings())

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeData(getFormattedDateStrings())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <header className="topbar" style={style}>
      <div className="brand-wrap">
        {showLogo && (
          <div
            className="brand-mark"
            style={{
              width: `${logoSize}px`,
              height: `${logoSize}px`,
              ...(logoUrl ? { background: 'transparent', boxShadow: 'none', padding: 0 } : {}),
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="logo"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }}
              />
            ) : (
              <LogoIcon />
            )}
          </div>
        )}
        {(showBrandName || showBrandSubtitle) && (
          <div>
            {showBrandName && (
              <div
                className="brand-name"
                style={{
                  fontSize: `${brandNameFontSize}px`,
                  color: brandNameColor,
                }}
              >
                {brandName}
              </div>
            )}
            {showBrandSubtitle && (
              <div
                className="brand-subtitle"
                style={{
                  fontSize: `${brandSubtitleFontSize}px`,
                  color: brandSubtitleColor,
                }}
              >
                {brandSubtitle}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 顶栏中间：时钟与日期显示（手机端隐去） */}
      {(showClock || showDate) && (
        <div className="topbar-time-wrap">
          {showClock && (
            <div
              className="topbar-clock"
              style={{
                fontSize: `${clockFontSize}px`,
                color: clockColor,
              }}
            >
              {timeData.clockStr}
            </div>
          )}
          {showDate && (
            <div
              className="topbar-date"
              style={{
                fontSize: `${dateFontSize}px`,
                color: dateColor,
              }}
            >
              {timeData.dateStr}
            </div>
          )}
        </div>
      )}

      <div className="toolbar">
        {isEditing && (
          <button type="button" className="action-button primary" onClick={onToggleEditing}>
            退出编辑模式
          </button>
        )}
        <div className="quick-menu-wrap" ref={quickMenuRef}>
          <button
            type="button"
            className="ghost-toggle"
            onClick={onToggleQuickMenu}
            aria-label="打开菜单"
            aria-haspopup="menu"
            aria-expanded={showQuickMenu}
          >
            ☰
          </button>
          {showQuickMenu && (
            <div className="quick-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onToggleEditing()
                  onToggleQuickMenu()
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span>{isEditing ? '退出编辑' : '编辑模式'}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onOpenSettings()
                  onToggleQuickMenu()
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span>设置</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
