<template>
  <div class="strategies-page">
    <div class="page-header">
      <h1 class="page-title">⚙️ 策略管理</h1>
      <button class="btn btn-primary" @click="showAddModal = true">
        <span>➕</span> 新增策略
      </button>
    </div>
    
    <!-- 搜尋框 -->
    <div class="search-box">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="🔍 搜尋策略名稱或參數..."
        class="search-input"
      >
      <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
    </div>
    
    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else class="strategies-container">
      <!-- 搜尋結果提示 -->
      <div v-if="searchQuery" class="search-results-info">
        找到 {{ filteredStrategies.length }} 個結果
      </div>
      <div class="strategies-grid">
        <div 
          v-for="strategy in paginatedStrategies" 
          :key="strategy.id"
          class="strategy-card"
          :class="{ disabled: !strategy.enabled }"
        >
          <div class="strategy-header">
            <h3 class="strategy-name">{{ strategy.name }}</h3>
            <label class="toggle">
              <input 
                type="checkbox" 
                :checked="strategy.enabled"
                @change="toggleStrategy(strategy)"
              >
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="strategy-body">
            <div class="strategy-param">
              <span class="param-label">參數</span>
              <span class="param-value">{{ strategy.params }}</span>
            </div>
            <div class="strategy-perf">
              <div class="perf-item">
                <span class="perf-label">報酬</span>
                <span class="perf-value" :class="strategy.return >= 0 ? 'long' : 'short'">
                  {{ strategy.return >= 0 ? '+' : '' }}{{ strategy.return }}%
                </span>
              </div>
              <div class="perf-item">
                <span class="perf-label">夏普</span>
                <span class="perf-value">{{ strategy.sharpe }}</span>
              </div>
            </div>
          </div>
          
          <div class="strategy-footer">
            <button class="action-btn" @click="viewDetails(strategy)">📊 詳情</button>
            <button class="action-btn" @click="editStrategy(strategy)">✏️ 編輯</button>
          </div>
        </div>
      </div>
      
      <!-- 分頁控制 -->
      <div v-if="totalPages > 1" class="pagination">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="currentPage = 1"
        >
          ««
        </button>
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          «
        </button>
        <span class="page-info">
          第 {{ currentPage }} / {{ totalPages }} 頁
        </span>
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          »
        </button>
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage = totalPages"
        >
          »»
        </button>
      </div>
    </div>

    <!-- 新增/編輯 Modal -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <h2>{{ showEditModal ? '編輯策略' : '新增策略' }}</h2>
        <form @submit.prevent="saveStrategy">
          <div class="form-group">
            <label>策略名稱</label>
            <input v-model="formData.name" required>
          </div>
          <div class="form-group">
            <label>RSI 週期</label>
            <input v-model.number="formData.rsi_period" type="number">
          </div>
          <div class="form-group">
            <label>超賣</label>
            <input v-model.number="formData.oversold" type="number">
          </div>
          <div class="form-group">
            <label>超買</label>
            <input v-model.number="formData.overbought" type="number">
          </div>
          <div class="form-group">
            <label>停損 %</label>
            <input v-model.number="formData.stop_loss" type="number" step="0.01">
          </div>
          <div class="form-group">
            <label>止盈 %</label>
            <input v-model.number="formData.take_profit" type="number" step="0.01">
          </div>
          <div class="modal-actions">
            <button type="button" @click="closeModal">取消</button>
            <button type="submit" class="btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 詳情 Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click.self="showDetailsModal = false">
      <div class="modal">
        <h2>策略詳情</h2>
        <div class="details-content">
          <p><strong>名稱：</strong>{{ selectedStrategy?.name }}</p>
          <p><strong>RSI 週期：</strong>{{ selectedStrategy?.rsi_period }}</p>
          <p><strong>超賣/超買：</strong>{{ selectedStrategy?.oversold }}/{{ selectedStrategy?.overbought }}</p>
          <p><strong>停損/止盈：</strong>{{ selectedStrategy?.stop_loss }}% / {{ selectedStrategy?.take_profit }}%</p>
          <p><strong>報酬：</strong>{{ selectedStrategy?.return }}%</p>
          <p><strong>夏普比率：</strong>{{ selectedStrategy?.sharpe }}</p>
          <p><strong>狀態：</strong>{{ selectedStrategy?.enabled ? '啟用' : '停用' }}</p>
        </div>
        <div class="modal-actions">
          <button @click="showDetailsModal = false">關閉</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useToast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_API_URL
