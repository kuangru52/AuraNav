import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

const STORAGE_KEY = 'liquid-nav-cards'
const WALLPAPER_KEY = 'liquid-nav-wallpaper'
const LOCAL_WALLPAPERS_KEY = 'liquid-nav-local-wallpapers'
const STORED_ICONS_KEY = 'liquid-nav-stored-icons'
const GROUPS_KEY = 'liquid-nav-groups'
const SAMPLE_CARDS_KEY = 'liquid-nav-sample-cards-v4'
const MAX_INTERVAL_SECONDS = Math.floor(Number.MAX_SAFE_INTEGER / 1000)
const MAX_TIMEOUT_DELAY = 2_147_483_647
const DEFAULT_FALLBACK_WALLPAPER = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80'

const defaultGroups = ['开发', '效率', '媒体', 'AI', '设计']
const legacyGroupNames: Record<string, string> = {
  Development: '开发',
  Productivity: '效率',
  Media: '媒体',
  Design: '设计',
}

const defaultCards: SiteCard[] = [
  {
    id: '1',
    title: 'GitHub',
    url: 'https://github.com',
    description: '代码与协作',
    icon: 'https://github.com/favicon.ico',
    category: '开发',
    accent: '#7dd3fc',
  },
  {
    id: '2',
    title: '哔哩哔哩',
    url: 'https://www.bilibili.com',
    description: '视频与弹幕社区',
    icon: 'https://www.bilibili.com/favicon.ico',
    category: '媒体',
    accent: '#f472b6',
  },
  {
    id: '3',
    title: '知乎',
    url: 'https://www.zhihu.com',
    description: '问题与知识分享',
    icon: 'https://www.zhihu.com/favicon.ico',
    category: '效率',
    accent: '#60a5fa',
  },
]

const sampleCards: SiteCard[] = []

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

