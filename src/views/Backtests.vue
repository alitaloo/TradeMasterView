<template>
  <div class="backtests-page">
    <div class="page-header">
      <h1 class="page-title">📊 回測分析</h1>
      <div class="tab-switcher">
        <button :class="['tab-btn', activeTab === 'daily' ? 'active' : '']" @click="activeTab = 'daily'">每日績效</button>
        <button :class="['tab-btn', activeTab === 'results' ? 'active' : '']" @click="activeTab = 'results'; loadBacktestResults()">策略回測</button>
      </div>
    </div>

    <!-- Tab 1: 每日績效 -->
    <div v-if="activeTab === 'daily'">
      <div v-if="loadingDaily" class="loading">載入中...</div>
      <div v-else-if="dailySummaries.length === 0" class="empty">暫無數據</div>
      <div v-else>
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

        <!-- 資產曲線 -->
        <div class="card chart-card">
          <div class="card-header"><h2 class="card-title">📈 資產曲線</h2></div>
          <canvas ref="equityChartRef" height="80"></canvas>
        </div>

        <!-- 每日結算表 -->
        <div class="card">
          <div class="card-header"><h2 class="card-title">📅 每日結算紀錄</h2></div>
          <table class="table">
            <thead>
              <tr>
                <th>日期</th><th>總資產</th><th>現金</th><th>市值</th>
                <th>未實現損益</th><th>整體盈虧</th><th>買入</th><th>賣出</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in dailySummaries" :key="item.id">
                <td>{{ item.date }}</td>
                <td>${{ formatNumber(item.total_value) }}</td>
                <td>${{ formatNumber(item.cash) }}</td>
                <td>${{ formatNumber(item.market_value) }}</td>
                <td :class="item.unrealized_pnl >= 0 ? 'profit' : 'loss'">${{ formatNumber(item.unrealized_pnl) }}</td>
                <td :class="item.daily_pnl >= 0 ? 'profit' : 'loss'">{{ item.daily_pnl >= 0 ? '+' : '' }}${{ formatNumber(item.daily_pnl) }}</td>
                <td>{{ item.buy_count }}</td>
                <td>{{ item.sell_count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 2: 策略回測結果 -->
    <div v-if="activeTab === 'results'">
      <!-- 篩選器 -->
      <div class="filters">
        <select v-model="filterSymbol" class="filter-select" @change="applyFilters">
          <option value="">全部股票</option>
          <option v-for="s in symbolList" :key="s" :value="s">{{ s.replace('US.','') }}</option>
        </select>
        <select v-model="filterTimeframe" class="filter-select" @change="applyFilters">
          <option value="">全部週期</option>
          <option value="1d">日線</option>
          <option value="1h">小時</option>
          <option value="5m">5分鐘</option>
        </select>
        <select v-model="filterIndicator" class="filter-select" @change="applyFilters">
          <option value="">全部指標</option>
          <option v-for="ind in indicatorList" :key="ind" :value="ind">{{ ind }}</option>
        </select>
        <select v-model="sortBy" class="filter-select" @change="applyFilters">
          <option value="sharpe">按夏普排序</option>
          <option value="return_pct">按報酬率排序</option>
          <option value="win_rate">按勝率排序</option>
          <option value="trades">按交易次數排序</option>
        </select>
        <span class="filter-count">{{ filteredResults.length }} 筆</span>
      </div>

      <div v-if="loadingResults" class="loading">載入回測數據...</div>
      <div v-else-if="backtestResults.length === 0" class="empty">暫無回測數據</div>
      <div v-else>
        <!-- 圖表區 -->
        <div class="charts-row">
          <!-- 散點圖 -->
          <div class="card chart-card">
            <div class="card-header">
              <h2 class="card-title">🎯 報酬率 vs 夏普比率</h2>
              <span class="card-hint">點大小 = 交易次數</span>
            </div>
            <canvas ref="scatterChartRef" height="140"></canvas>
          </div>
          <!-- Top 10 柱狀圖 -->
          <div class="card chart-card">
            <div class="card-header"><h2 class="card-title">🏆 Top 10 策略（夏普）</h2></div>
            <canvas ref="barChartRef" height="140"></canvas>
          </div>
        </div>

        <!-- 數據表格 -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">📋 回測明細</h2>
            <div class="pagination-info">第 {{ currentPage }}/{{ totalPages }} 頁</div>
          </div>
          <table class="table">
            <thead>
              <tr>
                <th>股票</th><th>週期</th><th>指標</th>
                <th>報酬率</th><th>夏普</th><th>最大回撤</th><th>勝率</th><th>交易次數</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in paginatedResults" :key="`${r.symbol}-${r.timeframe}-${r.indicator}`">
                <td class="symbol-cell">{{ r.symbol ? r.symbol.replace('US.','') : '-' }}</td>
                <td><span class="tf-badge" :class="r.timeframe">{{ r.timeframe }}</span></td>
                <td class="indicator-cell">{{ r.indicator }}</td>
                <td :class="parseFloat(r.return_pct||r.return||0) >= 0 ? 'profit' : 'loss'">
                  {{ (parseFloat(r.return_pct||r.return||0)*100).toFixed(2) }}%
                </td>
                <td :class="parseFloat(r.sharpe||0) >= 0 ? 'profit' : 'loss'">
                  {{ parseFloat(r.sharpe||0).toFixed(3) }}
                </td>
                <td class="loss">{{ r.max_dd ? (parseFloat(r.max_dd)*100).toFixed(1)+'%' : '-' }}</td>
                <td>{{ r.win_rate ? (parseFloat(r.win_rate)*100).toFixed(1)+'%' : '-' }}</td>
                <td>{{ r.trades || r.total_trades || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <div class="pagination" v-if="totalPages > 1">
            <button :disabled="currentPage === 1" @click="currentPage--" class="page-btn">‹</button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <button :disabled="currentPage === totalPages" @click="currentPage++" class="page-btn">›</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
const INITIAL_BALANCE = 1000000
const PAGE_SIZE = 20

// Tab
const activeTab = ref('daily')

// Daily
const dailySummaries = ref([])
const loadingDaily = ref(true)
const equityChartRef = ref(null)
let equityChartInstance = null

// Backtest results
const backtestResults = ref([])
const filteredResults = ref([])
const loadingResults = ref(false)
const scatterChartRef = ref(null)
const barChartRef = ref(null)
let scatterChartInstance = null
let barChartInstance = null

// Filters
const filterSymbol = ref('')
const filterTimeframe = ref('')
const filterIndicator = ref('')
const sortBy = ref('sharpe')
const currentPage = ref(1)

const symbolList = computed(() => [...new Set(backtestResults.value.map(r => r.symbol).filter(Boolean))].sort())
const indicatorList = computed(() => [...new Set(backtestResults.value.map(r => r.indicator).filter(Boolean))].sort())

const totalPages = computed(() => Math.ceil(filteredResults.value.length / PAGE_SIZE) || 1)
const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredResults.value.slice(start, start + PAGE_SIZE)
})

// Daily computed
const totalReturn = computed(() => {
  if (!dailySummaries.value.length) return 0
  return ((dailySummaries.value[0].total_value - INITIAL_BALANCE) / INITIAL_BALANCE) * 100
})
const maxDailyLoss = computed(() => {
  if (!dailySummaries.value.length) return 0
  return Math.min(...dailySummaries.value.map(s => Number(s.daily_pnl) || 0))
})
const maxDailyLossDate = computed(() => {
  if (!dailySummaries.value.length) return ''
  const minDay = dailySummaries.value.reduce((a, b) =>
    (Number(a.daily_pnl) || 0) < (Number(b.daily_pnl) || 0) ? a : b)
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

const formatNumber = (num) => {
  if (!num && num !== 0) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fetchDaily = async () => {
  loadingDaily.value = true
  try {
    const res = await fetch(`${API_URL}/paper/daily-summary?limit=30`)
    const data = await res.json()
    if (data.summaries) {
      dailySummaries.value = data.summaries
      await nextTick()
      renderEquityChart()
    }
  } catch (err) {
    console.error('Fetch daily error:', err)
  } finally {
    loadingDaily.value = false
  }
}

const loadBacktestResults = async () => {
  if (backtestResults.value.length > 0) return
  loadingResults.value = true
  try {
    const res = await fetch(`${API_URL}/backtests?limit=500`)
    const data = await res.json()
    const items = data.backtests || data.results || []
    backtestResults.value = items
    applyFilters()
    await nextTick()
    renderCharts()
  } catch (err) {
    console.error('Fetch backtests error:', err)
  } finally {
    loadingResults.value = false
  }
}

const applyFilters = () => {
  let results = [...backtestResults.value]
  if (filterSymbol.value) results = results.filter(r => r.symbol === filterSymbol.value)
  if (filterTimeframe.value) results = results.filter(r => r.timeframe === filterTimeframe.value)
  if (filterIndicator.value) results = results.filter(r => r.indicator === filterIndicator.value)
  results.sort((a, b) => {
    const aVal = parseFloat(a[sortBy.value] || a.return_pct || 0)
    const bVal = parseFloat(b[sortBy.value] || b.return_pct || 0)
    return bVal - aVal
  })
  filteredResults.value = results
  currentPage.value = 1
  nextTick(() => renderCharts())
}

const renderEquityChart = () => {
  if (!equityChartRef.value || !dailySummaries.value.length) return
  if (equityChartInstance) { equityChartInstance.destroy(); equityChartInstance = null }
  const sorted = [...dailySummaries.value].reverse()
  const labels = sorted.map(d => d.date)
  const values = sorted.map(d => parseFloat(d.total_value) || 0)
  equityChartInstance = new Chart(equityChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '總資產',
        data: values,
        borderColor: '#388bfd',
        backgroundColor: 'rgba(56,139,253,0.1)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `$${ctx.parsed.y.toLocaleString()}`
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8b949e', maxTicksLimit: 8 }, grid: { color: '#21262d' } },
        y: {
          ticks: { color: '#8b949e', callback: (v) => '$' + (v/1000).toFixed(0) + 'K' },
          grid: { color: '#21262d' }
        }
      }
    }
  })
}

const renderCharts = () => {
  const data = filteredResults.value.slice(0, 200)
  renderScatterChart(data)
  renderBarChart(data)
}

const renderScatterChart = (data) => {
  if (!scatterChartRef.value) return
  if (scatterChartInstance) { scatterChartInstance.destroy(); scatterChartInstance = null }

  const indicatorColors = {
    'VolumeMA_Crossover': '#388bfd',
    'VolumePrice_Confirm': '#3fb950',
    'VWAP_Reversion': '#d29922',
    'ATRTrailingStop': '#bc8cff',
    'default': '#8b949e'
  }

  const grouped = {}
  data.forEach(r => {
    const ind = r.indicator || 'other'
    if (!grouped[ind]) grouped[ind] = []
    grouped[ind].push({
      x: parseFloat(r.return_pct || r.return || 0) * 100,
      y: parseFloat(r.sharpe || 0),
      r: Math.min(Math.max(Math.sqrt((r.trades || r.total_trades || 10)) * 1.5, 3), 15),
      label: `${(r.symbol||'').replace('US.','')} ${ind} ${r.timeframe}`
    })
  })

  const datasets = Object.entries(grouped).map(([ind, points]) => ({
    label: ind,
    data: points,
    backgroundColor: (indicatorColors[ind] || indicatorColors.default) + '99',
    borderColor: indicatorColors[ind] || indicatorColors.default,
    borderWidth: 1
  }))

  scatterChartInstance = new Chart(scatterChartRef.value, {
    type: 'bubble',
    data: { datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#8b949e', boxWidth: 10 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pt = ctx.raw
              return `${pt.label}: 報酬 ${pt.x.toFixed(1)}% 夏普 ${pt.y.toFixed(2)}`
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: '報酬率 (%)', color: '#8b949e' },
          ticks: { color: '#8b949e' },
          grid: { color: '#21262d' }
        },
        y: {
          title: { display: true, text: '夏普比率', color: '#8b949e' },
          ticks: { color: '#8b949e' },
          grid: { color: '#21262d' }
        }
      }
    }
  })
}

