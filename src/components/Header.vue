<template>
  <header class="header">
    <div class="header-left">
      <router-link to="/" class="logo">
        <span class="logo-icon">📈</span>
        <span class="logo-text">TradeMaster</span>
        <span class="logo-view">View</span>
      </router-link>
    </div>
    
    <div class="header-center">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          class="search-input" 
          placeholder="搜索股票、策略、信号..."
          v-model="searchQuery"
          @keyup.enter="handleSearch"
        >
      </div>
    </div>
    
    <div class="header-right">
      <div class="connection-status" :class="{ connected: apiConnected }">
        <span class="status-dot"></span>
        <span class="status-text">{{ apiConnected ? '已连接' : '未连接' }}</span>
      </div>
      
      <button class="header-btn" title="刷新数据" @click="refreshData">
        <span>🔄</span>
      </button>
      
      <button class="header-btn" title="设置">
        <span>⚙️</span>
      </button>
      
      <div class="user-menu">
        <button class="user-btn">
          <span class="user-avatar">👤</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')
const apiConnected = ref(true)

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ 
      path: '/signals', 
      query: { q: searchQuery.value } 
    })
  }
}

const refreshData = () => {
  // 触发数据刷新
  console.log('Refreshing data...')
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.logo-icon {
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.logo-view {
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--color-text-secondary);
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 480px;
  margin: 0 24px;
}

.search-box {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 16px;
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.search-box:focus-within {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.search-icon {
  margin-right: 8px;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.search-input::placeholder {
  color: var(--color-text-muted);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 71, 87, 0.2);
  border-radius: 100px;
}

.connection-status.connected {
  background: rgba(78, 204, 163, 0.2);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
}

.connection-status.connected .status-dot {
  background: var(--color-success);
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 0.75rem;
  font-weight: 500;
}

.header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.header-btn:hover {
  background: var(--color-bg-tertiary);
}

.header-btn span {
  font-size: 1.125rem;
}

.user-menu {
  margin-left: 8px;
}

.user-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--gradient-accent);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.user-avatar {
  font-size: 1rem;
}
</style>
