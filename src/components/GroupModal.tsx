type GroupModalProps = {
  isOpen: boolean
  editingGroup?: string | null
  newGroupName: string
  groupColor?: string
  groups: string[]
  onGroupNameChange: (name: string) => void
  onGroupColorChange?: (color: string) => void
  onClose: () => void
  onSave: () => void
}

const COLOR_PRESETS = [
  { name: '默认透亮', value: '' },
  { name: '冰蓝', value: '#38bdf8' },
  { name: '紫罗兰', value: '#c084fc' },
  { name: '樱花粉', value: '#f472b6' },
  { name: '薄荷绿', value: '#4ade80' },
  { name: '暖阳橙', value: '#fb923c' },
  { name: '鹅黄', value: '#fde047' },
  { name: '莫兰迪灰', value: '#94a3b8' },
]

export function GroupModal({
  isOpen,
  editingGroup = null,
  newGroupName,
  groupColor = '',
  groups,
  onGroupNameChange,
  onGroupColorChange,
  onClose,
  onSave,
}: GroupModalProps) {
  if (!isOpen) return null

  const isEditMode = !!editingGroup
  const trimmedName = newGroupName.trim()
  const isDuplicate = groups.includes(trimmedName) && trimmedName !== editingGroup
  const isInvalid = !trimmedName || isDuplicate

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel group-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: '420px', width: '100%' }}>
        <div className="panel-header">
          <h3>{isEditMode ? `编辑分组：${editingGroup}` : '新建分组'}</h3>
          <button type="button" className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0' }}>
          <label className="group-name-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.9)' }}>分组名称</span>
            <input
              autoFocus
              value={newGroupName}
              onChange={(event) => onGroupNameChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isInvalid) onSave()
              }}
              placeholder="例如：常用工具"
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '10px',
                border: isDuplicate ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            {isDuplicate && (
              <span style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '2px' }}>
                已存在同名分组，请换一个名称
              </span>
            )}
          </label>

          {/* 分组胶囊专属颜色选择器 */}
          {onGroupColorChange && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(226, 232, 240, 0.9)' }}>
                  分组胶囊颜色
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(226, 232, 240, 0.6)' }}>自定义</span>
                  <input
                    type="color"
                    value={groupColor.startsWith('#') ? groupColor : '#38bdf8'}
                    onChange={(e) => onGroupColorChange(e.target.value)}
                    style={{ height: '26px', width: '32px', padding: 0, borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', cursor: 'pointer' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COLOR_PRESETS.map((preset) => {
                  const isSelected = preset.value === '' ? !groupColor : groupColor === preset.value
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => onGroupColorChange(preset.value)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        borderRadius: '999px',
                        border: isSelected ? '2px solid #fff' : '1px solid rgba(255, 255, 255, 0.2)',
                        background: preset.value ? preset.value : 'rgba(255, 255, 255, 0.12)',
                        color: preset.value ? '#0f172a' : '#fff',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 10px rgba(255, 255, 255, 0.4)' : 'none',
                      }}
                    >
                      {preset.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="action-button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="action-button primary"
            onClick={onSave}
            disabled={isInvalid}
          >
            {isEditMode ? '保存修改' : '创建分组'}
          </button>
        </div>
      </div>
    </div>
  )
}
