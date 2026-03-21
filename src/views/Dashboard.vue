<template>
  <div class="dashboard">
    <!-- Stats Row: 5 columns -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">總資產</div>
        <div class="stat-value">${{ formatNumber(accountStatus.total_assets) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">現金</div>
        <div class="stat-value">${{ formatNumber(accountStatus.cash) }}</div>
      </div>
      <div class="stat-card" :class="accountStatus.unrealized_pnl >= 0 ? 'profit' : 'loss'">
        <div class="stat-label">今日損益</div>
        <div class="stat-value">
          {{ accountStatus.unrealized_pnl >= 0 ? '+' : '' }}${{ formatNumber(accountStatus.unrealized_pnl) }}
          <span class="stat-pct">({{ accountStatus.unrealized_pnl_pct }}%)</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-label">持倉數</div>
        <div class="stat-value">{{ positions.length }}</div>
      </div>
      <div class="stat-card" :class="vixLevel.class">
        <div class="stat-label">VIX</div>
        <div class="stat-value">{{ vixValue }}</div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="dashboard-grid">
      <div class="dashboard-left">
        <!-- Left: Positions Table -->
        <div class="card positions-card">
        <div class="card-header">
          <h2 class="card-title">持倉</h2>
          <span class="position-count">{{ positions.length }} 檔</span>
        </div>
        <div class="positions-list">
          <table class="data-table">
            <thead>
              <tr>
                <th>股票</th>
                <th class="text-right">數量</th>
                <th class="text-right">成本</th>
                <th class="text-right">現價</th>
                <th class="text-right">市值</th>
                <th class="text-right">損益%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pos in positions" :key="pos.id">
                <td class="symbol">{{ pos.symbol }}</td>
                <td class="text-right number">{{ pos.quantity }}</td>
                <td class="text-right number">${{ pos.average_cost?.toFixed(2) }}</td>
                <td class="text-right number">${{ pos.current_price?.toFixed(2) }}</td>
                <td class="text-right number">${{ formatNumber(pos.market_value) }}</td>
                <td class="text-right number" :class="pos.return_pct >= 0 ? 'profit' : 'loss'">
                  {{ pos.return_pct >= 0 ? '+' : '' }}{{ (pos.return_pct || 0).toFixed(2) }}%
                </td>
              </tr>
              <tr v-if="positions.length === 0">
                <td colspan="6" class="empty-cell">暫無持倉</td>
              </tr>
            </tbody>
          </table>
        </div>
        </div>
      </div>

      <!-- Right: Market + Signals -->
      <div class="dashboard-right">
        <!-- Market Indicators -->
        <div class="card market-card">
          <div class="card-header">
            <h2 class="card-title">市場指標</h2>
          </div>
          <div class="market-grid">
            <div v-for="m in marketIndicators" :key="m.type" class="market-item">
              <span class="market-symbol">{{ m.type }}</span>
              <span class="market-value number">${{ m.value?.toFixed(2) || '-' }}</span>
              <span v-if="m.change !== undefined" class="market-change" :class="m.change >= 0 ? 'profit' : 'loss'">
                {{ m.change >= 0 ? '+' : '' }}{{ m.change.toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Latest Signals -->
        <div class="card signals-card">
          <div class="card-header">
            <h2 class="card-title">最新信號</h2>
            <router-link to="/signals" class="view-all">查看全部</router-link>
          </div>
          <div class="signals-list">
            <div v-for="signal in latestSignals" :key="signal.id" class="signal-item">
              <div class="signal-info">
                <span class="signal-symbol">{{ signal.symbol }}</span>
                <span class="signal-type" :class="signal.signal_type?.toLowerCase()">{{ signal.signal_type }}</span>
              </div>
              <div class="signal-meta">
                <span class="signal-confidence">{{ (signal.confidence * 100).toFixed(0) }}%</span>
              </div>
            </div>
            <div v-if="latestSignals.length === 0" class="empty-cell">暫無信號</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

const accountStatus = ref({})
const positions = ref([])
const signals = ref([])
const marketRaw = ref([])
const loading = ref(true)

// VIX level classification
const vixData = computed(() => {
  const vix = marketRaw.value.find(m => m.type === 'VIX')
  return vix?.value || null
})

const vixValue = computed(() => {
  if (vixData.value === null) return '-'
  return vixData.value.toFixed(2)
})

const vixLevel = computed(() => {
  const vix = vixData.value
  if (vix === null) return { class: '' }
  if (vix < 15) return { class: 'low' }
  if (vix < 25) return { class: 'normal' }
  if (vix < 35) return { class: 'elevated' }
  return { class: 'high' }
})

// Market indicators (SPY, QQQ, VIX)
const marketIndicators = computed(() => {
  const result = []
  const marketMap = {}
  marketRaw.value.forEach(m => {
    marketMap[m.type] = m
  })
  
  if (marketMap['SPY']) {
    result.push({ type: 'SPY', value: marketMap['SPY'].value, change: marketMap['MARKET_DROP']?.value || 0 })
  }
  if (marketMap['QQQ']) {
    result.push({ type: 'QQQ', value: marketMap['QQQ'].value, change: 0 })
  }
  if (marketMap['VIX']) {
    result.push({ type: 'VIX', value: marketMap['VIX'].value, change: undefined })
  }
  
  return result.slice(0, 3)
})

const latestSignals = computed(() => signals.value.slice(0, 5))

const formatNumber = (num) => {
  if (!num && num !== 0) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fetchAllData = async () => {
  loading.value = true
  try {
    const [statusRes, posRes, signalsRes, marketRes] = await Promise.all([
      fetch(`${API_URL}/paper/status`),
      fetch(`${API_URL}/paper/positions`),
      fetch(`${API_URL}/signals?limit=10`),
      fetch(`${API_URL}/market`)
    ])

    const statusData = await statusRes.json()
    if (statusData) {
      accountStatus.value = {
        total_assets: statusData.total_assets || 0,
        cash: statusData.cash || 0,
        unrealized_pnl: statusData.unrealized_pnl || 0,
        unrealized_pnl_pct: statusData.unrealized_pnl_pct?.toFixed(2) || '0.00'
      }
    }

    const posData = await posRes.json()
    positions.value = posData.positions || []

    const signalsData = await signalsRes.json()
    signals.value = signalsData.signals || []

    const marketData = await marketRes.json()
    marketRaw.value = marketData.markets || []
  } catch (err) {
    console.error('Fetch dashboard data error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAllData()
})
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
  overflow: hidden;
}

/* Stats Row: 5 columns */
.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
  flex-shrink: 0;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: 600;
  font-family: var(--font-mono);
}

.stat-card.profit .stat-value {
  color: var(--color-profit);
}

.stat-card.loss .stat-value {
  color: var(--color-loss);
}

.stat-pct {
  font-size: var(--text-sm);
  opacity: 0.8;
}

.stat-card.low .stat-value { color: var(--color-profit); }
.stat-card.normal .stat-value { color: var(--text-secondary); }
.stat-card.elevated .stat-value { color: var(--color-warning); }
.stat-card.high .stat-value { color: var(--color-loss); }

/* Content Grid */
.dashboard-grid {
  display: flex;
  gap: 12px;
  align-items: start;
  flex: 1;
  min-height: 0;
}

.dashboard-left {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dashboard-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-muted);
}

.card-title {
  font-size: var(--text-base);
  font-weight: 600;
  margin: 0;
}

.view-all {
  font-size: var(--text-sm);
  color: var(--color-accent);
}

.position-count {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* Positions Table */
.positions-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.positions-list {
  flex: 1;
  overflow-y: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-muted);
}

.data-table th {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  position: sticky;
  top: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.symbol {
  font-weight: 600;
  font-family: var(--font-mono);
}

.text-right {
  text-align: right;
}

.profit { color: var(--color-profit); }
.loss { color: var(--color-loss); }
.number {
  font-family: var(--font-mono);
}

.empty-cell {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

/* Market Card */
.market-card {
  flex-shrink: 0;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
  padding: var(--space-3);
}

.market-item {
  display: flex;
  flex-direction: column;
  padding: var(--space-2);
  background: var(--bg-tertiary);
  border-radius: var(--radius-sm);
  text-align: center;
}

.market-symbol {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
}

.market-value {
  font-size: var(--text-base);
  font-weight: 700;
  margin: var(--space-1) 0;
}

.market-change {
  font-size: var(--text-xs);
}

/* Signals Card */
.signals-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.signals-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.signal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-muted);
}

.signal-item:last-child {
  border-bottom: none;
}

.signal-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.signal-symbol {
  font-weight: 600;
  font-size: var(--text-sm);
  font-family: var(--font-mono);
}

.signal-type {
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
}

.signal-type.buy { background: rgba(31, 111, 235, 0.2); color: var(--color-buy); }
.signal-type.sell { background: rgba(218, 54, 51, 0.2); color: var(--color-sell); }
.signal-type.hold { background: rgba(110, 118, 129, 0.2); color: var(--color-hold); }

.signal-meta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (max-width: 1200px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .right-column {
    flex-direction: row;
  }
  
  .market-card, .signals-card {
    flex: 1;
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>