<template>
  <div class="orders-page">
    <div class="page-header">
      <h1 class="page-title">📋 訂單管理</h1>
      <button class="btn btn-primary" @click="showAddModal = true">
        <span>+</span> 新增訂單
      </button>
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
          <tr v-for="order in orders" :key="order.id">
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
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_API_URL
const { error } = useToast()
const orders = ref([])
const loading = ref(true)
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

onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.orders-page {
  animation: fadeIn 0.3s ease;
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
  gap: 12px;
  margin-bottom: 20px;
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
  padding: 12px 16px;
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

.direction.BUY { background: #22c55e20; color: #22c55e; }
.direction.SELL { background: #ef444420; color: #ef4444; }

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