function App() {
  const [cards, setCards] = useState<SiteCard[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return defaultCards

    try {
      return JSON.parse(saved) as SiteCard[]
    } catch {
      return defaultCards
    }
  })

  const [groups, setGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem(GROUPS_KEY)
    if (!saved) return defaultGroups
    try {
      const parsed = JSON.parse(saved) as string[]
      return Array.isArray(parsed) ? parsed.map((group) => legacyGroupNames[group] ?? group) : defaultGroups
    } catch {
      return defaultGroups
    }
  })

  const defaultNormalSettings: NormalGlassSettings = {
    blur: 12,
    opacity: 0.25,
    cornerRadius: 16,
    edgeHighlight: 0.2,
  }

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

  useEffect(() => {
    localStorage.setItem('auranav-page-layout', JSON.stringify(pageLayoutSettings))
  }, [pageLayoutSettings])

  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>(() => {
    const saved = localStorage.getItem(WALLPAPER_KEY)
    if (!saved) return defaultWallpaperSettings

    try {
      const parsed = { ...defaultWallpaperSettings, ...JSON.parse(saved) }
      const interval = Number(parsed.interval)
      return {
        ...parsed,
        interval: Number.isFinite(interval) ? Math.min(MAX_INTERVAL_SECONDS, Math.max(3, interval)) : defaultWallpaperSettings.interval,
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
      const parsed = JSON.parse(saved) as string[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const [storedIcons, setStoredIcons] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORED_ICONS_KEY)
    if (!saved) return []

    try {
      const parsed = JSON.parse(saved) as string[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const lastLocalMutationTime = useRef<number>(0)
  const isInitialLoad = useRef<boolean>(true)

  const [currentUser, setCurrentUser] = useState<{ username: string; isAdmin: boolean }>(() => {
    const saved = localStorage.getItem('liquid-nav-current-user')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return { username: 'admin', isAdmin: true }
  })

  const safeSaveLocal = (key: string, value: any) => {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    } catch (e) {
      console.warn(`[Storage] localStorage 限额超限，改由云端同步保存 (${key})`, e)
    }
  }

  const autoSyncToServer = useMemo(() => {
    let timer: number | null = null
    return (payload: any) => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(async () => {
        try {
          await fetch(`/api/sync?username=${encodeURIComponent(currentUser.username)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        } catch (e) {
          console.warn('[Sync] 自动同步至服务端失败', e)
        }
      }, 600)
    }
  }, [currentUser.username])

  useEffect(() => {
    safeSaveLocal(STORAGE_KEY, cards)
    safeSaveLocal(GROUPS_KEY, groups)
    safeSaveLocal('liquid-nav-normal-glass', normalSettings)
    safeSaveLocal(WALLPAPER_KEY, wallpaperSettings)
    safeSaveLocal(LOCAL_WALLPAPERS_KEY, localWallpapers)
    safeSaveLocal(STORED_ICONS_KEY, storedIcons)

    if (isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    lastLocalMutationTime.current = Date.now()

    const payload = {
      version: '1.0',
      syncTime: lastLocalMutationTime.current,
      cards,
      groups,
      normalSettings,
      wallpaperSettings,
      localWallpapers,
      storedIcons,
    }
    autoSyncToServer(payload)
  }, [cards, groups, normalSettings, wallpaperSettings, localWallpapers, storedIcons, autoSyncToServer])

  useEffect(() => {
    const pollSync = async () => {
      if (Date.now() - lastLocalMutationTime.current < 3000) return

      try {
        const res = await fetch(`/api/sync?username=${encodeURIComponent(currentUser.username)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data && Array.isArray(data.cards) && data.cards.length > 0) {
          if (!data.syncTime || data.syncTime >= lastLocalMutationTime.current) {
            setCards(data.cards)
            if (data.groups) setGroups(data.groups)
            if (data.normalSettings) setNormalSettings(data.normalSettings)
            if (data.wallpaperSettings) setWallpaperSettings(data.wallpaperSettings)
            if (Array.isArray(data.localWallpapers)) setLocalWallpapers(data.localWallpapers)
            if (Array.isArray(data.storedIcons)) setStoredIcons(data.storedIcons)
          }
        }
      } catch {}
    }

    pollSync()
    const interval = setInterval(pollSync, 8000)
    return () => clearInterval(interval)
  }, [currentUser.username])

  const updateNormalGlass = <K extends keyof NormalGlassSettings>(key: K, value: NormalGlassSettings[K]) => {
    setNormalSettings((prev) => ({ ...prev, [key]: value }))
  }

  const [bingWallpaper, setBingWallpaper] = useState<string>(DEFAULT_FALLBACK_WALLPAPER)
  const [bingRefreshKey, setBingRefreshKey] = useState(0)
  const [isBingLoading, setIsBingLoading] = useState(false)
  const [bingWallpaperError, setBingWallpaperError] = useState(false)
  const [currentWallpaperIndex, setCurrentWallpaperIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>(() => groups[0] ?? '开发')
  const [selectedWallpaperUrls, setSelectedWallpaperUrls] = useState<string[]>(() => {
    const saved = localStorage.getItem('selected-wallpapers')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {}
    }
    return ['https://www.bing.com/favicon.ico']
  })

  useEffect(() => {
    localStorage.setItem('selected-wallpapers', JSON.stringify(selectedWallpaperUrls))
  }, [selectedWallpaperUrls])

  const handleToggleSelectWallpaper = (url: string) => {
    setSelectedWallpaperUrls((prev) => {
      if (prev.includes(url)) {
        if (prev.length <= 1) return prev
        return prev.filter((item) => item !== url)
      } else {
        return [...prev, url]
      }
    })
  }
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

  const [isEditing, setIsEditing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showQuickMenu, setShowQuickMenu] = useState(false)
  const [settingsCategory, setSettingsCategory] = useState<'wallpaper' | 'glass' | 'page' | 'account' | 'backup' | 'storage' | 'about'>('wallpaper')
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('liquid-nav-auth') === 'true'
  })

  const [ordinaryUsers, setOrdinaryUsers] = useState<{ username: string }[]>([])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) return
      const data = await res.json()
      if (data) {
        if (Array.isArray(data.ordinaryUsers)) {
          setOrdinaryUsers(data.ordinaryUsers)
        }
        if (data.adminUser) {
          setCurrentUser((prev) => {
            if (prev.isAdmin) {
              const updated = { ...prev, username: data.adminUser }
              localStorage.setItem('liquid-nav-current-user', JSON.stringify(updated))
              return updated
            }
            return prev
          })
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers()
    }
  }, [isAuthenticated, fetchUsers])

  const handleCreateOrdinaryUser = async (u: string, p: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        alert('普通账号创建成功！')
        fetchUsers()
      } else {
        alert(data.error || '创建用户失败')
      }
    } catch {
      alert('创建用户请求失败')
    }
  }

  const handleDeleteOrdinaryUser = async (u: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        alert('用户已成功删除')
        fetchUsers()
      } else {
        alert(data.error || '删除失败')
      }
    } catch {
      alert('删除用户请求失败')
    }
  }

  const [credentials, setCredentials] = useState<Credentials>(() => {
    const saved = localStorage.getItem('liquid-nav-credentials')
    if (!saved) return { username: 'admin', password: 'admin123' }
    try {
      return JSON.parse(saved)
    } catch {
      return { username: 'admin', password: 'admin123' }
    }
  })
  useEffect(() => {
    localStorage.setItem('liquid-nav-credentials', JSON.stringify(credentials))
  }, [credentials])
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
    if (localStorage.getItem(SAMPLE_CARDS_KEY) === 'done') return

    const existingUrls = new Set(cards.map((card) => card.url))
    const migratedCards = cards.map((card) => ({
      ...card,
      category: legacyGroupNames[card.category] ?? card.category,
    }))
    localStorage.setItem(SAMPLE_CARDS_KEY, 'done')
    setCards([...migratedCards, ...sampleCards.filter((card) => !existingUrls.has(card.url))])
  }, [])

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

    return () => {
      active = false
    }
  }, [bingRefreshKey])

  useEffect(() => {
    if (selectedWallpaperUrls.length <= 1) return

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
  }, [wallpaperSettings.interval, selectedWallpaperUrls.length])

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      return selectedCategory === '全部' || card.category === selectedCategory
    })
  }, [cards, selectedCategory])

  const currentWallpaper = useMemo(() => {
    if (selectedWallpaperUrls.length > 0) {
      const idx = currentWallpaperIndex % selectedWallpaperUrls.length
      return selectedWallpaperUrls[idx] ?? bingWallpaper
    }
    return bingWallpaper
  }, [bingWallpaper, currentWallpaperIndex, selectedWallpaperUrls])

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

    return () => {
      active = false
    }
  }, [currentWallpaper])

  const handleIconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const compressedIcon = await compressImage(file, 128, 128, 0.85)
      setForm((prev) => ({ ...prev, icon: compressedIcon }))
    } catch (error) {
      console.error('处理图标失败', error)
      alert('处理图标图片失败，请重试')
    } finally {
      event.target.value = ''
    }
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

  const handleBatchUploadIcons = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      const encoded = await Promise.all(
        files.map((file) => compressImage(file, 128, 128, 0.85)),
      )

      setStoredIcons((prev) => [...prev, ...encoded])
    } catch (error) {
      console.error('批量上传图标失败', error)
      alert('批量上传图标失败，请重试')
    } finally {
      event.target.value = ''
    }
  }

  const handleDeleteStoredIcon = (index: number) => {
    setStoredIcons((prev) => prev.filter((_, i) => i !== index))
  }

  // 一键拉取所有网站在线图标（跳过用户手动上传的本地图标）
  const handleFetchAllSiteFavicons = () => {
    let updatedCount = 0
    let skippedCount = 0

    setCards((prevCards) =>
      prevCards.map((card) => {
        // 如果卡片已经是用户手动上传的本地图片图标 (Base64 或 blob:)，则避开不覆盖
        const isUserUploaded =
          /^data:image\//i.test(card.icon) || /^blob:/i.test(card.icon)

        if (isUserUploaded) {
          skippedCount++
          return card
        }

        // 解析网址并生成网站自有的直连 favicon URL
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

  const handleSyncData = async () => {
    const payload = {
      version: '1.0',
      syncTime: Date.now(),
      cards,
      groups,
      normalSettings,
      wallpaperSettings,
      localWallpapers,
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
      localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
      localStorage.setItem('liquid-nav-normal-glass', JSON.stringify(normalSettings))
      localStorage.setItem(WALLPAPER_KEY, JSON.stringify(wallpaperSettings))
      localStorage.setItem(LOCAL_WALLPAPERS_KEY, JSON.stringify(localWallpapers))

      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        alert('🌐 跨设备云端同步成功！当前账号下的卡片、分组与配置已实时同步至服务器。')
      } else {
        alert('本地已保存，但云端服务器同步失败。')
      }
    } catch {
      alert('已保存至本地存储。')
    }
  }

  const handleWallpaperFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    try {
      const encoded = await Promise.all(
        files.map((file) => compressImage(file)),
      )

      const nextImages = [...localWallpapers, ...encoded]
      setLocalWallpapers(nextImages)
      setWallpaperSettings((prev) => ({ ...prev, mode: 'local' }))
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
    setWallpaperSettings((prev) => ({ ...prev, mode: 'bing' }))
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

  if (!isAuthenticated) {
    return (
      <LoginModal
        credentials={credentials}
        onLoginSuccess={(user) => {
          setCurrentUser(user)
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
                <>
                  <button type="button" className="category-add-button" onClick={() => setShowGroupForm(true)}>
                    + 新建分组
                  </button>
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
                </>
              )}

              {/* 分类栏居中搜索框 (不影响分类位置，手机端自动隐藏) */}
              {pageLayoutSettings.showSearchBar && (
                <SearchBar defaultEngineId={pageLayoutSettings.defaultSearchEngine} />
              )}
            </div>

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
          normalSettings={normalSettings}
          updateNormalGlass={updateNormalGlass}
          currentWallpaper={resolvedWallpaper}
          credentials={credentials}
          onCredentialsChange={setCredentials}
          currentUser={currentUser}
          ordinaryUsers={ordinaryUsers}
          onCreateOrdinaryUser={handleCreateOrdinaryUser}
          onDeleteOrdinaryUser={handleDeleteOrdinaryUser}
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
            if (data.wallpaperSettings) setWallpaperSettings(data.wallpaperSettings)
            if (data.localWallpapers) setLocalWallpapers(data.localWallpapers)
            if (data.storedIcons) setStoredIcons(data.storedIcons)
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
