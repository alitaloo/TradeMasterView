<template>
  <div class="system-status-panel">
    <div class="panel-header">
      <h2 class="panel-title">🖥️ 系統狀態</h2>
      <span class="refresh-info" v-if="checkedAt">
        {{ timeAgo(checkedAt) }}
        <button class="refresh-btn" @click="fetchStatus" :disabled="loading" title="重新整理">🔄</button>
      </span>
    </div>

    <div v-if="loading && !status" class="loading-state">載入中...</div>
    <div v-else-if="error && !status" class="error-state">⚠️ {{ error }}</div>

    <div v-else class="status-grid">
      <!-- API Health -->
      <div class="status-item">
        <span class="status-dot" :class="dotClass(status?.api?.status)"></span>
        <div class="status-detail">
          <span class="status-label">TradeMaster API</span>
          <span class="status-value">{{ statusText(status?.api?.status) }}</span>
        </div>
      </div>

      <!-- News Sync -->
      <div class="status-item">
        <span class="status-dot" :class="dotClass(status?.news_sync?.status)"></span>
        <div class="status-detail">
          <span class="status-label">新聞同步</span>
          <span class="status-value">
            {{ statusText(status?.news_sync?.status) }}
            <template v-if="status?.news_sync?.count_24h != null">
              · {{ status.news_sync.count_24h }} 筆/24h
            </template>
          </span>
          <span class="status-sub" v-if="status?.news_sync?.last_synced">
            最後同步：{{ formatTime(status.news_sync.last_synced) }}
          </span>
        </div>
      </div>

      <!-- K-line Freshness -->
      <div class="status-item">
        <span class="status-dot" :class="dotClass(status?.kline?.status)"></span>
        <div class="status-detail">
          <span class="status-label">K 線資料</span>
          <span class="status-value">
            {{ statusText(status?.kline?.status) }}
            <template v-if="status?.kline?.symbol_count">
              · {{ status.kline.symbol_count }} 檔
            </template>
          </span>
          <span class="status-sub" v-if="status?.kline?.last_updated">
            最後更新：{{ formatTime(status.kline.last_updated) }}
          </span>
        </div>
      </div>

      <!-- OpenD Gateway -->
      <div class="status-item">
        <span class="status-dot" :class="dotClass(opendNormalized)"></span>
        <div class="status-detail">
          <span class="status-label">OpenD 閘道</span>
          <span class="status-value">{{ opendText }}</span>
          <span class="status-sub" v-if="status?.opend?.host">
            {{ status.opend.host }}:{{ status.opend.port }}
          </span>
        </div>
      </div>

      <!-- Futu API -->
      <div class="status-item">
        <span class="status-dot" :class="dotClass(futuNormalized)"></span>
        <div class="status-detail">
          <span class="status-label">Futu API</span>
          <span class="status-value">{{ futuText }}</span>
          <span class="status-sub" v-if="status?.futu?.market_state">
            市場狀態：{{ status.futu.market_state }}
          </span>
        </div>
      </div>

      <!-- Cron -->
      <div class="status-item">
        <span class="status-dot" :class="dotClass(cronNormalized)"></span>
        <div class="status-detail">
          <span class="status-label">Cron 排程</span>
          <span class="status-value">
            {{ cronText }}
          </span>
          <span class="status-sub" v-if="status?.cron?.recent_errors > 0">
            ⚠️ 近期錯誤：{{ status.cron.recent_errors }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { systemApi } from '../api/index.js'

const status = ref(null)
const loading = ref(false)
const error = ref(null)
const checkedAt = ref(null)
let timer = null

async function fetchStatus() {
  loading.value = true
  error.value = null
  try {
    const data = await systemApi.getStatus()
    status.value = data
    checkedAt.value = data.checked_at || new Date().toISOString()
  } catch (e) {
    error.value = '無法取得系統狀態'
    console.warn('System status fetch failed:', e)
  } finally {
    loading.value = false
  }
}

// Computed helpers
const opendNormalized = computed(() => {
  const s = status.value?.opend?.status
  if (s === 'reachable') return 'ok'
  if (s === 'unreachable') return 'error'
  return 'unknown'
})

const opendText = computed(() => {
  const s = status.value?.opend?.status
  if (s === 'reachable') return '運行中'
  if (s === 'unreachable') return '無法連線'
  return '未知'
})

const futuNormalized = computed(() => {
  const s = status.value?.futu?.status
  if (s === 'connected') return 'ok'
  if (s === 'unreachable' || s === 'error') return 'error'
  if (s === 'sdk_missing') return 'stale'
  return 'unknown'
})

const futuText = computed(() => {
  const s = status.value?.futu?.status
  if (s === 'connected') return '已連線'
  if (s === 'unreachable') return '無法連線'
  if (s === 'error') return `錯誤${status.value?.futu?.detail ? '：' + status.value.futu.detail.substring(0, 50) : ''}`
  if (s === 'sdk_missing') return 'SDK 未安裝'
  return '未知'
})

const cronNormalized = computed(() => {
  const c = status.value?.cron
  if (!c) return 'unknown'
  if (c.status === 'error') return 'error'
  if (c.recent_errors > 3) return 'stale'
  if (c.job_count > 0) return 'ok'
  return 'stale'
})

const cronText = computed(() => {
  const c = status.value?.cron
  if (!c) return '未知'
  if (c.status === 'error') return '錯誤'
  if (c.status === 'no_jobs') return '無排程'
  return `${c.job_count} 個排程`
})

function dotClass(s) {
  if (s === 'ok') return 'dot-ok'
  if (s === 'stale' || s === 'never_synced' || s === 'empty') return 'dot-warn'
  if (s === 'error' || s === 'unreachable') return 'dot-error'
  return 'dot-unknown'
}

function statusText(s) {
  const map = {
    ok: '正常',
    stale: '過期',
    never_synced: '未同步',
    empty: '無資料',
    error: '錯誤',
    reachable: '可連線',
    unreachable: '無法連線',
  }
  return map[s] || s || '未知'
}

function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function timeAgo(iso) {
  if (!iso) return ''
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
    if (diff < 60) return `${diff}s 前`
    if (diff < 3600) return `${Math.floor(diff / 60)}m 前`
    return `${Math.floor(diff / 3600)}h 前`
  } catch { return '' }
}

onMounted(() => {
  fetchStatus()
  // Auto-refresh every 60s
  timer = setInterval(fetchStatus, 60000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.system-status-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.refresh-info {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.refresh-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.refresh-btn:hover { opacity: 1; }
.refresh-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.loading-state, .error-state {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 12px 0;
}

.status-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.status-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.dot-ok { background: #4ecca3; box-shadow: 0 0 6px rgba(78, 204, 163, 0.5); }
.dot-warn { background: #ffc107; box-shadow: 0 0 6px rgba(255, 193, 7, 0.4); }
.dot-error { background: #ff4757; box-shadow: 0 0 6px rgba(255, 71, 87, 0.5); }
.dot-unknown { background: #888; }

.status-detail {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.status-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.status-value {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.status-sub {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}
</style>
