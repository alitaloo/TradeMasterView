<template>
  <div class="stocks-page">
    <div class="page-header">
      <h1 class="page-title">📊 股票清單管理</h1>
      <button class="btn btn-primary" @click="showAddModal = true">
        <span>➕</span> 新增股票
      </button>
    </div>

    <!-- 摘要卡片 -->
    <div class="summary-cards">
      <div class="summary-card backtest">
        <div class="card-icon">📈</div>
        <div class="card-content">
          <div class="card-title">回測股票</div>
          <div class="card-value">{{ backtestCount }}</div>
        </div>
      </div>
      <div class="summary-card live">
        <div class="card-icon">💰</div>
        <div class="card-content">
          <div class="card-title">實盤股票</div>
          <div class="card-value">{{ liveCount }}</div>
        </div>
      </div>
    </div>

    <!-- Tab 導航 -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'backtest' }"
        @click="activeTab = 'backtest'"
      >
        📈 回測股票 ({{ backtestCount }})
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'live' }"
        @click="activeTab = 'live'"
      >
        💰 實盤股票 ({{ liveCount }})
      </button>
    </div>

    <!-- 載入狀態 -->
    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <!-- 股票表格 -->
    <div v-else class="stocks-table-container">
      <table class="stocks-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>名稱</th>
            <th>需要回測</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stock in filteredStocks" :key="stock.id">
            <td class="symbol">{{ stock.symbol }}</td>
            <td>{{ stock.name }}</td>
            <td v-if="stock.type === 'live'">
              <button 
                class="action-btn" 
                :class="{ 'backtest-flag': stock.needsBacktest }"
                @click="toggleNeedsBacktest(stock)"
              >
                {{ stock.needsBacktest ? '✅ 是' : '⬜ 否' }}
              </button>
            </td>
            <td v-else></td>
            <td>
              <span class="status-badge" :class="stock.enabled ? 'enabled' : 'disabled'">
                {{ stock.enabled ? '啟用' : '停用' }}
              </span>
            </td>
            <td class="actions">
              <button class="action-btn" @click="editStock(stock)">✏️ 編輯</button>
              <button class="action-btn" @click="toggleStock(stock)">
                {{ stock.enabled ? '⏸️ 停用' : '▶️ 啟用' }}
              </button>
              <button class="action-btn danger" @click="deleteStock(stock)">🗑️ 刪除</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredStocks.length === 0" class="empty-state">
        暫無股票
      </div>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>{{ showEditModal ? '編輯股票' : '新增股票' }}</h2>
        <form @submit.prevent="saveStock">
          <div class="form-group">
            <label>股票代號 *</label>
            <input v-model="formData.symbol" required placeholder="例如: AAPL" maxlength="10">
          </div>
          <div class="form-group">
            <label>名稱</label>
            <input v-model="formData.name" placeholder="例如: Apple Inc.">
          </div>
          <!-- 新增時隱藏類型選擇（只能是實盤股票） -->
          <div v-if="showEditModal" class="form-group">
            <label>類型</label>
            <select v-model="formData.type" disabled>
              <option value="live">💰 實盤股票</option>
            </select>
            <small style="color: var(--color-text-muted);">（股票類型不可修改）</small>
          </div>
          <div class="form-group" v-if="showEditModal && formData.type === 'live'">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.needsBacktest">
              需要回測
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="formData.enabled">
              啟用
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_API_URL
const { error: showError } = useToast()
const stocks = ref([])
const loading = ref(true)
const error = ref(null)
const activeTab = ref('backtest')
const showAddModal = ref(false)
const showEditModal = ref(false)
const formData = ref({
  symbol: '',
  name: '',
  type: 'live',  // 默認是實盤股票
  enabled: true,
  needsBacktest: false  // 是否需要回測
})

// 回測股票 = 實盤股票中標記為需要回測的
const backtestCount = computed(() => stocks.value.filter(s => s.type === 'live' && s.needsBacktest && s.enabled).length)
// 實盤股票 = 所有實盤股票
const liveCount = computed(() => stocks.value.filter(s => s.type === 'live' && s.enabled).length)

