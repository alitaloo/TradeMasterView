<template>
  <div class="live-page">
    <div class="live-warning-banner">
      ⚠️ 真實交易模式 — 所有操作使用真實資金
    </div>
    
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">💰 真實持倉</h1>
      <button v-if="liveEnabled" @click="disableLiveTrading" class="btn-disable-live">
        🔴 停用真實交易
      </button>
    </div>

    <!-- 啟用/停用說明 -->
    <div v-if="!liveEnabled" class="disabled-overlay">
      <div class="disabled-content">
        <p class="disabled-text">真實交易目前已停用</p>
        <p class="disabled-hint">啟用後可查看富途真實帳戶的持倉</p>
        <button @click="showEnableModal = true" class="btn-enable-live">啟用真實交易</button>
      </div>
    </div>

    <!-- 持倉列表 -->
    <div v-else>
      <div v-if="loading" class="loading">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="positions.length === 0" class="empty">暫無持倉</div>
      <div v-else class="positions-table">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>股數</th>
              <th>買入均價</th>
              <th>當前價格</th>
              <th>市值</th>
              <th>浮動損益</th>
              <th>報酬率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pos in positions" :key="pos.symbol">
              <td class="symbol">{{ pos.symbol }}</td>
              <td>{{ pos.quantity }}</td>
              <td>${{ pos.average_cost?.toFixed(2) || '-' }}</td>
              <td>${{ pos.current_price?.toFixed(2) || '-' }}</td>
              <td>${{ formatNumber(pos.market_value) }}</td>
              <td :class="(pos.unrealized_pnl || 0) >= 0 ? 'profit' : 'loss'">
                ${{ formatNumber(pos.unrealized_pnl) }}
              </td>
              <td :class="(pos.unrealized_pnl_pct || 0) >= 0 ? 'profit' : 'loss'">
                {{ (pos.unrealized_pnl_pct || 0).toFixed(2) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 啟用確認彈窗 -->
    <div v-if="showEnableModal" class="modal-overlay" @click.self="showEnableModal = false">
      <div class="modal live-modal">
        <h3>⚠️ 啟用真實交易</h3>
        <p class="warning-text">啟用後，將可查看富途真實帳戶的持倉和訂單。</p>
        <p class="confirm-label">請輸入確認碼：<strong>ENABLE_LIVE_TRADING</strong></p>
        <input 
          v-model="confirmCode" 
          placeholder="輸入確認碼" 
          class="confirm-input"
          @keyup.enter="enableLiveTrading"
        />
        <div class="modal-actions">
          <button @click="showEnableModal = false" class="btn-cancel">取消</button>
          <button 
            @click="enableLiveTrading" 
            :disabled="confirmCode !== 'ENABLE_LIVE_TRADING'" 
            class="btn-confirm-live"
          >
            確認啟用
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const API_URL = import.meta.env.VITE_API_URL

const liveEnabled = ref(false)
const positions = ref([])
const loading = ref(false)
const error = ref(null)
const showEnableModal = ref(false)
const confirmCode = ref('')

const fetchTradingMode = async () => {
  try {
    const res = await fetch(`${API_URL}/config/trading/mode`, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    liveEnabled.value = data.live_enabled || false
  } catch (err) {
    console.error('Fetch trading mode error:', err)
    liveEnabled.value = false
  } finally {
    // 確保 loading 一定會結束
    if (!liveEnabled.value) loading.value = false
  }
}

const fetchPositions = async () => {
  loading.value = true
  error.value = null
  
  try {
    const res = await fetch(`${API_URL}/live/positions`, { signal: AbortSignal.timeout(8000) })
    const data = await res.json()
    
    if (data.status === 'error') {
      error.value = data.message || '載入失敗'
      positions.value = []
    } else {
      positions.value = data.positions || []
    }
  } catch (err) {
    console.error('Fetch positions error:', err)
    error.value = '網絡錯誤，請稍後重試'
  } finally {
    loading.value = false
  }
}

const disableLiveTrading = async () => {
  if (!confirm('確定要停用真實交易嗎？')) return
  try {
    await fetch(`${API_URL}/config/trading/mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable_live: false, confirm: 'ENABLE_LIVE_TRADING' })
    })
    liveEnabled.value = false
  } catch (err) {
    console.error('Disable live trading error:', err)
  }
}

const enableLiveTrading = async () => {
  if (confirmCode.value !== 'ENABLE_LIVE_TRADING') return
  
  try {
    const res = await fetch(`${API_URL}/config/trading/mode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enable_live: true,
        confirm: 'ENABLE_LIVE_TRADING'
      })
    })
    
    const data = await res.json()
    
    if (data.status === 'ok' || data.status === 'ok') {
      liveEnabled.value = true
      showEnableModal.value = false
      confirmCode.value = ''
      fetchPositions()
    } else {
      alert(data.message || '啟用失敗')
    }
  } catch (err) {
    console.error('Enable live trading error:', err)
    alert('網絡錯誤，請稍後重試')
  }
}

const formatNumber = (num) => {
  if (!num) return '0'
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

onMounted(() => {
  fetchTradingMode().then(() => {
    if (liveEnabled.value) {
      fetchPositions()
    } else {
      loading.value = false
    }
  })
})
</script>

<style scoped>
.live-page {
  animation: fadeIn 0.3s ease;
}

.live-warning-banner {
  background: rgba(218, 54, 51, 0.15);
  border: 1px solid #da3633;
  color: #f85149;
  padding: 8px 16px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
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

.disabled-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.disabled-content {
  text-align: center;
}

.disabled-text {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.disabled-hint {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.btn-disable-live {
  background: transparent;
  border: 1px solid #da3633;
  color: #da3633;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.btn-disable-live:hover { background: rgba(218,54,51,0.1); }
.btn-enable-live {
  background: #da3633;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-enable-live:hover {
  background: #b91c1c;
}

.loading, .empty, .error-message {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.error-message {
  color: #ef4444;
}

.positions-table {
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

.symbol {
  font-weight: 600;
}

.profit {
  color: #22c55e;
}

.loss {
  color: #ef4444;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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
  border: 1px solid var(--color-border);
}

.live-modal {
  border: 2px solid #da3633 !important;
}

.modal h3 {
  margin-bottom: 16px;
  font-size: 1.25rem;
}

.warning-text {
  color: #f85149;
  margin-bottom: 12px;
}

.confirm-label {
  margin-bottom: 8px;
  font-size: 0.875rem;
}

.confirm-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel {
  background: #6b7280;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-confirm-live {
  background: #da3633;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.btn-confirm-live:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
