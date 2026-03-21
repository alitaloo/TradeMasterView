<template>
  <div class="runner-page">
    <div class="page-header">
      <h1 class="page-title">⚡ 執行回測</h1>
    </div>

    <!-- 設定面板 -->
    <div class="setup-grid" v-if="!runId">
      <!-- 股票選擇 -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📋 選擇股票</h2>
          <div class="header-actions">
            <button class="btn-xs" @click="selectAll">全選</button>
            <button class="btn-xs" @click="clearAll">清除</button>
          </div>
        </div>
        <div class="stock-grid">
          <label v-for="s in stockList" :key="s.symbol" class="stock-item">
            <input type="checkbox" :value="s.symbol" v-model="selectedSymbols">
            <span class="stock-name">{{ s.symbol.replace('US.','') }}</span>
          </label>
        </div>
      </div>

      <!-- 週期 + 指標選擇 -->
      <div class="config-col">
        <div class="card">
          <div class="card-header"><h2 class="card-title">⏱️ 週期</h2></div>
          <div class="checkbox-group">
            <label v-for="tf in timeframes" :key="tf.value" class="check-item">
              <input type="checkbox" :value="tf.value" v-model="selectedTimeframes">
              <span>{{ tf.label }}</span>
            </label>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h2 class="card-title">📅 回測時間範圍</h2></div>
          <div class="range-group">
            <label v-for="r in dateRanges" :key="r.value"
              :class="['range-item', selectedDays === r.value ? 'active' : '']"
              @click="selectedDays = r.value">
              <span class="range-label">{{ r.label }}</span>
              <span class="range-sub">{{ r.desc }}</span>
            </label>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="card-title">🧠 選擇策略</h2>
            <div class="header-actions">
              <button class="btn-xs" @click="selectedIndicators = strategies.map(s => s.value)">全選策略</button>
              <button class="btn-xs" @click="selectedIndicators = baseIndicators.map(i => i.value)">只選指標</button>
              <button class="btn-xs" @click="selectedIndicators = []">清除</button>
            </div>
          </div>
          <!-- 搜尋 -->
          <div class="strategy-search">
            <input v-model="strategySearch" type="text" placeholder="🔍 搜尋策略名稱..." class="search-input">
          </div>
          <!-- 策略分組 -->
          <div class="strategy-tabs">
            <button :class="['stab', strategyTab==='strategy'?'active':'']" @click="strategyTab='strategy'">
              策略 ({{ strategies.length }})
            </button>
            <button :class="['stab', strategyTab==='indicator'?'active':'']" @click="strategyTab='indicator'">
              基礎指標 ({{ baseIndicators.length }})
            </button>
          </div>
          <div class="strategy-list">
            <label v-for="ind in filteredOptions" :key="ind.value" class="check-item">
              <input type="checkbox" :value="ind.value" v-model="selectedIndicators">
              <div class="ind-info">
                <span class="indicator-name">{{ ind.label }}</span>
                <span class="indicator-desc">{{ ind.desc }}</span>
              </div>
            </label>
            <div v-if="filteredOptions.length === 0" class="no-match">無符合結果</div>
          </div>
        </div>

        <!-- 預估 + 啟動 -->
        <div class="card launch-card">
          <div class="estimate">
            <span class="est-label">預估回測數量</span>
            <span class="est-value">{{ totalCombinations }}</span>
          </div>
          <button
            class="btn-launch"
            :disabled="!canLaunch || launching"
            @click="launchBacktest"
          >
            <span v-if="launching">⏳ 啟動中...</span>
            <span v-else>🚀 開始回測</span>
          </button>
          <div v-if="!canLaunch" class="launch-hint">請至少選擇 1 隻股票、1 個週期、1 個指標</div>
        </div>
      </div>
    </div>

    <!-- 進度顯示 -->
    <div v-if="runId && runStatus !== 'completed'" class="progress-card card">
      <div class="card-header">
        <h2 class="card-title">⚡ 回測進行中</h2>
        <span class="run-id">ID: {{ runId.slice(0,8) }}...</span>
      </div>

      <!-- 進度條 -->
      <div class="progress-bar-wrap">
        <div class="progress-bar" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="progress-info">
        <span>{{ progressCompleted }} / {{ progressTotal }} 完成</span>
        <span class="pct">{{ progressPct.toFixed(1) }}%</span>
        <span class="elapsed">⏱ {{ elapsed }}s</span>
      </div>

      <!-- 當前跑的項目 -->
      <div class="current-items">
        <div v-for="item in runningItems" :key="item" class="running-item">
          <span class="dot"></span>{{ item }}
        </div>
      </div>
    </div>

    <!-- 完成 → 結果 -->
    <div v-if="runStatus === 'completed'" class="results-section">
      <div class="completed-banner">
        ✅ 回測完成！共 {{ progressTotal }} 個組合，耗時 {{ elapsed }}s
        <button class="btn-reset" @click="reset">重新設定</button>
      </div>

      <!-- 結果篩選 -->
      <div class="result-filters">
        <select v-model="resultFilter.symbol" class="filter-sel" @change="filterResults">
          <option value="">全部股票</option>
          <option v-for="s in resultSymbols" :key="s" :value="s">{{ s.replace('US.','') }}</option>
        </select>
        <select v-model="resultFilter.timeframe" class="filter-sel" @change="filterResults">
          <option value="">全部週期</option>
          <option value="1d">日線</option>
          <option value="1h">小時</option>
          <option value="5m">5分鐘</option>
        </select>
        <select v-model="resultFilter.sort" class="filter-sel" @change="filterResults">
          <option value="sharpe">按夏普排序</option>
          <option value="return_pct">按報酬率排序</option>
          <option value="win_rate">按勝率排序</option>
        </select>
        <span class="filter-cnt">{{ filteredResultData.length }} 筆</span>
      </div>

      <!-- 結果表格 -->
      <div class="card">
        <table class="table">
          <thead>
            <tr>
              <th>股票</th><th>週期</th><th>指標</th>
              <th>報酬率</th><th>夏普</th><th>最大回撤</th><th>勝率</th><th>交易數</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in paginatedResultData" :key="`${r.symbol}-${r.timeframe}-${r.indicator}`"
                :class="{ 'applied-row': r.active }">
              <td class="sym-cell">{{ (r.symbol||'').replace('US.','') }}</td>
              <td><span class="tf-tag" :class="'tf-'+r.timeframe">{{ r.timeframe }}</span></td>
              <td class="ind-cell">{{ r.indicator }}</td>
              <td :class="parseFloat(r.return_pct||0)*100 >= 0 ? 'profit' : 'loss'">
                {{ (parseFloat(r.return_pct||0)*100).toFixed(2) }}%
              </td>
              <td :class="parseFloat(r.sharpe||0) >= 0 ? 'profit' : 'loss'">
                {{ parseFloat(r.sharpe||0).toFixed(3) }}
              </td>
              <td class="loss">{{ r.max_dd ? (parseFloat(r.max_dd)*100).toFixed(1)+'%' : '-' }}</td>
              <td>{{ r.win_rate ? (parseFloat(r.win_rate)*100).toFixed(1)+'%' : '-' }}</td>
              <td>{{ r.trades || '-' }}</td>
              <td>
                <button v-if="!r.active" class="btn-apply" @click="applyStrategy(r)">啟用</button>
                <span v-else class="applied-tag">✅ 已啟用</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination" v-if="resultTotalPages > 1">
          <button :disabled="resultPage===1" @click="resultPage--" class="page-btn">‹</button>
          <span class="page-info">{{ resultPage }}/{{ resultTotalPages }}</span>
          <button :disabled="resultPage===resultTotalPages" @click="resultPage++" class="page-btn">›</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
