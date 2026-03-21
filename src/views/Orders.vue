<template>
  <div class="orders-page">
    <div class="page-header">
      <h1 class="page-title">📋 訂單管理</h1>
      <button class="btn btn-primary" @click="showAddModal = true">
        <span>+</span> 新增訂單
      </button>
    </div>

    <!-- 統計圖表區 - 可收合 -->
    <div class="charts-toggle" v-if="orders.length > 0">
      <button class="btn-toggle" @click="showCharts = !showCharts">
        {{ showCharts ? '▲ 隱藏統計' : '▼ 顯示統計' }}
      </button>
    </div>
    <div class="charts-row" v-if="orders.length > 0 && showCharts">
      <!-- 狀態分佈 -->
      <div class="chart-card">
        <div class="chart-title">訂單狀態</div>
        <canvas ref="statusChartRef" height="120"></canvas>
      </div>
      <!-- 各股票交易量 -->
      <div class="chart-card">
        <div class="chart-title">各股票成交筆數</div>
        <canvas ref="symbolChartRef" height="120"></canvas>
      </div>
      <!-- 買賣比例 -->
      <div class="chart-card">
        <div class="chart-title">買入 vs 賣出</div>
        <canvas ref="typeChartRef" height="120"></canvas>
      </div>
      <!-- 統計摘要 -->
      <div class="chart-card stats-card">
        <div class="chart-title">成交摘要</div>
        <div class="stat-row"><span class="stat-label">總訂單</span><span class="stat-value">{{ orders.length }}</span></div>
        <div class="stat-row"><span class="stat-label">已成交</span><span class="stat-value profit">{{ filledOrders.length }}</span></div>
        <div class="stat-row"><span class="stat-label">已取消</span><span class="stat-value loss">{{ cancelledOrders.length }}</span></div>
        <div class="stat-row"><span class="stat-label">成交金額</span><span class="stat-value">${{ totalFilledValue }}</span></div>
      </div>
    </div>

    <!-- 篩選 -->
    <div class="filters">
      <select v-model="filters.status" @change="fetchOrders">
        <option value="">全部狀態</option>
        <option value="PENDING">待處理</option>
        <option value="FILLED">已完成</option>
        <option value="PARTIAL">部分成交</option>
        <option value="CANCELLED">已取消</option>
      </select>
      <input v-model="filters.symbol" placeholder="股票代號" @input="fetchOrders">
    </div>

    <!-- 訂單列表 -->
    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="orders.length === 0" class="empty">暫無訂單</div>
    <div v-else class="orders-table">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Symbol</th>
            <th>方向</th>
            <th>類型</th>
            <th>價格</th>
            <th>數量</th>
            <th>成交數</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in paginatedOrders" :key="order.id">
            <td class="order-id">{{ order.order_id }}</td>
            <td class="symbol">{{ order.symbol }}</td>
            <td>
              <span :class="['direction', order.direction]">
                {{ order.direction }}
              </span>
            </td>
            <td>{{ order.order_type }}</td>
            <td>${{ order.price || '市價' }}</td>
            <td>{{ order.quantity }}</td>
            <td>{{ order.filled_quantity || 0 }}</td>
            <td>
              <span :class="['status', order.status]">{{ order.status }}</span>
            </td>
            <td>
              <button class="btn-sm" @click="editOrder(order)">編輯</button>
              <button class="btn-sm danger" @click="deleteOrder(order.id)">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="orders-pagination" v-if="totalOrderPages > 1">
        <button :disabled="ordersPage===1" @click="ordersPage--" class="page-btn">‹</button>
        <span class="page-info">{{ ordersPage }}/{{ totalOrderPages }}（共{{ orders.length }}筆）</span>
        <button :disabled="ordersPage===totalOrderPages" @click="ordersPage++" class="page-btn">›</button>
      </div>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editingOrder ? '編輯訂單' : '新增訂單' }}</h3>
        <form @submit.prevent="saveOrder">
          <div class="form-group">
            <label>股票代號</label>
            <input v-model="form.symbol" placeholder="例如: AAPL" required>
          </div>
          <div class="form-group">
            <label>方向</label>
            <select v-model="form.direction" required>
              <option value="BUY">買入</option>
              <option value="SELL">賣出</option>
            </select>
          </div>
          <div class="form-group">
            <label>訂單類型</label>
            <select v-model="form.order_type" required>
              <option value="MARKET">市價單</option>
              <option value="LIMIT">限價單</option>
            </select>
          </div>
          <div class="form-group">
            <label>價格</label>
            <input v-model.number="form.price" type="number" step="0.01" placeholder="限價單價格 (市價單可留空)">
          </div>
          <div class="form-group">
            <label>數量</label>
            <input v-model.number="form.quantity" type="number" placeholder="數量" required>
          </div>
          <div class="form-group">
            <label>狀態</label>
            <select v-model="form.status">
              <option value="PENDING">待處理</option>
              <option value="FILLED">已完成</option>
              <option value="PARTIAL">部分成交</option>
              <option value="CANCELLED">已取消</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const API_URL = import.meta.env.VITE_API_URL
