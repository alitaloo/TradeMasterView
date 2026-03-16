<template>
  <div class="signals-page">
    <div class="page-header">
      <h1 class="page-title">📈 交易信號</h1>
      <div class="header-actions">
        <FreshnessIndicator :timestamp="signalsTimestamp" />
        <button class="btn btn-primary" @click="fetchSignals">
          <span>🔄</span> 刷新
        </button>
      </div>
    </div>

    <!-- 摘要卡片 -->
    <div class="summary-cards">
      <div class="summary-card pending">
        <div class="card-icon">⏳</div>
        <div class="card-content">
          <div class="card-title">待處理</div>
          <div class="card-value">{{ summary.PENDING || 0 }}</div>
        </div>
      </div>
      <div class="summary-card sent">
        <div class="card-icon">📤</div>
        <div class="card-content">
          <div class="card-title">已發送</div>
          <div class="card-value">{{ summary.SENT || 0 }}</div>
        </div>
      </div>
      <div class="summary-card ignored">
        <div class="card-icon">⏭️</div>
        <div class="card-content">
          <div class="card-title">已忽略</div>
          <div class="card-value">{{ summary.IGNORED || 0 }}</div>
        </div>
      </div>
      <div class="summary-card cancelled">
        <div class="card-icon">❌</div>
        <div class="card-content">
          <div class="card-title">已取消</div>
          <div class="card-value">{{ summary.CANCELLED || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- 篩選 -->
    <div class="filters">
      <select v-model="filters.status" @change="currentPage = 1; fetchSignals()">
        <option value="">全部狀態</option>
        <option value="PENDING">待處理</option>
        <option value="SENT">已發送</option>
        <option value="IGNORED">已忽略</option>
        <option value="CANCELLED">已取消</option>
      </select>
      <input v-model="filters.symbol" placeholder="股票代號" @input="currentPage = 1; fetchSignals()">
    </div>

    <!-- 分頁 -->
    <div v-if="totalPages > 1" class="pagination">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="goToPage(1)"
      >««</button>
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >«</button>
      
      <span class="page-info">
        第 {{ currentPage }} / {{ totalPages }} 頁
        (共 {{ totalCount }} 筆)
      </span>
      
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >»</button>
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="goToPage(totalPages)"
      >»»</button>
    </div>

    <!-- 信號列表 -->
    <div v-if="loading" class="loading">載入中...</div>
    <div v-else-if="signals.length === 0" class="empty">暫無信號</div>
    <div v-else class="signals-table">
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>類型</th>
            <th>信號</th>
            <th>價格</th>
            <th>信心度</th>
            <th>狀態</th>
            <th>時間</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="signal in signals" :key="signal.id">
            <td class="symbol">{{ signal.symbol }}</td>
            <td>{{ signal.strategy_type || '-' }}</td>
            <td>
              <span :class="['signal-type', signal.signal_type]">
                {{ signal.signal_type }}
              </span>
            </td>
            <td>{{ signal.price || '-' }}</td>
            <td>{{ (signal.confidence * 100).toFixed(0) || 0 }}%</td>
            <td>
              <span :class="['status', signal.status]">{{ signal.status }}</span>
            </td>
            <td>{{ formatTime(signal.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import FreshnessIndicator from '../components/FreshnessIndicator.js'
import { formatTaipei } from '../utils/datetime.js'

const API_URL = import.meta.env.VITE_API_URL
const { error } = useToast()
const signals = ref([])
const signalsTimestamp = ref(null)
const loading = ref(true)
const summary = ref({})
const filters = ref({
  status: '',
  symbol: ''
})

// 分頁
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const fetchSignals = async () => {
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    let url = `${API_URL}/signals?limit=${pageSize.value}&offset=${offset}`
    if (filters.value.status) url += `&status=${filters.value.status}`
    if (filters.value.symbol) url += `&symbol=${filters.value.symbol}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === 'ok') {
      signals.value = data.signals || []
      totalCount.value = data.count || 0
      signalsTimestamp.value = data.data_timestamp || null
    }
    
    // 獲取摘要
    const summaryRes = await fetch(`${API_URL}/signals/summary`)
    const summaryData = await summaryRes.json()
    if (summaryData.status === 'ok') {
      summary.value = summaryData.summary.by_status || {}
    }
  } catch (err) {
    console.error('Fetch signals error:', err)
    error('載入信號失敗，請稍後重試')
  } finally {
    loading.value = false
  }
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    fetchSignals()
  }
}

const formatTime = (timestamp) => {
  return formatTaipei(timestamp)
}

onMounted(() => {
  fetchSignals()
})
</script>

<style scoped>
.signals-page {
  animation: fadeIn 0.3s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header .header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.summary-card.pending { border-left: 4px solid #f59e0b; }
.summary-card.sent { border-left: 4px solid #3b82f6; }
.summary-card.ignored { border-left: 4px solid #6b7280; }
.summary-card.cancelled { border-left: 4px solid #ef4444; }

.card-icon { font-size: 1.5rem; }
.card-title { font-size: 0.875rem; color: var(--color-text-secondary); }
.card-value { font-size: 1.5rem; font-weight: 700; }

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

.signals-table {
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

.symbol { font-weight: 600; }

.signal-type {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.signal-type.BUY { background: #22c55e20; color: #22c55e; }
.signal-type.SELL { background: #ef444420; color: #ef4444; }

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.status.PENDING { background: #f59e0b20; color: #f59e0b; }
.status.SENT { background: #3b82f620; color: #3b82f6; }
.status.IGNORED { background: #6b728020; color: #6b7280; }
.status.CANCELLED { background: #ef444420; color: #ef4444; }

.loading, .empty {
  text-align: center;
  padding: 40px;
  color: var(--color-text-muted);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
  padding: 16px;
}

.page-btn {
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: 8px 16px;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.freshness-indicator {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.freshness-indicator.fresh {
  background: rgba(78, 204, 163, 0.2);
  color: var(--color-success);
}

.freshness-indicator.normal {
  background: rgba(78, 204, 163, 0.1);
  color: var(--color-success);
}

.freshness-indicator.stale {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.freshness-indicator.outdated {
  background: rgba(255, 71, 87, 0.2);
  color: var(--color-danger);
}

.freshness-indicator.unknown {
  background: var(--color-bg-tertiary);
  color: var(--color-text-muted);
}
</style>
