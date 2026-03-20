<template>
  <div class="realtime-page">
    <div class="page-header">
      <h1>📊 K線監控</h1>
      <div class="header-info">
        <span class="data-source">{{ dataSource }} | 更新: {{ lastUpdate }}</span>
      </div>
    </div>
    
    <!-- 股票選擇器 -->
    <div class="stock-selector">
      <select v-model="selectedStock" @change="fetchKline(selectedStock)" class="stock-select">
        <option 
          v-for="stock in stockList" 
          :key="stock.symbol" 
          :value="stock.symbol"
        >
          {{ stock.symbol }}
          <span v-if="backtestSymbols.has(stock.symbol)">★</span>
        </option>
      </select>
      
      <select v-model="selectedInterval" @change="fetchKline(selectedStock)" class="interval-select">
        <option value="5m">5分鐘</option>
        <option value="1h">1小時</option>
        <option value="1d">日線</option>
      </select>
    </div>
    
    <!-- K線列表 -->
    <div class="kline-container" v-if="klineData.length > 0">
      <div class="kline-header">
        <h2>{{ selectedStock }} - {{ selectedInterval }} K線</h2>
        <div class="kline-controls">
          <span class="total-count">共 {{ klineData.length }} 筆</span>
          <button class="refresh-btn" @click="forceUpdate">
            查詢
          </button>
        </div>
      </div>
      
      <!-- 分頁控制 -->
      <div class="pagination">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          ◀
        </button>
        <span class="page-info">
          第 {{ currentPage }} / {{ totalPages }} 頁
        </span>
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          ▶
        </button>
        <select v-model="pageSize" class="page-size-select">
          <option :value="20">20 筆/頁</option>
          <option :value="50">50 筆/頁</option>
          <option :value="100">100 筆/頁</option>
        </select>
      </div>
      
      <!-- K線列表標題 -->
      <div class="kline-list-header">
        <div class="col-time">時間</div>
        <div class="col-prices">
          <span>開</span>
          <span>高</span>
          <span>低</span>
          <span>收</span>
        </div>
        <div class="col-change">漲跌幅</div>
        <div class="col-volume">成交量</div>
      </div>
      
      <!-- K線列表 -->
      <div class="kline-list">
        <div 
          v-for="k in paginatedKline" 
          :key="k.timestamp"
          class="kline-item"
          :class="{ 'up': k.close >= k.open, 'down': k.close < k.open }"
        >
          <div class="col-time">{{ formatFullTime(k.timestamp) }}</div>
          <div class="col-prices">
            <span>{{ k.open.toFixed(2) }}</span>
            <span class="high">{{ k.high.toFixed(2) }}</span>
            <span class="low">{{ k.low.toFixed(2) }}</span>
            <span :class="k.close >= k.open ? 'up' : 'down'">
              {{ k.close.toFixed(2) }}
            </span>
          </div>
          <div class="col-change" :class="k.close >= k.open ? 'up' : 'down'">
            {{ getChangePercent(k) }}%
          </div>
          <div class="col-volume">{{ formatVolume(k.volume) }}</div>
        </div>
      </div>
      
      <!-- 分頁控制 -->
      <div class="pagination">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          ◀
        </button>
        <span class="page-info">
          第 {{ currentPage }} / {{ totalPages }} 頁
        </span>
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          ▶
        </button>
        <select v-model="pageSize" class="page-size-select">
          <option :value="20">20 筆/頁</option>
          <option :value="50">50 筆/頁</option>
          <option :value="100">100 筆/頁</option>
        </select>
      </div>
    </div>
    
    <div v-else class="no-data">
      <p>選擇股票查看K線</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { nyToTaipei, parseTimestamp } from '../utils/datetime.js'

const API_URL = import.meta.env.VITE_API_URL
const { error } = useToast()
const dataSource = ref('快取')
const lastUpdate = ref('-')
const selectedStock = ref('AAPL')
const selectedInterval = ref('5m')
const klineData = ref([])

// 分頁相關
const currentPage = ref(1)
const pageSize = ref(15)

// 計算分頁數據
const totalPages = computed(() => Math.ceil(klineData.value.length / pageSize.value))
const paginatedKline = computed(() => {
  const sorted = [...klineData.value].sort((a, b) => {
    // K 線時間為紐約時間字串，直接字串排序即可（格式統一 YYYY-MM-DD HH:MM:SS）
    return (b.timestamp || '').localeCompare(a.timestamp || '')
  })
  const start = (currentPage.value - 1) * pageSize.value
  return sorted.slice(start, start + pageSize.value)
})

// 格式化完整時間：K 線時間為紐約本地時間，使用共用工具轉台北時間
const formatFullTime = (timestamp) => nyToTaipei(timestamp)

// 格式化成交量
const formatVolume = (volume) => {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(1) + 'M'
  } else if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + 'K'
  }
  return volume.toString()
}

