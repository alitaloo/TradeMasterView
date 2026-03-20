<template>
  <div class="signals-page">
    <div class="page-header">
      <h1 class="page-title">交易信號</h1>
      <div class="header-actions">
        <FreshnessIndicator :timestamp="signalsTimestamp" />
        <button class="btn btn-secondary" @click="fetchSignals">
          <span>🔄</span> 刷新
        </button>
      </div>
    </div>

    <!-- 摘要 Badge - 一行排列 -->
    <div class="summary-badges">
      <span class="badge pending">⏳ 待處理: {{ summary.PENDING || 0 }}</span>
      <span class="badge sent">📤 已發送: {{ summary.SENT || 0 }}</span>
      <span class="badge ignored">⏭️ 已忽略: {{ summary.IGNORED || 0 }}</span>
      <span class="badge cancelled">❌ 已取消: {{ summary.CANCELLED || 0 }}</span>
    </div>

    <!-- 篩選 -->
    <div class="filters">
      <select v-model="filters.status" @change="currentPage = 1; fetchSignals()" class="select">
        <option value="">全部狀態</option>
        <option value="PENDING">待處理</option>
        <option value="SENT">已發送</option>
        <option value="IGNORED">已忽略</option>
        <option value="CANCELLED">已取消</option>
      </select>
      <input v-model="filters.symbol" placeholder="股票代號" class="input" @input="currentPage = 1; fetchSignals()">
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
            <td class="number">{{ signal.price || '-' }}</td>
            <td class="number">{{ (signal.confidence * 100).toFixed(0) || 0 }}%</td>
            <td>
              <span :class="['status', signal.status]">{{ signal.status }}</span>
            </td>
            <td class="time">{{ formatTime(signal.created_at) }}</td>
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

/* 摘要 Badge 一行排列 */
.summary-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
}

.badge.pending { color: var(--color-warning); border-color: var(--color-warning); }
.badge.sent { color: var(--color-accent); border-color: var(--color-accent); }
.badge.ignored { color: var(--color-hold); border-color: var(--color-hold); }
.badge.cancelled { color: var(--color-loss); border-color: var(--color-loss); }

.signals-page {
  animation: fadeIn 0.3s ease;
  max-height: calc(100vh - 68px);
  overflow-y: auto;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.page-header .header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.page-title {
  font-size: var(--text-xl);
  font-weight: 700;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.summary-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}

.summary-card.pending { border-left: 3px solid var(--color-warning); }
.summary-card.sent { border-left: 3px solid var(--color-accent); }
.summary-card.ignored { border-left: 3px solid var(--color-hold); }
.summary-card.cancelled { border-left: 3px solid var(--color-loss); }

.card-icon { font-size: var(--text-xl); }
.card-title { font-size: var(--text-sm); color: var(--text-secondary); }
.card-value { font-size: var(--text-2xl); font-weight: 700; font-family: var(--font-mono); }

.filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.filters select, .filters input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.signals-table {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: auto;
  max-height: calc(100vh - 170px);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 6px 12px !important;
  text-align: left;
  border-bottom: 1px solid var(--border-muted);
}

th {
  background: var(--bg-tertiary);
  font-weight: 600;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.symbol { 
  font-weight: 600; 
  font-family: var(--font-mono);
}

.number {
  font-family: var(--font-mono);
}

.time {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.signal-type {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
}

.signal-type.BUY { 
  background: rgba(31, 111, 235, 0.2); 
  color: var(--color-buy); 
}

.signal-type.SELL { 
  background: rgba(218, 54, 51, 0.2); 
  color: var(--color-sell); 
}

.signal-type.HOLD { 
  background: rgba(110, 118, 129, 0.2); 
  color: var(--color-hold); 
}

.status {
  display: inline-block;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.status.PENDING { background: rgba(210, 153, 34, 0.2); color: var(--color-warning); }
.status.SENT { background: rgba(56, 139, 253, 0.2); color: var(--color-accent); }
.status.IGNORED { background: rgba(110, 118, 129, 0.2); color: var(--color-hold); }
.status.CANCELLED { background: rgba(248, 81, 73, 0.2); color: var(--color-loss); }

.loading, .empty {
  text-align: center;
  padding: var(--space-6);
  color: var(--text-muted);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-5);
  padding: var(--space-4);
}

.page-btn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: var(--text-sm);
}

.page-btn:hover:not(:disabled) {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  padding: var(--space-2) var(--space-4);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.freshness-indicator {
  font-size: var(--text-xs);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.freshness-indicator.fresh {
  background: rgba(63, 185, 80, 0.2);
  color: var(--color-profit);
}

.freshness-indicator.normal {
  background: rgba(63, 185, 80, 0.1);
  color: var(--color-profit);
}

.freshness-indicator.stale {
  background: rgba(210, 153, 34, 0.2);
  color: var(--color-warning);
}

.freshness-indicator.outdated {
  background: rgba(248, 81, 73, 0.2);
  color: var(--color-loss);
}

.freshness-indicator.unknown {
  background: var(--bg-tertiary);
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>