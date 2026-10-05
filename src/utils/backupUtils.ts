export function exportData(data: object) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2))
  const downloadAnchor = document.createElement('a')
  downloadAnchor.setAttribute('href', dataStr)
  downloadAnchor.setAttribute('download', `栖屿-AuraNav-${new Date().toISOString().slice(0, 10)}.json`)
  document.body.appendChild(downloadAnchor)
  downloadAnchor.click()
  downloadAnchor.remove()
}

export function importData(file: File, onSuccess: (data: any) => void, onError: (err: string) => void) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string)
      if (parsed && typeof parsed === 'object') {
        onSuccess(parsed)
      } else {
        onError('无效的备份文件格式')
      }
    } catch {
      onError('解析 JSON 文件失败')
    }
  }
  reader.onerror = () => onError('读取文件失败')
  reader.readAsText(file)
}
