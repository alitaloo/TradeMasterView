<template>
  <div class="paper-trading">
    <div class="header">
      <h1>📈 模擬交易</h1>
      <div class="status-badge" :class="{ enabled: isEnabled }">
        {{ isEnabled ? '✅ 已啟用' : '❌ 已停用' }}
      </div>
    </div>

    <!-- 總資產卡片 -->
    <div class="summary-cards">
      <div class="card total">
        <div class="label">總資產</div>
        <div class="value">${{ formatNumber(summary.total) }}</div>
      </div>
      <div class="card cash">
        <div class="label">現金</div>
        <div class="value">${{ formatNumber(summary.cash) }}</div>
      </div>
      <div class="card market-value">
        <div class="label">持倉市值</div>
        <div class="value">${{ formatNumber(summary.market_value) }}</div>
      </div>
      <div class="card pnl" :class="{ positive: summary.unrealized_pnl >= 0, negative: summary.unrealized_pnl < 0 }">
        <div class="label">未實現損益</div>
        <div class="value">${{ formatNumber(summary.unrealized_pnl) }} ({{ summary.unrealized_pnl_pct }}%)</div>
      </div>
    </div>

    <!-- 持倉列表 -->
    <div class="section">
      <h2>📊 持倉 ({{ positions.length }})</h2>
      <div v-if="positions.length === 0" class="empty">暫無持倉</div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>股票</th>
            <th>股數</th>
            <th>成本</th>
            <th>現價</th>
            <th>市值</th>
            <th>損益</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pos in positions" :key="pos.symbol">
            <td>{{ pos.symbol }}</td>
            <td>{{ pos.quantity }}</td>
            <td>${{ pos.average_cost }}</td>
            <td>${{ pos.current_price }}</td>
            <td>${{ formatNumber(pos.market_value) }}</td>
            <td :class="{ positive: pos.unrealized_pnl >= 0, negative: pos.unrealized_pnl < 0 }">
              ${{ formatNumber(pos.unrealized_pnl) }} ({{ pos.unrealized_pnl_pct }}%)
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 訂單列表 -->
    <div class="section">
      <h2>📋 訂單 ({{ orders.length }})</h2>
      <table v-if="orders.length > 0" class="data-table">
        <thead>
          <tr>
            <th>時間</th>
            <th>股票</th>
            <th>類型</th>
            <th>股數</th>
            <th>價格</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ formatDate(order.created_at) }}</td>
            <td>{{ order.symbol }}</td>
            <td :class="{ buy: order.order_type === 'BUY', sell: order.order_type === 'SELL' }">
              {{ order.order_type }}
            </td>
            <td>{{ order.quantity }}</td>
            <td>${{ order.price }}</td>
            <td>{{ order.status }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暫無訂單</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { paperApi } from '@/api'
import { formatTaipei } from '../utils/datetime.js'

const isEnabled = ref(false)
const summary = ref({})
const positions = ref([])
const orders = ref([])
const loading = ref(false)
const debugInfo = ref('')

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
    debugInfo.value = `enabled=${status.enabled}, type=${typeof status.enabled}`
    summary.value = {
      total: status.total_assets,
      cash: status.cash,
      market_value: status.market_value,
      unrealized_pnl: status.unrealized_pnl,
      unrealized_pnl_pct: 0
    }
    
    // 處理持倉
    positions.value = posRes.positions || []
    
    // 計算未實現損益百分比
    if (summary.value.total > 0) {
      summary.value.unrealized_pnl_pct = ((summary.value.unrealized_pnl / summary.value.total) * 100).toFixed(2)
    }
    
    // 處理訂單
    orders.value = orderRes.orders || []
    
  } catch (error) {
    console.error('載入失敗:', error)
    console.error('Error details:', error.message)
    isEnabled.value = false
  } finally {
    loading.value = false
  }
}

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'
  return Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatDate = (dateStr) => {
  return formatTaipei(dateStr)
}

onMounted(() => {
  console.log('onMounted called')
  loadData()
})
</script>

<style scoped>
.paper-trading {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #333;
}

.header h1 {
  margin: 0;
  font-size: 28px;
}

.status-badge {
  padding: 10px 20px;
  border-radius: 24px;
  background: #ff4444;
  color: white;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
}

.status-badge.enabled {
  background: #00c853;
  color: #000;
  box-shadow: 0 2px 8px rgba(0,200,83,0.3);
}

.status-badge.loading {
  background: #666;
  color: #fff;
}


.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.card {
  background: #1e1e1e;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.card .label {
  color: #888;
  font-size: 14px;
  margin-bottom: 8px;
}

.card .value {
  font-size: 24px;
  font-weight: bold;
}

.card.pnl.positive .value {
  color: #44ff44;
}

.card.pnl.negative .value {
  color: #ff4444;
}

.section {
  margin-bottom: 24px;
}

.section h2 {
  margin-bottom: 12px;
  color: #fff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #333;
}

.data-table th {
  background: #2a2a2a;
  color: #888;
}

.positive {
  color: #44ff44;
}

.negative {
  color: #ff4444;
}

.buy {
  color: #44ff44;
}

.sell {
  color: #ff4444;
}

.empty {
  color: #666;
  text-align: center;
  padding: 40px;
}
</style>