// 計算漲跌幅
const getChangePercent = (kline) => {
  const change = ((kline.close - kline.open) / kline.open * 100)
  return change >= 0 ? '+' + change.toFixed(2) : change.toFixed(2)
}

// 股票列表（從 API 載入）
const stockList = ref([])
const backtestSymbols = ref(new Set())

const fetchWatchlist = async () => {
  try {
    // 從股票清單 API 獲取啟用的實盤股票
    const response = await fetch(`${API_URL}/stocks`)
    const data = await response.json()
    
    // 移除 US. 前綴以便顯示
    stockList.value = (data.stocks || []).map(s => ({
      ...s,
      symbol: s.symbol.replace(/^US\./, '')
    }))
    
    console.log('Stock list loaded:', stockList.value.length, 'stocks')
  } catch (err) {
    console.error('Fetch stock list error:', err)
    error('載入股票列表失敗')
    // 使用默認列表
    stockList.value = [
      { symbol: 'AAPL' }, { symbol: 'MSFT' }, { symbol: 'NVDA' }, { symbol: 'TSM' },
      { symbol: 'AMZN' }, { symbol: 'META' }, { symbol: 'UBER' }, { symbol: 'MU' },
      { symbol: 'AMD' }, { symbol: 'ORCL' }, { symbol: 'GOOG' }, { symbol: 'AVGO' },
      { symbol: 'COIN' }, { symbol: 'TSLA' }, { symbol: 'DELL' }, { symbol: 'WDC' }
    ]
  }
}

// 添加股票
const addStock = async (symbol) => {
  try {
    await fetch(`${API_URL}/watchlist/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, name: symbol, is_backtest: false })
    })
    await fetchWatchlist()
  } catch (err) {
    console.error('Add stock error:', err)
    error('新增股票失敗')
  }
}

// 移除股票
const removeStock = async (symbol) => {
  try {
    await fetch(`${API_URL}/watchlist/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol })
    })
    await fetchWatchlist()
  } catch (err) {
    console.error('Remove stock error:', err)
    error('移除股票失敗')
  }
}

