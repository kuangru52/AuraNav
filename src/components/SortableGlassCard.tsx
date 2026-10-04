import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SiteCard, NormalGlassSettings } from '../types'

type SortableGlassCardProps = {
  card: SiteCard
  normalSettings: NormalGlassSettings
  isEditing: boolean
  onRemove: (id: string) => void
  onEdit: (card: SiteCard) => void
}

export function SortableGlassCard({
  card,
  normalSettings,
  isEditing,
  onRemove,
  onEdit,
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

  return (
    <div
      ref={setNodeRef}
      className={isEditing ? 'site-tile editing' : 'site-tile'}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 30 : 2,
        borderRadius: `${normalSettings.cornerRadius}px`,
        backgroundColor: getCardBg(),
        backdropFilter: `blur(${normalSettings.blur}px)`,
        WebkitBackdropFilter: `blur(${normalSettings.blur}px)`,
        border: card.accent
          ? `1px solid ${card.accent.startsWith('#') ? `${card.accent}80` : card.accent}`
          : `1px solid rgba(255, 255, 255, ${Math.max(0.12, normalSettings.edgeHighlight * 0.5)})`,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
      data-site-id={card.id}
    >
      <a
        href={isEditing ? undefined : card.url}
        target="_blank"
        rel="noreferrer"
        className="site-card"
        style={{ touchAction: isEditing ? 'none' : 'auto' }}
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
          {/^https?:\/\//i.test(card.icon) || /^data:image\//i.test(card.icon) || /^blob:/i.test(card.icon) ? (
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
      {isEditing && (
        <button type="button" className="delete-button" onClick={() => onRemove(card.id)} aria-label={`删除 ${card.title}`}>
          ×
        </button>
      )}
    </div>
  )
}
