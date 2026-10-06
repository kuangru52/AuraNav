import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SiteCard, NormalGlassSettings } from '../types'

type SortableGlassCardProps = {
  card: SiteCard
  normalSettings: NormalGlassSettings
  isEditing: boolean
  onRemove: (id: string) => void
  onEdit: (card: SiteCard) => void
  onContextMenu?: (event: React.MouseEvent, card: SiteCard) => void
}

export function SortableGlassCard({
  card,
  normalSettings,
  isEditing,
  onRemove,
  onEdit,
  onContextMenu,
}: SortableGlassCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, disabled: !isEditing })

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
      {/* 独立 3D 隔离层：专门承载高斯模糊与背景色，100% 解决 Chromium GPU 在非标准 DPI 下的切片缝隙问题 */}
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
      {/* 1. 拖拽专属手柄：在编辑模式下，仅拖拽此手柄才触发卡片排序，避免在手机上滑动页面时误触发拖拽 */}
      {isEditing && (
        <div
          className="card-drag-handle"
          title="按住此处拖拽排序"
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute',
            left: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 15,
            width: '18px',
            height: '32px',
            display: 'grid',
            placeItems: 'center',
            cursor: 'grab',
            color: 'rgba(255, 255, 255, 0.65)',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 12 18" fill="currentColor">
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="3" cy="9" r="1.5" />
            <circle cx="9" cy="9" r="1.5" />
            <circle cx="3" cy="15" r="1.5" />
            <circle cx="9" cy="15" r="1.5" />
          </svg>
        </div>
      )}

      {/* 2. 卡片主体主体内容 (编辑模式下左侧留出 18px 容纳拖拽手柄) */}
      <a
        href={isEditing ? undefined : card.url}
        target="_blank"
        rel="noreferrer"
        className="site-card"
        style={{
          paddingLeft: isEditing ? '22px' : '12px',
          touchAction: 'auto',
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
      >
        <div className="site-icon" style={{ color: '#38bdf8' }}>
          {/^https?:\/\//i.test(card.icon) || /^data:image\//i.test(card.icon) || /^blob:/i.test(card.icon) || card.icon.startsWith('/data/') ? (
            <img src={card.icon} alt={card.title} />
          ) : (
            card.icon || card.title.slice(0, 2)
          )}
        </div>
        <div className="site-body">
          <h4>{card.title}</h4>
          {card.description && <p>{card.description}</p>}
        </div>
      </a>

      {/* 3. 红“×”删除按钮 */}
      {isEditing && (
        <button type="button" className="delete-button" onClick={() => onRemove(card.id)} aria-label={`删除 ${card.title}`}>
          ×
        </button>
      )}
    </div>
  )
}
