<template>
  <div class="portfolio-summary">
    <!-- 總資產卡片 -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-icon">💼</div>
        <div class="card-content">
          <div class="card-label">總資產</div>
          <div class="card-value">{{ formatCurrency(data.total_value) }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon">💵</div>
        <div class="card-content">
          <div class="card-label">現金餘額</div>
          <div class="card-value">{{ formatCurrency(data.cash_balance) }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon" :class="getPnlClass(data.total_pnl)">
          {{ data.total_pnl >= 0 ? '📈' : '📉' }}
        </div>
        <div class="card-content">
          <div class="card-label">總損益</div>
          <div :class="['card-value', getPnlClass(data.total_pnl)]">
            {{ formatCurrency(data.total_pnl) }}
          </div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon">🎯</div>
        <div class="card-content">
          <div class="card-label">報酬率</div>
          <div :class="['card-value', getReturnClass(data.total_return)]">
            {{ formatPercent(data.total_return * 100) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 風險指標 -->
    <div class="risk-section">
      <h4>風險指標</h4>
      <div class="risk-metrics">
        <div class="metric">
          <div class="metric-label">最大回撤</div>
          <div class="metric-bar">
            <div 
              class="metric-fill danger"
              :style="{ width: `${Math.abs(data.max_drawdown * 100)}%` }"
            ></div>
          </div>
          <div class="metric-value negative">{{ formatPercent(data.max_drawdown * 100) }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">波動率</div>
          <div class="metric-bar">
            <div 
              class="metric-fill warning"
              :style="{ width: `${(data.volatility || 0) * 100}%` }"
            ></div>
          </div>
          <div class="metric-value">{{ formatPercent((data.volatility || 0) * 100) }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">夏普比率</div>
          <div class="metric-value large">{{ data.sharpe_ratio?.toFixed(2) || 'N/A' }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">勝率</div>
          <div class="metric-value large">{{ formatPercent((data.win_rate || 0) * 100) }}</div>
        </div>
      </div>
    </div>

    <!-- 持倉分布 -->
    <div class="allocation-section">
      <h4>資產配置</h4>
      <div class="allocation-bars">
        <div 
          v-for="(item, index) in allocationData" 
          :key="item.symbol"
          class="allocation-item"
        >
          <div class="allocation-info">
            <span class="allocation-symbol">{{ item.symbol }}</span>
            <span class="allocation-percent">{{ item.percent.toFixed(1) }}%</span>
          </div>
          <div class="allocation-bar">
            <div 
              class="allocation-fill"
              :style="{ 
                width: `${item.percent}%`,
                backgroundColor: colors[index % colors.length]
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 持倉列表 -->
    <div class="positions-section">
      <h4>持倉明細 ({{ data.positions?.length || 0 }})</h4>
      <div class="positions-list">
        <div 
          v-for="position in data.positions" 
          :key="position.symbol"
          class="position-item"
        >
          <div class="position-info">
            <div class="position-symbol">{{ position.symbol }}</div>
            <div class="position-qty">{{ position.quantity }} 股</div>
          </div>
          <div class="position-prices">
            <div class="price-row">
              <span class="price-label">均價</span>
              <span class="price-value">{{ formatCurrency(position.avg_price) }}</span>
            </div>
            <div class="price-row">
              <span class="price-label">現價</span>
              <span class="price-value">{{ formatCurrency(position.current_price) }}</span>
            </div>
          </div>
          <div :class="['position-pnl', getPnlClass(position.pnl)]">
            <div class="pnl-value">{{ formatCurrency(position.pnl) }}</div>
            <div class="pnl-percent">{{ formatPercent(position.pnl_percent * 100) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import formatter from '@/utils/formatter.js';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      total_value: 0,
      cash_balance: 0,
      total_pnl: 0,
      total_return: 0,
      max_drawdown: 0,
      volatility: 0,
      sharpe_ratio: 0,
      win_rate: 0,
      positions: []
    })
  }
});

// 資產配置顏色
const colors = [
  '#4ecca3', '#e94560', '#ffc107', '#3498db',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e'
];

// 計算持倉占比
const allocationData = computed(() => {
  if (!props.data.positions || !props.data.total_value) return [];
  
  return props.data.positions
    .map(p => ({
      symbol: p.symbol,
      percent: (p.current_price * p.quantity / props.data.total_value) * 100
    }))
    .sort((a, b) => b.percent - a.percent);
});

// 格式化工具
const formatCurrency = (value) => formatter.formatCurrency(value || 0);
const formatPercent = (value) => formatter.formatPercent(value || 0);

const getPnlClass = (value) => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return '';
};

const getReturnClass = (value) => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return '';
};
</script>

<style scoped>
.portfolio-summary {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 總資產卡片 */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.summary-card {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #2a2a4a;
}

.card-icon {
  font-size: 32px;
}

.card-content {
  flex: 1;
}

.card-label {
  color: #a0a0a0;
  font-size: 12px;
  margin-bottom: 4px;
}

.card-value {
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.card-value.positive {
  color: #4ecca3;
}

.card-value.negative {
  color: #e94560;
}

/* 風險指標 */
.risk-section,
.allocation-section,
.positions-section {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #2a2a4a;
}

.risk-section h4,
.allocation-section h4,
.positions-section h4 {
  margin: 0 0 16px 0;
  color: #ffffff;
  font-size: 16px;
}

.risk-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.metric {
  text-align: center;
}

.metric-label {
  color: #a0a0a0;
  font-size: 12px;
  margin-bottom: 8px;
}

.metric-bar {
  background: #16213e;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.metric-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.metric-fill.danger {
  background: #e94560;
}

.metric-fill.warning {
  background: #ffc107;
}

.metric-value {
  color: #ffffff;
  font-size: 14px;
}

.metric-value.negative {
  color: #e94560;
}

.metric-value.large {
  font-size: 24px;
  font-weight: 600;
}

/* 資產配置 */
.allocation-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.allocation-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.allocation-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.allocation-symbol {
  color: #ffffff;
}

.allocation-percent {
  color: #a0a0a0;
}

.allocation-bar {
  background: #16213e;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.allocation-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

/* 持倉列表 */
.positions-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.position-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #16213e;
  border-radius: 8px;
  padding: 12px 16px;
}

.position-info {
  flex: 1;
}

.position-symbol {
  font-weight: 600;
  color: #ffffff;
}

.position-qty {
  font-size: 12px;
  color: #a0a0a0;
}

.position-prices {
  display: flex;
  gap: 24px;
}

.price-row {
  text-align: right;
}

.price-label {
  display: block;
  font-size: 10px;
  color: #a0a0a0;
}

.price-value {
  color: #ffffff;
}

.position-pnl {
  text-align: right;
  min-width: 100px;
}

.pnl-value {
  font-weight: 600;
  font-size: 14px;
}

.pnl-percent {
  font-size: 12px;
}

.position-pnl.positive .pnl-value,
.position-pnl.positive .pnl-percent {
  color: #4ecca3;
}

.position-pnl.negative .pnl-value,
.position-pnl.negative .pnl-percent {
  color: #e94560;
}

@media (max-width: 1024px) {
  .summary-cards,
  .risk-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .position-item {
    flex-direction: column;
    gap: 12px;
  }
  
  .position-prices {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
