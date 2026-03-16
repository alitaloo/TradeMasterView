/**
 * TradeMaster Store
 * 全局狀態管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { signalsApi, backtestsApi, strategiesApi, portfolioApi } from '../api'

export const useTradeMasterStore = defineStore('trademaster', () => {
  // ===== 狀態 =====
  
  // 信號
  const signals = ref([])
  const signalsLoading = ref(false)
  const signalsTimestamp = ref(null)
  const signalsError = ref(null)
  
  // 回測結果
  const backtests = ref([])
  const backtestsLoading = ref(false)
  const backtestsError = ref(null)
  
  // 策略
  const strategies = ref([])
  const strategiesLoading = ref(false)
  const strategiesError = ref(null)
  
  // 投資組合
  const portfolio = ref({
    totalAssets: 0,
    todayPnL: 0,
    positions: []
  })
  const portfolioLoading = ref(false)
  const portfolioError = ref(null)
  
  // 市場狀態
  const marketStatus = ref({
    isOpen: false,
    lastUpdate: null
  })
  
  // ===== Getters =====
  
  const longSignals = computed(() => 
    signals.value.filter(s => (s.signal_type || s.type) === 'LONG' || (s.signal_type || s.type) === 'BUY')
  )
  
  const shortSignals = computed(() => 
    signals.value.filter(s => (s.signal_type || s.type) === 'SHORT' || (s.signal_type || s.type) === 'SELL')
  )
  
  const enabledStrategies = computed(() => 
    strategies.value.filter(s => s.enabled)
  )
  
  const topPerformingStrategies = computed(() => 
    [...strategies.value]
      .sort((a, b) => b.sharpe - a.sharpe)
      .slice(0, 5)
  )
  
  // ===== Actions =====
  
  // 載入信號
  // NOTE: axios interceptor already unwraps response.data, so `response` IS the JSON body
  async function fetchSignals(params = {}) {
    signalsLoading.value = true
    signalsError.value = null
    try {
      const response = await signalsApi.getAll(params)
      if (response && response.status === 'ok') {
        signals.value = response.signals || []
        signalsTimestamp.value = response.data_timestamp || null
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error)
      signalsError.value = error?.message || 'Failed to fetch signals from API'
      signals.value = []
    } finally {
      signalsLoading.value = false
    }
  }
  
  // 載入回測結果
  async function fetchBacktests(params = {}) {
    backtestsLoading.value = true
    backtestsError.value = null
    try {
      const response = await backtestsApi.getAll(params)
      if (response && response.status === 'ok') {
        backtests.value = response.backtests || []
      }
    } catch (error) {
      console.error('Failed to fetch backtests:', error)
      backtestsError.value = error?.message || 'Failed to fetch backtests from API'
      backtests.value = []
    } finally {
      backtestsLoading.value = false
    }
  }
  
  // 載入策略
  async function fetchStrategies() {
    strategiesLoading.value = true
    strategiesError.value = null
    try {
      const response = await strategiesApi.getAll()
      if (response && response.status === 'ok') {
        strategies.value = response.strategies || []
      }
    } catch (error) {
      console.error('Failed to fetch strategies:', error)
      strategiesError.value = error?.message || 'Failed to fetch strategies from API'
      strategies.value = []
    } finally {
      strategiesLoading.value = false
    }
  }
  
  // 載入投資組合
  async function fetchPortfolio() {
    portfolioLoading.value = true
    portfolioError.value = null
    try {
      const response = await portfolioApi.getSummary()
      if (response && response.status === 'ok') {
        const data = response.portfolio
        // 轉換字段名（後端 snake_case → 前端 camelCase）
        portfolio.value = {
          totalAssets: data.total_assets || 0,
          todayPnL: data.today_pnl || 0,
          positions: (data.positions || []).map(p => ({
            symbol: p.symbol,
            shares: p.shares || p.quantity,
            avgPrice: p.avg_price,
            currentPrice: p.current_price,
            marketValue: p.market_value,
            pnl: p.pnl,
            pnlAmount: p.pnl_amount,
            allocation: p.allocation
          }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error)
      portfolioError.value = error?.message || 'Failed to fetch portfolio from API'
      portfolio.value = { totalAssets: 0, todayPnL: 0, positions: [] }
    } finally {
      portfolioLoading.value = false
    }
  }
  
  // 切換策略狀態
  async function toggleStrategy(id) {
    const strategy = strategies.value.find(s => s.id === id)
    if (strategy) {
      try {
        const response = await strategiesApi.toggle(id, !strategy.enabled)
        if (response && response.status === 'ok') {
          strategy.enabled = response.enabled
        }
      } catch (error) {
        console.error('Failed to toggle strategy:', error)
        strategy.enabled = !strategy.enabled
      }
    }
  }
  
  // 初始化所有數據
  async function initialize() {
    await Promise.all([
      fetchSignals(),
      fetchBacktests(),
      fetchStrategies(),
      fetchPortfolio()
    ])
  }
  
  // ===== 模擬數據（後備） =====
  
  function getMockSignals() {
    return [
      { id: 1, symbol: 'AMD', type: 'LONG', price: 142.50, time: '10:30', confidence: 85, strategy: 'Stooq_V2' },
      { id: 2, symbol: 'NVDA', type: 'SHORT', price: 875.20, time: '10:25', confidence: 78, strategy: 'Trend_Filtered' },
      { id: 3, symbol: 'AVGO', type: 'LONG', price: 1240.00, time: '10:20', confidence: 92, strategy: 'Stooq_V2' },
      { id: 4, symbol: 'COIN', type: 'LONG', price: 178.50, time: '10:15', confidence: 88, strategy: 'MACD_Trend' },
      { id: 5, symbol: 'TSLA', type: 'SHORT', price: 245.30, time: '10:10', confidence: 72, strategy: 'Trend_Filtered' },
      { id: 6, symbol: 'MU', type: 'LONG', price: 98.75, time: '10:05', confidence: 81, strategy: 'RSI_Reversal' }
    ]
  }
  
  function getMockBacktests() {
    return [
      { id: 1, strategy: 'Stooq_V2', symbol: 'WDC', return: 109.3, sharpe: 105.5, max_dd: 20.9 },
      { id: 2, strategy: 'Stooq_V2', symbol: 'TSM', return: 31.1, sharpe: 92.4, max_dd: 6.3 },
      { id: 3, strategy: 'Stooq_V2', symbol: 'GOOGL', return: 22.9, sharpe: 59.8, max_dd: 7.6 },
      { id: 4, strategy: 'MACD_Trend', symbol: 'TSLA', return: 198408, sharpe: 164.9, max_dd: 56.3 },
      { id: 5, strategy: 'Stooq_V2', symbol: 'COIN', return: 21.4, sharpe: 51.4, max_dd: 26.8 }
    ]
  }
  
  function getMockStrategies() {
    return [
      { id: 1, name: 'Stooq_V2', params: 'RSI(7/35/80) SL=8% TP=10%', return: 67.7, sharpe: 139.2, enabled: true },
      { id: 2, name: 'Stooq_V2', params: 'RSI(14/35/65) SL=15% TP=20%', return: 109.3, sharpe: 105.5, enabled: true },
      { id: 3, name: 'Trend_Filtered', params: 'RSI(7/40/75) SMA(50/200)', return: 17.1, sharpe: 78.8, enabled: false },
      { id: 4, name: 'MACD_Trend', params: 'Fast:8, Slow:17, Signal:9', return: 396708, sharpe: 146.9, enabled: true }
    ]
  }
  
  function getMockPortfolio() {
    return {
      totalAssets: 156420,
      todayPnL: 3240,
      positions: [
        { symbol: 'TSM', shares: 100, avgPrice: 145.20, currentPrice: 152.30, pnl: 4.9, allocation: 22 },
        { symbol: 'NVDA', shares: 50, avgPrice: 820.50, currentPrice: 875.20, pnl: 6.7, allocation: 18 },
        { symbol: 'AMD', shares: 200, avgPrice: 138.40, currentPrice: 142.50, pnl: 3.0, allocation: 15 },
        { symbol: 'AVGO', shares: 30, avgPrice: 1180.00, currentPrice: 1240.00, pnl: 5.1, allocation: 12 },
        { symbol: 'WDC', shares: 80, avgPrice: 92.50, currentPrice: 98.75, pnl: 6.8, allocation: 10 }
      ]
    }
  }
  
  // ===== 返回 =====
  return {
    // 狀態
    signals,
    signalsLoading,
    signalsTimestamp,
    signalsError,
    backtests,
    backtestsLoading,
    backtestsError,
    strategies,
    strategiesLoading,
    strategiesError,
    portfolio,
    portfolioLoading,
    portfolioError,
    marketStatus,
    
    // Getters
    longSignals,
    shortSignals,
    enabledStrategies,
    topPerformingStrategies,
    
    // Actions
    fetchSignals,
    fetchBacktests,
    fetchStrategies,
    fetchPortfolio,
    toggleStrategy,
    initialize
  }
})