const PAGE_SIZE = 20

// Setup
const stockList = ref([])
const selectedSymbols = ref([])
const selectedTimeframes = ref(['1d'])
const selectedIndicators = ref([])
const selectedDays = ref(365)

const dateRanges = [
  { value: 90,  label: '3 個月', desc: '近期表現' },
  { value: 180, label: '6 個月', desc: '半年數據' },
  { value: 365, label: '1 年',   desc: '全年回測（預設）' },
  { value: 730, label: '2 年',   desc: '最長期限' },
]
const launching = ref(false)

// Run state
const runId = ref('')
const runStatus = ref('')
const progressTotal = ref(0)
const progressCompleted = ref(0)
const progressPct = ref(0)
const elapsed = ref(0)
const runningItems = ref([])
let pollTimer = null
let elapsedTimer = null
let startTime = null

// Results
const resultData = ref([])
const filteredResultData = ref([])
const resultFilter = ref({ symbol: '', timeframe: '', sort: 'sharpe' })
const resultPage = ref(1)
const resultTotalPages = computed(() => Math.ceil(filteredResultData.value.length / PAGE_SIZE) || 1)
const paginatedResultData = computed(() => filteredResultData.value.slice((resultPage.value-1)*PAGE_SIZE, resultPage.value*PAGE_SIZE))
const resultSymbols = computed(() => [...new Set(resultData.value.map(r => r.symbol))].sort())