const { error } = useToast()

// Chart refs
const statusChartRef = ref(null)
const symbolChartRef = ref(null)
const typeChartRef = ref(null)
let statusChart = null, symbolChart = null, typeChart = null

const orders = ref([])
const loading = ref(true)
const showCharts = ref(false)
const ordersPage = ref(1)
const ORDERS_PAGE_SIZE = 15
const totalOrderPages = computed(() => Math.ceil(orders.value.length / ORDERS_PAGE_SIZE) || 1)
const paginatedOrders = computed(() => {
  const start = (ordersPage.value - 1) * ORDERS_PAGE_SIZE
  return orders.value.slice(start, start + ORDERS_PAGE_SIZE)
})
const filters = ref({
  status: '',
  symbol: ''
})

const showAddModal = ref(false)
const editingOrder = ref(null)
const form = ref({
  symbol: '',
  direction: 'BUY',
  order_type: 'MARKET',
  price: null,
  quantity: null,
  status: 'PENDING'
})

const fetchOrders = async () => {
  loading.value = true
  try {
    let url = `${API_URL}/paper/orders?limit=100`
    if (filters.value.status) url += `&status=${filters.value.status}`
    if (filters.value.symbol) url += `&symbol=${filters.value.symbol}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.orders) {
      orders.value = data.orders || []
      renderCharts()
    }
  } catch (err) {
    console.error('Fetch orders error:', err)
    error('載入訂單失敗')
  } finally {
    loading.value = false
  }
}

const saveOrder = async () => {
  try {
    const url = editingOrder.value 
      ? `${API_URL}/orders/${editingOrder.value.id}`
      : `${API_URL}/orders`
    const method = editingOrder.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    
    if (response.ok) {
      closeModal()
      fetchOrders()
    }
  } catch (err) {
    console.error('Save error:', err)
    error('保存訂單失敗')
  }
}

const editOrder = (order) => {
  editingOrder.value = order
  form.value = {
    symbol: order.symbol,
    direction: order.direction,
    order_type: order.order_type,
    price: order.price,
    quantity: order.quantity,
    status: order.status
  }
  showAddModal.value = true
}

const deleteOrder = async (id) => {
  if (!confirm('確定要刪除此訂單嗎？')) return
  
  try {
    await fetch(`${API_URL}/orders/${id}`, { method: 'DELETE' })
    fetchOrders()
  } catch (err) {
    console.error('Delete error:', err)
    error('刪除訂單失敗')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingOrder.value = null
  form.value = {
    symbol: '',
    direction: 'BUY',
    order_type: 'MARKET',
    price: null,
    quantity: null,
    status: 'PENDING'
  }
}

// Computed stats
const filledOrders = computed(() => orders.value.filter(o => o.status === 'filled'))
const cancelledOrders = computed(() => orders.value.filter(o => o.status === 'cancelled'))
const totalFilledValue = computed(() => {
  const total = filledOrders.value.reduce((sum, o) => sum + (parseFloat(o.filled_price||0) * parseFloat(o.filled_quantity||0)), 0)
  return total.toLocaleString('en-US', { maximumFractionDigits: 0 })
})

const renderCharts = async () => {
  await nextTick()
  const chartDefaults = {
    plugins: { legend: { labels: { color: '#8b949e', boxWidth: 10, font: { size: 11 } } } }
  }

  // 狀態圓餅圖
  if (statusChartRef.value) {
    if (statusChart) statusChart.destroy()
    const statusCount = {}
    orders.value.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1 })
    statusChart = new Chart(statusChartRef.value, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCount),
        datasets: [{ data: Object.values(statusCount), backgroundColor: ['#3fb950','#f85149','#d29922','#8b949e','#388bfd'], borderWidth: 0 }]
      },
      options: { ...chartDefaults, responsive: true, cutout: '65%' }
    })
  }

  // 各股票柱狀圖
  if (symbolChartRef.value) {
    if (symbolChart) symbolChart.destroy()
    const symCount = {}
    orders.value.forEach(o => {
      const sym = (o.symbol || '').replace('US.', '')
      symCount[sym] = (symCount[sym] || 0) + 1
    })
    const sorted = Object.entries(symCount).sort((a,b) => b[1]-a[1]).slice(0,8)
    symbolChart = new Chart(symbolChartRef.value, {
      type: 'bar',
      data: {
        labels: sorted.map(e => e[0]),
        datasets: [{ data: sorted.map(e => e[1]), backgroundColor: '#388bfd99', borderRadius: 3 }]
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#8b949e', font: { size: 10 } }, grid: { color: '#21262d' } },
          y: { ticks: { color: '#8b949e', stepSize: 1 }, grid: { color: '#21262d' } }
        }
      }
    })
  }

  // 買賣圓餅圖
  if (typeChartRef.value) {
    if (typeChart) typeChart.destroy()
    const buyCount = orders.value.filter(o => o.order_type === 'BUY').length
    const sellCount = orders.value.filter(o => o.order_type === 'SELL').length
    typeChart = new Chart(typeChartRef.value, {
      type: 'doughnut',
      data: {
        labels: ['買入', '賣出'],
        datasets: [{ data: [buyCount, sellCount], backgroundColor: ['#1f6feb', '#da3633'], borderWidth: 0 }]
      },
      options: { ...chartDefaults, responsive: true, cutout: '65%' }
    })
  }
}

// 顯示統計時才初始化 chart（v-if 讓 canvas DOM 此時才存在）
watch(showCharts, (val) => {
  if (val) renderCharts()
})

onMounted(() => {
  fetchOrders()
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

/* 可收合圖表 toggle */
.charts-toggle {
  margin-bottom: 8px;
}

.btn-toggle {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.btn-toggle:hover {
  background: var(--color-bg-secondary);
}

.charts-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
  height: 160px;
  overflow: hidden;
}
.chart-card {
  background: var(--bg-secondary, #161b22);
  border: 1px solid var(--border-default, #30363d);
  border-radius: 6px;
  padding: 8px;
}
.chart-title {
  font-size: 12px;
  font-weight: 600;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}
.stats-card { display: flex; flex-direction: column; justify-content: center; }
.stat-row { display: flex; justify-content: space-between; align-items: center; padding: 2px 0; border-bottom: 1px solid #21262d; }
.stat-row:last-child { border-bottom: none; }
.stat-label { font-size: 12px; color: #8b949e; }
.stat-value { font-size: 14px; font-weight: 700; font-family: 'SF Mono', monospace; color: #e6edf3; }
.profit { color: #3fb950 !important; }
.loss { color: #f85149 !important; }

.orders-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px; border-top: 1px solid #21262d; }
.page-btn { background: #21262d; border: 1px solid #30363d; color: #e6edf3; padding: 3px 10px; border-radius: 4px; cursor: pointer; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 12px; color: #8b949e; }
.orders-page {
  animation: fadeIn 0.3s ease;
  max-height: calc(100vh - 60px);
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-sm {
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background: #3b82f620;
  color: #3b82f6;
  margin-right: 4px;
}

.btn-sm.danger {
  background: #ef444420;
  color: #ef4444;
}

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.filters select, .filters input {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.orders-table {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 6px 12px !important;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  background: var(--color-bg-tertiary);
  font-weight: 600;
  font-size: 0.8125rem;
}

.order-id { 
  font-family: var(--font-mono); 
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}
.symbol { font-weight: 600; }

.direction {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.direction.BUY { background: rgba(31, 111, 235, 0.2); color: var(--color-buy); }
.direction.SELL { background: rgba(218, 54, 51, 0.2); color: var(--color-sell); }

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.status.PENDING { background: #f59e0b20; color: #f59e0b; }
.status.FILLED { background: #22c55e20; color: #22c55e; }
.status.PARTIAL { background: #3b82f620; color: #3b82f6; }
.status.CANCELLED { background: #ef444420; color: #ef4444; }

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-card);
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90%;
}

.modal h3 {
  margin-bottom: 20px;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  font-weight: 500;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
