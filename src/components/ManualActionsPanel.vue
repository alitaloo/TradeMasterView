<template>
  <div class="manual-actions-panel">
    <div class="panel-header">
      <h2 class="panel-title">🎛️ 手動控制</h2>
    </div>

    <div v-if="loadError" class="error-state">⚠️ {{ loadError }}</div>

    <div class="actions-grid">
      <div
        v-for="act in actions"
        :key="act.action"
        class="action-card"
      >
        <!-- 主行：圖標 + 資訊 + 按鈕 -->
        <div class="action-item">
          <div class="action-left">
            <span class="action-icon">{{ iconMap[act.action] || '⚙️' }}</span>
            <div class="action-info">
              <span class="action-label">{{ act.label }}</span>
              <span class="action-status" :class="'st-' + act.status">
                {{ statusLabel(act.status) }}
              </span>
            </div>
          </div>
          <div class="action-right">
            <button
              class="history-toggle"
              :class="{ active: expandedAction === act.action }"
              @click="toggleHistory(act.action)"
              title="執行記錄"
            >📋</button>
            <button
              class="trigger-btn"
              :class="{ disabled: act.status === 'running' }"
              :disabled="act.status === 'running'"
              @click="triggerAction(act.action)"
              :title="act.status === 'running' ? '執行中…' : '點擊執行'"
            >
              <span v-if="act.status === 'running'" class="spinner">⏳</span>
              <span v-else>▶</span>
            </button>
          </div>
        </div>

        <!-- 最近一次結果區塊 -->
        <div v-if="act.finished_at" class="last-result" :class="'lr-' + act.status">
          <div class="lr-header">
            <span class="lr-badge" :class="'badge-' + act.status">
              {{ act.status === 'success' ? '✅ 成功' : '❌ 失敗' }}
            </span>
            <span class="lr-time">{{ formatTime(act.finished_at) }}</span>
          </div>
          <div v-if="act.summary" class="lr-summary">{{ truncate(act.summary, 120) }}</div>
          <div v-if="act.error" class="lr-error">{{ truncate(act.error, 120) }}</div>
        </div>

        <!-- 歷史記錄展開區 -->
        <transition name="slide">
          <div v-if="expandedAction === act.action" class="history-section">
            <div v-if="historyLoading" class="history-loading">載入中…</div>
            <div v-else-if="historyRecords.length === 0" class="history-empty">尚無執行記錄</div>
            <div v-else class="history-list">
              <div
                v-for="rec in historyRecords"
                :key="rec.id"
                class="history-row"
                :class="'hr-' + rec.status"
              >
                <span class="hr-status">{{ rec.status === 'success' ? '✅' : '❌' }}</span>
                <span class="hr-time">{{ formatTime(rec.finished_at || rec.started_at) }}</span>
                <span class="hr-detail">
                  {{ truncate(rec.summary || rec.error || '—', 60) }}
                </span>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { manualActionsApi } from '../api/index.js'

const actions = ref([])
const loadError = ref(null)
const expandedAction = ref(null)
const historyRecords = ref([])
const historyLoading = ref(false)
let pollTimer = null

const iconMap = {
  sync_news: '📰',
  refresh_kline: '📊',
  refresh_status: '🔄',
}

function statusLabel(s) {
  const map = {
    idle: '待命',
    running: '執行中…',
    success: '✅ 成功',
    failed: '❌ 失敗',
    cooldown: '冷卻中',
  }
  return map[s] || s
}

function truncate(text, max) {
  if (!text) return ''
  const first = text.split('\n')[0]
  return first.length > max ? first.slice(0, max) + '…' : first
}

function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return iso
  }
}

async function fetchActions() {
  try {
    const data = await manualActionsApi.list()
    actions.value = data.actions || []
    loadError.value = null
  } catch (e) {
    loadError.value = '無法載入手動操作'
  }
}

