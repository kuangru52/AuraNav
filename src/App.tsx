import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import type { SiteCard, NormalGlassSettings, WallpaperSettings, Credentials, PageLayoutSettings } from './types'
import { compressImage } from './utils/imageUtils'
import { SortableGlassCard } from './components/SortableGlassCard'
import { SiteModal } from './components/SiteModal'
import { GroupModal } from './components/GroupModal'
import { SettingsPanel } from './components/SettingsPanel'
import { Header } from './components/Header'
import { LoginModal } from './components/LoginModal'
import { SearchBar } from './components/SearchBar'

const CARDS_STORAGE_KEY = 'liquid-nav-cards'
const GROUPS_STORAGE_KEY = 'liquid-nav-groups'
const WALLPAPER_KEY = 'liquid-nav-wallpaper'
const LOCAL_WALLPAPERS_KEY = 'liquid-nav-local-wallpapers'
const STORED_ICONS_KEY = 'liquid-nav-stored-icons'
const SELECTED_WALLPAPERS_KEY = 'selected-wallpapers'
const MAX_INTERVAL_SECONDS = Math.floor(Number.MAX_SAFE_INTEGER / 1000)
const MAX_TIMEOUT_DELAY = 2_147_483_647
const DEFAULT_FALLBACK_WALLPAPER = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80'

// 默认 3 个示例卡片数据与 3 个初始分组
const defaultGroups = ['开发', '娱乐', '阅读']

const defaultCards: SiteCard[] = [
  {
    id: '1',
    title: 'GitHub',
    url: 'https://github.com',
    description: '全球最大的开源代码托管与协同平台',
    icon: 'https://github.githubassets.com/favicons/favicon.svg',
    category: '开发',
    accent: '#7dd3fc',
  },
  {
    id: '2',
    title: '哔哩哔哩 (Bilibili)',
    url: 'https://www.bilibili.com',
    description: '国内知名年轻人弹幕视频分享与学习社区',
    icon: 'https://www.bilibili.com/favicon.ico',
    category: '娱乐',
    accent: '#f472b6',
  },
  {
    id: '3',
    title: '知乎 (Zhihu)',
    url: 'https://www.zhihu.com',
    description: '中文互联网高质量问答与知识创作者平台',
    icon: 'https://static.zhihu.com/heifetz/assets/apple-touch-icon-152.abcdef.png',
    category: '阅读',
    accent: '#60a5fa',
  },
]

const defaultWallpaperSettings: WallpaperSettings = {
  mode: 'bing',
  blur: 0,
  interval: 60,
}

const defaultPageLayoutSettings: PageLayoutSettings = {
  topbarPaddingX: 60,
  topbarPaddingTop: 18,
  categoryPaddingX: 60,
  categoryMarginTop: 0,
  categoryAlign: 'flex-start',
  cardGridPaddingX: 60,
  cardGridPaddingTop: 4,
  cardsPerRow: 6,
  cardHeight: 68,
  cardGapX: 16,
  cardGapY: 14,

  showLogo: true,
  logoUrl: '',
  logoSize: 38,
  showBrandName: true,
  brandName: '栖屿',
  brandNameFontSize: 18,
  brandNameColor: '#f8fafc',
  showBrandSubtitle: true,
  brandSubtitle: '个人导航',
  brandSubtitleFontSize: 12,
  brandSubtitleColor: 'rgba(226, 232, 240, 0.7)',

  showClock: true,
  clockFontSize: 20,
  clockColor: '#f8fafc',
  showDate: true,
  dateFontSize: 12,
  dateColor: 'rgba(226, 232, 240, 0.75)',

  showSearchBar: true,
  defaultSearchEngine: 'baidu',
}

const defaultNormalSettings: NormalGlassSettings = {
  blur: 12,
  opacity: 0.25,
  cornerRadius: 16,
  edgeHighlight: 0.2,
}

