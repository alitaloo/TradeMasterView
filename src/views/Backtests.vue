<template>
  <div class="backtests-page">
    <div class="page-header">
      <h1 class="page-title">📊 回測結果</h1>
    </div>
    
    <div class="backtests-content">
      <div class="card chart-card">
        <div class="card-header">
          <h2 class="card-title">📈 權益曲線</h2>
        </div>
        <div class="chart-container">
          <canvas ref="equityChart"></canvas>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">🏆 策略排名</h2>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>排名</th>
              <th>策略</th>
              <th>股票</th>
              <th>報酬</th>
              <th>夏普</th>
              <th>最大回撤</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in topStrategies" :key="index">
              <td>
                <span class="rank-badge" :class="getRankClass(index)">
                  {{ index + 1 }}
                </span>
              </td>
              <td>{{ item.strategy }}</td>
              <td>{{ item.symbol }}</td>
              <td :class="item.return >= 0 ? 'long' : 'short'">
                {{ item.return >= 0 ? '+' : '' }}{{ item.return }}%
              </td>
              <td>{{ item.sharpe }}</td>
              <td>{{ item.maxDD }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const topStrategies = ref([
  { strategy: 'Stooq_V2', symbol: 'WDC', return: 109.3, sharpe: 105.5, maxDD: 20.9 },
  { strategy: 'Stooq_V2', symbol: 'TSM', return: 31.1, sharpe: 92.4, maxDD: 6.3 },
  { strategy: 'Stooq_V2', symbol: 'GOOGL', return: 22.9, sharpe: 59.8, maxDD: 7.6 },
  { strategy: 'MACD_Trend', symbol: 'TSLA', return: 198408, sharpe: 164.9, maxDD: 56.3 },
  { strategy: 'Stooq_V2', symbol: 'COIN', return: 21.4, sharpe: 51.4, maxDD: 26.8 }
])

const getRankClass = (index) => {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

onMounted(() => {
  // 初始化图表
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
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
}

.chart-card {
  min-height: 400px;
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-muted);
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 0.875rem;
  font-weight: 700;
  background: var(--color-bg-tertiary);
  border-radius: 50%;
}

.rank-badge.gold {
  background: linear-gradient(135deg, #ffd700, #ffb700);
  color: #000;
}

.rank-badge.silver {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
  color: #000;
}

.rank-badge.bronze {
  background: linear-gradient(135deg, #cd7f32, #b87333);
  color: #fff;
}

@media (max-width: 1024px) {
  .back tests-content {
    grid-template-columns: 1fr;
  }
}
</style>
