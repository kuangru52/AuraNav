export type WallpaperMode = 'bing' | 'local'

export type SiteCard = {
  id: string
  title: string
  url: string
  description: string
  icon: string
  category: string
  accent: string
}

export type NormalGlassSettings = {
  blur: number
  opacity: number
  cornerRadius: number
  edgeHighlight: number
}

export type WallpaperSettings = {
  mode: WallpaperMode
  blur: number
  interval: number
}

export type GlassPosition = {
  left: number
  top: number
  width: number
  height: number
}

export type Credentials = {
  username: string
  password: string
}

export type PageLayoutSettings = {
  topbarPaddingX: number
  topbarPaddingTop: number
  categoryPaddingX: number
  categoryMarginTop: number
  categoryAlign: 'flex-start' | 'center' | 'flex-end'
  cardGridPaddingX: number
  cardGridPaddingTop: number
  cardsPerRow: number
  cardHeight: number
  cardGapX: number
  cardGapY: number

  // 顶栏 Logo 与标题自定义
  showLogo: boolean
  logoUrl: string
  logoSize: number
  showBrandName: boolean
  brandName: string
  brandNameFontSize: number
  brandNameColor: string
  showBrandSubtitle: boolean
  brandSubtitle: string
  brandSubtitleFontSize: number
  brandSubtitleColor: string

  // 顶栏中间时间与日期
  showClock: boolean
  clockFontSize: number
  clockColor: string
  showDate: boolean
  dateFontSize: number
  dateColor: string

  // 分类栏搜索框
  showSearchBar: boolean
  defaultSearchEngine: string
}
