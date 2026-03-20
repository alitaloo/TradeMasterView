<template>
  <div class="dashboard">
    <!-- 頂部：4 個數字卡 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-info">
          <span class="stat-label">總資產</span>
          <span class="stat-value">${{ formatNumber(accountStatus.total_assets) }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💵</div>
        <div class="stat-info">
          <span class="stat-label">現金</span>
          <span class="stat-value">${{ formatNumber(accountStatus.cash) }}</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" :class="accountStatus.unrealized_pnl >= 0 ? 'profit' : 'loss'">📈</div>
        <div class="stat-info">
          <span class="stat-label">未實現損益</span>
          <span class="stat-value" :class="accountStatus.unrealized_pnl >= 0 ? 'profit' : 'loss'">
            {{ accountStatus.unrealized_pnl >= 0 ? '+' : '' }}${{ formatNumber(accountStatus.unrealized_pnl) }} ({{ accountStatus.unrealized_pnl_pct }}%)
          </span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <span class="stat-label">今日信號數</span>
          <span class="stat-value">{{ todaySignalCount }}</span>
        </div>
      </div>
    </div>

    <!-- 中間區域 -->
    <div class="content-grid">
      <!-- 中間左：持倉列表 -->
      <div class="card positions-card">
        <div class="card-header">
          <h2 class="card-title">📋 持倉 ({{ positions.length }})</h2>
        </div>
        <div class="positions-list">
          <table class="data-table">
            <thead>
              <tr>
                <th>股票</th>
                <th>數量</th>
                <th>成本</th>
                <th>現價</th>
                <th>損益%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pos in positions" :key="pos.id">
                <td class="symbol">{{ pos.symbol }}</td>
                <td>{{ pos.quantity }}</td>
                <td>${{ pos.average_cost?.toFixed(2) }}</td>
                <td>${{ pos.current_price?.toFixed(2) }}</td>
                <td :class="pos.return_pct >= 0 ? 'profit' : 'loss'">
                  {{ pos.return_pct >= 0 ? '+' : '' }}{{ (pos.return_pct || 0).toFixed(2) }}%
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="positions.length === 0" class="empty">暫無持倉</div>
        </div>
      </div>

      <!-- 中間右：市場狀況 + 最新信號 -->
      <div class="right-column">
        <!-- 市場狀況 -->
        <div class="card market-card">
          <div class="card-header">
            <h2 class="card-title">🌍 市場狀況</h2>
          </div>
          <div class="market-grid">
            <div v-for="m in marketData" :key="m.type" class="market-item">
              <span class="market-symbol">{{ m.type }}</span>
              <span class="market-value">${{ m.value?.toFixed(2) || '-' }}</span>
              <span v-if="m.change !== undefined" class="market-change" :class="m.change >= 0 ? 'profit' : 'loss'">
                {{ m.change >= 0 ? '+' : '' }}{{ m.change.toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- 最新信號 -->
        <div class="card signals-card">
          <div class="card-header">
            <h2 class="card-title">📈 最新信號</h2>
            <router-link to="/signals" class="view-all">查看全部 →</router-link>
          </div>
          <div class="signals-list">
            <div v-for="signal in latestSignals" :key="signal.id" class="signal-item">
              <div class="signal-info">
                <span class="signal-symbol">{{ signal.symbol }}</span>
                <span class="signal-type" :class="signal.signal_type?.toLowerCase()">{{ signal.signal_type }}</span>
              </div>
              <div class="signal-meta">
                <span class="signal-confidence">信心度: {{ signal.confidence }}</span>
              </div>
            </div>
            <div v-if="latestSignals.length === 0" class="empty">暫無信號</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：最新新聞 -->
    <div class="card news-card">
      <div class="card-header">
        <h2 class="card-title">📰 最新新聞</h2>
      </div>
      <div class="news-list">
        <a v-for="news in latestNews" :key="news.id" :href="news.url" target="_blank" class="news-item">
          <span class="news-title">{{ news.title }}</span>
          <span class="news-source">{{ news.source }}</span>
        </a>
        <div v-if="latestNews.length === 0" class="empty">暫無新聞</div>
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
const news = ref([])
const marketRaw = ref([])
const loading = ref(true)

const marketData = computed(() => {
  const result = []
  const marketMap = {}
  marketRaw.value.forEach(m => {
    marketMap[m.type] = m
  })
  
  // SPY
  if (marketMap['SPY']) {
    result.push({ type: 'SPY', value: marketMap['SPY'].value, change: 0 })
  }
  // QQQ
  if (marketMap['QQQ']) {
    result.push({ type: 'QQQ', value: marketMap['QQQ'].value, change: 0 })
  }
  // VIX
  if (marketMap['VIX']) {
    result.push({ type: 'VIX', value: marketMap['VIX'].value, change: 0 })
  }
  // MARKET_DROP (大盤漲跌)
  if (marketMap['MARKET_DROP']) {
    result.push({ type: '大盤', value: null, change: marketMap['MARKET_DROP'].value })
  }
  
  return result.slice(0, 4)
})

const latestSignals = computed(() => signals.value.slice(0, 5))
const latestNews = computed(() => news.value.slice(0, 3))

const todaySignalCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return signals.value.filter(s => s.created_at?.startsWith(today)).length
})

const formatNumber = (num) => {
  if (!num && num !== 0) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fetchAllData = async () => {
  loading.value = true
  try {
    const [statusRes, posRes, signalsRes, newsRes, marketRes] = await Promise.all([
      fetch(`${API_URL}/paper/status`),
      fetch(`${API_URL}/paper/positions`),
      fetch(`${API_URL}/signals?limit=10`),
      fetch(`${API_URL}/news?limit=5`),
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

    const newsData = await newsRes.json()
    news.value = newsData.news || []

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
  gap: 16px;
  max-height: calc(100vh - 120px);
  overflow: hidden;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  flex-shrink: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat-icon {
  font-size: 1.5rem;
}

.stat-icon.profit { color: #22c55e; }
.stat-icon.loss { color: #ef4444; }

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
}

.stat-value.profit { color: #22c55e; }
.stat-value.loss { color: #ef4444; }

.content-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.right-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
}

.view-all {
  font-size: 0.75rem;
  color: var(--color-accent);
}

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
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.data-table th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-bg-tertiary);
  position: sticky;
  top: 0;
}

.symbol {
  font-weight: 600;
}

.profit { color: #22c55e; }
.loss { color: #ef4444; }

.market-card {
  flex-shrink: 0;
}

.market-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 12px;
}

.market-item {
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.market-symbol {
  font-size: 0.75rem;
  font-weight: 600;
}

.market-value {
  font-size: 1rem;
  font-weight: 700;
}

.market-change {
  font-size: 0.75rem;
}

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
  padding: 8px;
}

.signal-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
}

.signal-item:last-child {
  border-bottom: none;
}

.signal-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.signal-symbol {
  font-weight: 600;
  font-size: 0.875rem;
}

.signal-type {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 500;
}

.signal-type.buy { background: #22c55e20; color: #22c55e; }
.signal-type.sell { background: #ef444420; color: #ef4444; }
.signal-type.hold { background: #6b728020; color: #6b7280; }

.signal-meta {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.news-card {
  flex-shrink: 0;
}

.news-list {
  display: flex;
  gap: 12px;
  padding: 12px;
  overflow-x: auto;
}

.news-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: inherit;
  transition: background 0.2s;
}

.news-item:hover {
  background: var(--color-bg-hover);
}

.news-title {
  font-size: 0.875rem;
  font-weight: 500;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.news-source {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.empty {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
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
</style>
