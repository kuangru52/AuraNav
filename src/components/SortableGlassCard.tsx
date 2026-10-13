import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SiteCard, NormalGlassSettings } from '../types'

type SortableGlassCardProps = {
  card: SiteCard
  normalSettings: NormalGlassSettings
  isEditing: boolean
  hideCardDescription?: boolean
  onRemove: (id: string) => void
  onEdit: (card: SiteCard) => void
  onContextMenu?: (event: React.MouseEvent, card: SiteCard) => void
}

export const SortableGlassCard = React.memo(function SortableGlassCard({
  card,
  normalSettings,
  isEditing,
  hideCardDescription = false,
  onRemove,
  onEdit,
  onContextMenu,
}: SortableGlassCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, disabled: !isEditing })
  const [imgError, setImgError] = useState(false)

  const getCardBg = () => {
    if (!card.accent) {
      return `rgba(15, 23, 42, ${Math.max(0.35, normalSettings.opacity * 0.9)})`
    }
    if (card.accent.startsWith('#')) {
      const alphaHex = Math.round(Math.max(0.25, normalSettings.opacity * 0.8) * 255).toString(16).padStart(2, '0')
      return `${card.accent}${alphaHex}`
    }
    return card.accent
  }

  const handleRightClick = (e: React.MouseEvent) => {
    if (onContextMenu) {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(e, card)
    }
  }

  const isImageUrl = !imgError && (/^https?:\/\//i.test(card.icon) || /^data:image\//i.test(card.icon) || /^blob:/i.test(card.icon) || card.icon.startsWith('/data/'))

  return (
    <div
      ref={setNodeRef}
      className={isEditing ? 'site-tile editing' : 'site-tile'}
      onContextMenu={handleRightClick}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : 2,
        borderRadius: `${normalSettings.cornerRadius}px`,
        border: card.accent
          ? `1px solid ${card.accent.startsWith('#') ? `${card.accent}80` : card.accent}`
          : `1px solid rgba(255, 255, 255, ${Math.max(0.12, normalSettings.edgeHighlight * 0.5)})`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
      data-site-id={card.id}
    >
      {/* 1. 独立 3D 隔离层：专门承载高斯模糊与背景色 */}
      <div
        className="glass-surface-layer"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          backgroundColor: getCardBg(),
          backdropFilter: normalSettings.blur > 0 ? `blur(${normalSettings.blur}px)` : 'none',
          WebkitBackdropFilter: normalSettings.blur > 0 ? `blur(${normalSettings.blur}px)` : 'none',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 2. 编辑模式下的拖拽指示柄 */}
      {isEditing && (
        <div
          className="card-drag-handle-indicator"
          style={{
            position: 'absolute',
            left: '6px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 5,
            width: '12px',
            height: '24px',
            display: 'grid',
            placeItems: 'center',
            color: 'rgba(255, 255, 255, 0.65)',
            pointerEvents: 'none',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 12 18" fill="currentColor">
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="3" cy="9" r="1.5" />
            <circle cx="9" cy="9" r="1.5" />
            <circle cx="3" cy="15" r="1.5" />
            <circle cx="9" cy="9" r="1.5" />
          </svg>
        </div>
      )}

      {/* 3. 卡片主体 */}
      <a
        href={isEditing ? undefined : (!card.url ? '#' : (/^https?:\/\//i.test(card.url) ? card.url : `https://${card.url}`))}
        target="_blank"
        rel="noreferrer"
        className="site-card"
        style={{
          paddingLeft: isEditing ? '22px' : '12px',
          touchAction: 'pan-y',
        }}
        onContextMenu={handleRightClick}
        onClickCapture={(event) => {
          if (isEditing) {
            event.preventDefault()
            event.stopPropagation()
            onEdit(card)
          }
        }}
        onClick={(event) => {
          if (isEditing) event.preventDefault()
        }}
        {...(isEditing ? attributes : {})}
        {...(isEditing ? listeners : {})}
      >
        <div className="site-icon" style={{ color: '#38bdf8' }}>
          {isImageUrl ? (
            <img
              src={card.icon}
              alt={card.title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : (
            card.icon || card.title.slice(0, 2)
          )}
        </div>
        <div className="site-body">
          <h4>{card.title}</h4>
          {!hideCardDescription && card.description && <p>{card.description}</p>}
        </div>
      </a>

      {/* 4. 删除按钮 (SVG 高精居中叉号) */}
      {isEditing && (
        <button type="button" className="delete-button" onClick={() => onRemove(card.id)} aria-label={`删除 ${card.title}`}>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      )}
    </div>
  )
})
