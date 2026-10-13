import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SortableGroupPillProps = {
  category: string
  selectedCategory: string
  isEditing: boolean
  groupsCount: number
  onSelect: (category: string) => void
  onRemove: (category: string) => void
  onContextMenu?: (event: React.MouseEvent, category: string) => void
  blur?: number
  opacity?: number
  edgeHighlight?: number
  color?: string
  dragOverGroup?: string | null
}

export function SortableGroupPill({
  category,
  selectedCategory,
  isEditing,
  groupsCount,
  onSelect,
  onRemove,
  onContextMenu,
  blur = 20,
  opacity = 0.45,
  edgeHighlight = 0.28,
  color = '',
  dragOverGroup = null,
}: SortableGroupPillProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category,
    disabled: !isEditing,
  })

  const isActive = selectedCategory === category || dragOverGroup === category
  const pillColor = color || ''
  const hasCustomColor = !!pillColor

  const customStyle: React.CSSProperties = {
    cursor: isEditing ? 'grab' : 'pointer',
    paddingLeft: isEditing ? '22px' : '14px',
    position: 'relative',
    touchAction: 'none',
    backdropFilter: blur > 0 ? `blur(${blur}px) saturate(160%)` : 'none',
    WebkitBackdropFilter: blur > 0 ? `blur(${blur}px) saturate(160%)` : 'none',
    background: isActive
      ? (hasCustomColor
          ? `linear-gradient(135deg, ${pillColor}, ${pillColor}88)`
          : `linear-gradient(135deg, rgba(191, 219, 254, ${Math.min(0.85, opacity + 0.15)}), rgba(255, 255, 255, ${Math.min(0.5, opacity * 0.6)}))`)
      : (hasCustomColor
          ? (pillColor.startsWith('#') ? `${pillColor}38` : pillColor)
          : `rgba(15, 23, 42, ${opacity})`),
    border: `1px solid ${hasCustomColor
      ? (pillColor.startsWith('#') ? `${pillColor}a0` : pillColor)
      : (isActive ? `rgba(255, 255, 255, ${Math.min(1, edgeHighlight + 0.35)})` : `rgba(255, 255, 255, ${edgeHighlight})`)}`,
    boxShadow: isActive && hasCustomColor
      ? `0 0 16px ${pillColor.startsWith('#') ? `${pillColor}80` : pillColor}`
      : `inset 0 1px 0 rgba(255, 255, 255, ${Math.min(1, edgeHighlight * 0.7)}), 0 5px 14px rgba(15, 23, 42, ${Math.min(0.5, opacity * 0.5)})`,
  }

  return (
    <span
      ref={setNodeRef}
      className="category-item"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : 2,
        opacity: isDragging ? 0.65 : 1,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      {...(isEditing ? attributes : {})}
      {...(isEditing ? listeners : {})}
    >
      <button
        type="button"
        className={isActive ? 'category-pill active' : 'category-pill'}
        onClick={() => onSelect(category)}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault()
            e.stopPropagation()
            onContextMenu(e, category)
          }
        }}
        style={customStyle}
      >
        {/* 编辑模式下的 6 点拖拽手柄指示 */}
        {isEditing && (
          <svg
            width="10"
            height="14"
            viewBox="0 0 12 18"
            fill="currentColor"
            style={{
              position: 'absolute',
              left: '7px',
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.65,
              pointerEvents: 'none',
            }}
          >
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="9" cy="3" r="1.5" />
            <circle cx="3" cy="9" r="1.5" />
            <circle cx="9" cy="9" r="1.5" />
            <circle cx="3" cy="15" r="1.5" />
            <circle cx="9" cy="15" r="1.5" />
          </svg>
        )}
        {category}
      </button>

      {/* 编辑模式下的删除分组按键 (SVG 高精居中叉号) */}
      {isEditing && groupsCount > 1 && (
        <button
          type="button"
          className="group-delete-button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(category)
          }}
          aria-label={`删除分组 ${category}`}
        >
          <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="2" y1="2" x2="10" y2="10" />
            <line x1="10" y1="2" x2="2" y2="10" />
          </svg>
        </button>
      )}
    </span>
  )
}