async function triggerAction(action) {
  const act = actions.value.find(a => a.action === action)
  if (act) act.status = 'running'

  try {
    const res = await manualActionsApi.trigger(action)
    if (res.status === 'cooldown' || res.status === 'rejected') {
      if (act) {
        act.status = 'idle'
        act.error = res.message
      }
    }
    pollUntilDone(action)
  } catch (e) {
    if (act) {
      act.status = 'failed'
      act.error = e?.response?.data?.message || '觸發失敗'
    }
  }
}

async function pollUntilDone(action, retries = 30) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 2000))
    try {
      const data = await manualActionsApi.getStatus(action)
      const act = actions.value.find(a => a.action === action)
      if (act) {
        act.status = data.status
        act.summary = data.summary
        act.error = data.error
        act.started_at = data.started_at
        act.finished_at = data.finished_at
      }
      if (data.status !== 'running') {
        // 如果歷史面板正好展開在這個 action，重新載入
        if (expandedAction.value === action) {
          loadHistory(action)
        }
        return
      }
    } catch {
      // ignore transient errors
    }
  }
}

async function toggleHistory(action) {
  if (expandedAction.value === action) {
    expandedAction.value = null
    historyRecords.value = []
    return
  }
  expandedAction.value = action
  await loadHistory(action)
}

async function loadHistory(action) {
  historyLoading.value = true
  historyRecords.value = []
  try {
    const data = await manualActionsApi.getHistory(action, 5)
    historyRecords.value = data.history || []
  } catch {
    historyRecords.value = []
  } finally {
    historyLoading.value = false
  }
}

onMounted(() => {
  fetchActions()
  pollTimer = setInterval(fetchActions, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<style scoped>
.manual-actions-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
}

.panel-header {
  margin-bottom: 12px;
}

.panel-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.error-state {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  padding: 8px 0;
}

.actions-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-card {
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  gap: 10px;
}

.action-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.action-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  margin-top: 1px;
}

.action-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.action-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.action-status {
  font-size: 0.6875rem;
  margin-top: 2px;
}

.action-status.st-idle { color: var(--color-text-muted); }
.action-status.st-running { color: #ffc107; }
.action-status.st-success { color: #4ecca3; }
.action-status.st-failed { color: #ff4757; }

.action-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.history-toggle {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  opacity: 0.6;
}

.history-toggle:hover,
.history-toggle.active {
  opacity: 1;
  border-color: var(--color-accent, #4ecca3);
}

.trigger-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.trigger-btn:hover:not(.disabled) {
  background: var(--gradient-accent);
  color: white;
  border-color: transparent;
}

.trigger-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── 最近一次結果 ── */
.last-result {
  padding: 6px 12px 8px 44px;  /* 左邊對齊 action-info */
  font-size: 0.75rem;
  border-top: 1px solid rgba(255,255,255,0.04);
}

.lr-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.lr-badge {
  font-size: 0.6875rem;
  font-weight: 600;
}

.badge-success { color: #4ecca3; }
.badge-failed { color: #ff4757; }

.lr-time {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.lr-summary {
  color: var(--color-text-muted);
  font-size: 0.6875rem;
  line-height: 1.4;
  word-break: break-all;
}

.lr-error {
  color: #ff6b7a;
  font-size: 0.6875rem;
  line-height: 1.4;
  word-break: break-all;
}

/* ── 歷史記錄 ── */
.history-section {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 8px 12px;
  background: rgba(0,0,0,0.1);
}

.history-loading,
.history-empty {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: center;
  padding: 6px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.6875rem;
  padding: 3px 4px;
  border-radius: 4px;
}

.history-row.hr-success { background: rgba(78,204,163,0.06); }
.history-row.hr-failed  { background: rgba(255,71,87,0.06);  }

.hr-status {
  flex-shrink: 0;
  font-size: 0.625rem;
}

.hr-time {
  flex-shrink: 0;
  color: var(--color-text-muted);
  min-width: 90px;
}

.hr-detail {
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* ── 展開動畫 ── */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
  max-height: 300px;
  overflow: hidden;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
