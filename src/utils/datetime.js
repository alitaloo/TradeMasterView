/**
 * 統一時間/時區處理工具
 * 所有頁面共用，避免各處重複實作
 * 
 * 慣例：
 * - 後端 DB 時間欄位 = Asia/Taipei 本地時間，帶 +08:00 tag
 * - K 線時間 = America/New_York 本地時間（字串無時區）
 * - 前端顯示統一轉成 Asia/Taipei
 */

const TAIPEI_TZ = 'Asia/Taipei'
const NY_TZ = 'America/New_York'

/**
 * 將任意時間字串解析為 Date 物件。
 * 若字串不帶時區資訊，預設為 Asia/Taipei (+08:00)。
 */
export function parseTimestamp(ts, assumeTz = '+08:00') {
  if (!ts) return null
  if (ts instanceof Date) return ts

  let str = String(ts)

  // 已帶時區 → 直接解析
  if (str.includes('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str)
  }

  // 無時區 → 追加預設
  // 先統一 T 分隔
  str = str.replace(' ', 'T')
  return new Date(str + assumeTz)
}

/**
 * 將 K 線時間（America/New_York 本地）轉為台北時間字串
 */
export function nyToTaipei(timestamp) {
  if (!timestamp) return '-'

  if (typeof timestamp === 'string' && timestamp.includes('-') && timestamp.includes(':')) {
    try {
      const [datePart, timePart] = timestamp.split(/[T ]/)
      const [y, m, d] = datePart.split('-').map(Number)
      const [H, M, S] = (timePart || '00:00:00').split(':').map(Number)

      // 利用 Intl 動態取得 NY 的 UTC offset（自動處理 DST）
      const approxUtc = new Date(Date.UTC(y, m - 1, d, H, M, S || 0))
      const nyParts = new Intl.DateTimeFormat('en-US', {
        timeZone: NY_TZ,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(approxUtc)

      const map = Object.fromEntries(
        nyParts.filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)])
      )

      const asNyUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second)
      const offsetMs = asNyUtc - approxUtc.getTime()
      const actualUtc = new Date(Date.UTC(y, m - 1, d, H, M, S || 0) - offsetMs)

      return formatTaipei(actualUtc)
    } catch (e) {
      console.error('nyToTaipei parse error:', e)
    }
  }

  return '-'
}

/**
 * 格式化為台北時間字串 (2026/03/12 13:09:00)
 */
export function formatTaipei(date, opts = {}) {
  if (!date) return '-'
  const d = date instanceof Date ? date : parseTimestamp(date)
  if (!d || isNaN(d.getTime())) return '-'

  return d.toLocaleString('zh-TW', {
    timeZone: TAIPEI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: opts.hideSeconds ? undefined : '2-digit',
    hour12: false,
    ...opts
  })
}

/**
 * 格式化為相對時間 ("3 分鐘前")
 */
export function timeAgo(ts) {
  if (!ts) return '未知'
  const d = ts instanceof Date ? ts : parseTimestamp(ts)
  if (!d || isNaN(d.getTime())) return '未知'

  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛更新'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  return `${diffDays} 天前`
}

/**
 * 取得美股市場當前狀態（正確處理 DST）
 * 回傳: { text, class, isOpen }
 */
export function getUSMarketStatus() {
  const now = new Date()

  // 用 Intl 取得目前紐約時間
  const nyStr = now.toLocaleString('en-US', {
    timeZone: NY_TZ,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })

  // parse "03/12/2026, 00:09"
  const match = nyStr.match(/(\d+):(\d+)/)
  if (!match) return { text: '⚠️ 未知', class: 'unknown', isOpen: false }

  const nyHour = parseInt(match[1], 10)
  const nyMin = parseInt(match[2], 10)
  const etTime = nyHour * 60 + nyMin
  const marketOpen = 9 * 60 + 30  // 9:30
  const marketClose = 16 * 60     // 16:00

  // 檢查是否為週末
  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TZ,
    weekday: 'short'
  }).format(now)

  if (dayOfWeek === 'Sat' || dayOfWeek === 'Sun') {
    return { text: '🌙 週末休市', class: 'closed', isOpen: false }
  }

  if (etTime >= marketOpen && etTime < marketClose) {
    return { text: '📈 開盤', class: 'open', isOpen: true }
  } else if (etTime < marketOpen) {
    return { text: '🌅 盤前', class: 'pre', isOpen: false }
  } else {
    return { text: '🌙 收盤', class: 'closed', isOpen: false }
  }
}

/**
 * FreshnessIndicator 的新鮮度等級
 */
export function getFreshnessLevel(ts) {
  if (!ts) return { text: '未知', class: 'unknown' }
  const d = ts instanceof Date ? ts : parseTimestamp(ts)
  if (!d || isNaN(d.getTime())) return { text: '未知', class: 'unknown' }

  const diffMins = Math.floor((Date.now() - d.getTime()) / 60000)

  if (diffMins < 5) return { text: timeAgo(d), class: 'fresh' }
  if (diffMins < 30) return { text: timeAgo(d), class: 'normal' }
  if (diffMins < 60) return { text: timeAgo(d), class: 'stale' }
  return { text: timeAgo(d), class: 'outdated' }
}
