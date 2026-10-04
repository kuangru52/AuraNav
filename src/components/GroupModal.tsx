type GroupModalProps = {
  isOpen: boolean
  newGroupName: string
  groups: string[]
  onGroupNameChange: (name: string) => void
  onClose: () => void
  onAdd: () => void
}

export function GroupModal({
  isOpen,
  newGroupName,
  groups,
  onGroupNameChange,
  onClose,
  onAdd,
}: GroupModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel group-modal" onClick={(event) => event.stopPropagation()}>
        <div className="panel-header">
          <h3>新建分组</h3>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <label className="group-name-field">
          <span>分组名称</span>
          <input
            autoFocus
            value={newGroupName}
            onChange={(event) => onGroupNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onAdd()
            }}
            placeholder="例如：常用工具"
          />
        </label>
        <div className="form-actions">
          <button type="button" className="action-button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="action-button primary"
            onClick={onAdd}
            disabled={!newGroupName.trim() || groups.includes(newGroupName.trim())}
          >
            创建分组
          </button>
        </div>
      </div>
    </div>
  )
}