const timeframes = [
  { value: '1d', label: '日線 (1d)' },
  { value: '1h', label: '小時 (1h)' },
  { value: '5m', label: '5分鐘 (5m)' },
]

const indicators = ref([])
const strategySearch = ref('')
const strategyTab = ref('strategy')

const strategies = computed(() => indicators.value.filter(i => i.type === 'strategy'))
const baseIndicators = computed(() => indicators.value.filter(i => i.type === 'indicator' || !i.type))

const filteredOptions = computed(() => {
  const list = strategyTab.value === 'strategy' ? strategies.value : baseIndicators.value
  if (!strategySearch.value) return list
  const q = strategySearch.value.toLowerCase()
  return list.filter(i => i.label.toLowerCase().includes(q) || (i.desc||'').toLowerCase().includes(q))
})

const loadIndicators = async () => {
  try {
    const res = await fetch(`${API_URL}/backtests/indicators`)
    const data = await res.json()
    indicators.value = data.indicators || []
    // 預設全選
    selectedIndicators.value = indicators.value.map(i => i.value)
  } catch {
    // fallback
    indicators.value = [
      { value: 'VolumeMA_Crossover', label: 'VolumeMA Crossover', desc: '成交量MA交叉' },
      { value: 'VolumePrice_Confirm', label: 'VolumePrice Confirm', desc: '量價確認' },
      { value: 'VWAP_Reversion', label: 'VWAP Reversion', desc: 'VWAP均值回歸' },
    ]
    selectedIndicators.value = indicators.value.map(i => i.value)
  }
}

const totalCombinations = computed(() =>
  selectedSymbols.value.length * selectedTimeframes.value.length * selectedIndicators.value.length
)

const canLaunch = computed(() =>
  selectedSymbols.value.length > 0 &&
  selectedTimeframes.value.length > 0 &&
  selectedIndicators.value.length > 0
)

const selectAll = () => { selectedSymbols.value = stockList.value.map(s => s.symbol) }
const clearAll = () => { selectedSymbols.value = [] }

const loadStocks = async () => {
  try {
    const res = await fetch(`${API_URL}/watchlist`)
    const data = await res.json()
    stockList.value = (data.watchlist || []).filter(s => s.is_backtest)
  } catch {}
}

const launchBacktest = async () => {
  launching.value = true
  try {
    const res = await fetch(`${API_URL}/backtests/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: selectedSymbols.value,
        timeframes: selectedTimeframes.value,
        indicators: selectedIndicators.value,
        days: selectedDays.value
      })
    })
    const data = await res.json()
    if (data.run_id) {
      runId.value = data.run_id
      runStatus.value = 'running'
      progressTotal.value = data.total || totalCombinations.value
      startTime = Date.now()
      startPolling()
      startElapsedTimer()
    }
  } catch (e) {
    alert('啟動回測失敗：' + e.message)
  } finally {
    launching.value = false
  }
}

const startPolling = () => {
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_URL}/backtests/runs/${runId.value}`)
      const data = await res.json()
      progressCompleted.value = data.completed || 0
      progressTotal.value = data.total || progressTotal.value
      progressPct.value = progressTotal.value > 0
        ? (progressCompleted.value / progressTotal.value) * 100 : 0

      if (data.status === 'completed' || data.status === 'failed') {
        runStatus.value = data.status
        clearInterval(pollTimer)
        clearInterval(elapsedTimer)
        if (data.status === 'completed') loadResults()
      }
    } catch {}
  }, 1500)
}

const startElapsedTimer = () => {
  elapsedTimer = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startTime) / 1000)
    // 模擬進行中的項目顯示
    const idx = progressCompleted.value % selectedSymbols.value.length
    const sym = (selectedSymbols.value[idx] || '').replace('US.','')
    runningItems.value = sym ? [`${sym} 分析中...`] : []
  }, 500)
}