// 標記回測
const toggleBacktest = async (symbol, isBacktest) => {
  try {
    await fetch(`${API_URL}/watchlist/backtest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, is_backtest: isBacktest })
    })
    await fetchWatchlist()
  } catch (err) {
    console.error('Toggle backtest error:', err)
    error('更新回測狀態失敗')
  }
}

const fetchKline = async (symbol) => {
  if (!symbol) return
  
  try {
    // 添加 US. 前綴
    const futuSymbol = symbol.startsWith('US.') ? symbol : `US.${symbol}`
    
    // 獲取全部數據（5m約1500筆）
    const response = await fetch(`${API_URL}/kline?symbol=${futuSymbol}&interval=${selectedInterval.value}&limit=2000`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    dataSource.value = data.source === 'cache' ? '📁 本地快取' : '☁️ 網絡獲取'
    // 如果日期字符串没有时区信息，假设是台北时间 (UTC+8)
    let d = data.timestamp
    if (d && typeof d === 'string' && !d.includes('Z') && !d.endsWith('+08:00')) {
      d = d + '+08:00'
    }
    lastUpdate.value = d ? new Date(d).toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei' }) : '-'
    
    if (data.kline && data.kline.length > 0) {
      klineData.value = data.kline
      currentPage.value = 1
      updateStockInfo(symbol, data.kline)
    } else {
      // 沒有數據時顯示訊息，不使用模擬數據
      klineData.value = []
      currentPage.value = 1
      dataSource.value = '⚠️ 無數據'
      console.warn('No kline data for', symbol)
    }
  } catch (err) {
    console.error('Fetch K-line error:', err)
    error('載入 K 線數據失敗')
    klineData.value = []
    currentPage.value = 1
    dataSource.value = '❌ 獲取失敗'
  }
}

const forceUpdate = async () => {
  // 重新查詢本地快取
  await fetchKline(selectedStock.value)
}

const generateMockKline = (symbol) => {
  const basePrice = {
    'AAPL': 185, 'MSFT': 378, 'NVDA': 875, 'TSM': 175, 'AMZN': 178,
    'META': 505, 'UBER': 62, 'MU': 105, 'AMD': 145, 'ORCL': 125,
    'GOOGL': 140, 'GOOG': 138, 'NFLX': 485, 'ADBE': 515, 'CRM': 265,
    'QCOM': 155, 'TXN': 155, 'AVGO': 1250, 'COIN': 185, 'MSTR': 165
  }[symbol] || 100
  
  const data = []
  let price = basePrice
  
  for (let i = 0; i < 78; i++) {
    const change = (Math.random() - 0.5) * price * 0.005
    const open = price
    const close = price + change
    const high = Math.max(open, close) + Math.random() * price * 0.002
    const low = Math.min(open, close) - Math.random() * price * 0.002
    
    data.push({
      timestamp: new Date(Date.now() - (78-i)*5*60*1000).toISOString(),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000
    })
    
    price = close
  }
  
  return data
}

const generateSignal = (kline) => {
  if (kline.length < 20) return null
  
  const closes = kline.slice(-20).map(k => k.close)
  const ma20 = closes.reduce((a, b) => a + b, 0) / closes.length
  const latestClose = closes[closes.length - 1]

  const changes = []
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i-1])
  }
  const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0) / 14
  const losses = -changes.filter(c => c < 0).reduce((a, b) => a + b, 0) / 14
  const rs = losses === 0 ? 100 : gains / losses
  const rsi = 100 - (100 / (1 + rs))
  
  if (rsi < 30) return 'LONG'
  if (rsi > 70) return 'SHORT'
  return 'HOLD'
}

const updateStockInfo = (symbol, kline) => {
  const stock = stockList.value.find(s => s.symbol === symbol)
  if (stock && kline.length > 0) {
    const latest = kline[kline.length - 1]
    const prev = kline.length > 1 ? kline[kline.length - 2] : latest
    stock.price = latest.close
    stock.change = ((latest.close - prev.close) / prev.close * 100)
    stock.signal = generateSignal(kline)
  }
}

onMounted(() => {
  fetchWatchlist()
  fetchKline('AAPL')
})
</script>

<style scoped>
/* 壓縮表格行高 */
.table th, .table td {
  padding: 6px 12px !important;
}

/* 壓縮頁面 header */
.page-header {
  margin-bottom: 12px !important;
}

/* 壓縮卡片 padding */
.card-header {
  padding: 8px 14px !important;
}

.realtime-page {
  padding: 12px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.page-header h1 {
  color: #ffffff;
  font-size: 1.5rem;
  margin: 0;
}

.header-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.data-source {
  color: #888;
  font-size: 12px;
}

/* 股票選擇器 */
.stock-selector {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stock-select,
.interval-select {
  padding: 10px 16px;
  background: #242454;
  border: 1px solid #2d2d5a;
  border-radius: 8px;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  min-width: 120px;
}

.stock-select:hover,
.interval-select:hover {
  border-color: #e94560;
}

.stock-select:focus,
.interval-select:focus {
  outline: none;
  border-color: #e94560;
}

/* K線容器 */
.kline-container {
  background: #1a1a3e;
  border-radius: 12px;
  padding: 20px;
}

.kline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.kline-header h2 {
  color: #ffffff;
  font-size: 1.125rem;
  margin: 0;
}

.kline-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.total-count {
  color: #888;
  font-size: 12px;
}

.refresh-btn {
  padding: 6px 16px;
  background: #e94560;
  border: none;
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  background: #ff6b81;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 分頁 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-btn {
  padding: 6px 14px;
  background: #242454;
  border: 1px solid #2d2d5a;
  border-radius: 6px;
  color: #ffffff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #e94560;
  border-color: #e94560;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-info {
  color: #ffffff;
  font-size: 13px;
}

.page-size-select {
  padding: 6px 10px;
  background: #242454;
  border: 1px solid #2d2d5a;
  border-radius: 6px;
  color: #ffffff;
  font-size: 12px;
}

/* K線列表標題 */
.kline-list-header {
  display: flex;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px 8px 0 0;
  font-size: 12px;
  color: #888;
  font-weight: 600;
}

.col-time {
  width: 140px;
}

.col-prices {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: right;
}

.col-change {
  width: 100px;
  text-align: right;
}

.col-volume {
  width: 80px;
  text-align: right;
}

/* K線列表 */
.kline-list {
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.kline-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #2d2d5a;
  transition: background 0.2s;
}

.kline-item:hover {
  background: rgba(233, 69, 96, 0.1);
}

.kline-item:last-child {
  border-bottom: none;
}

.kline-item .col-time {
  color: #ffffff;
  font-size: 12px;
}

.kline-item .col-prices {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  text-align: right;
  font-size: 12px;
  color: #ffffff;
}

.kline-item .col-prices .high {
  color: #4ecca3;
}

.kline-item .col-prices .low {
  color: #ff4757;
}

.kline-item .col-prices .up {
  color: #4ecca3;
}

.kline-item .col-prices .down {
  color: #ff4757;
}

.kline-item .col-change {
  width: 100px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
}

.kline-item .col-change.up {
  color: #4ecca3;
}

.kline-item .col-change.down {
  color: #ff4757;
}

.kline-item .col-volume {
  width: 80px;
  text-align: right;
  font-size: 12px;
  color: #888;
}

.no-data {
  text-align: center;
  padding: 60px;
  color: #888;
}
</style>
