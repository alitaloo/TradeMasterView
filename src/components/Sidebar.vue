<template>
  <aside class="sidebar">
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
      <div class="market-status">
        <span class="market-label">市場狀態</span>
        <span class="market-value" :class="marketStatus.class">
          {{ marketStatus.text }}
        </span>
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

// 使用統一的 datetime 工具，正確處理 DST 與週末
const marketStatus = computed(() => getUSMarketStatus())
</script>

<style scoped>
.sidebar {
  width: 240px;
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.nav-menu {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.nav-item:hover {
  background: var(--color-bg-tertiary);
  color: var(--color-text-primary);
}

.nav-item.active {
  background: rgba(233, 69, 96, 0.15);
  color: var(--color-accent);
}

.nav-icon {
  font-size: 1.25rem;
  width: 24px;
  text-align: center;
}

.nav-text {
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 500;
}

.nav-badge {
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--color-accent);
  color: white;
  border-radius: 100px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--color-border);
}

.market-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.market-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.market-value {
  font-size: 0.875rem;
  font-weight: 600;
}

.market-value.open {
  color: var(--color-success);
}

.market-value.pre {
  color: var(--color-warning);
}

.market-value.closed {
  color: var(--color-text-muted);
}
</style>
