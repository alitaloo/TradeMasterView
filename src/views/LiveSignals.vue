<template>
  <div class="live-page">
    <div class="live-warning-banner">
      ⚠️ 真實交易模式 — 信號將在真實帳戶執行
    </div>
    
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">💰 真實交易信號</h1>
    </div>

    <!-- 啟用/停用說明 -->
    <div v-if="!liveEnabled" class="disabled-overlay">
      <div class="disabled-content">
        <p class="disabled-text">真實交易目前已停用</p>
        <p class="disabled-hint">啟用後可查看真實交易的交易信號</p>
        <button @click="showEnableModal = true" class="btn-enable-live">啟用真實交易</button>
      </div>
    </div>

    <!-- 信號列表 -->
    <div v-else>
      <div v-if="loading" class="loading">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="signals.length === 0" class="empty">暫無信號</div>
      <div v-else class="signals-grid">
        <div 
          v-for="signal in signals" 
          :key="signal.id" 
          class="signal-card"
          :class="signal.action?.toLowerCase()"
        >
          <div class="signal-header">
            <span class="signal-symbol">{{ signal.symbol }}</span>
            <span class="signal-action" :class="signal.action?.toLowerCase()">
              {{ signal.action === 'BUY' ? '買入' : '賣出' }}
            </span>
          </div>
          <div class="signal-body">
            <div class="signal-price">
              <span class="label">價格</span>
              <span class="value">${{ signal.price?.toFixed(2) || signal.target_price?.toFixed(2) || '-' }}</span>
            </div>
            <div class="signal-confidence">
              <span class="label">信心度</span>
              <span class="value">{{ ((signal.confidence || 0) * 100).toFixed(0) }}%</span>
            </div>
            <div class="signal-strategy">
              <span class="label">策略</span>
              <span class="value">{{ signal.strategy_name || signal.strategy || '-' }}</span>
            </div>
          </div>
          <div class="signal-footer">
            <span class="signal-time">{{ formatTime(signal.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 啟用確認彈窗 -->
    <div v-if="showEnableModal" class="modal-overlay" @click.self="showEnableModal = false">
      <div class="modal live-modal">
        <h3>⚠️ 啟用真實交易</h3>
        <p class="warning-text">啟用後，產生的交易信號將直接在富途真實帳戶執行。</p>
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
const signals = ref([])
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
    liveEnabled.value = false
  } finally {
    if (!liveEnabled.value) loading.value = false
  }
}

const fetchSignals = async () => {
  loading.value = true
  error.value = null
  
  try {
    // 調用一般的 signals API
    const res = await fetch(`${API_URL}/signals?limit=50`)
    const data = await res.json()
    
    if (data.status === 'error') {
      error.value = data.message || '載入失敗'
      signals.value = []
    } else {
      // 過濾出有效的信號
      signals.value = (data.signals || data || []).filter(s => s && s.symbol)
    }
  } catch (err) {
    console.error('Fetch signals error:', err)
    error.value = '網絡錯誤，請稍後重試'
  } finally {
    loading.value = false
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
    
    if (data.status === 'ok') {
      liveEnabled.value = true
      showEnableModal.value = false
      confirmCode.value = ''
      fetchSignals()
    } else {
      alert(data.message || '啟用失敗')
    }
  } catch (err) {
    console.error('Enable live trading error:', err)
    alert('網絡錯誤，請稍後重試')
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return '-'
  try {
    const date = new Date(timeStr)
    return date.toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return timeStr
  }
}

onMounted(() => {
  fetchTradingMode().then(() => {
    if (liveEnabled.value) {
      fetchSignals()
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

.signals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.signal-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.signal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.signal-card.buy {
  border-left: 3px solid #22c55e;
}

.signal-card.sell {
  border-left: 3px solid #ef4444;
}

.signal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.signal-symbol {
  font-weight: 700;
  font-size: 1.125rem;
}

.signal-action {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.signal-action.buy {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.signal-action.sell {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.signal-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.signal-price, .signal-confidence, .signal-strategy {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.label {
  color: var(--text-secondary);
}

.value {
  font-weight: 500;
}

.signal-footer {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.signal-time {
  font-size: 0.75rem;
  color: var(--text-muted);
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
