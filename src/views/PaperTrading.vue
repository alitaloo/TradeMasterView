<template>
  <div class="paper-trading">
    <div class="page-header">
      <h1 class="page-title">模擬交易</h1>
      <div class="status-badge" :class="{ enabled: isEnabled, loading: loading }">
        {{ loading ? '載入中...' : (isEnabled ? '已啟用' : '已停用') }}
      </div>
    </div>

    <!-- Stats Row: 3 columns -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">總資產</div>
        <div class="stat-value">${{ formatNumber(summary.total) }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">現金</div>
        <div class="stat-value">${{ formatNumber(summary.cash) }}</div>
      </div>
      <div class="stat-card" :class="summary.overall_pnl >= 0 ? 'profit' : 'loss'">
        <div class="stat-label">整體損益</div>
        <div class="stat-value">
          {{ summary.overall_pnl >= 0 ? '+' : '' }}${{ formatNumber(summary.overall_pnl) }}
          <span class="stat-pct">({{ summary.overall_pnl_pct }}%)</span>
        </div>
      </div>
    </div>

    <!-- Main Content: Positions + Orders -->
    <div class="content-grid">
      <!-- Left: Positions -->
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
                <th class="text-right">股數</th>
                <th class="text-right">成本</th>
                <th class="text-right">現價</th>
                <th class="text-right">市值</th>
                <th class="text-right">損益</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pos in positions" :key="pos.symbol">
                <td class="symbol">{{ pos.symbol }}</td>
                <td class="text-right number">{{ pos.quantity }}</td>
                <td class="text-right number">${{ pos.average_cost }}</td>
                <td class="text-right number">${{ pos.current_price }}</td>
                <td class="text-right number">${{ formatNumber(pos.market_value) }}</td>
                <td class="text-right number" :class="pos.unrealized_pnl >= 0 ? 'profit' : 'loss'">
                  {{ pos.unrealized_pnl >= 0 ? '+' : '' }}${{ formatNumber(pos.unrealized_pnl) }}
                  <span class="pct">({{ pos.unrealized_pnl_pct }}%)</span>
                </td>
              </tr>
              <tr v-if="positions.length === 0">
                <td colspan="6" class="empty-cell">暫無持倉</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right: Orders -->
      <div class="card orders-card">
        <div class="card-header">
          <h2 class="card-title">訂單</h2>
          <button class="filter-btn" @click="toggleOrders">
            {{ showAllOrders ? '只顯示完成' : '顯示全部' }}
          </button>
        </div>
        <div class="orders-list">
          <table class="data-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>股票</th>
                <th>類型</th>
                <th class="text-right">股數</th>
                <th class="text-right">價格</th>
                <th>狀態</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <td class="time">{{ formatDate(order.created_at) }}</td>
                <td class="symbol">{{ order.symbol }}</td>
                <td>
                  <span class="order-type" :class="order.order_type?.toLowerCase()">
                    {{ order.order_type }}
                  </span>
                </td>
                <td class="text-right number">{{ order.quantity }}</td>
                <td class="text-right number">${{ order.price }}</td>
                <td>
                  <span class="order-status" :class="order.status?.toLowerCase()">{{ order.status }}</span>
                </td>
              </tr>
              <tr v-if="orders.length === 0">
                <td colspan="6" class="empty-cell">暫無訂單</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { paperApi } from '@/api'
import { formatTaipei } from '../utils/datetime.js'

const isEnabled = ref(false)
const summary = ref({
  total: 0,
  cash: 0,
  market_value: 0,
  initial_balance: 0,
  unrealized_pnl: 0,
  unrealized_pnl_pct: 0,
  overall_pnl: 0,
  overall_pnl_pct: 0
})
const positions = ref([])
const allOrders = ref([])
const orders = ref([])
const loading = ref(false)
const showAllOrders = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    // 並行獲取所有數據（避免串行等待）
    const [status, posRes, orderRes] = await Promise.all([
      paperApi.getStatus(),
      paperApi.getPositions(),
      paperApi.getOrders(20)
    ])

    // 處理狀態
    isEnabled.value = status.enabled === true || status.enabled === 'true'
    summary.value = {
      total: status.total_assets || 0,
      cash: status.cash || 0,
      market_value: status.market_value || 0,
      initial_balance: status.initial_balance || 0,
      unrealized_pnl: status.unrealized_pnl || 0,
      unrealized_pnl_pct: status.unrealized_pnl_pct?.toFixed(2) || '0.00',
      overall_pnl: status.overall_pnl || 0,
      overall_pnl_pct: status.overall_pnl_pct?.toFixed(2) || '0.00'
    }
    
    // 處理持倉
    positions.value = posRes.positions || posRes || []
    
    // 處理訂單
    allOrders.value = orderRes.orders || []
    orders.value = allOrders.value.filter(o => o.status === 'filled')
    
  } catch (error) {
    console.error('載入失敗:', error)
    isEnabled.value = false
  } finally {
    loading.value = false
  }
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0.00'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return formatTaipei(dateStr)
}

const toggleOrders = () => {
  showAllOrders.value = !showAllOrders.value
  orders.value = showAllOrders.value ? allOrders.value : allOrders.value.filter(o => o.status === 'filled')
}

onMounted(() => {
  loadData()
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

.paper-trading {
  animation: fadeIn 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: 8px;
}

.page-title {
  font-size: var(--text-xl);
  font-weight: 700;
  margin: 0;
}

.status-badge {
  padding: var(--space-2) var(--space-4);
  border-radius: 100px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  font-size: var(--text-sm);
  font-weight: 500;
  border: 1px solid var(--border-default);
}

.status-badge.enabled {
  background: rgba(63, 185, 80, 0.15);
  color: var(--color-profit);
  border-color: var(--color-profit);
}

.status-badge.loading {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

/* Stats Row: 3 columns */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: 700;
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

/* Content Grid */
.content-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-muted);
  flex-shrink: 0;
}

.card-title {
  font-size: var(--text-base);
  font-weight: 600;
  margin: 0;
}

.position-count, .order-count {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.filter-btn {
  font-size: var(--text-xs);
  padding: 2px 8px;
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.positions-list, .orders-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 6px 10px !important;
  text-align: left;
  border-bottom: 1px solid var(--border-muted);
}

.data-table th {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: sticky;
  top: 0;
}

.symbol {
  font-weight: 600;
  font-family: var(--font-mono);
}

.text-right {
  text-align: right;
}

.number {
  font-family: var(--font-mono);
}

.time {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.profit { color: var(--color-profit); }
.loss { color: var(--color-loss); }

.pct {
  font-size: var(--text-xs);
  opacity: 0.8;
}

.order-type {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
}

.order-type.buy { 
  background: rgba(31, 111, 235, 0.2); 
  color: var(--color-buy); 
}

.order-type.sell { 
  background: rgba(218, 54, 51, 0.2); 
  color: var(--color-sell); 
}

.order-status {
  display: inline-block;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.order-status.filled { 
  background: rgba(63, 185, 80, 0.2); 
  color: var(--color-profit); 
}

.order-status.pending { 
  background: rgba(210, 153, 34, 0.2); 
  color: var(--color-warning); 
}

.order-status.cancelled { 
  background: rgba(110, 118, 129, 0.2); 
  color: var(--color-hold); 
}

.empty-cell {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>