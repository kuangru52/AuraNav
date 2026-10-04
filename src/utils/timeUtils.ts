export function getFormattedDateStrings(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  const weekDayStr = weekDays[date.getDay()] ?? ''

  let lunarStr = ''
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const parts = formatter.formatToParts(date)
    const lYear = parts.find((p) => p.type === 'year')?.value ?? ''
    const lMonth = parts.find((p) => p.type === 'month')?.value ?? ''
    const lDay = parts.find((p) => p.type === 'day')?.value ?? ''

    // Map Chinese Lunar Day numbers to traditional Chinese lunar day names if numeric
    const dayNum = parseInt(lDay, 10)
    let lunarDayName = lDay
    if (!isNaN(dayNum)) {
      const lunarDays = [
        '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
        '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
        '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
      ]
      lunarDayName = lunarDays[dayNum - 1] ?? lDay
    }

    lunarStr = `${lYear}${lMonth}${lunarDayName}`
  } catch {
    lunarStr = ''
  }

  const clockStr = date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const dateStr = `${year}年${month}月${day}日 ${weekDayStr}${lunarStr ? ` ${lunarStr}` : ''}`

  return { clockStr, dateStr }
}