const { error: showToast } = useToast()
const strategies = ref([])
const loading = ref(true)
const error = ref(null)
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDetailsModal = ref(false)
const selectedStrategy = ref(null)
const currentPage = ref(1)
const ITEMS_PER_PAGE = 12
const searchQuery = ref('')
const formData = ref({
  name: '',
  rsi_period: 14,
  oversold: 35,
  overbought: 65,
  stop_loss: 0.05,
  take_profit: 0.10
})

const fetchStrategies = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await fetch(`${API_URL}/strategies`)
    if (!response.ok) throw new Error('獲取策略失敗')
    const data = await response.json()
    strategies.value = data.strategies || []
    currentPage.value = 1 // Reset to first page when fetching new data
  } catch (err) {
    error.value = err.message
    console.showToast('Fetch strategies error:', err)
    showToast('載入策略失敗')
    // 使用備用數據
    strategies.value = [
      { id: 1, name: 'Stooq_V2', params: 'RSI(7/35/80) SL=8% TP=10%', return: 67.7, sharpe: 139.2, enabled: true },
      { id: 2, name: 'Stooq_V2', params: 'RSI(14/35/65) SL=15% TP=20%', return: 109.3, sharpe: 105.5, enabled: true },
      { id: 3, name: 'Trend_Filtered', params: 'RSI(7/40/75) SMA(50/200)', return: 17.1, sharpe: 78.8, enabled: false },
      { id: 4, name: 'Test_Strategy', params: 'RSI(14/30/70) SL=10% TP=15%', return: 45.2, sharpe: 92.1, enabled: true },
      { id: 5, name: 'Another_Strategy', params: 'MACD(12,26,9)', return: -12.5, sharpe: 45.3, enabled: false },
      { id: 6, name: 'Volatility_Strategy', params: 'BB(20,2) SL=5% TP=8%', return: 28.9, sharpe: 67.4, enabled: true },
      { id: 7, name: 'Momentum_V1', params: 'RSI(21/35/75) SL=12% TP=18%', return: 56.1, sharpe: 88.7, enabled: true },
      { id: 8, name: 'Mean_Reversion', params: 'Z-Score(20)', return: 34.7, sharpe: 72.5, enabled: false },
      { id: 9, name: 'Breakout_Strategy', params: 'ATR(14) SL=2% TP=4%', return: 89.2, sharpe: 112.3, enabled: true },
      { id: 10, name: 'Swing_Trading', params: 'SMA(50) SL=8% TP=16%', return: 67.8, sharpe: 95.6, enabled: true },
      { id: 11, name: 'Day_Trade_V1', params: '5min RSI(7/20/80)', return: 45.3, sharpe: 78.9, enabled: false },
      { id: 12, name: 'Scalp_Strategy', params: 'Tick RSI(3/10/90)', return: 23.4, sharpe: 56.7, enabled: true },
      { id: 13, name: 'Extra_Strategy_1', params: 'Custom Config A', return: 15.6, sharpe: 42.3, enabled: true },
      { id: 14, name: 'Extra_Strategy_2', params: 'Custom Config B', return: -8.9, sharpe: 31.2, enabled: false }
    ]
    currentPage.value = 1
  } finally {
    loading.value = false
  }
}

// Pagination computed properties
const totalPages = computed(() => {
  return Math.ceil(filteredStrategies.value.length / ITEMS_PER_PAGE) || 1
})

const filteredStrategies = computed(() => {
  if (!searchQuery.value.trim()) {
    return strategies.value
  }
  
  const query = searchQuery.value.toLowerCase().trim()
  
  return strategies.value.filter(strategy => {
    // 搜尋策略名稱
    if (strategy.name && strategy.name.toLowerCase().includes(query)) {
      return true
    }
    // 搜尋參數
    if (strategy.params && strategy.params.toLowerCase().includes(query)) {
      return true
    }
    return false
  })
})

const paginatedStrategies = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return filteredStrategies.value.slice(start, end)
})