const filteredStocks = computed(() => {
  if (activeTab.value === 'backtest') {
    // 回測股票 tab：顯示需要回測的實盤股票
    return stocks.value.filter(s => s.type === 'live' && s.needsBacktest)
  } else {
    // 實盤股票 tab：顯示所有實盤股票
    return stocks.value.filter(s => s.type === 'live')
  }
})

const fetchStocks = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await fetch(`${API_URL}/stocks`)
    if (!response.ok) throw new Error('獲取股票失敗')
    const data = await response.json()
    stocks.value = data.stocks || []
  } catch (err) {
    error.value = err.message
    console.error('Fetch stocks error:', err)
    showError('載入股票失敗，請稍後重試')
    // 使用備用數據
    stocks.value = [
      { id: 'bt_001', symbol: 'TSLA', name: 'Tesla Inc.', type: 'backtest', enabled: true },
      { id: 'bt_002', symbol: 'AAPL', name: 'Apple Inc.', type: 'backtest', enabled: true },
      { id: 'bt_003', symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'backtest', enabled: true },
      { id: 'lv_001', symbol: 'AAPL', name: 'Apple Inc.', type: 'live', enabled: true },
      { id: 'lv_002', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'live', enabled: true },
    ]
  } finally {
    loading.value = false
  }
}

const editStock = (stock) => {
  formData.value = { ...stock, needsBacktest: stock.needsBacktest || false }
  showEditModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  formData.value = { symbol: '', name: '', type: 'live', enabled: true, needsBacktest: false }
}

const toggleNeedsBacktest = async (stock) => {
  try {
    await fetch(`${API_URL}/stocks/${stock.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ needsBacktest: !stock.needsBacktest })
    })
    await fetchStocks()
  } catch (err) {
    console.error('Toggle needsBacktest error:', err)
  }
}

const saveStock = async () => {
  try {
    if (showEditModal.value && formData.value.id) {
      await fetch(`${API_URL}/stocks/${formData.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.value)
      })
    } else {
      await fetch(`${API_URL}/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.value)
      })
    }
    await fetchStocks()
    closeModal()
  } catch (err) {
    console.error('Save stock error:', err)
    // 顯示具體錯誤訊息
    const errorMsg = err.message || '儲存股票失敗'
    alert(`錯誤：${errorMsg}`)
    error.value = errorMsg
  }
}

const toggleStock = async (stock) => {
  try {
    await fetch(`${API_URL}/stocks/${stock.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !stock.enabled })
    })
    await fetchStocks()
  } catch (err) {
    console.error('Toggle stock error:', err)
  }
}

const deleteStock = async (stock) => {
  if (!confirm(`確定要刪除 ${stock.symbol} 嗎？`)) return
  
  try {
    await fetch(`${API_URL}/stocks/${stock.id}`, {
      method: 'DELETE'
    })
    await fetchStocks()
  } catch (err) {
    console.error('Delete stock error:', err)
    error.value = '刪除股票失敗'
  }
}

onMounted(fetchStocks)
</script>

<style scoped>
.stocks-page {
  animation: fadeIn 0.3s ease;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.summary-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.summary-card.backtest {
  border-left: 4px solid var(--color-accent);
}

.summary-card.live {
  border-left: 4px solid var(--color-success);
}

.card-icon {
  font-size: 2rem;
}

.card-title {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}

.tab {
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.9375rem;
  color: var(--color-text-muted);
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--color-text);
}

.tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.stocks-table-container {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.stocks-table {
  width: 100%;
  border-collapse: collapse;
}

.stocks-table th,
.stocks-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.stocks-table th {
  background: var(--color-bg-tertiary);
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
}

.stocks-table td {
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.stocks-table tr:last-child td {
  border-bottom: none;
}

.symbol {
  font-weight: 600;
  font-family: var(--font-mono);
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.enabled {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.status-badge.disabled {
  background: rgba(107, 114, 128, 0.1);
  color: var(--color-text-muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  font-size: 0.8125rem;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-primary);
}

.action-btn:hover {
  background: var(--color-border-light);
}

.action-btn.backtest-flag {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}

.error {
  color: var(--color-danger);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 90%;
  max-width: 400px;
}

.modal h2 {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.modal-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
}

.modal-actions button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.modal-actions button[type="submit"],
.modal-actions .btn-primary {
  background: var(--color-accent);
  color: white;
}
</style>
