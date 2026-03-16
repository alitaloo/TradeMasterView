<template>
  <div class="signal-card" :class="signalTypeClass">
    <div class="signal-header">
      <div class="signal-symbol">
        <span class="symbol">{{ signal.symbol }}</span>
        <span class="type-badge" :class="signalTypeClass">
          {{ signalType }}
        </span>
      </div>
      <span class="signal-time">{{ displayTime }}</span>
    </div>
    
    <div class="signal-body">
      <div class="signal-price">
        <span class="price-label">信號價格</span>
        <span class="price-value">${{ signal.price ? Number(signal.price).toLocaleString() : '-' }}</span>
      </div>
      
      <div class="signal-confidence">
        <span class="confidence-label">置信度</span>
        <div class="confidence-bar">
          <div 
            class="confidence-fill" 
            :style="{ width: confidencePct + '%' }"
            :class="getConfidenceClass(confidencePct)"
          ></div>
        </div>
        <span class="confidence-value">{{ confidencePct }}%</span>
      </div>
    </div>
    
    <div class="signal-footer">
      <button class="signal-btn" @click="executeSignal">
        <span>✅</span> 執行
      </button>
      <button class="signal-btn secondary" @click="viewDetails">
        <span>📊</span> 詳情
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatTaipei } from '../utils/datetime.js'

const props = defineProps({
  signal: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['execute', 'view'])

// 兼容 DB schema (signal_type, created_at, confidence 0-1) 和舊 mock (type, time, confidence 0-100)
const signalType = computed(() => props.signal.signal_type || props.signal.type || 'UNKNOWN')
const signalTypeClass = computed(() => {
  const t = signalType.value.toLowerCase()
  if (t === 'buy' || t === 'long') return 'long'
  if (t === 'sell' || t === 'short') return 'short'
  return t
})
const displayTime = computed(() => {
  if (props.signal.created_at) return formatTaipei(props.signal.created_at, { hideSeconds: true })
  return props.signal.time || '-'
})
const confidencePct = computed(() => {
  const c = props.signal.confidence
  if (c == null) return 0
  // DB stores 0-1, mock stores 0-100
  return c <= 1 ? Math.round(c * 100) : Math.round(c)
})

const getConfidenceClass = (confidence) => {
  if (confidence >= 80) return 'high'
  if (confidence >= 60) return 'medium'
  return 'low'
}

const executeSignal = () => {
  emit('execute', props.signal)
}

const viewDetails = () => {
  emit('view', props.signal)
}
</script>

<style scoped>
.signal-card {
  padding: 16px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.signal-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.signal-card.long {
  border-left: 3px solid var(--color-success);
}

.signal-card.short {
  border-left: 3px solid var(--color-danger);
}

.signal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.signal-symbol {
  display: flex;
  align-items: center;
  gap: 8px;
}

.symbol {
  font-size: 1.125rem;
  font-weight: 700;
}

.type-badge {
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 100px;
}

.type-badge.long {
  background: rgba(78, 204, 163, 0.2);
  color: var(--color-success);
}

.type-badge.short {
  background: rgba(255, 71, 87, 0.2);
  color: var(--color-danger);
}

.signal-time {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.signal-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.signal-price {
  display: flex;
  flex-direction: column;
}

.price-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 2px;
}

.price-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.signal-confidence {
  display: flex;
  align-items: center;
  gap: 8px;
}

.confidence-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.confidence-bar {
  width: 60px;
  height: 6px;
  background: var(--color-bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--transition-normal);
}

.confidence-fill.high { background: var(--color-success); }
.confidence-fill.medium { background: var(--color-warning); }
.confidence-fill.low { background: var(--color-danger); }

.confidence-value {
  font-size: 0.875rem;
  font-weight: 600;
  min-width: 36px;
}

.signal-footer {
  display: flex;
  gap: 8px;
}

.signal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.signal-btn:first-child {
  background: var(--gradient-accent);
  color: white;
}

.signal-btn:first-child:hover {
  box-shadow: var(--shadow-glow);
}

.signal-btn.secondary {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.signal-btn.secondary:hover {
  background: var(--color-bg-secondary);
}
</style>
