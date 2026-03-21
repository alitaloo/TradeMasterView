<template>
  <div class="live-page">
    <div class="live-warning-banner">
      ⚠️ 真實交易模式 — 所有操作使用真實資金
    </div>
    
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">💰 真實訂單</h1>
      <button v-if="liveEnabled" @click="disableLiveTrading" class="btn-disable-live">🔴 停用真實交易</button>
    </div>

    <!-- 啟用/停用說明 -->
    <div v-if="!liveEnabled" class="disabled-overlay">
      <div class="disabled-content">
        <p class="disabled-text">真實交易目前已停用</p>
        <p class="disabled-hint">啟用後可查看富途真實帳戶的訂單記錄</p>
        <button @click="showEnableModal = true" class="btn-enable-live">啟用真實交易</button>
      </div>
    </div>

    <!-- 訂單列表 -->
    <div v-else>
      <div v-if="loading" class="loading">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <div v-else-if="orders.length === 0" class="empty">暫無訂單</div>
      <div v-else class="orders-table">
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Symbol</th>
              <th>方向</th>
              <th>價格</th>
              <th>數量</th>
              <th>成交數</th>
              <th>成交價</th>
              <th>狀態</th>
              <th>創建時間</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.order_id">
              <td class="order-id">{{ order.order_id }}</td>
              <td class="symbol">{{ order.symbol }}</td>
              <td>
                <span :class="['direction', order.order_type]">
                  {{ order.order_type }}
                </span>
              </td>
              <td>${{ order.price?.toFixed(2) || '-' }}</td>
              <td>{{ order.quantity }}</td>
              <td>{{ order.filled_quantity }}</td>
              <td>${{ order.filled_price?.toFixed(2) || '-' }}</td>
              <td>
                <span :class="['status', order.status]">{{ order.status }}</span>
              </td>
              <td class="time">{{ order.created_at }}</td>
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
const orders = ref([])
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

const fetchOrders = async () => {
  loading.value = true
  error.value = null
  
  try {
    const res = await fetch(`${API_URL}/live/orders`)
    const data = await res.json()
    
    if (data.status === 'error') {
      error.value = data.message || '載入失敗'
      orders.value = []
    } else {
      orders.value = data.orders || []
    }
  } catch (err) {
    console.error('Fetch orders error:', err)
    error.value = '網絡錯誤，請稍後重試'
  } finally {
    loading.value = false
  }
}

const disableLiveTrading = async () => {
  if (!confirm('確定要停用真實交易嗎？')) return;
  try {
    await fetch(`${API_URL}/config/trading/mode`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({enable_live: false, confirm: 'ENABLE_LIVE_TRADING'})
    });
    liveEnabled.value = false;
  } catch(e) { console.error(e); }
};

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
      fetchOrders()
    } else {
      alert(data.message || '啟用失敗')
    }
  } catch (err) {
    console.error('Enable live trading error:', err)
    alert('網絡錯誤，請稍後重試')
  }
}

onMounted(() => {
  fetchTradingMode().then(() => {
    if (liveEnabled.value) {
      fetchOrders()
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

.btn-disable-live { background: transparent; border: 1px solid #da3633; color: #da3633; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 13px; }
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
  font-family: monospace;
  font-size: 0.8125rem;
}

.symbol {
  font-weight: 600;
}

.direction {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.direction.BUY {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.direction.SELL {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
}

.status.filled {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status.cancelled {
  background: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.status.submitted, .status.pre-submitted {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.status.failed, .status.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.time {
  font-size: 0.8125rem;
  color: var(--text-secondary);
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
