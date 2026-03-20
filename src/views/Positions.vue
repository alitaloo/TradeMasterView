<template>
  <div class="positions-page">
    <div class="page-header">
      <h1 class="page-title">💼 持倉管理</h1>
      <button class="btn btn-primary" @click="showAddModal = true">
        <span>+</span> 新增持倉
      </button>
    </div>

    <!-- 摘要卡片 -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="card-icon">💰</div>
        <div class="card-content">
          <div class="card-title">總市值</div>
          <div class="card-value">${{ formatNumber(summary.total_value) }}</div>
        </div>
      </div>
      <div class="summary-card clickable" @click="showConfigModal = true">
        <div class="card-icon">📊</div>
        <div class="card-content">
          <div class="card-title">總資金 <span class="edit-hint">✏️</span></div>
          <div class="card-value">${{ formatNumber(summary.total_capital) }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon">💵</div>
        <div class="card-content">
          <div class="card-title">可用資金</div>
          <div class="card-value">${{ formatNumber(summary.available_cash) }}</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="card-icon">📈</div>
        <div class="card-content">
          <div class="card-title">浮動損益</div>
          <div class="card-value" :class="summary.unrealized_pnl >= 0 ? 'profit' : 'loss'">
            ${{ formatNumber(summary.unrealized_pnl) }} ({{ summary.return_pct?.toFixed(2) }}%)
          </div>
        </div>
      </div>
    </div>

    <!-- 持倉列表 -->
    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="positions.length === 0" class="empty">暫無持倉</div>
    <div v-else class="positions-table">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>狀態</th>
            <th>買入均價</th>
            <th>當前股數</th>
            <th>當前市值</th>
            <th>浮動損益</th>
            <th>報酬率</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pos in positions" :key="pos.id">
            <td class="symbol">{{ pos.symbol }}</td>
            <td>
              <span :class="['status', pos.status]">{{ pos.status }}</span>
            </td>
            <td>${{ pos.avg_price?.toFixed(2) || '-' }}</td>
            <td>{{ pos.quantity || 0 }}</td>
            <td>${{ formatNumber(pos.quantity * pos.current_price) }}</td>
            <td :class="(pos.pnl || 0) >= 0 ? 'profit' : 'loss'">
              ${{ formatNumber(pos.pnl) }}
            </td>
            <td :class="(pos.pnl_pct || 0) >= 0 ? 'profit' : 'loss'">
              {{ (pos.pnl_pct || 0).toFixed(2) }}%
            </td>
            <td>
              <button class="btn-sm" @click="editPosition(pos)">編輯</button>
              <button class="btn-sm danger" @click="deletePosition(pos.symbol)">刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editingPosition ? '編輯持倉' : '新增持倉' }}</h3>
        <form @submit.prevent="savePosition">
          <div class="form-group">
            <label>股票代號</label>
            <select v-model="form.symbol" @change="onStockChange" :disabled="!!editingPosition" required>
              <option value="">選擇股票</option>
              <option v-for="stock in stocks" :key="stock.symbol" :value="stock.symbol">
                {{ stock.symbol }} - {{ stock.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>買入均價</label>
            <input v-model.number="form.average_cost" type="number" step="0.01" placeholder="買入均價" required>
          </div>
          <div class="form-group">
            <label>股數</label>
            <input v-model.number="form.current_quantity" type="number" placeholder="持有股數" required>
          </div>
          <div class="form-group">
            <label>狀態</label>
            <select v-model="form.status">
              <option value="WATCHING">觀察中</option>
              <option value="HOLDING">持有中</option>
              <option value="PARTIAL">部分持有</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 資金配置 Modal -->
    <div v-if="showConfigModal" class="modal-overlay" @click.self="showConfigModal = false">
      <div class="modal">
        <h3>💰 資金配置</h3>
        <form @submit.prevent="saveConfig">
          <div class="form-group">
            <label>總資金 ($)</label>
            <input v-model.number="configForm.total_capital" type="number" step="0.01" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showConfigModal = false">取消</button>
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
const positions = ref([])
const stocks = ref([])
const loading = ref(true)
const summary = ref({
  total_value: 0,
  total_capital: 0,
  unrealized_pnl: 0,
  return_pct: 0,
  position_count: 0
})

const showAddModal = ref(false)
const editingPosition = ref(null)
const form = ref({
  symbol: '',
  average_cost: null,
  current_quantity: null,
  status: 'HOLDING'
})

const showConfigModal = ref(false)
const configForm = ref({
  total_capital: 0
})

// 獲取 config
const fetchConfig = async () => {
  try {
    const res = await fetch(`${API_URL}/config/total_capital`)
    const data = await res.json()
    if (data.value) {
      configForm.value.total_capital = parseFloat(data.value)
    }
  } catch (err) {
    console.error('Fetch config error:', err)
    error('載入配置失敗')
  }
}

const fetchStocks = async () => {
  try {
    const res = await fetch(`${API_URL}/stocks/live`)
    const data = await res.json()
    stocks.value = data.stocks || []
  } catch (err) {
    console.error('Fetch stocks error:', err)
    error('載入股票列表失敗')
  }
}

const fetchPositions = async () => {
  loading.value = true
  try {
    // 不自動同步，只獲取持倉列表
    // await fetch(`${API_URL}/positions/sync`, { method: 'POST' })
    
    // 獲取持倉列表
    const response = await fetch(`${API_URL}/paper/positions`)
    const data = await response.json()
    
    if (data.positions) {
      positions.value = data.positions || []
    }
    
    // 獲取摘要
    const summaryRes = await fetch(`${API_URL}/paper/summary`)
    const summaryData = await summaryRes.json()
    if (summaryData.summary) {
      const s = summaryData.summary
      summary.value = {
        total_value: s.market_value || 0,
        total_capital: s.total || 0,
        available_cash: s.cash || 0,
        unrealized_pnl: s.unrealized_pnl || 0,
        return_pct: s.unrealized_pnl_pct || 0,
        position_count: s.position_count || 0
      }
    }
  } catch (err) {
    console.error('Fetch positions error:', err)
    error('載入持倉失敗，請稍後重試')
  } finally {
    loading.value = false
  }
}

const onStockChange = async () => {
  if (!form.value.symbol) return
  
  // 自動獲取最新價格
  try {
    const res = await fetch(`${API_URL}/kline?symbol=US.${form.value.symbol}&interval=1d&limit=1`)
    const data = await res.json()
    if (data.kline && data.kline.length > 0) {
      form.value.average_cost = data.kline[0].close
    }
  } catch (err) {
    console.error('Fetch price error:', err)
  }
}

const savePosition = async () => {
  try {
    const url = editingPosition.value 
      ? `${API_URL}/positions/${form.value.symbol}`
      : `${API_URL}/positions`
    const method = editingPosition.value ? 'PUT' : 'POST'
    
    // 轉換欄位名稱 to match API
    const payload = {
      symbol: form.value.symbol,
      avg_price: form.value.average_cost,
      quantity: form.value.current_quantity,
      current_price: form.value.average_cost,  // 預設=買入均價
      status: form.value.status
    }
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (response.ok) {
      closeModal()
      fetchPositions()
    }
  } catch (err) {
    console.error('Save error:', err)
  }
}

const editPosition = (pos) => {
  editingPosition.value = pos
  form.value = {
    symbol: pos.symbol,
    average_cost: pos.avg_price,
    current_quantity: pos.quantity,
    status: pos.status
  }
  showAddModal.value = true
}

const deletePosition = async (symbol) => {
  if (!confirm(`確定要刪除 ${symbol} 持倉嗎？`)) return
  
  try {
    await fetch(`${API_URL}/positions/${symbol}`, { method: 'DELETE' })
    fetchPositions()
  } catch (err) {
    console.error('Delete error:', err)
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingPosition.value = null
  form.value = {
    symbol: '',
    average_cost: null,
    current_quantity: null,
    status: 'HOLDING'
  }
}

const saveConfig = async () => {
  try {
    await fetch(`${API_URL}/config/total_capital`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: configForm.value.total_capital })
    })
    showConfigModal.value = false
    fetchPositions()
  } catch (err) {
    console.error('Save config error:', err)
  }
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => {
  fetchStocks()
  fetchPositions()
  fetchConfig()
})
</script>

