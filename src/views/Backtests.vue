<template>
  <div class="backtests-page">
    <div class="page-header">
      <h1 class="page-title">📊 回測結果</h1>
    </div>
    
    <div v-if="loading" class="loading">載入中...</div>
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
      <div class="card">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'
const INITIAL_BALANCE = 1000000

const dailySummaries = ref([])
const loading = ref(true)

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

const formatNumber = (num) => {
  if (!num && num !== 0) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/paper/daily-summary?limit=30`)
    const data = await res.json()
    if (data.summaries) {
      dailySummaries.value = data.summaries
    }
  } catch (err) {
    console.error('Fetch daily summary error:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.backtests-page {
  animation: fadeIn 0.3s ease;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.backtests-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
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

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}

.summary-card {
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border-default, #30363d);
  border-radius: 6px;
  padding: 16px;
}

.summary-label {
  font-size: 11px;
  color: var(--text-secondary, #8b949e);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'SF Mono', 'Fira Code', monospace;
  margin-bottom: 4px;
}

.summary-sub {
  font-size: 11px;
  color: var(--text-muted, #6e7681);
}

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  font-size: 1rem;
}
</style>
