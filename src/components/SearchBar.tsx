import { useState } from 'react'

export type SearchEngine = {
  id: string
  name: string
  url: string
  icon: string
}

export const SEARCH_ENGINES: SearchEngine[] = [
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', icon: '百' },
  { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=', icon: 'B' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: 'G' },
  { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=', icon: '搜' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=', icon: 'GH' },
]

type SearchBarProps = {
  defaultEngineId?: string
}

export function SearchBar({ defaultEngineId = 'baidu' }: SearchBarProps) {
  const [selectedEngineId, setSelectedEngineId] = useState(defaultEngineId)
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const currentEngine = SEARCH_ENGINES.find((e) => e.id === selectedEngineId) ?? SEARCH_ENGINES[0]

  const handleSearch = () => {
    if (!query.trim()) return
    const targetUrl = `${currentEngine.url}${encodeURIComponent(query.trim())}`
    window.open(targetUrl, '_blank')
  }

  return (
    <div className="search-bar-wrap">
      <div className="search-engine-selector">
        <button
          type="button"
          className="engine-toggle-btn"
          onClick={() => setShowDropdown((prev) => !prev)}
          title={`当前搜索引擎：${currentEngine.name}（点击切换）`}
        >
          <span className="engine-icon-badge">{currentEngine.icon}</span>
          <span className="dropdown-arrow">▾</span>
        </button>

        {showDropdown && (
          <div className="engine-dropdown-menu">
            {SEARCH_ENGINES.map((engine) => (
              <button
                key={engine.id}
                type="button"
                className={engine.id === currentEngine.id ? 'engine-item active' : 'engine-item'}
                onClick={() => {
                  setSelectedEngineId(engine.id)
                  setShowDropdown(false)
                }}
              >
                <span className="engine-icon-badge">{engine.icon}</span>
                <span>{engine.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input
        type="text"
        name="search_query"
        autoComplete="off"
        className="search-input"
        placeholder={`在 ${currentEngine.name} 中搜索...`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch()
        }}
      />

      <button type="button" className="search-submit-btn" onClick={handleSearch} title="开始搜索">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      </button>
    </div>
  )
}
