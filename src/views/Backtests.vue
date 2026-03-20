<template>
  <div class="backtests-page">
    <div class="page-header">
      <h1 class="page-title">📊 回測結果</h1>
    </div>
    
    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="dailySummaries.length === 0" class="empty">暫無回測數據</div>
    
    <div v-else class="backtests-content">
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
import { ref, onMounted } from 'vue'

const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

const dailySummaries = ref([])
const loading = ref(true)

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

.profit { color: #22c55e; }
.loss { color: #ef4444; }

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  font-size: 1rem;
}
</style>