const toggleStrategy = async (strategy) => {
  strategy.enabled = !strategy.enabled
  try {
    await fetch(`${API_URL}/strategies/${strategy.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: strategy.enabled })
    })
  } catch (err) {
    console.showToast('Toggle strategy error:', err)
    showToast('切換策略狀態失敗')
  }
}

const viewDetails = (strategy) => {
  selectedStrategy.value = strategy
  showDetailsModal.value = true
}

const editStrategy = (strategy) => {
  selectedStrategy.value = strategy
  formData.value = { ...strategy }
  showEditModal.value = true
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  showDetailsModal.value = false
  formData.value = { name: '', rsi_period: 14, oversold: 35, overbought: 65, stop_loss: 0.05, take_profit: 0.10 }
}

const saveStrategy = async () => {
  try {
    if (showEditModal.value) {
      await fetch(`${API_URL}/strategies/${selectedStrategy.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.value)
      })
    } else {
      await fetch(`${API_URL}/strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.value)
      })
    }
    await fetchStrategies()
    closeModal()
  } catch (err) {
    console.showToast('Save strategy error:', err)
    error.value = '儲存策略失敗'
    showToast('保存策略失敗')
  }
}

onMounted(fetchStrategies)
</script>

<style scoped>
/* 強制所有文字為白色 */
.strategies-page,
.strategies-page * {
  color: #ffffff !important;
}

.strategies-page {
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
  color: #ffffff !important;
}

/* 搜尋框樣式 */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  position: relative;
}

.search-input {
  flex: 1;
  padding: 12px 16px 12px 44px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 0.9375rem;
  color: #ffffff !important;
  transition: all var(--transition-fast);
}

.search-input::placeholder {
  color: var(--color-text-muted) !important;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.1);
}

.search-box::before {
  content: '🔍';
  position: absolute;
  left: 14px;
  font-size: 1rem;
  pointer-events: none;
}

.clear-btn {
  position: absolute;
  right: 12px;
  padding: 4px 8px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-muted) !important;
  transition: all var(--transition-fast);
}

.clear-btn:hover {
  background: var(--color-accent);
  color: #ffffff !important;
  border-color: var(--color-accent);
}

.search-results-info {
  padding: 12px 16px;
  background: rgba(233, 69, 96, 0.1);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: var(--radius-md);
  color: var(--color-accent) !important;
  font-size: 0.875rem;
  margin-bottom: 16px;
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.strategy-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  transition: all var(--transition-fast);
}

.strategy-card:hover {
  border-color: var(--color-accent);
}

.strategy-card.disabled {
  opacity: 0.6;
}

.strategy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.strategy-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #ffffff !important;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--color-bg-tertiary);
  border-radius: 24px;
  transition: var(--transition-fast);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: var(--transition-fast);
}

.toggle input:checked + .toggle-slider {
  background: var(--color-success);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(24px);
}

.strategy-body {
  margin-bottom: 16px;
}

.strategy-param {
  margin-bottom: 12px;
}

.param-label {
  display: block;
  font-size: 0.75rem;
  color: #ffffff !important;
  margin-bottom: 4px;
}

.param-value {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: #ffffff !important;
}

.strategy-perf {
  display: flex;
  gap: 24px;
}

.perf-item {
  display: flex;
  flex-direction: column;
}

.perf-label {
  font-size: 0.75rem;
  color: #ffffff !important;
}

.perf-value {
  font-weight: 600;
  color: #ffffff !important;
}

.strategy-footer {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.8125rem;
  background: var(--color-bg-tertiary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  color: #ffffff !important;
}

.action-btn:hover {
  background: var(--color-border-light);
}

.loading, .error {
  text-align: center;
  padding: 40px;
  color: #ffffff !important;
}

.error {
  color: #ff4757 !important;
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
  color: #ffffff !important;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.875rem;
  color: #ffffff !important;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  color: #ffffff !important;
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
  color: #ffffff !important;
}

.modal-actions button[type="submit"],
.modal-actions .btn-primary {
  background: var(--color-accent);
  color: white !important;
}

.details-content p {
  margin-bottom: 12px;
  color: #ffffff !important;
}

/* 分頁樣式 */
.strategies-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: var(--color-bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.page-btn {
  padding: 8px 14px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: #ffffff !important;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.page-btn:hover:not(:disabled) {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 0 16px;
  font-size: 0.875rem;
  color: #ffffff !important;
}
</style>
