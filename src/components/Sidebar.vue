<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="brand">TradeMaster</span>
    </div>
    
    <nav class="nav-menu">
      <!-- 儀表板 -->
      <router-link 
        to="/"
        class="nav-item"
        :class="{ active: $route.path === '/' }"
      >
        <span class="nav-icon">📊</span>
        <span class="nav-text">儀表板</span>
      </router-link>

      <!-- 模擬交易 分組 -->
      <div class="nav-group">
        <div class="nav-group-title">📊 模擬交易</div>
        <router-link 
          to="/signals"
          class="nav-item"
          :class="{ active: $route.path === '/signals' }"
        >
          <span class="nav-icon">📈</span>
          <span class="nav-text">信號</span>
        </router-link>
        <router-link 
          to="/positions"
          class="nav-item"
          :class="{ active: $route.path === '/positions' }"
        >
          <span class="nav-icon">💼</span>
          <span class="nav-text">持倉</span>
        </router-link>
        <router-link 
          to="/orders"
          class="nav-item"
          :class="{ active: $route.path === '/orders' }"
        >
          <span class="nav-icon">📋</span>
          <span class="nav-text">訂單</span>
        </router-link>
        <router-link 
          to="/paper-trading"
          class="nav-item"
          :class="{ active: $route.path === '/paper-trading' }"
        >
          <span class="nav-icon">📈</span>
          <span class="nav-text">總覽</span>
        </router-link>
      </div>

      <!-- 真實交易 分組 -->
      <div class="nav-group">
        <div class="nav-group-title live-title">
          💰 真實交易
          <span :class="['live-badge', liveEnabled ? 'on' : 'off']">
            {{ liveEnabled ? '🟢 啟用' : '🔴 停用' }}
          </span>
        </div>
        <router-link 
          to="/live/positions"
          class="nav-item"
          :class="{ active: $route.path === '/live/positions', disabled: !liveEnabled }"
        >
          <span class="nav-icon">💼</span>
          <span class="nav-text">持倉</span>
        </router-link>
        <router-link 
          to="/live/orders"
          class="nav-item"
          :class="{ active: $route.path === '/live/orders', disabled: !liveEnabled }"
        >
          <span class="nav-icon">📋</span>
          <span class="nav-text">訂單</span>
        </router-link>
        <router-link 
          to="/live/signals"
          class="nav-item"
          :class="{ active: $route.path === '/live/signals', disabled: !liveEnabled }"
        >
          <span class="nav-icon">📈</span>
          <span class="nav-text">信號</span>
        </router-link>
      </div>

      <!-- 其他菜單 -->
      <router-link 
        to="/risk"
        class="nav-item"
        :class="{ active: $route.path === '/risk' }"
      >
        <span class="nav-icon">🛡️</span>
        <span class="nav-text">風控儀表板</span>
      </router-link>
      <router-link 
        to="/backtests"
        class="nav-item"
        :class="{ active: $route.path === '/backtests' }"
      >
        <span class="nav-icon">📉</span>
        <span class="nav-text">回測結果</span>
      </router-link>
      <router-link 
        to="/backtest-runner"
        class="nav-item"
        :class="{ active: $route.path === '/backtest-runner' }"
      >
        <span class="nav-icon">⚡</span>
        <span class="nav-text">執行回測</span>
      </router-link>
      <router-link 
        to="/strategies"
        class="nav-item"
        :class="{ active: $route.path === '/strategies' }"
      >
        <span class="nav-icon">⚙️</span>
        <span class="nav-text">策略管理</span>
      </router-link>
      <router-link 
        to="/stock-strategies"
        class="nav-item"
        :class="{ active: $route.path === '/stock-strategies' }"
      >
        <span class="nav-icon">🎯</span>
        <span class="nav-text">股票策略</span>
      </router-link>
      <router-link 
        to="/stocks"
        class="nav-item"
        :class="{ active: $route.path === '/stocks' }"
      >
        <span class="nav-icon">📋</span>
        <span class="nav-text">股票清單</span>
      </router-link>
      <router-link 
        to="/realtime"
        class="nav-item"
        :class="{ active: $route.path === '/realtime' }"
      >
        <span class="nav-icon">📺</span>
        <span class="nav-text">K線監控</span>
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
import { ref, computed, onMounted } from 'vue'
import { getUSMarketStatus } from '../utils/datetime.js'

const API_URL = import.meta.env.VITE_API_URL

// 真實交易開關狀態
const liveEnabled = ref(false)

// 獲取交易模式
const fetchTradingMode = async () => {
  try {
    const res = await fetch(`${API_URL}/config/trading/mode`)
    const data = await res.json()
    liveEnabled.value = data.live_enabled || false
  } catch (err) {
    console.error('Fetch trading mode error:', err)
    liveEnabled.value = false
  }
}

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

onMounted(() => {
  fetchTradingMode()
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

.nav-group {
  margin-bottom: 8px;
}

.nav-group-title {
  font-size: 10px;
  color: #6e7681;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 8px 16px 4px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.live-title {
  color: #da3633;
}

.live-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
}

.live-badge.on {
  background: rgba(63, 185, 80, 0.2);
  color: #3fb950;
}

.live-badge.off {
  background: rgba(218, 54, 51, 0.2);
  color: #da3633;
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

.nav-item.disabled {
  opacity: 0.4;
  pointer-events: none;
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
