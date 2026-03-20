<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="brand">TradeMaster</span>
    </div>
    
    <nav class="nav-menu">
      <router-link 
        v-for="item in menuItems" 
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: $route.path === item.path }"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-text">{{ item.label }}</span>
        <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
      </router-link>
    </nav>
    
    <div class="sidebar-footer">
      <div class="connection-status">
        <span class="status-dot" :class="connectionStatus"></span>
        <span class="status-label">{{ connectionLabel }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { getUSMarketStatus } from '../utils/datetime.js'

const menuItems = [
  { path: '/', label: '儀表板', icon: '📊' },
  { path: '/signals', label: '交易信號', icon: '📈' },
  { path: '/positions', label: '持倉管理', icon: '💼' },
  { path: '/orders', label: '訂單管理', icon: '📋' },
  { path: '/risk', label: '風控儀表板', icon: '🛡️' },
  { path: '/backtests', label: '回測結果', icon: '📉' },
  { path: '/strategies', label: '策略管理', icon: '⚙️' },
  { path: '/stock-strategies', label: '股票策略', icon: '🎯' },
  { path: '/stocks', label: '股票清單', icon: '📋' },
  { path: '/realtime', label: 'K線監控', icon: '📺' },
  { path: '/paper-trading', label: '模擬交易', icon: '📈' }
]

// 使用统一的 datetime 工具，正确处理 DST 与周末
const marketStatus = computed(() => getUSMarketStatus())

const connectionStatus = computed(() => {
  const status = marketStatus.value
  if (status.class === 'open') return 'online'
  if (status.class === 'pre') return 'pre-market'
  return 'offline'
})

const connectionLabel = computed(() => {
  const status = marketStatus.value
  return status.text
})
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
}

.sidebar-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-default);
}

.brand {
  font-size: var(--text-lg);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.nav-menu {
  flex: 1;
  padding: var(--space-3) var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
  border-left: 2px solid transparent;
  margin-left: -2px;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background: rgba(56, 139, 253, 0.1);
  color: var(--color-accent);
  border-left-color: var(--color-accent);
}

.nav-icon {
  font-size: var(--text-base);
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
  font-size: var(--text-sm);
  font-weight: 500;
}

.nav-badge {
  padding: 2px 6px;
  font-size: var(--text-xs);
  font-weight: 600;
  background: var(--color-accent);
  color: white;
  border-radius: 100px;
}

.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--border-default);
}

.connection-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background: var(--color-profit);
  box-shadow: 0 0 6px var(--color-profit);
}

.status-dot.pre-market {
  background: var(--color-warning);
  box-shadow: 0 0 6px var(--color-warning);
}

.status-dot.offline {
  background: var(--text-muted);
}

.status-label {
  font-size: var(--text-xs);
  color: var(--text-secondary);
}
</style>