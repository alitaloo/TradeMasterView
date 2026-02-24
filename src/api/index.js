/**
 * TradeMaster API 客戶端
 */

import axios from 'axios'

// 支持環境變量配置 API 地址
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

// 創建 axios 實例
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 請求攔截器
api.interceptors.request.use(
  config => {
    // 可以添加認證 token
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 響應攔截器
api.interceptors.response.use(
  response => response.data,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

/**
 * 信號相關 API
 */
export const signalsApi = {
  // 獲取所有信號
  getAll: (params = {}) => api.get('/signals', { params }),
  
  // 獲取最新信號
  getLatest: (limit = 10) => api.get('/signals/latest', { params: { limit } }),
  
  // 獲取特定股票的信號
  getBySymbol: (symbol) => api.get(`/signals/${symbol}`),
  
  // 獲取信號摘要
  getSummary: () => api.get('/signals/summary')
}

/**
 * 回測相關 API
 */
export const backtestsApi = {
  // 獲取所有回測結果
  getAll: (params = {}) => api.get('/backtests', { params }),
  
  // 獲取特定策略的回測結果
  getByStrategy: (strategy) => api.get(`/backtests/strategy/${strategy}`),
  
  // 獲取特定股票的回測結果
  getBySymbol: (symbol) => api.get(`/backtests/symbol/${symbol}`),
  
  // 獲取表現最好的回測
  getTop: () => api.get('/backtests/top'),
  
  // 獲取回測統計
  getStatistics: () => api.get('/backtests/statistics')
}

/**
 * 策略相關 API
 */
export const strategiesApi = {
  // 獲取所有策略
  getAll: () => api.get('/strategies'),
  
  // 獲取策略詳情
  getById: (id) => api.get(`/strategies/${id}`),
  
  // 切換策略狀態
  toggle: (id, enabled) => api.post(`/strategies/${id}/toggle`, { enabled }),
  
  // 獲取已啟用策略
  getEnabled: () => api.get('/strategies/enabled'),
  
  // 獲取表現最好的策略
  getTop: () => api.get('/strategies/top')
}

/**
 * 投資組合相關 API
 */
export const portfolioApi = {
  // 獲取投資組合概覽
  getOverview: () => api.get('/portfolio/overview'),
  
  // 獲取持倉列表
  getPositions: () => api.get('/portfolio/positions'),
  
  // 獲取特定持倉
  getPosition: (symbol) => api.get(`/portfolio/positions/${symbol}`),
  
  // 獲取資產配置
  getAllocation: () => api.get('/portfolio/allocation'),
  
  // 獲取表現統計
  getPerformance: () => api.get('/portfolio/performance'),
  
  // 獲取完整摘要
  getSummary: () => api.get('/portfolio/summary')
}

/**
 * 市場數據相關 API
 */
export const marketApi = {
  // 獲取股票報價
  getQuote: (symbol) => api.get(`/market/quote/${symbol}`),
  
  // 批量獲取報價
  getQuotes: (symbols) => api.post('/market/quotes', { symbols }),
  
  // 獲取市場狀態
  getStatus: () => api.get('/market/status')
}

/**
 * 模擬交易相關 API
 */
export const paperApi = {
  // 獲取模擬交易狀態
  getStatus: () => api.get('/paper/status'),
  
  // 啟用/停用模擬交易
  enable: (enabled = true) => api.post('/paper/enable', { enabled }),
  
  // 獲取模擬持倉
  getPositions: () => api.get('/paper/positions'),
  
  // 獲取單一持倉
  getPosition: (symbol) => api.get(`/paper/positions/${symbol}`),
  
  // 獲取模擬交易摘要
  getSummary: () => api.get('/paper/summary'),
  
  // 獲取模擬訂單列表
  getOrders: (limit = 100) => api.get('/paper/orders', { params: { limit } }),
  
  // 創建模擬訂單
  createOrder: (order) => api.post('/paper/orders', order),
  
  // 取消模擬訂單
  cancelOrder: (orderId) => api.delete(`/paper/orders/${orderId}`),
  
  // 輪詢訂單狀態
  pollOrders: () => api.post('/paper/poll'),
  
  // 獲取模擬報告
  getReport: () => api.get('/paper/report'),
  
  // 獲取每日結算
  getDailySummary: (limit = 30) => api.get('/paper/daily-summary', { params: { limit } }),
  
  // 獲取信號命中率
  getSignalStats: () => api.get('/paper/signal-stats'),
  
  // 獲取回測對比
  getPerformance: () => api.get('/paper/performance'),
  
  // 手動推送到 Successor Bot
  pushSummary: () => api.post('/paper/push')
}

export default api
