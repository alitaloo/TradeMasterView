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

    <!-- 帳戶類型 Tab -->
    <div class="account-tabs">
      <button :class="['account-tab', accountType==='paper'?'active':'']" @click="switchAccountType('paper')">
        📊 模擬交易
      </button>
      <button :class="['account-tab', accountType==='live'?'active':'']" @click="switchAccountType('live')">
        💰 真實交易
      </button>
    </div>

    <!-- 真實交易警示 -->
    <div v-if="accountType==='live'" class="live-signal-banner">
      ⚠️ 真實交易信號 — 僅顯示信心度 ≥75% 且符合真實風控條件的信號
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
            <th>詳情</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="signal in signals" :key="signal.id">
            <tr>
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
              <td>
                <button class="btn-detail" @click="signal._expanded = !signal._expanded">
                  📊 {{ signal._expanded ? '▲' : '▼' }}
                </button>
              </td>
            </tr>
            <!-- 詳情展開面板 -->
            <tr v-if="signal._expanded" class="detail-row">
              <td colspan="99" class="detail-cell">
                <div class="signal-detail">
                  <!-- 多時間框架 -->
                  <div class="detail-section">
                    <div class="detail-label">多時間框架共識</div>
                    <div class="tf-badges">
                      <template v-for="(val, tf) in (signal._meta?.tf_signals || {})" :key="tf">
                        <span v-if="tf !== 'consensus' && tf !== 'method'" :class="['tf-badge', val?.toLowerCase()]">
                          {{ tf }}: {{ val }}
                        </span>
                      </template>
                      <span class="tf-arrow">→</span>
                      <span :class="['consensus-badge', (signal._meta?.tf_signals?.consensus || '').toLowerCase()]">
                        共識: {{ signal._meta?.tf_signals?.consensus || '-' }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- 信心度組成 -->
                  <div class="detail-section" v-if="signal._meta?.confidence_components?.length">
                    <div class="detail-label">信心度組成</div>
                    <div class="comp-list">
                      <span v-for="comp in signal._meta.confidence_components" :key="comp"
                        :class="['comp-item', comp.includes('aligned') || comp.includes('consensus') ? 'positive' : 'neutral']">
                        {{ comp.includes('aligned') || comp.includes('consensus') ? '✅' : '⚠️' }} {{ comp }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- 市場環境 -->
                  <div class="detail-section">
                    <div class="detail-label">市場環境</div>
                    <span class="env-badge">{{ signal._meta?.market_ok ? '✅ 市場正常' : '⚠️ 市場異常' }}</span>
                    <span class="env-badge">{{ signal._meta?.news_ok ? '✅ 新聞正面' : '⚠️ 新聞負面' }}</span>
                    <span v-if="signal._meta?.['1h_trend']" class="env-badge">1h: {{ signal._meta['1h_trend'] }}</span>
                    <span v-if="signal._meta?.['1d_trend']" class="env-badge">1d: {{ signal._meta['1d_trend'] }}</span>
                  </div>
                  
                  <!-- 原因 -->
                  <div class="detail-reason" v-if="signal._meta?.reason">
                    💬 {{ signal._meta.reason }}
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 分頁 -->
    <div v-if="totalPages > 1" class="pagination">
      <button class="page-btn" :disabled="currentPage === 1" @click="goToPage(1)">««</button>
      <button class="page-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">«</button>
      <span class="page-info">第 {{ currentPage }} / {{ totalPages }} 頁 (共 {{ totalCount }} 筆)</span>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">»</button>
      <button class="page-btn" :disabled="currentPage === totalPages" @click="goToPage(totalPages)">»»</button>
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

// 帳戶類型切換
const accountType = ref('paper')

const switchAccountType = (type) => {
  accountType.value = type
  currentPage.value = 1
  fetchSignals()
}

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

const fetchSignals = async () => {
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize.value
    let url = `${API_URL}/signals?limit=${pageSize.value}&offset=${offset}`
    if (filters.value.status) url += `&status=${filters.value.status}`
    if (filters.value.symbol) url += `&symbol=${filters.value.symbol}`
    url += `&account_type=${accountType.value}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.status === 'ok') {
      signals.value = (data.signals || []).map(s => ({
        ...s,
        _meta: (() => { try { return JSON.parse(s.metadata || '{}') } catch { return {} } })(),
        _expanded: false
      }))
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

/* 詳情面板樣式 */
.btn-detail {
  background: #21262d;
  border: 1px solid #30363d;
  color: #8b949e;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.btn-detail:hover {
  color: #388bfd;
  border-color: #388bfd;
}

.detail-row {
  background: #0d1117;
}

.detail-cell {
  padding: 12px 16px !important;
}

.signal-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-label {
  font-size: 11px;
  color: #6e7681;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tf-badges {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.tf-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.tf-badge.buy {
  background: rgba(63,185,80,0.15);
  color: #3fb950;
}

.tf-badge.sell {
  background: rgba(248,81,73,0.15);
  color: #f85149;
}

.tf-badge.hold {
  background: rgba(110,118,129,0.15);
  color: #8b949e;
}

.consensus-badge {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.consensus-badge.buy {
  background: #3fb950;
  color: #0d1117;
}

.consensus-badge.sell {
  background: #f85149;
  color: #fff;
}

.consensus-badge.hold {
  background: #6e7681;
  color: #fff;
}

.tf-arrow {
  color: #6e7681;
  font-size: 14px;
}

.comp-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.comp-item {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.comp-item.positive {
  background: rgba(63,185,80,0.1);
  color: #3fb950;
}

.comp-item.neutral {
  background: rgba(210,153,34,0.1);
  color: #d29922;
}

.env-badge {
  font-size: 12px;
  padding: 2px 8px;
  background: #21262d;
  border-radius: 4px;
}

.detail-reason {
  font-size: 12px;
  color: #8b949e;
  font-style: italic;
  align-self: flex-end;
}

/* 帳戶類型 Tab */
.account-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.account-tab {
  padding: 6px 16px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #8b949e;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.account-tab.active {
  background: #1f2d40;
  border-color: #388bfd;
  color: #388bfd;
}

.account-tab:nth-child(2).active {
  background: #2d1b1b;
  border-color: #da3633;
  color: #da3633;
}

.live-signal-banner {
  background: rgba(218,54,51,0.1);
  border: 1px solid #da3633;
  color: #f85149;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}
</style>