<style scoped>
.positions-page { animation: fadeIn 0.3s ease; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-title { font-size: 1.5rem; font-weight: 700; }
.btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
.btn-primary { background: #3b82f6; color: white; }
.btn-secondary { background: #6b7280; color: white; }
.btn-sm { padding: 4px 8px; border-radius: 4px; border: none; cursor: pointer; background: #3b82f620; color: #3b82f6; margin-right: 4px; }
.btn-sm.danger { background: #ef444420; color: #ef4444; }
.summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
.summary-card { display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.summary-card.clickable { cursor: pointer; transition: background 0.2s; }
.summary-card.clickable:hover { background: var(--color-bg-tertiary); }
.edit-hint { font-size: 0.75rem; opacity: 0.5; }
.card-icon { font-size: 1.5rem; }
.card-title { font-size: 0.875rem; color: var(--color-text-secondary); }
.card-value { font-size: 1.25rem; font-weight: 700; }
.card-value.profit { color: #22c55e; }
.card-value.loss { color: #ef4444; }
.positions-table { background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--color-border); }
th { background: var(--color-bg-tertiary); font-weight: 600; font-size: 0.8125rem; }
.symbol { font-weight: 600; }
.profit { color: #22c55e; }
.loss { color: #ef4444; }
.status { padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; }
.status.WATCHING { background: #6b728020; color: #6b7280; }
.status.HOLDING { background: #22c55e20; color: #22c55e; }
.status.PARTIAL { background: #f59e0b20; color: #f59e0b; }
.loading, .empty { text-align: center; padding: 40px; color: var(--color-text-muted); }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: var(--color-bg-card); border-radius: 12px; padding: 24px; width: 400px; max-width: 90%; }
.modal h3 { margin-bottom: 20px; font-size: 1.25rem; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 0.875rem; font-weight: 500; }
.form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg-tertiary); color: var(--color-text-primary); }
.form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
</style>
