/**
 * 格式化工具函數
 */

import { format, formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'

/**
 * 格式化貨幣
 */
export function formatCurrency(value, currency = 'USD', decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * 格式化數字
 */
export function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value)
}

/**
 * 格式化百分比
 */
export function formatPercent(value, decimals = 2) {
  const formatted = value.toFixed(decimals)
  return value >= 0 ? `+${formatted}%` : `${formatted}%`
}

/**
 * 格式化日期時間
 */
export function formatDateTime(date, formatStr = 'yyyy-MM-dd HH:mm') {
  return format(new Date(date), formatStr)
}

/**
 * 格式化相對時間
 */
export function formatRelativeTime(date) {
  return formatDistanceToNow(new Date(date), { 
    addSuffix: true,
    locale: zhTW 
  })
}

/**
 * 格式化檔案大小
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * 截斷文字
 */
export function truncate(text, maxLength = 50) {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * 去除 HTML 標籤
 */
export function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * 生成隨機 ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 計算回撤
 */
export function calculateDrawdown(equityCurve) {
  let maxEquity = equityCurve[0]
  let maxDrawdown = 0
  
  for (const equity of equityCurve) {
    if (equity > maxEquity) {
      maxEquity = equity
    }
    const drawdown = (maxEquity - equity) / maxEquity
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }
  
  return maxDrawdown * 100
}

/**
 * 計算夏普比率
 */
export function calculateSharpe(returns, riskFreeRate = 0.02) {
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
  const stdDev = Math.sqrt(
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  )
  
  if (stdDev === 0) return 0
  
  return (avgReturn - riskFreeRate) / stdDev * Math.sqrt(252)
}

/**
 * 顏色輔助類
 */
export function getReturnColor(value) {
  if (value > 0) return 'var(--color-success)'
  if (value < 0) return 'var(--color-danger)'
  return 'var(--color-text-muted)'
}

export function getConfidenceClass(confidence) {
  if (confidence >= 80) return 'high'
  if (confidence >= 60) return 'medium'
  return 'low'
}
