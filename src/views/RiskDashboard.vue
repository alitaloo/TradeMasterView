<template>
  <div class="risk-page">
    <div class="page-header">
      <h1 class="page-title">🛡️ 風控儀表板</h1>
      <button class="btn btn-primary" @click="checkRisk">
        <span>🔄</span> 重新檢查
      </button>
    </div>

    <!-- 風控狀態 -->
    <div class="risk-status" :class="riskStatus">
      <div class="status-icon">
        {{ riskStatus === 'safe' ? '✅' : riskStatus === 'warning' ? '⚠️' : '🔴' }}
      </div>
      <div class="status-info">
        <div class="status-title">
          {{ riskStatus === 'safe' ? '風控正常' : riskStatus === 'warning' ? '風控警告' : '風控攔截' }}
        </div>
        <div class="status-desc">{{ riskMessage }}</div>
      </div>
    </div>

    <!-- 風控配置 -->
    <div class="config-section">
      <h3>風控配置</h3>
      <div class="config-grid">
        <div class="config-item">
          <div class="config-label">單筆最大金額</div>
          <div class="config-value">${{ config.max_single_amount.toLocaleString() }}</div>
        </div>
        <div class="config-item">
          <div class="config-label">總持倉上限</div>
          <div class="config-value">${{ config.max_total_position.toLocaleString() }}</div>
        </div>
        <div class="config-item">
          <div class="config-label">單股票上限</div>
          <div class="config-value">${{ config.max_position_per_stock.toLocaleString() }}</div>
        </div>
        <div class="config-item">
          <div class="config-label">最大杠桿</div>
          <div class="config-value">{{ config.max_leverage }}x</div>
        </div>
        <div class="config-item">
          <div class="config-label">最低信心度</div>
          <div class="config-value">{{ (config.min_confidence * 100).toFixed(0) }}%</div>
        </div>
        <div class="config-item">
          <div class="config-label">最大持倉股票數</div>
          <div class="config-value">{{ config.max_stocks }}</div>
        </div>
      </div>
    </div>

    <!-- 持倉風控 -->
    <div class="positions-risk">
      <h3>持倉風險評估</h3>
      <div v-if="loading" class="loading">載入中...</div>
      <div v-else class="risk-list">
        <div 
          v-for="pos in positions" 
          :key="pos.symbol" 
          class="risk-item"
          :class="getRiskLevel(pos)"
        >
          <div class="risk-symbol">{{ pos.symbol }}</div>
          <div class="risk-info">
            <div class="risk-value">
              持倉: ${{ (pos.market_value || 0).toLocaleString() }}
            </div>
            <div class="risk-pnl" :class="(pos.unrealized_pnl || 0) >= 0 ? 'profit' : 'loss'">
              損益: ${{ (pos.unrealized_pnl || 0).toLocaleString() }} ({{ (pos.return_pct || 0).toFixed(2) }}%)
            </div>
          </div>
          <div class="risk-badge">
            {{ getRiskLabel(pos) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 風控日誌 -->
    <div class="risk-logs">
      <h3>最近風控記錄</h3>
      <div class="logs-list">
        <div v-for="log in riskLogs" :key="log.id" class="log-item">
          <div class="log-time">{{ formatTime(log.triggered_at) }}</div>
          <div class="log-rule">{{ log.rule_name }}</div>
          <div class="log-action">{{ log.action_taken }}</div>
        </div>
        <div v-if="riskLogs.length === 0" class="empty">暫無風控記錄</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_API_URL
const { error } = useToast()

const config = ref({
  max_single_amount: 10000,
  max_total_position: 50000,
  max_position_per_stock: 20000,
  max_leverage: 3.0,
  min_confidence: 0.6,
  max_stocks: 10
})

const positions = ref([])
const riskLogs = ref([])
const loading = ref(true)

const riskStatus = computed(() => {
  const totalValue = positions.value.reduce((sum, p) => sum + (p.current_value || 0), 0)
  const usage = totalValue / config.value.max_total_position
  if (usage > 0.9) return 'danger'
  if (usage > 0.7) return 'warning'
  return 'safe'
})

const riskMessage = computed(() => {
  const totalValue = positions.value.reduce((sum, p) => sum + (p.current_value || 0), 0)
  const usage = (totalValue / config.value.max_total_position * 100).toFixed(0)
  
  if (riskStatus.value === 'safe') return `總持倉使用率 ${usage}%，風控狀態正常`
  if (riskStatus.value === 'warning') return `總持倉使用率 ${usage}%，接近風控上限`
  return `總持倉使用率 ${usage}%，已超過風控上限！`
})

const fetchData = async () => {
  loading.value = true
  try {
    // 獲取持倉
    const posRes = await fetch(`${API_URL}/paper/positions`)
    const posData = await posRes.json()
    if (posData.positions) {
      positions.value = posData.positions || []
    }
  } catch (err) {
    console.error('Fetch error:', err)
    error('載入風險數據失敗')
  } finally {
    loading.value = false
  }
}

const checkRisk = () => {
  fetchData()
}

const getRiskLevel = (pos) => {
  const value = pos.market_value || 0
  if (value > config.value.max_position_per_stock) return 'danger'
  if (value > config.value.max_position_per_stock * 0.8) return 'warning'
  return 'safe'
}

const getRiskLabel = (pos) => {
  const value = pos.market_value || 0
  if (value > config.value.max_position_per_stock) return '⚠️ 超限'
  if (value > config.value.max_position_per_stock * 0.8) return '⚡ 接近上限'
  return '✅ 正常'
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  // 如果日期字符串没有时区信息，假设是台北时间 (UTC+8)
  let d = timestamp
  if (typeof timestamp === 'string' && !timestamp.includes('Z') && !timestamp.endsWith('+08:00')) {
    d = timestamp + '+08:00'
  }
  return new Date(d).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.risk-page {
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

.risk-status {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: var(--radius-lg);
  margin-bottom: 24px;
}

.risk-status.safe { background: #22c55e20; border: 1px solid #22c55e; }
.risk-status.warning { background: #f59e0b20; border: 1px solid #f59e0b; }
.risk-status.danger { background: #ef444420; border: 1px solid #ef4444; }

.status-icon { font-size: 2rem; }
.status-title { font-size: 1.25rem; font-weight: 700; }
.status-desc { color: var(--color-text-secondary); }

.config-section, .positions-risk, .risk-logs {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 20px;
}

h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.config-item {
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.config-label { font-size: 0.75rem; color: var(--color-text-secondary); }
.config-value { font-size: 1rem; font-weight: 600; margin-top: 4px; }

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: var(--radius-md);
}

.risk-item.safe { background: #22c55e10; }
.risk-item.warning { background: #f59e0b10; }
.risk-item.danger { background: #ef444410; }

.risk-symbol { font-weight: 600; width: 80px; }
.risk-info { flex: 1; }
.risk-value { font-size: 0.875rem; }
.risk-pnl { font-size: 0.75rem; }
.risk-pnl.profit { color: #22c55e; }
.risk-pnl.loss { color: #ef4444; }

.risk-badge { font-size: 0.75rem; }

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--color-border);
}

.log-time { width: 150px; color: var(--color-text-muted); }
.log-rule { width: 150px; }
.log-action { flex: 1; }

.loading, .empty {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
}
</style>