const loadResults = async () => {
  try {
    const res = await fetch(`${API_URL}/backtests/runs/${runId.value}/results`)
    const data = await res.json()
    resultData.value = data.results || []
    filterResults()
  } catch {
    // fallback: 讀取 stock_strategies
    try {
      const res2 = await fetch(`${API_URL}/backtests?batch_id=${runId.value}&limit=500`)
      const d2 = await res2.json()
      resultData.value = d2.backtests || []
      filterResults()
    } catch {}
  }
}

const filterResults = () => {
  let d = [...resultData.value]
  if (resultFilter.value.symbol) d = d.filter(r => r.symbol === resultFilter.value.symbol)
  if (resultFilter.value.timeframe) d = d.filter(r => r.timeframe === resultFilter.value.timeframe)
  const key = resultFilter.value.sort
  d.sort((a, b) => parseFloat(b[key]||0) - parseFloat(a[key]||0))
  filteredResultData.value = d
  resultPage.value = 1
}

const applyStrategy = async (row) => {
  try {
    const res = await fetch(`${API_URL}/backtests/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: row.symbol,
        timeframe: row.timeframe,
        indicator: row.indicator
      })
    })
    const data = await res.json()
    if (data.status === 'ok') {
      row.active = true
    } else {
      alert('啟用失敗：' + (data.message || '未知錯誤'))
    }
  } catch (e) {
    alert('啟用失敗：' + e.message)
  }
}

const reset = () => {
  runId.value = ''
  runStatus.value = ''
  progressCompleted.value = 0
  progressPct.value = 0
  elapsed.value = 0
  resultData.value = []
  filteredResultData.value = []
}

onMounted(() => {
  loadStocks()
  loadIndicators()
})
onUnmounted(() => {
  clearInterval(pollTimer)
  clearInterval(elapsedTimer)
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

.runner-page { animation: fadeIn 0.3s ease; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.page-title { font-size: 1.5rem; font-weight: 700; margin: 0; }

.setup-grid { display: grid; grid-template-columns: 1fr 420px; gap: 12px; align-items: start; }
.config-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.config-col .card:nth-child(1),
.config-col .card:nth-child(2) { grid-column: span 1; }
.config-col .card:nth-child(3),
.config-col .card:nth-child(4) { grid-column: 1 / -1; }

.card { background: var(--bg-secondary, #161b22); border: 1px solid var(--border-default, #30363d); border-radius: 6px; overflow: hidden; margin-bottom: 12px; }
.card-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #30363d; }
.card-title { font-size: 13px; font-weight: 600; margin: 0; color: #8b949e; text-transform: uppercase; letter-spacing: 0.5px; }
.header-actions { display: flex; gap: 6px; }
.btn-xs { font-size: 11px; padding: 2px 8px; border: 1px solid #30363d; background: transparent; color: #8b949e; border-radius: 4px; cursor: pointer; }
.btn-xs:hover { color: #e6edf3; border-color: #8b949e; }

.stock-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 8px; max-height: 250px; overflow-y: auto; }
.stock-item { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-radius: 4px; cursor: pointer; border: 1px solid transparent; transition: all 0.1s; }
.stock-item:hover { background: #21262d; border-color: #30363d; }
.stock-item input { cursor: pointer; accent-color: #388bfd; }
.stock-name { font-size: 13px; font-weight: 600; font-family: 'SF Mono', monospace; }

.checkbox-group { padding: 10px 14px; display: flex; flex-direction: column; gap: 8px; }
.check-item { display: flex; align-items: flex-start; gap: 8px; cursor: pointer; padding: 4px 14px; }
.check-item:hover { background: #21262d22; }
.check-item input { accent-color: #388bfd; margin-top: 2px; flex-shrink: 0; }
.ind-info { display: flex; flex-direction: column; }
.indicator-name { font-size: 13px; font-weight: 600; }
.indicator-desc { font-size: 11px; color: #6e7681; }

.range-group { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 10px 12px; }
.range-item { display: flex; flex-direction: column; padding: 8px 10px; border: 1px solid #30363d; border-radius: 6px; cursor: pointer; transition: all 0.15s; }
.range-item:hover { border-color: #8b949e; }
.range-item.active { border-color: #388bfd; background: rgba(56,139,253,0.1); }
.range-label { font-size: 14px; font-weight: 600; color: #e6edf3; }
.range-sub { font-size: 11px; color: #6e7681; margin-top: 2px; }

.strategy-search { padding: 8px 12px; border-bottom: 1px solid #21262d; }
.search-input { width: 100%; background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 6px 10px; border-radius: 4px; font-size: 12px; }
.strategy-tabs { display: flex; border-bottom: 1px solid #21262d; }
.stab { flex: 1; padding: 8px; background: none; border: none; color: #8b949e; font-size: 12px; cursor: pointer; border-bottom: 2px solid transparent; }
.stab.active { color: #388bfd; border-bottom-color: #388bfd; }
.strategy-list { max-height: 250px; overflow-y: auto; padding: 4px 0; }
.no-match { padding: 12px 14px; font-size: 12px; color: #6e7681; text-align: center; }

.launch-card { padding: 14px; }
.estimate { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.est-label { font-size: 12px; color: #8b949e; }
.est-value { font-size: 24px; font-weight: 700; font-family: 'SF Mono', monospace; color: #e6edf3; }
.btn-launch { width: 100%; padding: 10px; background: #388bfd; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
.btn-launch:hover:not(:disabled) { background: #58a6ff; }
.btn-launch:disabled { background: #21262d; color: #6e7681; cursor: not-allowed; }
.launch-hint { font-size: 11px; color: #6e7681; margin-top: 8px; text-align: center; }

.progress-card { padding: 20px; }
.run-id { font-size: 11px; color: #6e7681; font-family: 'SF Mono', monospace; }
.progress-bar-wrap { background: #21262d; border-radius: 6px; height: 8px; margin: 16px 0 8px; overflow: hidden; }
.progress-bar { height: 100%; background: linear-gradient(90deg, #388bfd, #3fb950); border-radius: 6px; transition: width 0.5s ease; }
.progress-info { display: flex; justify-content: space-between; font-size: 13px; color: #8b949e; margin-bottom: 12px; }
.pct { font-weight: 700; color: #e6edf3; font-family: 'SF Mono', monospace; }
.elapsed { color: #6e7681; }
.running-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #8b949e; padding: 3px 0; }
.dot { width: 6px; height: 6px; background: #388bfd; border-radius: 50%; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

.completed-banner { background: rgba(63,185,80,0.1); border: 1px solid rgba(63,185,80,0.3); border-radius: 6px; padding: 12px 16px; color: #3fb950; font-size: 14px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.btn-reset { font-size: 12px; padding: 4px 12px; border: 1px solid #3fb950; background: transparent; color: #3fb950; border-radius: 4px; cursor: pointer; }

.result-filters { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.filter-sel { background: var(--bg-secondary, #161b22); border: 1px solid #30363d; color: #e6edf3; padding: 6px 10px; border-radius: 6px; font-size: 13px; }
.filter-cnt { font-size: 12px; color: #6e7681; }

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th, .table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #21262d; }
.table th { background: #0d1117; font-size: 11px; color: #6e7681; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.table tr:last-child td { border-bottom: none; }
.applied-row td { background: rgba(63,185,80,0.04); }

.sym-cell { font-family: 'SF Mono', monospace; font-weight: 600; }
.ind-cell { font-size: 12px; color: #8b949e; }
.tf-tag { padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; }
.tf-1d { background: rgba(56,139,253,0.2); color: #388bfd; }
.tf-1h { background: rgba(63,185,80,0.2); color: #3fb950; }
.tf-5m { background: rgba(248,81,73,0.2); color: #f85149; }

.profit { color: #3fb950; }
.loss { color: #f85149; }

.btn-apply { padding: 4px 12px; background: #1f6feb; border: none; color: white; border-radius: 4px; font-size: 12px; cursor: pointer; font-weight: 600; }
.btn-apply:hover { background: #388bfd; }
.applied-tag { font-size: 12px; color: #3fb950; font-weight: 600; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 10px; border-top: 1px solid #21262d; }
.page-btn { background: #21262d; border: 1px solid #30363d; color: #e6edf3; padding: 3px 10px; border-radius: 4px; cursor: pointer; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 12px; color: #8b949e; }
</style>
