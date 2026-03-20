<template>
  <div class="backtests-page">
    <div class="page-header">
      <h1 class="page-title">📊 回測結果</h1>
    </div>

    <!-- Tab 導航 -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'daily' }"
        @click="activeTab = 'daily'"
      >
        📅 每日績效
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'results' }"
        @click="activeTab = 'results'"
      >
        📈 策略回測結果
      </button>
    </div>

    <!-- Tab 1: 每日績效 -->
    <div v-show="activeTab === 'daily'" class="tab-content">
      <div v-if="loadingDaily" class="loading">載入中...</div>
      <div v-else-if="dailySummaries.length === 0" class="empty">暫無回測數據</div>
      
      <div v-else class="backtests-content">
        <!-- 摘要卡片 -->
        <div class="summary-cards">
          <div class="summary-card">
            <div class="summary-label">總報酬率</div>
            <div class="summary-value" :class="totalReturn >= 0 ? 'profit' : 'loss'">
              {{ totalReturn >= 0 ? '+' : '' }}{{ totalReturn.toFixed(2) }}%
            </div>
            <div class="summary-sub">vs 初始 $1,000,000</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">最大單日虧損</div>
            <div class="summary-value loss">${{ formatNumber(maxDailyLoss) }}</div>
            <div class="summary-sub">{{ maxDailyLossDate }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">近 7 天趨勢</div>
            <div class="summary-value" :class="recentTrend >= 0 ? 'profit' : 'loss'">
              {{ recentTrend >= 0 ? '↑' : '↓' }} {{ recentTrend >= 0 ? '+' : '' }}{{ recentTrend.toFixed(2) }}%
            </div>
            <div class="summary-sub">過去 7 個交易日</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">記錄天數</div>
            <div class="summary-value neutral">{{ dailySummaries.length }}</div>
            <div class="summary-sub">交易日</div>
          </div>
        </div>

        <!-- 每日結算列表 -->
        <div class="card" style="max-height: calc(100vh - 280px); overflow: auto;">
          <div class="card-header">
            <h2 class="card-title">📅 每日結算紀錄</h2>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>總價值</th>
                <th>現金</th>
                <th>市值</th>
                <th>未實現損益</th>
                <th>整體盈虧</th>
                <th>買入</th>
                <th>賣出</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dailySummaries" :key="item.id">
                <td>{{ item.date }}</td>
                <td>${{ formatNumber(item.total_value) }}</td>
                <td>${{ formatNumber(item.cash) }}</td>
                <td>${{ formatNumber(item.market_value) }}</td>
                <td :class="item.unrealized_pnl >= 0 ? 'profit' : 'loss'">
                  ${{ formatNumber(item.unrealized_pnl) }}
                </td>
                <td :class="item.daily_pnl >= 0 ? 'profit' : 'loss'">
                  {{ item.daily_pnl >= 0 ? '+' : '' }}${{ formatNumber(item.daily_pnl) }}
                </td>
                <td>{{ item.buy_count }}</td>
                <td>{{ item.sell_count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 2: 策略回測結果 -->
    <div v-show="activeTab === 'results'" class="tab-content">
      <!-- 頂部篩選器 -->
      <div class="filters-bar">
        <div class="filter-group">
          <label>股票</label>
          <select v-model="filters.symbol">
            <option value="">All</option>
            <option v-for="s in watchlist" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>週期</label>
          <select v-model="filters.timeframe">
            <option value="">All</option>
            <option value="1d">1d</option>
            <option value="1h">1h</option>
            <option value="5m">5m</option>
          </select>
        </div>
        <div class="filter-group">
          <label>指標</label>
          <select v-model="filters.indicator">
            <option value="">All</option>
            <option value="VolumeMA_Crossover">VolumeMA_Crossover</option>
            <option value="VolumePrice_Confirm">VolumePrice_Confirm</option>
            <option value="VWAP_Reversion">VWAP_Reversion</option>
          </select>
        </div>
        <div class="filter-group">
          <label>排序</label>
          <select v-model="filters.sortBy">
            <option value="sharpe">Sharpe</option>
            <option value="return_pct">報酬率</option>
            <option value="trades">交易次數</option>
          </select>
        </div>
      </div>

      <!-- 回測概覽 -->
      <div class="backtest-overview" v-if="backtestData.length > 0">
        <div class="overview-stat">
          <div class="ov-label">回測總筆數</div>
          <div class="ov-value">{{ backtestData.length.toLocaleString() }}</div>
        </div>
        <div class="overview-stat">
          <div class="ov-label">涵蓋股票</div>
          <div class="ov-value">{{ uniqueSymbols }}</div>
        </div>
        <div class="overview-stat">
          <div class="ov-label">策略指標</div>
          <div class="ov-value">{{ uniqueIndicators }}</div>
        </div>
        <div class="overview-stat">
          <div class="ov-label">正報酬策略</div>
          <div class="ov-value profit">{{ positiveReturnCount }}</div>
        </div>
        <div class="overview-stat">
          <div class="ov-label">最佳夏普</div>
          <div class="ov-value profit">{{ bestSharpe }}</div>
        </div>
      </div>

      <!-- Top 3 最佳策略卡片 -->
      <div class="top3-cards" v-if="top3Strategies.length > 0">
        <div class="top3-card" v-for="(s, i) in top3Strategies" :key="i">
          <div class="top3-rank">#{{ i+1 }}</div>
          <div class="top3-symbol">{{ (s.symbol||'').replace('US.','') }}</div>
          <div class="top3-indicator">{{ s.indicator }} · {{ s.timeframe }}</div>
          <div class="top3-metrics">
            <span class="profit">報酬 {{ (parseFloat(s.return_pct||s.return||0)*100).toFixed(1) }}%</span>
            <span class="muted">夏普 {{ parseFloat(s.sharpe||0).toFixed(2) }}</span>
            <span class="muted">勝率 {{ s.win_rate ? (parseFloat(s.win_rate)*100).toFixed(0)+'%' : '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 可視化圖表 -->
      <div class="charts-container">
        <div class="chart-card">
          <h3 class="chart-title">📊 報酬率 vs 夏普比率</h3>
          <div ref="scatterChartRef" class="chart"></div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">🏆 Top 10 最佳策略</h3>
          <div ref="barChartRef" class="chart"></div>
        </div>
      </div>

      <!-- 數據表格 -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📋 策略回測明細</h2>
          <span class="table-info">共 {{ filteredBacktestData.length }} 筆</span>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Timeframe</th>
              <th>Indicator</th>
              <th>報酬率</th>
              <th>夏普</th>
              <th>最大回撤</th>
              <th>勝率</th>
              <th>交易次數</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedData" :key="item.batch_id + item.symbol + item.indicator">
              <td>{{ item.symbol }}</td>
              <td>{{ item.timeframe }}</td>
              <td>{{ item.indicator }}</td>
              <td :class="item.return_pct >= 0 ? 'profit' : 'loss'">
                {{ item.return_pct >= 0 ? '+' : '' }}{{ item.return_pct?.toFixed(2) }}%
              </td>
              <td :class="item.sharpe >= 0 ? 'profit' : 'loss'">
                {{ item.sharpe?.toFixed(2) }}
              </td>
              <td class="loss">{{ item.max_dd ? item.max_dd.toFixed(2) + '%' : '-' }}</td>
              <td>{{ item.win_rate ? item.win_rate.toFixed(1) + '%' : '-' }}</td>
              <td>{{ item.trades || 0 }}</td>
            </tr>
          </tbody>
        </table>
        <!-- 分頁 -->
        <div v-if="totalPages > 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage = 1">««</button>
          <button class="page-btn" :disabled="currentPage === 1" @click="currentPage--">«</button>
          <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁</span>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage++">»</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="currentPage = totalPages">»»</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
const INITIAL_BALANCE = 1000000
const ITEMS_PER_PAGE = 20

const route = useRoute()
const activeTab = ref('daily')
const scatterChartRef = ref(null)
const barChartRef = ref(null)
let scatterChart = null
let barChart = null

// Tab 1 數據
const dailySummaries = ref([])
const loadingDaily = ref(true)

// Tab 2 數據
const backtestData = ref([])
const watchlist = ref([])
const loadingResults = ref(true)
const currentPage = ref(1)

const filters = ref({
  symbol: '',
  timeframe: '',
  indicator: '',
  sortBy: 'sharpe'
})

// 解析 URL query 參數
const parseQueryParams = () => {
  const tab = route.query.tab
  if (tab === 'results' || tab === 'daily') {
    activeTab.value = tab
  }
  if (route.query.indicator) {
    filters.value.indicator = route.query.indicator
  }
}

// 獲取 watchlist
const fetchWatchlist = async () => {
  try {
    const res = await fetch(`${API_URL}/watchlist`)
    const data = await res.json()
    if (Array.isArray(data)) {
      watchlist.value = data
    } else if (data.symbols) {
      watchlist.value = data.symbols
    }
  } catch (err) {
    console.error('Fetch watchlist error:', err)
    watchlist.value = ['US.TSLA', 'US.AAPL', 'US.MSFT', 'US.NVDA', 'US.GOOGL']
  }
}

// 獲取回測數據
const fetchBacktestData = async () => {
  loadingResults.value = true
  try {
    const res = await fetch(`${API_URL}/backtests`)
    const data = await res.json()
    if (Array.isArray(data)) {
      backtestData.value = data
    } else if (data.results) {
      backtestData.value = data.results
    } else {
      backtestData.value = []
    }
  } catch (err) {
    console.error('Fetch backtest error:', err)
    backtestData.value = []
  } finally {
    loadingResults.value = false
    nextTick(() => {
      renderCharts()
    })
  }
}

// 獲取每日結算數據
const fetchDailySummaries = async () => {
  loadingDaily.value = true
  try {
    const res = await fetch(`${API_URL}/paper/daily-summary?limit=30`)
    const data = await res.json()
    if (data.summaries) {
      dailySummaries.value = data.summaries
    }
  } catch (err) {
    console.error('Fetch daily summary error:', err)
  } finally {
    loadingDaily.value = false
  }
}

// 計算屬性
const totalReturn = computed(() => {
  if (!dailySummaries.value.length) return 0
  const latest = dailySummaries.value[0]
  return ((latest.total_value - INITIAL_BALANCE) / INITIAL_BALANCE) * 100
})

const maxDailyLoss = computed(() => {
  if (!dailySummaries.value.length) return 0
  return Math.min(...dailySummaries.value.map(s => Number(s.daily_pnl) || 0))
})

const maxDailyLossDate = computed(() => {
  if (!dailySummaries.value.length) return ''
  const minDay = dailySummaries.value.reduce((a, b) =>
    (Number(a.daily_pnl) || 0) < (Number(b.daily_pnl) || 0) ? a : b
  )
  return minDay.date || ''
})

const recentTrend = computed(() => {
  const data = dailySummaries.value
  if (data.length < 2) return 0
  const recent = data.slice(0, Math.min(7, data.length))
  const latest = Number(recent[0]?.total_value) || 0
  const oldest = Number(recent[recent.length - 1]?.total_value) || 1
  return ((latest - oldest) / oldest) * 100
})

const uniqueSymbols = computed(() => new Set(backtestData.value.map(r => r.symbol)).size)
const uniqueIndicators = computed(() => new Set(backtestData.value.map(r => r.indicator)).size)
const positiveReturnCount = computed(() => backtestData.value.filter(r => parseFloat(r.return_pct||r.return||0) > 0).length)
const bestSharpe = computed(() => {
  if (!backtestData.value.length) return '-'
  return Math.max(...backtestData.value.map(r => parseFloat(r.sharpe||0))).toFixed(2)
})
const top3Strategies = computed(() => {
  return [...backtestData.value]
    .filter(r => parseFloat(r.sharpe||0) > 0)
    .sort((a,b) => parseFloat(b.sharpe||0) - parseFloat(a.sharpe||0))
    .slice(0, 3)
})

const filteredBacktestData = computed(() => {
  let data = [...backtestData.value]
  
  if (filters.value.symbol) {
    data = data.filter(d => d.symbol === filters.value.symbol)
  }
  if (filters.value.timeframe) {
    data = data.filter(d => d.timeframe === filters.value.timeframe)
  }
  if (filters.value.indicator) {
    data = data.filter(d => d.indicator === filters.value.indicator)
  }
  
  // 排序
  const sortKey = filters.value.sortBy
  data.sort((a, b) => {
    const aVal = Number(a[sortKey]) || 0
    const bVal = Number(b[sortKey]) || 0
    return bVal - aVal
  })
  
  return data
})

const totalPages = computed(() => {
  return Math.ceil(filteredBacktestData.value.length / ITEMS_PER_PAGE) || 1
})

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  return filteredBacktestData.value.slice(start, start + ITEMS_PER_PAGE)
})

const formatNumber = (num) => {
  if (!num && num !== 0) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 渲染散點圖
const renderScatterChart = () => {
  if (!scatterChartRef.value || !filteredBacktestData.value.length) return
  
  if (scatterChart) {
    scatterChart.dispose()
  }
  
  scatterChart = echarts.init(scatterChartRef.value)
  scatterChart.showLoading()
  
  const data = filteredBacktestData.value.map(d => ({
    symbol: d.symbol,
    indicator: d.indicator,
    timeframe: d.timeframe,
    value: [
      d.return_pct || 0,
      d.sharpe || 0,
      d.trades || 0
    ]
  }))
  
  // 指標顏色映射
  const indicatorColors = {
    'VolumeMA_Crossover': '#3fb950',
    'VolumePrice_Confirm': '#58a6ff',
    'VWAP_Reversion': '#f0883e'
  }
  
  const option = {
    backgroundColor: '#0d1117',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#161b22',
      borderColor: '#30363d',
      textStyle: { color: '#e6edf3' },
      formatter: (params) => {
        const d = data[params.dataIndex]
        return `<b>${d.symbol}</b><br/>
                指標: ${d.indicator}<br/>
                週期: ${d.timeframe}<br/>
                報酬率: ${d.value[0].toFixed(2)}%<br/>
                夏普: ${d.value[1].toFixed(2)}<br/>
                交易次數: ${d.value[2]}`
      }
    },
    grid: {
      left: '8%',
      right: '8%',
      top: '10%',
      bottom: '12%'
    },
    xAxis: {
      name: '報酬率 (%)',
      nameTextStyle: { color: '#e6edf3' },
      axisLine: { lineStyle: { color: '#30363d' } },
      axisLabel: { color: '#e6edf3' },
      splitLine: { lineStyle: { color: '#30363d' } }
    },
    yAxis: {
      name: '夏普比率',
      nameTextStyle: { color: '#e6edf3' },
      axisLine: { lineStyle: { color: '#30363d' } },
      axisLabel: { color: '#e6edf3' },
      splitLine: { lineStyle: { color: '#30363d' } }
    },
    series: [{
      type: 'scatter',
      symbolSize: (val) => Math.max(6, Math.min(30, val[2] / 10)),
      itemStyle: {
        color: (params) => {
          const indicator = data[params.dataIndex]?.indicator
          return indicatorColors[indicator] || '#8b949e'
        },
        opacity: 0.8
      },
      data: data.map(d => d.value)
    }]
  }
  
  setTimeout(() => {
    scatterChart.setOption(option)
    scatterChart.hideLoading()
  }, 300)
}

// 渲染 Top 10 柱狀圖
const renderBarChart = () => {
  if (!barChartRef.value || !filteredBacktestData.value.length) return
  
  if (barChart) {
    barChart.dispose()
  }
  
  barChart = echarts.init(barChartRef.value)
  barChart.showLoading()
  
  const top10 = filteredBacktestData.value.slice(0, 10)
  const names = top10.map(d => `${d.symbol} ${d.indicator} (${d.timeframe})`)
  const values = top10.map(d => d.sharpe || 0)
  
  const option = {
    backgroundColor: '#0d1117',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#161b22',
      borderColor: '#30363d',
      textStyle: { color: '#e6edf3' }
    },
    grid: {
      left: '3%',
      right: '8%',
      top: '5%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '夏普比率',
      nameTextStyle: { color: '#e6edf3' },
      axisLine: { lineStyle: { color: '#30363d' } },
      axisLabel: { color: '#e6edf3' },
      splitLine: { lineStyle: { color: '#30363d' } }
    },
    yAxis: {
      type: 'category',
      data: names.reverse(),
      axisLine: { lineStyle: { color: '#30363d' } },
      axisLabel: { 
        color: '#e6edf3',
        fontSize: 10,
        width: 150,
        overflow: 'truncate'
      }
    },
    series: [{
      type: 'bar',
      data: values.reverse(),
      itemStyle: {
        color: (params) => params.value >= 0 ? '#3fb950' : '#f85149'
      },
      barWidth: '60%'
    }]
  }
  
  setTimeout(() => {
    barChart.setOption(option)
    barChart.hideLoading()
  }, 300)
}

const renderCharts = () => {
  renderScatterChart()
  renderBarChart()
}

// 監聽篩選器變更
watch([filters], () => {
  currentPage.value = 1
  nextTick(() => {
    renderCharts()
  })
}, { deep: true })

// 監聽 tab 切換
watch(activeTab, (newTab) => {
  if (newTab === 'results' && !backtestData.value.length) {
    fetchBacktestData()
  }
})

onMounted(() => {
  parseQueryParams()
  fetchDailySummaries()
  fetchWatchlist()
  if (activeTab.value === 'results') {
    fetchBacktestData()
  }
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

/* Tab1 摘要卡片高度壓縮 */
.backtest-overview {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.overview-stat {
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border-default, #30363d);
  border-radius: 6px;
  padding: 8px 10px;
  text-align: center;
}
.ov-label { font-size: 10px; color: #6e7681; margin-bottom: 4px; }
.ov-value { font-size: 18px; font-weight: 700; font-family: 'SF Mono', monospace; color: #e6edf3; }

.top3-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.top3-card {
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border-default, #30363d);
  border-radius: 6px;
  padding: 10px 12px;
  position: relative;
}
.top3-rank { position: absolute; top: 8px; right: 10px; font-size: 16px; font-weight: 800; color: #30363d; }
.top3-symbol { font-size: 18px; font-weight: 700; color: #e6edf3; margin-bottom: 4px; }
.top3-indicator { font-size: 11px; color: #8b949e; margin-bottom: 8px; }
.top3-metrics { display: flex; gap: 8px; flex-wrap: wrap; }
.top3-metrics span { font-size: 11px; }
.muted { color: #8b949e; }

.profit { color: #3fb950; }
.loss { color: #f85149; }

.backtests-page {
  animation: fadeIn 0.3s ease;
}

.page-header {
  margin-bottom: 12px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
}

/* Tab 樣式 */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 8px;
}

.tab {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all var(--transition-fast);
}

.tab:hover {
  background: var(--color-bg-tertiary);
}

.tab.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.tab-content {
  animation: fadeIn 0.2s ease;
}

/* 篩選器 */
.filters-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  background: var(--color-bg-card);
  padding: 12px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.filter-group select {
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 0.875rem;
  min-width: 150px;
}

/* 圖表 */
.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
}

.chart-title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.chart {
  width: 100%;
  height: 350px;
}

@media (max-width: 1024px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}

/* 表格樣式 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.table-info {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.table th {
  background: var(--color-bg-tertiary);
  font-weight: 600;
  font-size: 0.8125rem;
}

.profit { color: var(--color-profit, #3fb950); }
.loss { color: var(--color-loss, #f85149); }
.neutral { color: var(--text-primary, #e6edf3); }

/* 摘要卡片 */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.summary-card {
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border-default, #30363d);
  border-radius: 6px;
  padding: 10px 12px;
}

.summary-label {
  font-size: 10px;
  color: var(--text-secondary, #8b949e);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 18px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  margin-bottom: 2px;
}

.summary-sub {
  font-size: 11px;
  color: var(--text-muted, #6e7681);
}

/* 分頁 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

.page-btn {
  padding: 8px 14px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 0 16px;
  font-size: 0.875rem;
  color: var(--text-primary);
}

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  font-size: 1rem;
}
</style>