const renderBarChart = (data) => {
  if (!barChartRef.value) return
  if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null }

  const top10 = [...data]
    .filter(r => r.sharpe && parseFloat(r.sharpe) > 0)
    .sort((a, b) => parseFloat(b.sharpe) - parseFloat(a.sharpe))
    .slice(0, 10)

  if (!top10.length) return

  const labels = top10.map(r =>
    `${(r.symbol||'').replace('US.','')} ${r.timeframe} ${(r.indicator||'').split('_')[0]}`
  )
  const values = top10.map(r => parseFloat(r.sharpe || 0))
  const colors = values.map(v => v > 1 ? '#3fb950cc' : v > 0.5 ? '#388bfdcc' : '#d29922cc')

  barChartInstance = new Chart(barChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '夏普比率',
        data: values,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => `夏普: ${ctx.parsed.x.toFixed(3)}` }
        }
      },
      scales: {
        x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
        y: { ticks: { color: '#e6edf3', font: { size: 11 } }, grid: { color: '#21262d' } }
      }
    }
  })
}

onMounted(() => { fetchDaily() })

watch(activeTab, async (tab) => {
  if (tab === 'daily') {
    await nextTick()
    renderEquityChart()
  }
})
</script>

<style scoped>
.backtests-page { animation: fadeIn 0.3s ease; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }

