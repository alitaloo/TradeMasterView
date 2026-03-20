<template>
  <div class="stock-strategies-page">
    <div class="page-header">
      <h1 class="page-title">🎯 股票策略配置</h1>
      <button class="btn btn-primary" @click="refreshStrategies">
        <span>🔄</span> 重新回測
      </button>
    </div>
    
    <!-- 搜尋框 -->
    <div class="search-box">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="🔍 搜尋股票代碼..."
        class="search-input"
      >
    </div>
    
    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="strategies-container">
      <table class="strategies-table">
        <thead>
          <tr>
            <th>股票</th>
            <th>週期</th>
            <th>指標</th>
            <th>夏普比率</th>
            <th>報酬率</th>
            <th>勝率</th>
            <th>交易次數</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="strategy in filteredStrategies" :key="strategy.symbol + strategy.timeframe">
            <td class="symbol">{{ strategy.symbol.replace('US.', '') }}</td>
            <td>
              <span class="timeframe-badge" :class="strategy.timeframe">
                {{ timeframeLabel(strategy.timeframe) }}
              </span>
            </td>
            <td class="indicator">{{ strategy.indicator }}</td>
            <td :class="getSharpeClass(strategy.sharpe)">{{ formatNumber(strategy.sharpe) }}</td>
            <td :class="getReturnClass(strategy.return_pct)">{{ formatPercent(strategy.return_pct) }}</td>
            <td>{{ formatPercent(strategy.win_rate) }}</td>
            <td>{{ strategy.trades }}</td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="filteredStrategies.length === 0" class="no-data">
        沒有找到匹配的策略
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_API_URL
const { error: showToast } = useToast()

const strategies = ref([])
const loading = ref(true)
const error = ref(null)
const searchQuery = ref('')

const fetchApi = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_URL}${url}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
    // 檢查是否返回 HTML（伺服器錯誤頁面）
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('伺服器回應格式錯誤，請確認 API 服務正常運行')
    }
    return response.json()
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('無法連線至 API 伺服器，請檢查網路連線')
    }
    throw err
  }
}

const filteredStrategies = computed(() => {
  if (!searchQuery.value) return strategies.value
  const query = searchQuery.value.toUpperCase()
  return strategies.value.filter(s => 
    s.symbol.toUpperCase().includes(query) ||
    s.indicator.toUpperCase().includes(query)
  )
})

const timeframeLabel = (tf) => {
  const labels = {
    '5m': '5分鐘',
    '1h': '1小時',
    '1d': '1日'
  }
  return labels[tf] || tf
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return '-'
  return parseFloat(num).toFixed(2)
}

const formatPercent = (num) => {
  if (num === null || num === undefined) return '-'
  return (parseFloat(num) * 100).toFixed(2) + '%'
}

const getSharpeClass = (sharpe) => {
  if (sharpe > 10) return 'excellent'
  if (sharpe > 5) return 'good'
  if (sharpe > 0) return 'neutral'
  return 'poor'
}

const getReturnClass = (ret) => {
  const r = parseFloat(ret)
  if (r > 0.2) return 'excellent'
  if (r > 0.1) return 'good'
  if (r > 0) return 'neutral'
  return 'poor'
}

const loadStrategies = async () => {
  loading.value = true
  error.value = null
  try {
    const data = await fetchApi('/stock-strategies')
    if (data && data.strategies) {
      strategies.value = data.strategies || []
    } else if (data && data.status === 'ok') {
      strategies.value = data.strategies || []
    } else {
      throw new Error(data?.message || '無法讀取策略數據')
    }
  } catch (e) {
    error.value = e.message || '載入策略失敗，請稍後重試'
    console.error('Load strategies error:', e)
    showToast(error.value)
  } finally {
    loading.value = false
  }
}

const refreshStrategies = async () => {
  loading.value = true
  error.value = null
  try {
    await fetchApi('/stock-strategies/refresh', { method: 'POST' })
    await loadStrategies()
    showToast('策略已重新整理')
  } catch (e) {
    error.value = e.message
    showToast('重新整理失敗')
  }
}

onMounted(() => {
  loadStrategies()
})
</script>

<style scoped>
.stock-strategies-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover {
  background: #4338CA;
}

.search-box {
  position: relative;
  margin-bottom: 24px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  font-size: 14px;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #4F46E5;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 48px;
  color: #6B7280;
}

.error {
  color: #EF4444;
}

.strategies-table {
  width: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.strategies-table th,
.strategies-table td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid #E5E7EB;
}

.strategies-table th {
  background: #F9FAFB;
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  text-transform: uppercase;
}

.strategies-table tbody tr:hover {
  background: #F9FAFB;
}

.symbol {
  font-weight: 600;
  color: #111827;
}

.timeframe-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.timeframe-badge[class*="5m"] {
  background: rgba(248,81,73,0.2);
  color: #f85149;
}

.timeframe-badge[class*="1h"] {
  background: rgba(63,185,80,0.2);
  color: #3fb950;
}

.timeframe-badge[class*="1d"] {
  background: rgba(56,139,253,0.2);
  color: #388bfd;
}

.indicator {
  font-weight: 500;
  color: #4B5563;
}

.excellent {
  color: #059669;
  font-weight: 600;
}

.good {
  color: #4F46E5;
}

.neutral {
  color: #6B7280;
}

.poor {
  color: #EF4444;
}
</style>
