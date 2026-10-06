import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SortableGroupPillProps = {
  category: string
  selectedCategory: string
  isEditing: boolean
  groupsCount: number
  onSelect: (category: string) => void
  onRemove: (category: string) => void
}

export function SortableGroupPill({
  category,
  selectedCategory,
  isEditing,
  groupsCount,
  onSelect,
  onRemove,
}: SortableGroupPillProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category,
    disabled: !isEditing,
  })

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
        className={selectedCategory === category ? 'category-pill active' : 'category-pill'}
        onClick={() => onSelect(category)}
        style={{
          cursor: isEditing ? 'grab' : 'pointer',
          paddingLeft: isEditing ? '22px' : '14px',
          position: 'relative',
          touchAction: 'none',
        }}
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

      {/* 编辑模式下的删除分组按键 */}
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
          ×
        </button>
      )}
    </span>
  )
}