.tab-switcher { display: flex; gap: 4px; background: var(--bg-secondary, #161b22); border: 1px solid var(--border-default, #30363d); border-radius: 6px; padding: 3px; }
.tab-btn { padding: 6px 16px; border: none; background: transparent; color: #8b949e; border-radius: 4px; cursor: pointer; font-size: 13px; transition: all 0.15s; }
.tab-btn.active { background: var(--bg-tertiary, #21262d); color: #e6edf3; }
.tab-btn:hover:not(.active) { color: #e6edf3; }

.summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.summary-card { background: var(--bg-secondary, #161b22); border: 1px solid var(--border-default, #30363d); border-radius: 6px; padding: 16px; }
.summary-label { font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.summary-value { font-size: 24px; font-weight: 700; font-family: 'SF Mono', monospace; margin-bottom: 4px; }
.summary-sub { font-size: 11px; color: #6e7681; }

.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.chart-card { overflow: hidden; }
.chart-card canvas { padding: 8px 12px 12px; }
.card-hint { font-size: 11px; color: #6e7681; }

.filters { display: flex; gap: 8px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.filter-select { background: var(--bg-secondary, #161b22); border: 1px solid var(--border-default, #30363d); color: #e6edf3; padding: 6px 10px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.filter-count { font-size: 12px; color: #8b949e; margin-left: 4px; }

.card { background: var(--bg-secondary, #161b22); border: 1px solid var(--border-default, #30363d); border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--border-default, #30363d); }
.card-title { font-size: 14px; font-weight: 600; margin: 0; }

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #21262d; }
.table th { background: #0d1117; font-weight: 600; font-size: 11px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; }
.table tr:last-child td { border-bottom: none; }
.table tr:hover td { background: #21262d22; }

.symbol-cell { font-family: 'SF Mono', monospace; font-weight: 600; }
.indicator-cell { font-size: 12px; color: #8b949e; }
.tf-badge { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
.tf-badge.1d { background: rgba(56,139,253,0.2); color: #388bfd; }
.tf-badge.1h { background: rgba(63,185,80,0.2); color: #3fb950; }
.tf-badge.5m { background: rgba(248,81,73,0.2); color: #f85149; }

.profit { color: #3fb950; }
.loss { color: #f85149; }
.neutral { color: #e6edf3; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; border-top: 1px solid #21262d; }
.page-btn { background: #21262d; border: 1px solid #30363d; color: #e6edf3; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 13px; color: #8b949e; }
.pagination-info { font-size: 12px; color: #8b949e; }

.loading, .empty { text-align: center; padding: 60px 20px; color: #6e7681; }
</style>
