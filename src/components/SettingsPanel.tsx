import React from 'react'
import type { WallpaperSettings, Credentials, SiteCard, NormalGlassSettings, PageLayoutSettings } from '../types'
import { compressImage } from '../utils/imageUtils'
import { LogoIcon } from './LogoIcon'
import { getOnlineWallpapers } from '../utils/wallpaperUtils'
import { APP_VERSION, isNewerVersion } from '../utils/versionUtils'

type SettingsPanelProps = {
  showSettings: boolean
  settingsCategory: 'wallpaper' | 'glass' | 'page' | 'account' | 'backup' | 'storage' | 'about'
  onSettingsCategoryChange: (category: 'wallpaper' | 'glass' | 'page' | 'account' | 'backup' | 'storage' | 'about') => void
  onClose: () => void
  pageLayoutSettings: PageLayoutSettings
  onPageLayoutSettingsChange: React.Dispatch<React.SetStateAction<PageLayoutSettings>>
  wallpaperSettings: WallpaperSettings
  onWallpaperSettingsChange: React.Dispatch<React.SetStateAction<WallpaperSettings>>
  intervalDraft: string
  onIntervalDraftChange: (val: string) => void
  commitWallpaperInterval: () => void
  localWallpapers: string[]
  handleWallpaperFiles: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  clearLocalWallpapers: () => void
  bingRefreshKey: number
  onRefreshBing: () => void
  isBingLoading: boolean
  bingWallpaperError: boolean
  bingWallpaper: string
  selectedWallpaperUrls: string[]
  onToggleSelectWallpaper: (url: string) => void
  wallpaperSelectionMode?: 'single' | 'carousel'
  onWallpaperSelectionModeChange?: (mode: 'single' | 'carousel') => void
  normalSettings: NormalGlassSettings
  updateNormalGlass: <K extends keyof NormalGlassSettings>(key: K, value: NormalGlassSettings[K]) => void
  currentWallpaper: string
  credentials: Credentials
  currentUser?: { username: string; isAdmin: boolean }
  onLogout: () => void
  cards: SiteCard[]
  groups: string[]
  storedIcons: string[]
  onRestoreData: (data: any) => void
  onSyncData: () => void
  onDeleteWallpaper?: (index: number) => void
  onResetCardIcon?: (cardId: string) => void
  onBatchUploadIcons?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onDeleteStoredIcon?: (index: number) => void
}