function App() {
  // 1. 卡片与分组状态 (存储于 sync.json)
  const [cards, setCards] = useState<SiteCard[]>(() => {
    const saved = localStorage.getItem(CARDS_STORAGE_KEY)
    if (!saved) return defaultCards
    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultCards
    } catch {
      return defaultCards
    }
  })

  const [groups, setGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem(GROUPS_STORAGE_KEY)
    if (!saved) return defaultGroups
    try {
      const parsed = JSON.parse(saved) as string[]
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultGroups
    } catch {
      return defaultGroups
    }
  })

  // 2. 各种个性化设置状态 (存储于 config.json)
  const [normalSettings, setNormalSettings] = useState<NormalGlassSettings>(() => {
    const saved = localStorage.getItem('liquid-nav-normal-glass')
    if (!saved) return defaultNormalSettings
    try {
      return { ...defaultNormalSettings, ...JSON.parse(saved) }
    } catch {
      return defaultNormalSettings
    }
  })

  const [pageLayoutSettings, setPageLayoutSettings] = useState<PageLayoutSettings>(() => {
    const saved = localStorage.getItem('auranav-page-layout')
    if (!saved) return defaultPageLayoutSettings
    try {
      return { ...defaultPageLayoutSettings, ...JSON.parse(saved) }
    } catch {
      return defaultPageLayoutSettings
    }
  })

  const [wallpaperSelectionMode, setWallpaperSelectionMode] = useState<'single' | 'carousel'>(() => {
    const saved = localStorage.getItem('auranav-wallpaper-mode')
    return saved === 'carousel' ? 'carousel' : 'single'
  })

  useEffect(() => {
    localStorage.setItem('auranav-wallpaper-mode', wallpaperSelectionMode)
  }, [wallpaperSelectionMode])

  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>(() => {
    const saved = localStorage.getItem(WALLPAPER_KEY)
    if (!saved) return defaultWallpaperSettings
    try {
      const parsed = { ...defaultWallpaperSettings, ...JSON.parse(saved) }
      return {
        ...parsed,
        interval: Number.isFinite(Number(parsed.interval))
          ? Math.min(MAX_INTERVAL_SECONDS, Math.max(3, Number(parsed.interval)))
          : defaultWallpaperSettings.interval,
      }
    } catch {
      return defaultWallpaperSettings
    }
  })
  const [intervalDraft, setIntervalDraft] = useState(() => String(wallpaperSettings.interval))

  const [localWallpapers, setLocalWallpapers] = useState<string[]>(() => {
    const saved = localStorage.getItem(LOCAL_WALLPAPERS_KEY)
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const [storedIcons, setStoredIcons] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORED_ICONS_KEY)
    if (!saved) return []
    try {
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const [selectedWallpaperUrls, setSelectedWallpaperUrls] = useState<string[]>(() => {
    const saved = localStorage.getItem(SELECTED_WALLPAPERS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {}
    }
    return [DEFAULT_FALLBACK_WALLPAPER]
  })

  const lastLocalMutationTime = useRef<number>(0)
  const isInitialLoad = useRef<boolean>(true)

  const [bingWallpaper, setBingWallpaper] = useState<string>(DEFAULT_FALLBACK_WALLPAPER)
  const [bingRefreshKey, setBingRefreshKey] = useState(0)
  const [isBingLoading, setIsBingLoading] = useState(false)
  const [bingWallpaperError, setBingWallpaperError] = useState(false)
  const [currentWallpaperIndex, setCurrentWallpaperIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')

  // 安全写本地缓存
  const safeSaveLocal = (key: string, value: any) => {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    } catch {}
  }

  // 服务端自动同步函数
  const autoSyncToServer = useMemo(() => {
    let timer: number | null = null
    return (syncPayload: any, configPayload: any) => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(async () => {
        try {
          // 同步卡片数据到 sync.json
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncPayload),
          })
          // 同步设置数据到 config.json
          await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(configPayload),
          })
        } catch {}
      }, 600)
    }
  }, [])

  // 监听状态改变并同步写本地及服务端
  useEffect(() => {
    safeSaveLocal(CARDS_STORAGE_KEY, cards)
    safeSaveLocal(GROUPS_STORAGE_KEY, groups)
    safeSaveLocal('liquid-nav-normal-glass', normalSettings)
    safeSaveLocal('auranav-page-layout', pageLayoutSettings)
    safeSaveLocal(WALLPAPER_KEY, wallpaperSettings)
    safeSaveLocal(LOCAL_WALLPAPERS_KEY, localWallpapers)
    safeSaveLocal(STORED_ICONS_KEY, storedIcons)
    safeSaveLocal(SELECTED_WALLPAPERS_KEY, selectedWallpaperUrls)

    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    lastLocalMutationTime.current = Date.now()

    const syncPayload = {
      version: '1.0',
      syncTime: lastLocalMutationTime.current,
      cards,
      groups,
    }

    const configPayload = {
      version: '1.0',
      syncTime: lastLocalMutationTime.current,
      normalSettings,
      pageLayoutSettings,
      wallpaperSettings,
      wallpaperSelectionMode,
      localWallpapers,
      storedIcons,
      selectedWallpaperUrls,
    }

    autoSyncToServer(syncPayload, configPayload)
  }, [cards, groups, normalSettings, pageLayoutSettings, wallpaperSettings, localWallpapers, storedIcons, selectedWallpaperUrls, autoSyncToServer])

  // 从服务端初始化及轮询加载 sync.json 和 config.json
  useEffect(() => {
    const loadServerData = async () => {
      if (Date.now() - lastLocalMutationTime.current < 3000) return

      try {
        // 1. 读取 sync.json
        const syncRes = await fetch('/api/sync')
        if (syncRes.ok) {
          const syncData = await syncRes.json()
          if (syncData && Array.isArray(syncData.cards) && syncData.cards.length > 0) {
            setCards(syncData.cards)
            if (Array.isArray(syncData.groups)) setGroups(syncData.groups)
          }
        }

        // 2. 读取 config.json
        const configRes = await fetch('/api/config')
        if (configRes.ok) {
          const configData = await configRes.json()
          if (configData) {
            if (configData.normalSettings) setNormalSettings(configData.normalSettings)
            if (configData.pageLayoutSettings) setPageLayoutSettings(configData.pageLayoutSettings)
            if (configData.wallpaperSettings) setWallpaperSettings(configData.wallpaperSettings)
            if (configData.wallpaperSelectionMode) setWallpaperSelectionMode(configData.wallpaperSelectionMode)
            if (Array.isArray(configData.localWallpapers)) setLocalWallpapers(configData.localWallpapers)
            if (Array.isArray(configData.storedIcons)) setStoredIcons(configData.storedIcons)
            if (Array.isArray(configData.selectedWallpaperUrls) && configData.selectedWallpaperUrls.length > 0) {
              setSelectedWallpaperUrls(configData.selectedWallpaperUrls)
            }
          }
        }
      } catch {}
    }

    loadServerData()
    const interval = setInterval(loadServerData, 8000)
    return () => clearInterval(interval)
  }, [])

  // 上传图片（图标/壁纸）到服务器磁盘目录（/app/data/icons 或 /app/data/wallpapers）
  const uploadImageToServer = async (file: File, type: 'icon' | 'wallpaper'): Promise<string> => {
    try {
      const base64 = await compressImage(file, type === 'icon' ? 128 : 1920, type === 'icon' ? 128 : 1080, 0.85)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, base64 }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.url) {
        return data.url
      }
      return base64
    } catch {
      return await compressImage(file)
    }
  }

  // 点击选壁纸 (单图固定模式下点击直接独占选中该壁纸；多图轮播模式下多选勾选)
  const handleToggleSelectWallpaper = (url: string) => {
    if (wallpaperSelectionMode === 'single') {
      setSelectedWallpaperUrls([url])
      setCurrentWallpaperIndex(0)
    } else {
      setSelectedWallpaperUrls((prev) => {
        if (prev.includes(url)) {
          if (prev.length <= 1) return prev
          return prev.filter((item) => item !== url)
        } else {
          return [...prev, url]
        }
      })
    }
  }

  // 加载 Bing 每日壁纸
  useEffect(() => {
    let active = true
    async function loadBingWallpaper() {
      const today = new Date().toISOString().slice(0, 10)
      const cachedDate = localStorage.getItem('liquid-nav-bing-date')
      const cachedUrl = localStorage.getItem('liquid-nav-bing-url')

      if (cachedDate === today && cachedUrl) {
        if (active) setBingWallpaper(cachedUrl)
        return
      }

      setIsBingLoading(true)
      setBingWallpaperError(false)
      try {
        const response = await fetch(`/api/bing-wallpaper?format=js&idx=0&n=1&mkt=zh-CN&_=${Date.now()}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('壁纸请求失败')
        const data = await response.json()
        const imageUrl = data?.images?.[0]?.url
        if (!imageUrl) throw new Error('未获取到每日壁纸')
        const fullUrl = /^https?:\/\//i.test(imageUrl) ? imageUrl : `https://www.bing.com${imageUrl}`

        if (active) {
          setBingWallpaper(fullUrl)
          localStorage.setItem('liquid-nav-bing-date', today)
          localStorage.setItem('liquid-nav-bing-url', fullUrl)
        }
      } catch {
        if (active) {
          if (cachedUrl) setBingWallpaper(cachedUrl)
          setBingWallpaperError(true)
        }
      } finally {
        if (active) setIsBingLoading(false)
      }
    }

    loadBingWallpaper()
    return () => { active = false }
  }, [bingRefreshKey])

  // 壁纸轮播定时器（仅在多图轮播模式且勾选了多张壁纸时开启；单图固定模式下绝对不轮播）
  useEffect(() => {
    if (wallpaperSelectionMode === 'single' || selectedWallpaperUrls.length <= 1) return

    const intervalMs = wallpaperSettings.interval * 1000
    let remainingMs = intervalMs
    let active = true
    let timer: number

    const scheduleNextRotation = () => {
      const delay = Math.min(remainingMs, MAX_TIMEOUT_DELAY)
      timer = window.setTimeout(() => {
        if (!active) return

        remainingMs -= delay
        if (remainingMs <= 0) {
          setCurrentWallpaperIndex((prev) => (prev + 1) % selectedWallpaperUrls.length)
          remainingMs = intervalMs
        }

        scheduleNextRotation()
      }, delay)
    }

    scheduleNextRotation()

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [wallpaperSettings.interval, selectedWallpaperUrls.length, wallpaperSelectionMode])

  // 当前主屏背景显示的壁纸（100% 来源于用户勾选的 selectedWallpaperUrls）
  const currentWallpaper = useMemo(() => {
    if (selectedWallpaperUrls.length > 0) {
      const idx = currentWallpaperIndex % selectedWallpaperUrls.length
      return selectedWallpaperUrls[idx] ?? selectedWallpaperUrls[0] ?? DEFAULT_FALLBACK_WALLPAPER
    }
    return DEFAULT_FALLBACK_WALLPAPER
  }, [currentWallpaperIndex, selectedWallpaperUrls])

  const [resolvedWallpaper, setResolvedWallpaper] = useState<string>('')

  useEffect(() => {
    if (!currentWallpaper) {
      setResolvedWallpaper('')
      return
    }

    let active = true
    async function loadBlobWallpaper() {
      if (currentWallpaper.startsWith('data:') || currentWallpaper.startsWith('blob:')) {
        if (active) setResolvedWallpaper(currentWallpaper)
        return
      }

      try {
        const res = await fetch(currentWallpaper, { mode: 'cors' })
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        if (active) {
          setResolvedWallpaper(blobUrl)
        }
      } catch {
        if (active) setResolvedWallpaper(currentWallpaper)
      }
    }

    loadBlobWallpaper()
    return () => { active = false }
  }, [currentWallpaper])

  // 配色方案与交互方法
  const [currentPaletteIndex, setCurrentPaletteIndex] = useState(0)

  const colorPalettes = [
    {
      name: '马卡龙色系',
      colors: ['#fecdd3', '#bae6fd', '#fef08a', '#d9f99d', '#e9d5ff', '#fed7aa', '#ccfbf1', '#fbcfe8'],
    },
    {
      name: '莫兰蒂色系',
      colors: ['#a8a29e', '#94a3b8', '#818cf8', '#64748b', '#78716c', '#6b7280', '#9ca3af', '#57534e'],
    },
    {
      name: '赛博霓虹',
      colors: ['#38bdf8', '#c084fc', '#f472b6', '#4ade80', '#fb923c', '#22d3ee', '#f43f5e', '#a855f7'],
    },
    {
      name: '冰岛北欧',
      colors: ['#7dd3fc', '#a7f3d0', '#fde68a', '#f472b6', '#c4b5fd', '#818cf8', '#67e8f9', '#fca5a5'],
    },
    {
      name: '日落暖阳',
      colors: ['#fdba74', '#f87171', '#f43f5e', '#fb923c', '#fde047', '#fed7aa', '#fca5a5', '#fb7185'],
    },
    {
      name: '翡翠森林',
      colors: ['#34d399', '#2dd4bf', '#a7f3d0', '#86efac', '#10b981', '#14b8a6', '#059669', '#38bdf8'],
    },
  ]

  const handleApplyColorPalette = () => {
    const nextIndex = (currentPaletteIndex + 1) % colorPalettes.length
    setCurrentPaletteIndex(nextIndex)
    const palette = colorPalettes[nextIndex]

    setCards((prevCards) =>
      prevCards.map((card, idx) => ({
        ...card,
        accent: palette.colors[idx % palette.colors.length],
      })),
    )
  }

  const handleClearAllCardColors = () => {
    setCards((prevCards) =>
      prevCards.map((card) => ({
        ...card,
        accent: '',
      })),
    )
  }

  const updateNormalGlass = <K extends keyof NormalGlassSettings>(key: K, value: NormalGlassSettings[K]) => {
    setNormalSettings((prev) => ({ ...prev, [key]: value }))
  }

  const [isEditing, setIsEditing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const [settingsCategory, setSettingsCategory] = useState<'wallpaper' | 'glass' | 'page' | 'account' | 'backup' | 'storage' | 'about'>('wallpaper')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('liquid-nav-auth') === 'true'
  })

  const [credentials] = useState<Credentials>(() => {
    const saved = localStorage.getItem('liquid-nav-credentials')
    if (!saved) return { username: 'admin', password: 'admin123' }
    try {
      return JSON.parse(saved)
    } catch {
      return { username: 'admin', password: 'admin123' }
    }
  })

  const [showForm, setShowForm] = useState(false)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [form, setForm] = useState({
    title: '',
    url: '',
    description: '',
    icon: '',
    category: groups[0] ?? '开发',
    accent: '#a5b4fc',
  })

  const appShellRef = useRef<HTMLDivElement>(null)
  const quickMenuRef = useRef<HTMLDivElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!showQuickMenu) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!quickMenuRef.current?.contains(event.target as Node)) setShowQuickMenu(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowQuickMenu(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [showQuickMenu])

  useEffect(() => {
    setIntervalDraft(String(wallpaperSettings.interval))
  }, [wallpaperSettings.interval])

  // 上传单图标 (保存到 data/icons 文件夹)
  const handleIconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const fileUrl = await uploadImageToServer(file, 'icon')
      setForm((prev) => ({ ...prev, icon: fileUrl }))
    } catch (error) {
      console.error('处理图标失败', error)
      alert('处理图标图片失败，请重试')
    } finally {
      event.target.value = ''
    }
  }

  // 批量上传图标 (保存到 data/icons 文件夹)
  const handleBatchUploadIcons = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      const uploadedUrls = await Promise.all(
        files.map((file) => uploadImageToServer(file, 'icon')),
      )
      setStoredIcons((prev) => [...prev, ...uploadedUrls])
    } catch (error) {
      console.error('批量上传图标失败', error)
      alert('批量上传图标失败，请重试')
    } finally {
      event.target.value = ''
    }
  }

  // 上传本地壁纸 (保存到 data/wallpapers 文件夹)
  const handleWallpaperFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      const uploadedUrls = await Promise.all(
        files.map((file) => uploadImageToServer(file, 'wallpaper')),
      )
      const nextImages = [...localWallpapers, ...uploadedUrls]
      setLocalWallpapers(nextImages)
      setSelectedWallpaperUrls(uploadedUrls)
      setCurrentWallpaperIndex(0)
    } catch (error) {
      console.error('处理本地壁纸失败', error)
      alert('处理本地壁纸失败，请重试')
    } finally {
      event.target.value = ''
    }
  }

  const clearLocalWallpapers = () => {
    setLocalWallpapers([])
    setSelectedWallpaperUrls([bingWallpaper])
    setCurrentWallpaperIndex(0)
  }

  const commitWallpaperInterval = () => {
    const parsedInterval = Number(intervalDraft)
    const interval = Number.isFinite(parsedInterval)
      ? Math.min(MAX_INTERVAL_SECONDS, Math.max(3, Math.round(parsedInterval)))
      : wallpaperSettings.interval
    setWallpaperSettings((prev) => ({ ...prev, interval }))
    setIntervalDraft(String(interval))
  }

  const openAddCard = () => {
    setEditingCardId(null)
    setForm({
      title: '',
      url: '',
      description: '',
      icon: '',
      category: selectedCategory === '全部' ? groups[0] ?? '' : selectedCategory,
      accent: '#a5b4fc',
    })
    setShowForm(true)
  }

  const openEditCard = (card: SiteCard) => {
    setEditingCardId(card.id)
    setForm({
      title: card.title,
      url: card.url,
      description: card.description,
      icon: card.icon,
      category: card.category,
      accent: card.accent,
    })
    setShowForm(true)
  }

  const saveCard = () => {
    const title = form.title.trim()
    const url = form.url.trim()
    if (!title || !url) return

    const defaultIcon = title.slice(0, 2)
    const icon = form.icon.trim() || defaultIcon

    if (editingCardId) {
      setCards((prev) =>
        prev.map((card) =>
          card.id === editingCardId
            ? {
                ...card,
                title,
                url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
                description: form.description.trim(),
                icon,
                category: groups.includes(form.category) ? form.category : groups[0] ?? '',
                accent: form.accent,
              }
            : card
        )
      )
    } else {
      const nextCard: SiteCard = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        title,
        url: /^https?:\/\//i.test(url) ? url : `https://${url}`,
        description: form.description.trim(),
        icon,
        category: groups.includes(form.category) ? form.category : groups[0] ?? '',
        accent: form.accent,
      }
      setCards((prev) => [nextCard, ...prev])
    }

    setForm({
      title: '',
      url: '',
      description: '',
      icon: '',
      category: groups[0] ?? '',
      accent: '#a5b4fc',
    })
    setEditingCardId(null)
    setShowForm(false)
  }

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id))
  }

  const reorderCards = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const previousIndex = filteredCards.findIndex((card) => card.id === active.id)
    const nextIndex = filteredCards.findIndex((card) => card.id === over.id)
    if (previousIndex < 0 || nextIndex < 0) return

    const reorderedVisibleCards = arrayMove(filteredCards, previousIndex, nextIndex)
    setCards((previousCards) => {
      let visibleIndex = 0
      return previousCards.map((card) => {
        const visible = selectedCategory === '全部' || card.category === selectedCategory
        if (!visible) return card
        return reorderedVisibleCards[visibleIndex++] ?? card
      })
    })
  }

  const addGroup = () => {
    const name = newGroupName.trim()
    if (!name || groups.includes(name)) return
    setGroups((prev) => [...prev, name])
    setSelectedCategory(name)
    setNewGroupName('')
    setShowGroupForm(false)
  }

  const removeGroup = (name: string) => {
    if (groups.length <= 1) return
    const remainingGroups = groups.filter((group) => group !== name)
    const fallbackGroup = remainingGroups[0]
    setGroups(remainingGroups)
    setCards((prev) => prev.map((card) => card.category === name ? { ...card, category: fallbackGroup } : card))
    if (selectedCategory === name) setSelectedCategory('全部')
  }

  const handleDeleteStoredIcon = (index: number) => {
    setStoredIcons((prev) => prev.filter((_, i) => i !== index))
  }

  // 一键拉取所有网站在线图标
  const handleFetchAllSiteFavicons = () => {
    let updatedCount = 0
    let skippedCount = 0

    setCards((prevCards) =>
      prevCards.map((card) => {
        const isUserUploaded =
          /^data:image\//i.test(card.icon) || /^blob:/i.test(card.icon) || card.icon.startsWith('/data/')

        if (isUserUploaded) {
          skippedCount++
          return card
        }

        let rawUrl = card.url.trim()
        if (!rawUrl) return card

        if (!/^https?:\/\//i.test(rawUrl)) {
          rawUrl = 'https://' + rawUrl
        }

        try {
          const urlObj = new URL(rawUrl)
          const directFaviconUrl = `${urlObj.origin}/favicon.ico`
          updatedCount++
          return {
            ...card,
            icon: directFaviconUrl,
          }
        } catch {
          return card
        }
      })
    )

    alert(
      `✅ 已完成所有图标更新！\n成功拉取了 ${updatedCount} 个网站的在线图标` +
        (skippedCount > 0 ? `，已自动跳过 ${skippedCount} 个您手动上传的图标。` : '。')
    )
  }

  // 手动触发一键同步
  const handleSyncData = async () => {
    const syncPayload = { version: '1.0', syncTime: Date.now(), cards, groups }
    const configPayload = {
      version: '1.0',
      syncTime: Date.now(),
      normalSettings,
      pageLayoutSettings,
      wallpaperSettings,
      localWallpapers,
      storedIcons,
      selectedWallpaperUrls,
    }

    try {
      const resSync = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload),
      })
      const resConfig = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload),
      })

      if (resSync.ok && resConfig.ok) {
        alert('🌐 云端数据与系统设置已同步保存至 /app/data/ (sync.json 与 config.json)！')
      } else {
        alert('本地已保存，但云端服务器写入失败。')
      }
    } catch {
      alert('已保存至本地浏览器存储。')
    }
  }

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      return selectedCategory === '全部' || card.category === selectedCategory
    })
  }, [cards, selectedCategory])

  const [cardContextMenu, setCardContextMenu] = useState<{ x: number; y: number; card: SiteCard } | null>(null)

  const handleCardContextMenu = (e: React.MouseEvent, card: SiteCard) => {
    setCardContextMenu({
      x: e.clientX,
      y: e.clientY,
      card,
    })
  }

  useEffect(() => {
    if (!cardContextMenu) return
    const closeMenu = (e: PointerEvent) => {
      const menuEl = document.querySelector('.card-context-menu')
      if (menuEl && menuEl.contains(e.target as Node)) {
        return
      }
      setCardContextMenu(null)
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCardContextMenu(null) }
    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', handleKey)
    }
  }, [cardContextMenu])

  if (!isAuthenticated) {
    return (
      <LoginModal
        credentials={credentials}
        onLoginSuccess={() => {
          setIsAuthenticated(true)
        }}
      />
    )
  }

  return (
    <div className="app-shell" ref={appShellRef}>
      <div className="wallpaper-layer">
        {resolvedWallpaper && (
          <img
            src={resolvedWallpaper}
            referrerPolicy="no-referrer"
            alt="wallpaper"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${wallpaperSettings.blur}px) brightness(0.9) saturate(1.1)`,
              transform: 'scale(1.05)',
            }}
          />
        )}
      </div>
      <div className="wallpaper-overlay" />
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderCards}>

        <Header
          isEditing={isEditing}
          onToggleEditing={() => setIsEditing((prev) => !prev)}
          onOpenSettings={() => setShowSettings(true)}
          showQuickMenu={showQuickMenu}
          onToggleQuickMenu={() => setShowQuickMenu((prev) => !prev)}
          quickMenuRef={quickMenuRef}
          pageLayoutSettings={pageLayoutSettings}
          style={{
            paddingLeft: `${pageLayoutSettings.topbarPaddingX}px`,
            paddingRight: `${pageLayoutSettings.topbarPaddingX}px`,
            paddingTop: `${pageLayoutSettings.topbarPaddingTop}px`,
          }}
        />

        <div className="content-area">
          <main className="main-panel">
            <div
              className="category-bar"
              style={{
                position: 'relative',
                paddingLeft: `${pageLayoutSettings.categoryPaddingX}px`,
                paddingRight: `${pageLayoutSettings.categoryPaddingX}px`,
                marginTop: `${pageLayoutSettings.categoryMarginTop}px`,
                justifyContent: pageLayoutSettings.showSearchBar && pageLayoutSettings.categoryAlign === 'center'
                  ? 'flex-start'
                  : pageLayoutSettings.categoryAlign,
              }}
            >
              {['全部', ...groups].map((category) => (
                <span className="category-item" key={category}>
                  <button
                    type="button"
                    className={selectedCategory === category ? 'category-pill active' : 'category-pill'}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                  {isEditing && category !== '全部' && groups.length > 1 && (
                    <button
                      type="button"
                      className="group-delete-button"
                      onClick={() => removeGroup(category)}
                      aria-label={`删除分组 ${category}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <button type="button" className="category-add-button" onClick={() => setShowGroupForm(true)}>
                  + 新建分组
                </button>
              )}

              {/* 分类栏居中搜索框 (手机端自动隐藏) */}
              {pageLayoutSettings.showSearchBar && (
                <SearchBar defaultEngineId={pageLayoutSettings.defaultSearchEngine} />
              )}
            </div>

            {/* 编辑模式下三大快捷功能悬浮独立卡片 */}
            {isEditing && (
              <div
                className="floating-edit-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '8px 16px',
                  margin: '12px auto 0',
                  width: 'fit-content',
                  maxWidth: 'calc(100vw - 32px)',
                  borderRadius: '16px',
                  background: 'rgba(13, 20, 34, 0.82)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                  border: '1px solid rgba(168, 85, 247, 0.45)',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.45)',
                  zIndex: 25,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="category-add-button"
                  onClick={handleFetchAllSiteFavicons}
                  style={{ background: 'rgba(34, 197, 94, 0.18)', borderColor: 'rgba(34, 197, 94, 0.4)', color: '#4ade80' }}
                  title="自动批量拉取所有未设置图标网站的官方图标，避开您手动上传的图标"
                >
                  🌐 一键获取所有网站图标
                </button>
                <button
                  type="button"
                  className="category-add-button"
                  onClick={handleApplyColorPalette}
                  style={{ background: 'rgba(168, 85, 247, 0.2)', borderColor: 'rgba(168, 85, 247, 0.5)', color: '#c084fc', fontWeight: 600 }}
                  title="点击切换卡片配色方案（马卡龙、莫兰蒂、赛博、北欧等），点一次换一种"
                >
                  🎨 一键配色 ({colorPalettes[currentPaletteIndex].name})
                </button>
                <button
                  type="button"
                  className="category-add-button"
                  onClick={handleClearAllCardColors}
                  style={{ background: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.3)', color: '#e2e8f0', fontWeight: 600 }}
                  title="一键清除所有卡片自定义背景颜色，恢复为统一原版毛玻璃透明风格"
                >
                  💧 一键透明
                </button>
              </div>
            )}

            <div
              className="card-grid"
              style={{
                paddingLeft: `${pageLayoutSettings.cardGridPaddingX}px`,
                paddingRight: `${pageLayoutSettings.cardGridPaddingX}px`,
                paddingTop: `${pageLayoutSettings.cardGridPaddingTop}px`,
                gridTemplateColumns: `repeat(${pageLayoutSettings.cardsPerRow}, minmax(0, 1fr))`,
                gridAutoRows: `${pageLayoutSettings.cardHeight}px`,
                gap: `${pageLayoutSettings.cardGapY}px ${pageLayoutSettings.cardGapX}px`,
              }}
            >
              <SortableContext items={filteredCards.map((card) => card.id)} strategy={rectSortingStrategy}>
                {filteredCards.map((card) => (
                  <SortableGlassCard
                    key={card.id}
                    card={card}
                    normalSettings={normalSettings}
                    isEditing={isEditing}
                    onRemove={removeCard}
                    onEdit={openEditCard}
                    onContextMenu={handleCardContextMenu}
                  />
                ))}
              </SortableContext>
              {isEditing && (
                <div
                  className={'site-tile add-card-tile'}
                  style={{
                    borderRadius: `${normalSettings.cornerRadius}px`,
                    backgroundColor: `rgba(255, 255, 255, ${normalSettings.opacity * 0.35})`,
                    backdropFilter: `blur(${normalSettings.blur}px)`,
                    WebkitBackdropFilter: `blur(${normalSettings.blur}px)`,
                    border: `1px solid rgba(255, 255, 255, ${normalSettings.edgeHighlight * 0.8})`,
                  }}
                >
                  <button type="button" className="site-card add-card-button" onClick={openAddCard}>
                    <div className="site-icon add-icon" style={{ color: '#38bdf8' }}>
                      +
                    </div>
                    <div className="site-body">
                      <h4>添加网站</h4>
                      <p>点击添加新站点</p>
                    </div>
                  </button>
                </div>
              )}
              {filteredCards.length === 0 && !isEditing && (
                <div className="empty-state">
                  <h3>这个分组还没有网站</h3>
                  <p>切换其他分组，或在编辑模式下添加一个网站。</p>
                </div>
              )}
            </div>
            <footer className="footer" style={{ textAlign: 'center', padding: '32px 0 16px', color: 'rgba(226, 232, 240, 0.45)', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.02em' }}>
              Powered By kuangru52
            </footer>
          </main>
        </div>

        <SiteModal
          isOpen={showForm}
          editingCardId={editingCardId}
          form={form}
          groups={groups}
          storedIcons={storedIcons}
          cards={cards}
          onFormChange={setForm}
          onClose={() => setShowForm(false)}
          onSave={saveCard}
          onIconFileChange={handleIconFileChange}
        />

        <GroupModal
          isOpen={showGroupForm}
          newGroupName={newGroupName}
          groups={groups}
          onGroupNameChange={setNewGroupName}
          onClose={() => setShowGroupForm(false)}
          onAdd={addGroup}
        />

        {/* 卡片右键浮动小弹窗 (上边是删除，下边是编辑) */}
        {cardContextMenu && (
          <div
            className="card-context-menu"
            style={{
              position: 'fixed',
              top: `${Math.min(cardContextMenu.y, window.innerHeight - 110)}px`,
              left: `${Math.min(cardContextMenu.x, window.innerWidth - 130)}px`,
              zIndex: 3000,
              borderRadius: '12px',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(20px) saturate(160%)',
              WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              border: '1px solid rgba(255, 255, 255, 0.22)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
              padding: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: '120px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const cardToDelete = cardContextMenu.card
                setCardContextMenu(null)
                if (confirm(`确认删除卡片 "${cardToDelete.title}"？`)) {
                  removeCard(cardToDelete.id)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 0,
                background: 'transparent',
                color: '#ef4444',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ef4444' }}>
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              <span>删除</span>
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', margin: '2px 0' }} />

            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const cardToEdit = cardContextMenu.card
                setCardContextMenu(null)
                openEditCard(cardToEdit)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 0,
                background: 'transparent',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#38bdf8' }}>
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              <span>编辑</span>
            </button>
          </div>
        )}

      {createPortal(
        <SettingsPanel
          showSettings={showSettings}
          settingsCategory={settingsCategory}
          onSettingsCategoryChange={setSettingsCategory}
          onClose={() => setShowSettings(false)}
          pageLayoutSettings={pageLayoutSettings}
          onPageLayoutSettingsChange={setPageLayoutSettings}
          wallpaperSettings={wallpaperSettings}
          onWallpaperSettingsChange={setWallpaperSettings}
          intervalDraft={intervalDraft}
          onIntervalDraftChange={setIntervalDraft}
          commitWallpaperInterval={commitWallpaperInterval}
          localWallpapers={localWallpapers}
          handleWallpaperFiles={handleWallpaperFiles}
          clearLocalWallpapers={clearLocalWallpapers}
          bingRefreshKey={bingRefreshKey}
          onRefreshBing={() => setBingRefreshKey((prev) => prev + 1)}
          isBingLoading={isBingLoading}
          bingWallpaperError={bingWallpaperError}
          bingWallpaper={bingWallpaper}
          selectedWallpaperUrls={selectedWallpaperUrls}
          onToggleSelectWallpaper={handleToggleSelectWallpaper}
          wallpaperSelectionMode={wallpaperSelectionMode}
          onWallpaperSelectionModeChange={setWallpaperSelectionMode}
          normalSettings={normalSettings}
          updateNormalGlass={updateNormalGlass}
          currentWallpaper={resolvedWallpaper}
          credentials={credentials}
          currentUser={{ username: 'admin', isAdmin: true }}
          onLogout={() => {
            localStorage.removeItem('liquid-nav-auth')
            localStorage.removeItem('liquid-nav-current-user')
            setIsAuthenticated(false)
            setShowSettings(false)
          }}
          cards={cards}
          groups={groups}
          storedIcons={storedIcons}
          onRestoreData={(data) => {
            if (data.cards) setCards(data.cards)
            if (data.groups) setGroups(data.groups)
            if (data.normalSettings) setNormalSettings(data.normalSettings)
            if (data.pageLayoutSettings) setPageLayoutSettings(data.pageLayoutSettings)
            if (data.wallpaperSettings) setWallpaperSettings(data.wallpaperSettings)
            if (data.localWallpapers) setLocalWallpapers(data.localWallpapers)
            if (data.storedIcons) setStoredIcons(data.storedIcons)
            if (data.selectedWallpaperUrls) setSelectedWallpaperUrls(data.selectedWallpaperUrls)
          }}
          onSyncData={handleSyncData}
          onDeleteWallpaper={(index) => setLocalWallpapers((prev) => prev.filter((_, i) => i !== index))}
          onResetCardIcon={(cardId) =>
            setCards((prev) =>
              prev.map((c) => (c.id === cardId ? { ...c, icon: c.title.slice(0, 2) } : c))
            )
          }
          onBatchUploadIcons={handleBatchUploadIcons}
          onDeleteStoredIcon={handleDeleteStoredIcon}
        />,
        document.body,
      )}
      </DndContext>
    </div>
  )
}

export default App