export function SettingsPanel({
  showSettings,
  settingsCategory,
  onSettingsCategoryChange,
  onClose,
  pageLayoutSettings,
  onPageLayoutSettingsChange,
  wallpaperSettings,
  onWallpaperSettingsChange,
  intervalDraft,
  onIntervalDraftChange,
  commitWallpaperInterval,
  localWallpapers,
  handleWallpaperFiles,
  clearLocalWallpapers,
  bingRefreshKey = 0,
  onRefreshBing,
  isBingLoading,
  bingWallpaperError,
  bingWallpaper,
  selectedWallpaperUrls,
  onToggleSelectWallpaper,
  wallpaperSelectionMode = 'single',
  onWallpaperSelectionModeChange = () => {},
  normalSettings,
  updateNormalGlass,
  currentWallpaper,
  credentials,
  currentUser = { username: credentials.username || 'admin', isAdmin: true },
  onLogout,
  cards,
  storedIcons,
  onDeleteWallpaper,
  onResetCardIcon,
  onBatchUploadIcons,
  onDeleteStoredIcon,
}: SettingsPanelProps) {
  const [panelOffset, setPanelOffset] = React.useState({ x: 0, y: 0 })
  const isDraggingRef = React.useRef(false);
  const dragStartRef = React.useRef({ x: 0, y: 0 });

  const [storageTab, setStorageTab] = React.useState<'icon' | 'wallpaper'>('icon')
  const [wallpaperTab, setWallpaperTab] = React.useState<'online' | 'local'>('online')
  const [pageTab, setPageTab] = React.useState<'topbar' | 'category' | 'cards' | 'widgets'>('topbar')
  const [showLogoGallery, setShowLogoGallery] = React.useState(false)
  const [showLogoUrlInput, setShowLogoUrlInput] = React.useState(false)
  const [showDonateModal, setShowDonateModal] = React.useState(false)
  const [updateStatus, setUpdateStatus] = React.useState<'latest' | 'has_update' | 'checking' | 'error'>('checking')
  const [remoteLatestVersion, setRemoteLatestVersion] = React.useState<string>('')
  const [isSpinning, setIsSpinning] = React.useState(false)

  React.useEffect(() => {
    if (settingsCategory === 'about') {
      setUpdateStatus('checking')
      fetch('/api/check-update')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success && data.latestVersion) {
            setRemoteLatestVersion(data.latestVersion)
            if (isNewerVersion(data.latestVersion, APP_VERSION)) {
              setUpdateStatus('has_update')
            } else {
              setUpdateStatus('latest')
            }
          } else {
            setUpdateStatus('error')
          }
        })
        .catch(() => setUpdateStatus('error'))
    }
  }, [settingsCategory])

  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('.close-button') || (event.target as HTMLElement).closest('button')) return;
    isDraggingRef.current = true;
    dragStartRef.current = { x: event.clientX - panelOffset.x, y: event.clientY - panelOffset.y };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    setPanelOffset({
      x: event.clientX - dragStartRef.current.x,
      y: event.clientY - dragStartRef.current.y,
    })
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    try {
      (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {}
  }

  // 1. 导出/还原卡片数据 JSON
  const handleDownloadCards = () => { window.open('/api/backup/cards', '_blank') }
  const handleRestoreCards = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const res = await fetch('/api/restore/cards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text })
      const data = await res.json()
      if (res.ok && data.success) {
        alert('网站卡片与分组结构成功还原！')
        window.location.reload()
      } else alert(`还原失败：${data.error || '数据格式不匹配'}`)
    } catch { alert('无法读取选中的 JSON 文件') }
    finally { e.target.value = '' }
  }

  // 2. 导出/还原系统外观配置 JSON
  const handleDownloadConfig = () => { window.open('/api/backup/config', '_blank') }
  const handleRestoreConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const res = await fetch('/api/restore/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: text })
      const data = await res.json()
      if (res.ok && data.success) {
        alert('系统与页面外观配置成功还原！')
        window.location.reload()
      } else alert(`还原失败：${data.error || '数据格式不匹配'}`)
    } catch { alert('无法读取选中的 JSON 文件') }
    finally { e.target.value = '' }
  }

  // 3. 导出/还原图标包 (.zip)
  const handleDownloadIconsZip = () => { window.open('/api/backup/icons', '_blank') }
  const handleRestoreIconsZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const arrayBuffer = await file.arrayBuffer()
      const res = await fetch('/api/restore/icons', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: arrayBuffer })
      const data = await res.json()
      if (res.ok && data.success) {
        alert(`图标库成功解压还原 ${data.count ?? ''} 个图标！`)
        window.location.reload()
      } else alert(`图标包还原失败：${data.error || '文件非标准 ZIP'}`)
    } catch { alert('解压文件失败，请检查是否为有效的 ZIP 格式') }
    finally { e.target.value = '' }
  }

  // 4. 导出/还原壁纸包 (.zip)
  const handleDownloadWallpapersZip = () => { window.open('/api/backup/wallpapers', '_blank') }
  const handleRestoreWallpapersZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const arrayBuffer = await file.arrayBuffer()
      const res = await fetch('/api/restore/wallpapers', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: arrayBuffer })
      const data = await res.json()
      if (res.ok && data.success) {
        alert(`壁纸库成功解压还原 ${data.count ?? ''} 张壁纸！`)
        window.location.reload()
      } else alert(`壁纸包还原失败：${data.error || '文件非标准 ZIP'}`)
    } catch { alert('解压文件失败，请检查是否为有效的 ZIP 格式') }
    finally { e.target.value = '' }
  }

  // 5. 导出/还原全量完整备份包 (.zip)
  const handleDownloadFullZip = () => { window.open('/api/backup/full', '_blank') }
  const handleRestoreFullZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('提示：全量恢复将一次性还原卡片数据、外观设置、图标库与壁纸库，确定继续？')) {
      e.target.value = ''
      return
    }
    try {
      const arrayBuffer = await file.arrayBuffer()
      const res = await fetch('/api/restore/full', { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: arrayBuffer })
      const data = await res.json()
      if (res.ok && data.success) {
        alert('全量整站数据与图片文件成功全量还原！')
        window.location.reload()
      } else alert(`全量还原失败：${data.error || '文件格式错误'}`)
    } catch { alert('解压全量包失败') }
    finally { e.target.value = '' }
  }

  return (
    <aside
      className={`settings-panel ${showSettings ? 'visible' : 'hidden'}`}
      style={{
        transform: `translate(calc(-50% + ${panelOffset.x}px), ${panelOffset.y}px)`,
      }}
    >
      <div
        className="settings-panel-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="settings-header-title">
          <h3>设置</h3>
        </div>
        <button type="button" className="close-button" onClick={onClose} aria-label="关闭设置">
          ×
        </button>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="设置分类">
        <button
          type="button"
          role="tab"
          aria-selected={settingsCategory === 'wallpaper'}
          className={settingsCategory === 'wallpaper' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => onSettingsCategoryChange('wallpaper')}
        >
          <span>壁</span>
          <span>纸</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsCategory === 'glass'}
          className={settingsCategory === 'glass' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => onSettingsCategoryChange('glass')}
        >
          <span>卡片风格</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsCategory === 'page'}
          className={settingsCategory === 'page' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => onSettingsCategoryChange('page')}
        >
          <span>页</span>
          <span>面</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsCategory === 'backup'}
          className={settingsCategory === 'backup' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => onSettingsCategoryChange('backup')}
        >
          <span>数据同步</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsCategory === 'storage'}
          className={settingsCategory === 'storage' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => onSettingsCategoryChange('storage')}
        >
          <span>数据目录</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsCategory === 'account'}
          className={settingsCategory === 'account' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => onSettingsCategoryChange('account')}
        >
          <span>账户安全</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={settingsCategory === 'about'}
          className={settingsCategory === 'about' ? 'settings-tab active' : 'settings-tab'}
          onClick={() => onSettingsCategoryChange('about')}
        >
          <span>关</span>
          <span>于</span>
        </button>
      </div>

      <section className="settings-section" hidden={settingsCategory !== 'wallpaper'} style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '380px' }}>
          <div>
            {/* 顶层工具栏：【网络 / 本地】居中，【单图 / 轮播】放在右侧且样式区分 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', position: 'relative' }}>
              {/* 左侧空占位，保证【网络 / 本地】在正中间 */}
              <div style={{ width: '140px' }} className="mobile-hide" />

              {/* 居中：【网络 / 本地】 (保持原样) */}
              <div className="mode-switch" style={{ width: '180px' }}>
                <button
                  type="button"
                  className={wallpaperTab === 'online' ? 'mode-button active' : 'mode-button'}
                  onClick={() => setWallpaperTab('online')}
                >
                  网络
                </button>
                <button
                  type="button"
                  className={wallpaperTab === 'local' ? 'mode-button active' : 'mode-button'}
                  onClick={() => setWallpaperTab('local')}
                >
                  本地
                </button>
              </div>

              {/* 靠右：【单图 / 轮播】 (紫蓝亮彩专属胶囊，与网络/本地明确区分) */}
              <div
                className="selection-mode-switch"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.75)',
                  padding: '3px',
                  borderRadius: '999px',
                  border: '1px solid rgba(192, 132, 252, 0.45)',
                  boxShadow: '0 4px 16px rgba(168, 85, 247, 0.2)',
                  width: '140px',
                }}
              >
                <button
                  type="button"
                  onClick={() => onWallpaperSelectionModeChange('single')}
                  style={{
                    flex: 1,
                    height: '30px',
                    borderRadius: '999px',
                    border: 0,
                    background: wallpaperSelectionMode === 'single' ? 'linear-gradient(135deg, #38bdf8, #0284c7)' : 'transparent',
                    color: wallpaperSelectionMode === 'single' ? '#ffffff' : 'rgba(226, 232, 240, 0.75)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: wallpaperSelectionMode === 'single' ? '0 2px 8px rgba(56, 189, 248, 0.4)' : 'none',
                  }}
                >
                  单图
                </button>
                <button
                  type="button"
                  onClick={() => onWallpaperSelectionModeChange('carousel')}
                  style={{
                    flex: 1,
                    height: '30px',
                    borderRadius: '999px',
                    border: 0,
                    background: wallpaperSelectionMode === 'carousel' ? 'linear-gradient(135deg, #c084fc, #9333ea)' : 'transparent',
                    color: wallpaperSelectionMode === 'carousel' ? '#ffffff' : 'rgba(226, 232, 240, 0.75)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: wallpaperSelectionMode === 'carousel' ? '0 2px 8px rgba(168, 85, 247, 0.4)' : 'none',
                  }}
                >
                  轮播
                </button>
              </div>
            </div>

            {/* 网络壁纸 选项卡 */}
            {wallpaperTab === 'online' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <small style={{ fontSize: '0.75rem', color: 'rgba(226,232,240,0.5)' }}>
                    选择网络壁纸
                  </small>
                  <button
                    type="button"
                    className="mini-button wallpaper-refresh"
                    onClick={() => {
                      setIsSpinning(true)
                      setTimeout(() => setIsSpinning(false), 800)
                      onRefreshBing()
                    }}
                    disabled={isBingLoading || isSpinning}
                    title="刷新下边所有在线壁纸源"
                    style={{
                      width: '36px',
                      height: '36px',
                      padding: 0,
                      borderRadius: '10px',
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(56, 189, 248, 0.15)',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      color: '#38bdf8',
                      cursor: 'pointer',
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: isSpinning || isBingLoading ? 'spin 0.8s ease-in-out' : 'none',
                      }}
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
                      <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"/>
                    </svg>
                  </button>
                </div>
                {bingWallpaperError && (
                  <small className="helper-text">每日壁纸暂不可用，请检查网络后重试</small>
                )}

                {/* 网络壁纸缩略图网格（标题与来源放置于壁纸图片框外部下方） */}
                <div className="wallpaper-grid-scroll">
                  {getOnlineWallpapers(bingWallpaper, bingRefreshKey).map((preset) => {
                    const isSelected = selectedWallpaperUrls.includes(preset.url)
                    return (
                      <div
                        key={preset.id}
                        onClick={() => onToggleSelectWallpaper(preset.url)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {/* 16:9 壁纸图片框 */}
                        <div
                          style={{
                            position: 'relative',
                            aspectRatio: '16 / 9',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            border: isSelected ? '2.5px solid #22c55e' : '1px solid rgba(255,255,255,0.18)',
                            boxShadow: isSelected ? '0 0 14px rgba(34, 197, 94, 0.45)' : '0 4px 12px rgba(0,0,0,0.25)',
                            background: 'rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            referrerPolicy="no-referrer"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {isSelected && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.3)', display: 'grid', placeItems: 'center' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                                ✓
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 壁纸框下方外置标题与来源 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px', fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 500 }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preset.name}</span>
                          <span style={{ color: '#c084fc', fontSize: '0.72rem', flexShrink: 0 }}>{preset.source}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 本地壁纸 选项卡 */}
            {wallpaperTab === 'local' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <small style={{ fontSize: '0.75rem', color: 'rgba(226,232,240,0.5)' }}>
                    本地添加的壁纸缩略图 ({localWallpapers.length} 张)
                  </small>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      id="wallpaper-file-input"
                      onChange={handleWallpaperFiles}
                    />
                    <label
                      htmlFor="wallpaper-file-input"
                      title="上传本地壁纸"
                      style={{
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        background: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      + 上传壁纸
                    </label>
                    {localWallpapers.length > 0 && (
                      <button type="button" className="mini-button" onClick={clearLocalWallpapers}>
                        清空
                      </button>
                    )}
                  </div>
                </div>

                {/* 本地壁纸缩略图网格（带绿对号选择功能） */}
                {localWallpapers.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'rgba(226,232,240,0.45)', margin: 0, padding: '16px 0' }}>
                    暂无本地上传壁纸，请点击右上角【+ 上传壁纸】按钮添加。
                  </p>
                ) : (
                  <div className="wallpaper-grid-scroll">
                    {localWallpapers.map((wp, idx) => {
                      const isSelected = selectedWallpaperUrls.includes(wp)
                      return (
                        <div
                          key={idx}
                          onClick={() => onToggleSelectWallpaper(wp)}
                          style={{
                            position: 'relative',
                            aspectRatio: '16 / 9',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isSelected ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.18)',
                            boxShadow: isSelected ? '0 0 12px rgba(34, 197, 94, 0.4)' : 'none',
                            background: 'rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <img src={wp} alt={`wp-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          {isSelected && (
                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.3)', display: 'grid', placeItems: 'center' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#22c55e', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                                ✓
                              </div>
                            </div>
                          )}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', fontSize: '0.72rem', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                            <span>本地壁纸 #{idx + 1}</span>
                            {onDeleteWallpaper && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDeleteWallpaper(idx)
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 0,
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '12px',
                                }}
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 最下部分：左边壁纸模糊度拖动条 + 右边轮播时间 (仅轮播模式显示) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              paddingTop: '14px',
            }}
          >
            {/* 左边：壁纸模糊度拖动条 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'rgba(226,232,240,0.85)' }}>
                <span>壁纸模糊度</span>
                <output style={{ fontSize: '0.8rem', color: '#38bdf8' }}>{wallpaperSettings.blur}px</output>
              </div>
              <input
                type="range"
                min="0"
                max="18"
                step="1"
                value={wallpaperSettings.blur}
                onChange={(event) =>
                  onWallpaperSettingsChange((prev) => ({ ...prev, blur: Number(event.target.value) }))
                }
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* 右边：仅在轮播模式下才显示轮播时间 */}
            {wallpaperSelectionMode === 'carousel' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(226,232,240,0.85)', whiteSpace: 'nowrap' }}>轮播时间</span>
                <input
                  type="number"
                  min="3"
                  step="1"
                  value={intervalDraft}
                  onChange={(event) => onIntervalDraftChange(event.target.value)}
                  onBlur={commitWallpaperInterval}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  style={{
                    width: '60px',
                    height: '34px',
                    padding: '0 6px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    color: '#fff',
                    textAlign: 'center',
                    outline: 'none',
                    fontSize: '0.85rem',
                  }}
                />
                <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.6)' }}>秒</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="settings-section" hidden={settingsCategory !== 'glass'}>
        <div className="glass-preview-wrap">
          <div
            className="glass-preview-stage"
            style={{
              backgroundImage: currentWallpaper ? `url("${currentWallpaper}")` : undefined,
            }}
          >
            {(() => {
              return (
                <div
                  className={'glass-preview-card'}
                  style={{
                    borderRadius: `${normalSettings.cornerRadius}px`,
                    backgroundColor: `rgba(255, 255, 255, ${normalSettings.opacity * 0.35})`,
                    backdropFilter: `blur(${normalSettings.blur}px)`,
                    WebkitBackdropFilter: `blur(${normalSettings.blur}px)`,
                    border: `1px solid rgba(255, 255, 255, ${normalSettings.edgeHighlight * 0.8})`,
                    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.25)`,
                  }}
                >
                  <div className="site-card">
                    <div className="site-icon" style={{ color: '#38bdf8' }}>栖</div>
                    <div className="site-body">
                      <h4>示例网站</h4>
                      <p>example.com</p>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        <div className="settings-grid glass-settings-grid">
          <div className="setting-group">
            <label htmlFor="normal-blur">
              <span>背景高斯模糊</span>
              <output>{normalSettings.blur}px</output>
            </label>
            <input
              id="normal-blur"
              type="range"
              min={0}
              max={40}
              step={1}
              value={normalSettings.blur}
              onChange={(e) => updateNormalGlass('blur', Number(e.target.value))}
            />
          </div>
          <div className="setting-group">
            <label htmlFor="normal-opacity">
              <span>玻璃不透明度</span>
              <output>{normalSettings.opacity.toFixed(2)}</output>
            </label>
            <input
              id="normal-opacity"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={normalSettings.opacity}
              onChange={(e) => updateNormalGlass('opacity', Number(e.target.value))}
            />
          </div>
          <div className="setting-group">
            <label htmlFor="normal-radius">
              <span>卡片圆角</span>
              <output>{normalSettings.cornerRadius}px</output>
            </label>
            <input
              id="normal-radius"
              type="range"
              min={0}
              max={80}
              step={1}
              value={normalSettings.cornerRadius}
              onChange={(e) => updateNormalGlass('cornerRadius', Number(e.target.value))}
            />
          </div>
          <div className="setting-group">
            <label htmlFor="normal-edge">
              <span>边缘高光</span>
              <output>{normalSettings.edgeHighlight.toFixed(2)}</output>
            </label>
            <input
              id="normal-edge"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={normalSettings.edgeHighlight}
              onChange={(e) => updateNormalGlass('edgeHighlight', Number(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* 页面布局设置 section */}
      <section className="settings-section" hidden={settingsCategory !== 'page'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 子选项卡 (顶栏 | 分类 | 卡片 | 时间与搜索 - 移动端自适应2x2) */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="mode-switch page-subtabs-switch">
              <button
                type="button"
                className={pageTab === 'topbar' ? 'mode-button active' : 'mode-button'}
                onClick={() => setPageTab('topbar')}
              >
                顶栏
              </button>
              <button
                type="button"
                className={pageTab === 'category' ? 'mode-button active' : 'mode-button'}
                onClick={() => setPageTab('category')}
              >
                分类
              </button>
              <button
                type="button"
                className={pageTab === 'cards' ? 'mode-button active' : 'mode-button'}
                onClick={() => setPageTab('cards')}
              >
                卡片
              </button>
              <button
                type="button"
                className={pageTab === 'widgets' ? 'mode-button active' : 'mode-button'}
                onClick={() => setPageTab('widgets')}
              >
                时间与搜索
              </button>
            </div>
          </div>

          {/* 子选项卡 1：顶栏设置 */}
          {pageTab === 'topbar' && (
            <div className="settings-grid page-topbar-grid">
              <div className="setting-group">
                <label>
                  <span>左右边距</span>
                  <output>{pageLayoutSettings.topbarPaddingX}px</output>
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={2}
                  value={pageLayoutSettings.topbarPaddingX}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, topbarPaddingX: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <label>
                  <span>顶部边距</span>
                  <output>{pageLayoutSettings.topbarPaddingTop}px</output>
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={pageLayoutSettings.topbarPaddingTop}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, topbarPaddingTop: Number(e.target.value) }))
                  }
                />
              </div>

              {/* Logo 自定义 */}
              <div className="setting-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="setting-label" style={{ fontWeight: 600, color: '#f8fafc' }}>左上角 Logo 设置</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={pageLayoutSettings.showLogo}
                      onChange={(e) =>
                        onPageLayoutSettingsChange((prev) => ({ ...prev, showLogo: e.target.checked }))
                      }
                    />
                    <span>显示 Logo</span>
                  </label>
                </div>
                {pageLayoutSettings.showLogo && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    {/* 行 1：Logo 标志 + 品牌主副标题实时预览 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: `${Math.max(32, Math.min(52, pageLayoutSettings.logoSize))}px`,
                          height: `${Math.max(32, Math.min(52, pageLayoutSettings.logoSize))}px`,
                          borderRadius: '12px',
                          background: pageLayoutSettings.logoUrl ? 'transparent' : 'rgba(15, 23, 42, 0.6)',
                          border: pageLayoutSettings.logoUrl ? 'none' : '1px solid rgba(255, 255, 255, 0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                      >
                        {pageLayoutSettings.logoUrl ? (
                          <img
                            src={pageLayoutSettings.logoUrl}
                            alt="Logo 实时预览"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit', display: 'block' }}
                          />
                        ) : (
                          <div style={{ width: '80%', height: '80%', display: 'grid', placeItems: 'center' }}>
                            <LogoIcon />
                          </div>
                        )}
                      </div>

                      <div>
                        {pageLayoutSettings.showBrandName && (
                          <div style={{ fontSize: '0.95rem', color: pageLayoutSettings.brandNameColor, fontWeight: 700, lineHeight: 1.2 }}>
                            {pageLayoutSettings.brandName || '栖屿'}
                          </div>
                        )}
                        {pageLayoutSettings.showBrandSubtitle && (
                          <div style={{ fontSize: '0.75rem', color: pageLayoutSettings.brandSubtitleColor, lineHeight: 1.2, marginTop: '2px' }}>
                            {pageLayoutSettings.brandSubtitle || '个人导航'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 行 2：Logo 尺寸滑动条 (左) + 3 个功能图标按键 (右侧红圈位置 - 同行并排) */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                      {/* 左侧：Logo 尺寸 Slider */}
                      <label style={{ display: 'grid', gap: '4px', width: '220px', maxWidth: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(226,232,240,0.75)' }}>
                          <span>Logo 尺寸</span>
                          <output style={{ color: '#38bdf8' }}>{pageLayoutSettings.logoSize}px</output>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={64}
                          step={1}
                          value={pageLayoutSettings.logoSize}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, logoSize: Number(e.target.value) }))
                          }
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </label>

                      {/* 右侧红圈位置：三个标志性 SVG 功能按键 */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          id="logo-file-input"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            try {
                              const base64 = await compressImage(file, 128, 128, 0.85)
                              const res = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'icon', base64 }),
                              })
                              const data = await res.json()
                              const logoUrl = res.ok && data.success && data.url ? data.url : base64
                              onPageLayoutSettingsChange((prev) => ({ ...prev, logoUrl }))
                            } catch {
                              const fallback = await compressImage(file)
                              onPageLayoutSettingsChange((prev) => ({ ...prev, logoUrl: fallback }))
                            } finally {
                              e.target.value = ''
                            }
                          }}
                        />

                        {/* 1. 本地上传 📤 */}
                        <label
                          htmlFor="logo-file-input"
                          title="1. 本地文件上传 Logo"
                          style={{
                            cursor: 'pointer',
                            width: '38px',
                            height: '38px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(255,255,255,0.22)',
                            borderRadius: '10px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            padding: 0,
                            margin: 0,
                            boxSizing: 'border-box',
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: 0 }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                        </label>

                        {/* 2. 从服务器/数据目录选择 🗂️ */}
                        <button
                          type="button"
                          title="2. 从服务器/数据目录图库选择"
                          onClick={() => setShowLogoGallery((prev) => !prev)}
                          style={{
                            cursor: 'pointer',
                            width: '38px',
                            height: '38px',
                            display: 'grid',
                            placeItems: 'center',
                            border: '1px solid rgba(255,255,255,0.22)',
                            borderRadius: '10px',
                            background: showLogoGallery ? 'rgba(168, 85, 247, 0.35)' : 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </button>

                        {/* 3. 网络链接 🌐 */}
                        <button
                          type="button"
                          title="3. 输入网络图片链接"
                          onClick={() => setShowLogoUrlInput((prev) => !prev)}
                          style={{
                            cursor: 'pointer',
                            width: '38px',
                            height: '38px',
                            display: 'grid',
                            placeItems: 'center',
                            border: '1px solid rgba(255,255,255,0.22)',
                            borderRadius: '10px',
                            background: showLogoUrlInput ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.15)',
                            color: '#4ade80',
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" y1="12" x2="22" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                        </button>

                        {pageLayoutSettings.logoUrl && (
                          <button
                            type="button"
                            onClick={() => onPageLayoutSettingsChange((prev) => ({ ...prev, logoUrl: '' }))}
                            className="mini-button"
                            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                          >
                            恢复默认
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 网络链接输入框 */}
                    {showLogoUrlInput && (
                      <input
                        type="text"
                        placeholder="请输入网络 Logo 图片 URL (https://...)"
                        value={pageLayoutSettings.logoUrl}
                        onChange={(e) =>
                          onPageLayoutSettingsChange((prev) => ({ ...prev, logoUrl: e.target.value }))
                        }
                        style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(15,23,42,0.6)', color: '#fff', outline: 'none', fontSize: '0.8rem' }}
                      />
                    )}

                    {/* 服务器/数据目录图库选择面板 */}
                    {showLogoGallery && (
                      <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(226,232,240,0.7)', display: 'block', marginBottom: '6px' }}>
                          点击选择已存图标或壁纸作为 Logo：
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                          {storedIcons.map((icon, idx) => (
                            <img
                              key={idx}
                              src={icon}
                              alt="icon"
                              onClick={() => {
                                onPageLayoutSettingsChange((prev) => ({ ...prev, logoUrl: icon }))
                                setShowLogoGallery(false)
                              }}
                              style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 主标题自定义 */}
              <div className="setting-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="setting-label" style={{ fontWeight: 600, color: '#f8fafc' }}>主标题设置</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={pageLayoutSettings.showBrandName}
                      onChange={(e) =>
                        onPageLayoutSettingsChange((prev) => ({ ...prev, showBrandName: e.target.checked }))
                      }
                    />
                    <span>显示主标题</span>
                  </label>
                </div>
                {pageLayoutSettings.showBrandName && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                    {/* 行 1：主标题文本输入框独立一行 */}
                    <label style={{ display: 'grid', gap: '4px', width: '100%' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>主标题文本</span>
                      <input
                        type="text"
                        value={pageLayoutSettings.brandName}
                        onChange={(e) =>
                          onPageLayoutSettingsChange((prev) => ({ ...prev, brandName: e.target.value }))
                        }
                        style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.4)', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </label>

                    {/* 行 2：字号大小与颜色换行显示 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '12px', alignItems: 'center' }}>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>
                          <span>字号大小</span>
                          <output>{pageLayoutSettings.brandNameFontSize}px</output>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={32}
                          step={1}
                          value={pageLayoutSettings.brandNameFontSize}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, brandNameFontSize: Number(e.target.value) }))
                          }
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>颜色</span>
                        <input
                          type="color"
                          value={pageLayoutSettings.brandNameColor}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, brandNameColor: e.target.value }))
                          }
                          style={{ height: '32px', width: '100%', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer' }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* 副标题自定义 */}
              <div className="setting-group" style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="setting-label" style={{ fontWeight: 600, color: '#f8fafc' }}>副标题设置</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={pageLayoutSettings.showBrandSubtitle}
                      onChange={(e) =>
                        onPageLayoutSettingsChange((prev) => ({ ...prev, showBrandSubtitle: e.target.checked }))
                      }
                    />
                    <span>显示副标题</span>
                  </label>
                </div>
                {pageLayoutSettings.showBrandSubtitle && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                    {/* 行 1：副标题文本输入框独立一行 */}
                    <label style={{ display: 'grid', gap: '4px', width: '100%' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>副标题文本</span>
                      <input
                        type="text"
                        value={pageLayoutSettings.brandSubtitle}
                        onChange={(e) =>
                          onPageLayoutSettingsChange((prev) => ({ ...prev, brandSubtitle: e.target.value }))
                        }
                        style={{ height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.4)', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </label>

                    {/* 行 2：字号大小与颜色换行显示 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px', gap: '12px', alignItems: 'center' }}>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>
                          <span>字号大小</span>
                          <output>{pageLayoutSettings.brandSubtitleFontSize}px</output>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={24}
                          step={1}
                          value={pageLayoutSettings.brandSubtitleFontSize}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, brandSubtitleFontSize: Number(e.target.value) }))
                          }
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>颜色</span>
                        <input
                          type="color"
                          value={pageLayoutSettings.brandSubtitleColor.startsWith('#') ? pageLayoutSettings.brandSubtitleColor : '#94a3b8'}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, brandSubtitleColor: e.target.value }))
                          }
                          style={{ height: '32px', width: '100%', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer' }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 子选项卡 2：分类设置 */}
          {pageTab === 'category' && (
            <div className="settings-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
              <div className="setting-group">
                <label>
                  <span>左右边距</span>
                  <output>{pageLayoutSettings.categoryPaddingX}px</output>
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={2}
                  value={pageLayoutSettings.categoryPaddingX}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, categoryPaddingX: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <label>
                  <span>顶部边距</span>
                  <output>{pageLayoutSettings.categoryMarginTop}px</output>
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={pageLayoutSettings.categoryMarginTop}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, categoryMarginTop: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="setting-label">分类位置排列</span>
                  {pageLayoutSettings.showSearchBar && (
                    <small style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                      (开启搜索框时，分类位置限定为居左或居右)
                    </small>
                  )}
                </div>
                <div className="mode-switch" style={{ width: pageLayoutSettings.showSearchBar ? '180px' : '240px', gridTemplateColumns: pageLayoutSettings.showSearchBar ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))' }}>
                  <button
                    type="button"
                    className={pageLayoutSettings.categoryAlign === 'flex-start' ? 'mode-button active' : 'mode-button'}
                    onClick={() => onPageLayoutSettingsChange((prev) => ({ ...prev, categoryAlign: 'flex-start' }))}
                  >
                    居左
                  </button>
                  {!pageLayoutSettings.showSearchBar && (
                    <button
                      type="button"
                      className={pageLayoutSettings.categoryAlign === 'center' ? 'mode-button active' : 'mode-button'}
                      onClick={() => onPageLayoutSettingsChange((prev) => ({ ...prev, categoryAlign: 'center' }))}
                    >
                      居中
                    </button>
                  )}
                  <button
                    type="button"
                    className={pageLayoutSettings.categoryAlign === 'flex-end' ? 'mode-button active' : 'mode-button'}
                    onClick={() => onPageLayoutSettingsChange((prev) => ({ ...prev, categoryAlign: 'flex-end' }))}
                  >
                    居右
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 子选项卡 3：卡片网格设置 */}
          {pageTab === 'cards' && (
            <div className="settings-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
              <div className="setting-group">
                <label>
                  <span>左右边距</span>
                  <output>{pageLayoutSettings.cardGridPaddingX}px</output>
                </label>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={2}
                  value={pageLayoutSettings.cardGridPaddingX}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, cardGridPaddingX: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <label>
                  <span>顶部边距</span>
                  <output>{pageLayoutSettings.cardGridPaddingTop}px</output>
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={pageLayoutSettings.cardGridPaddingTop}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, cardGridPaddingTop: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <label>
                  <span>每行卡片数量</span>
                  <output>{pageLayoutSettings.cardsPerRow} 个</output>
                </label>
                <input
                  type="range"
                  min={2}
                  max={12}
                  step={1}
                  value={pageLayoutSettings.cardsPerRow}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, cardsPerRow: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <label>
                  <span>卡片高度</span>
                  <output>{pageLayoutSettings.cardHeight}px</output>
                </label>
                <input
                  type="range"
                  min={48}
                  max={120}
                  step={2}
                  value={pageLayoutSettings.cardHeight}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, cardHeight: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <label>
                  <span>卡片左右间距</span>
                  <output>{pageLayoutSettings.cardGapX}px</output>
                </label>
                <input
                  type="range"
                  min={4}
                  max={40}
                  step={1}
                  value={pageLayoutSettings.cardGapX}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, cardGapX: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="setting-group">
                <label>
                  <span>卡片上下间距</span>
                  <output>{pageLayoutSettings.cardGapY}px</output>
                </label>
                <input
                  type="range"
                  min={4}
                  max={40}
                  step={1}
                  value={pageLayoutSettings.cardGapY}
                  onChange={(e) =>
                    onPageLayoutSettingsChange((prev) => ({ ...prev, cardGapY: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
          )}

          {/* 子选项卡 4：时间与搜索框独立卡片 */}
          {pageTab === 'widgets' && (
            <div className="settings-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr)', gap: '16px' }}>
              {/* 1. 顶栏时间与日期设置 */}
              <div className="setting-group" style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="setting-label" style={{ fontWeight: 600, color: '#f8fafc', display: 'block', marginBottom: '10px' }}>
                  顶栏时间与日期设置 (手机端自动隐藏)
                </span>

                {/* 时钟设置 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={pageLayoutSettings.showClock}
                      onChange={(e) =>
                        onPageLayoutSettingsChange((prev) => ({ ...prev, showClock: e.target.checked }))
                      }
                    />
                    <span>显示时钟</span>
                  </label>
                  {pageLayoutSettings.showClock && (
                    <>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>
                          <span>时钟字号</span>
                          <output>{pageLayoutSettings.clockFontSize}px</output>
                        </div>
                        <input
                          type="range"
                          min={14}
                          max={36}
                          step={1}
                          value={pageLayoutSettings.clockFontSize}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, clockFontSize: Number(e.target.value) }))
                          }
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>时钟颜色</span>
                        <input
                          type="color"
                          value={pageLayoutSettings.clockColor.startsWith('#') ? pageLayoutSettings.clockColor : '#f8fafc'}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, clockColor: e.target.value }))
                          }
                          style={{ height: '32px', width: '100%', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer' }}
                        />
                      </label>
                    </>
                  )}
                </div>

                {/* 日期设置 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={pageLayoutSettings.showDate}
                      onChange={(e) =>
                        onPageLayoutSettingsChange((prev) => ({ ...prev, showDate: e.target.checked }))
                      }
                    />
                    <span>显示日期</span>
                  </label>
                  {pageLayoutSettings.showDate && (
                    <>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>
                          <span>日期字号</span>
                          <output>{pageLayoutSettings.dateFontSize}px</output>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={20}
                          step={1}
                          value={pageLayoutSettings.dateFontSize}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, dateFontSize: Number(e.target.value) }))
                          }
                        />
                      </label>
                      <label style={{ display: 'grid', gap: '4px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>日期颜色</span>
                        <input
                          type="color"
                          value={pageLayoutSettings.dateColor.startsWith('#') ? pageLayoutSettings.dateColor : '#94a3b8'}
                          onChange={(e) =>
                            onPageLayoutSettingsChange((prev) => ({ ...prev, dateColor: e.target.value }))
                          }
                          style={{ height: '32px', width: '100%', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer' }}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 分类栏搜索框设置 */}
              <div className="setting-group" style={{ padding: '12px 14px', borderRadius: '14px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="setting-label" style={{ fontWeight: 600, color: '#f8fafc', display: 'block', marginBottom: '10px' }}>
                  分类栏搜索框设置 (手机端自动隐藏)
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                    <input
                      type="checkbox"
                      checked={pageLayoutSettings.showSearchBar}
                      onChange={(e) => {
                        const enabled = e.target.checked
                        onPageLayoutSettingsChange((prev) => ({
                          ...prev,
                          showSearchBar: enabled,
                          categoryAlign: enabled && prev.categoryAlign === 'center' ? 'flex-start' : prev.categoryAlign,
                        }))
                      }}
                    />
                    <span>开启分类栏居中搜索框</span>
                  </label>

                  {pageLayoutSettings.showSearchBar && (
                    <label style={{ display: 'grid', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'rgba(226,232,240,0.7)' }}>默认搜索引擎</span>
                      <select
                        value={pageLayoutSettings.defaultSearchEngine}
                        onChange={(e) =>
                          onPageLayoutSettingsChange((prev) => ({ ...prev, defaultSearchEngine: e.target.value }))
                        }
                        style={{ height: '36px', padding: '0 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(15,23,42,0.8)', color: '#fff', fontSize: '0.82rem' }}
                      >
                        <option value="baidu">百度 (Baidu)</option>
                        <option value="bing">必应 (Bing)</option>
                        <option value="google">Google</option>
                        <option value="sogou">搜狗 (Sogou)</option>
                        <option value="github">GitHub</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 关于 AuraNav section */}
      <section className="settings-section" hidden={settingsCategory !== 'about'} style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '380px', padding: '10px 0', height: '100%' }}>
          {!showDonateModal ? (
            /* 应用作者信息页面 */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', gap: '16px' }}>
              {/* Logo & App Name */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="brand-mark" style={{ width: '60px', height: '60px', display: 'grid', placeItems: 'center', borderRadius: '18px', background: 'rgba(255,255,255,0.94)', boxShadow: '0 12px 30px rgba(56, 189, 248, 0.3)' }}>
                  <LogoIcon />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
                    AuraNav
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(226, 232, 240, 0.65)' }}>
                    极简高颜值·个人导航与云端工作台
                  </p>
                </div>
              </div>

              {/* 版本与 Docker Hub 更新检查提示 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px', borderRadius: '999px', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>版本号：v{APP_VERSION}</span>
                {updateStatus === 'checking' && (
                  <span style={{ fontSize: '0.78rem', color: 'rgba(226, 232, 240, 0.6)' }}>连接 Docker Hub 检查更新中…</span>
                )}
                {updateStatus === 'latest' && (
                  <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                    ✓ 已是 Docker Hub 最新版本
                  </span>
                )}
                {updateStatus === 'has_update' && (
                  <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                    💡 发现新版本 {remoteLatestVersion} 已推送到 Docker Hub！
                  </span>
                )}
                {updateStatus === 'error' && (
                  <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(239, 68, 68, 0.18)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                    ⚠️ 网络受限，无法连接 Docker Hub 检查
                  </span>
                )}
              </div>

              {/* 项目详细信息列表 */}
              <div style={{ width: '100%', maxWidth: '520px', display: 'grid', gap: '10px', padding: '14px 16px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'rgba(226,232,240,0.65)' }}>作者</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>kuangru52</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'rgba(226,232,240,0.65)' }}>Docker Hub 地址</span>
                  <a
                    href="https://hub.docker.com/r/kuangru52/auranav"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    hub.docker.com/r/kuangru52/auranav ↗
                  </a>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'rgba(226,232,240,0.65)' }}>QQ 交流群</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>1027610757</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'rgba(226,232,240,0.65)' }}>Telegram 群组</span>
                  <a
                    href="https://t.me/+FFEviJJq9GkyOWFl"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    t.me/+FFEviJJq9GkyOWFl ↗
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* 捐赠页面：只显示两个二维码 */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '520px', gap: '12px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', display: 'block', lineHeight: 1.5 }}>
                又到了互联网要饭环节<br />
                感谢您支持 AuraNav 项目开发！扫码请作者喝杯咖啡 ☕
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '16px', background: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                  <img
                    src="/data/alipay.png"
                    alt="支付宝捐赠二维码"
                    style={{ width: '100%', height: 'auto', borderRadius: '8px', objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: 700 }}>推荐使用支付宝</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '16px', background: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
                  <img
                    src="/data/wechat.png"
                    alt="微信支付捐赠二维码"
                    style={{ width: '100%', height: 'auto', borderRadius: '8px', objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>推荐使用微信支付</span>
                </div>
              </div>
            </div>
          )}

          {/* 设置弹窗最下方的捐赠/切换按钮 */}
          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              className="action-button primary"
              onClick={() => setShowDonateModal((prev) => !prev)}
              style={{
                background: showDonateModal
                  ? 'rgba(255,255,255,0.15)'
                  : 'linear-gradient(135deg, #e11d48, #f43f5e)',
                color: '#ffffff',
                padding: '10px 28px',
                fontSize: '0.9rem',
                fontWeight: 600,
                borderRadius: '12px',
                boxShadow: showDonateModal ? 'none' : '0 8px 24px rgba(225, 29, 72, 0.35)',
                border: showDonateModal ? '1px solid rgba(255,255,255,0.3)' : 'none',
              }}
            >
              {showDonateModal ? '⬅️ 返回应用作者信息' : '☕ 捐赠支持作者'}
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section" hidden={settingsCategory !== 'account'} style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', minHeight: '380px' }}>
          {/* 上部分：系统管理员账号卡片 */}
          <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38bdf8' }}>
                当前系统账号：{currentUser.username}
              </span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 600 }}>
                系统管理员
              </span>
            </div>
            <small style={{ fontSize: '0.8rem', color: 'rgba(226, 232, 240, 0.7)', lineHeight: 1.5, display: 'block' }}>
              管理员账号的用户名和密码由部署环境变量 (<code style={{ color: '#38bdf8' }}>ADMIN_USER / ADMIN_PASSWORD</code>) 设定。
            </small>
          </div>

          {/* 底部分：退出登录按键移动至最下方 */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: 'auto' }}>
            <button
              type="button"
              className="action-button primary"
              onClick={onLogout}
              style={{ background: 'rgba(239, 68, 68, 0.85)', color: '#fff', borderColor: 'transparent', padding: '10px 24px', borderRadius: '12px' }}
            >
              退出登录
            </button>
          </div>
        </div>
      </section>

      <section className="settings-section" hidden={settingsCategory !== 'backup'}>
        <div style={{ display: 'grid', gap: '14px', width: '100%', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>

          {/* 1. 🌐 网站卡片与分组数据 */}
          <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🌐 1. 网站卡片与分组数据
              </span>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', fontWeight: 600 }}>
                JSON 结构
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(226,232,240,0.65)' }}>
              单独导出或还原所有卡片名称、跳转网址、排序与分组目录信息。
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button type="button" className="action-button ghost" onClick={handleDownloadCards} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                ⬇️ 导出卡片 JSON
              </button>
              <label className="action-button ghost" style={{ fontSize: '0.8rem', padding: '6px 14px', cursor: 'pointer', margin: 0 }}>
                ⬆️ 还原卡片 JSON
                <input type="file" accept=".json" onChange={handleRestoreCards} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* 2. ⚙️ 系统与页面外观配置 */}
          <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(255, 255, 255, 0.12)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ⚙️ 2. 系统与页面外观配置
              </span>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.18)', color: '#38bdf8', fontWeight: 600 }}>
                JSON 配置
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(226,232,240,0.65)' }}>
              单独导出或还原毛玻璃参数、页面布局边距、顶部 Logo、时钟与搜索引擎偏好。
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button type="button" className="action-button ghost" onClick={handleDownloadConfig} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                ⬇️ 导出配置 JSON
              </button>
              <label className="action-button ghost" style={{ fontSize: '0.8rem', padding: '6px 14px', cursor: 'pointer', margin: 0 }}>
                ⬆️ 还原配置 JSON
                <input type="file" accept=".json" onChange={handleRestoreConfig} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* 3. 🎨 自定义 Logo 图标库 */}
          <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🎨 3. 自定义 Logo 图标库
              </span>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.22)', color: '#c084fc', fontWeight: 600 }}>
                ZIP 压缩包 📦
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(226,232,240,0.65)' }}>
              打包下载服务器 `data/icons/` 图标目录，或上传图标 ZIP 包自动解压还原。
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button type="button" className="action-button ghost" onClick={handleDownloadIconsZip} style={{ fontSize: '0.8rem', padding: '6px 14px', color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
                📦 导出图标包 (.zip)
              </button>
              <label className="action-button ghost" style={{ fontSize: '0.8rem', padding: '6px 14px', cursor: 'pointer', margin: 0, color: '#c084fc', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
                ⬆️ 解压还原图标包 (.zip)
                <input type="file" accept=".zip" onChange={handleRestoreIconsZip} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* 4. 🖼️ 本地高清壁纸库 */}
          <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.55)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🖼️ 4. 本地高清壁纸库
              </span>
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.22)', color: '#38bdf8', fontWeight: 600 }}>
                ZIP 压缩包 📦
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(226,232,240,0.65)' }}>
              打包下载服务器 `data/wallpapers/` 壁纸目录，或上传壁纸 ZIP 包自动解压还原。
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button type="button" className="action-button ghost" onClick={handleDownloadWallpapersZip} style={{ fontSize: '0.8rem', padding: '6px 14px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                📦 导出壁纸包 (.zip)
              </button>
              <label className="action-button ghost" style={{ fontSize: '0.8rem', padding: '6px 14px', cursor: 'pointer', margin: 0, color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                ⬆️ 解压还原壁纸包 (.zip)
                <input type="file" accept=".zip" onChange={handleRestoreWallpapersZip} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {/* 5. 📦 一键全量完整备份与还原 */}
          <div style={{ padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(56, 189, 248, 0.25))', border: '1px solid rgba(255, 255, 255, 0.3)', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📦 5. 一键全量完整备份与还原
              </span>
              <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '999px', background: '#38bdf8', color: '#0f172a', fontWeight: 800 }}>
                全量整站包 👑
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.4 }}>
              同时打包备份【卡片数据 + 系统外观 + 图标库 + 壁纸库】，适合快速克隆/迁移整站。
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
              <button type="button" className="action-button primary" onClick={handleDownloadFullZip} style={{ fontSize: '0.82rem', padding: '8px 18px', background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
                👑 导出全量备份 (.zip)
              </button>
              <label className="action-button primary" style={{ fontSize: '0.82rem', padding: '8px 18px', cursor: 'pointer', margin: 0, background: 'linear-gradient(135deg, #38bdf8, #0284c7)' }}>
                ⚡ 一键解压恢复全量 (.zip)
                <input type="file" accept=".zip" onChange={handleRestoreFullZip} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

        </div>
      </section>

      <section className="settings-section" hidden={settingsCategory !== 'storage'}>
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* 数据类型选择器 (左图标 / 右壁纸 - 缩小并居中显示) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <div className="mode-switch" style={{ width: '220px', margin: '0 auto' }}>
              <button
                type="button"
                className={storageTab === 'icon' ? 'mode-button active' : 'mode-button'}
                onClick={() => setStorageTab('icon')}
              >
                图标
              </button>
              <button
                type="button"
                className={storageTab === 'wallpaper' ? 'mode-button active' : 'mode-button'}
                onClick={() => setStorageTab('wallpaper')}
              >
                壁纸
              </button>
            </div>
          </div>

          {/* 图标分类 */}
          {storageTab === 'icon' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <small style={{ fontSize: '0.75rem', color: 'rgba(226,232,240,0.5)' }}>系统预存图标与卡片绑定的自定义图标</small>
              </div>
              {(() => {
                // 只筛选用户本地上传的 Base64 / blob 图片图标，剔除从网站拉取的 HTTP/HTTPS 网址图标
                const imageIconCards = cards.filter(
                  (c) => /^data:image\//i.test(c.icon) || /^blob:/i.test(c.icon)
                )

                return (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                      gap: '12px',
                      maxHeight: '340px',
                      overflowY: 'auto',
                      padding: '4px',
                    }}
                  >
                    {/* 网格第一项: 批量上传图标加号卡片 */}
                    {onBatchUploadIcons && (
                      <label
                        title="批量上传图标"
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          padding: '8px 4px',
                          borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: '1px dashed rgba(56, 189, 248, 0.4)',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease, background 0.2s ease',
                        }}
                      >
                        <input type="file" accept="image/*" multiple onChange={onBatchUploadIcons} style={{ display: 'none' }} />
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '1.4rem',
                            color: '#38bdf8',
                            lineHeight: 1,
                          }}
                        >
                          +
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>上传</span>
                      </label>
                    )}

                    {/* 图库独立存储图标 */}
                    {storedIcons.map((icon, idx) => (
                      <div
                        key={`stored-${idx}`}
                        title={`图库图标 #${idx + 1}`}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 4px',
                          borderRadius: '12px',
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        <img
                          src={icon}
                          alt={`图库图标 #${idx + 1}`}
                          style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: '#38bdf8',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}
                        >
                          已存#{idx + 1}
                        </span>
                        {onDeleteStoredIcon && (
                          <button
                            type="button"
                            onClick={() => onDeleteStoredIcon(idx)}
                            title="删除此图库图标"
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: 0,
                              background: '#ef4444',
                              color: '#fff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    {/* 站点卡片已关联图标 */}
                    {imageIconCards.map((card) => (
                      <div
                        key={`card-${card.id}`}
                        title={`关联站点: ${card.title}`}
                        style={{
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 4px',
                          borderRadius: '12px',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      >
                        <img
                          src={card.icon}
                          alt={card.title}
                          style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                        />
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.8)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                          }}
                        >
                          {card.title}
                        </span>
                        {onResetCardIcon && (
                          <button
                            type="button"
                            onClick={() => onResetCardIcon(card.id)}
                            title="解绑并恢复默认图标"
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              border: 0,
                              background: '#ef4444',
                              color: '#fff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'grid',
                              placeItems: 'center',
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}

          {/* 壁纸分类 */}
          {storageTab === 'wallpaper' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <small style={{ fontSize: '0.75rem', color: 'rgba(226,232,240,0.5)' }}>共 {localWallpapers.length} 张本地壁纸</small>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '14px',
                  maxHeight: '340px',
                  overflowY: 'auto',
                  padding: '4px',
                }}
              >
                {/* 网格第一项: 批量上传壁纸加号卡片 */}
                <label
                  title="批量上传壁纸"
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    aspectRatio: '16 / 9',
                    border: '1px dashed rgba(56, 189, 248, 0.4)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, background 0.2s ease',
                  }}
                >
                  <input type="file" accept="image/*" multiple onChange={handleWallpaperFiles} style={{ display: 'none' }} />
                  <span style={{ fontSize: '1.8rem', color: '#38bdf8', fontWeight: 300, lineHeight: 1 }}>+</span>
                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '4px' }}>上传壁纸</span>
                </label>

                {localWallpapers.map((wallpaper, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      aspectRatio: '16 / 9',
                      border: '1px solid rgba(255,255,255,0.15)',
                      background: 'rgba(0,0,0,0.3)',
                    }}
                  >
                    <img
                      src={wallpaper}
                      alt={`壁纸 #${idx + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent 60%)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', color: '#f8fafc', fontWeight: 500 }}>
                        壁纸 #{idx + 1}
                      </span>
                      {onDeleteWallpaper && (
                        <button
                          type="button"
                          onClick={() => onDeleteWallpaper(idx)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: 0,
                            background: 'rgba(239, 68, 68, 0.85)',
                            color: '#fff',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </aside>
  )
}
