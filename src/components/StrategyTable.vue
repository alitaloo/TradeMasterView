<template>
  <div class="strategy-table">
    <div class="table-header">
      <h3>{{ title }}</h3>
      <div class="table-controls">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索策略..."
          class="search-input"
        />
        <select v-model="sortBy" class="sort-select">
          <option value="name">名稱</option>
          <option value="total_return">報酬率</option>
          <option value="sharpe_ratio">夏普比率</option>
          <option value="trades_count">交易次數</option>
        </select>
      </div>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th class="status-col"></th>
            <th class="name-col" @click="sortBy = 'name'">
              名稱
              <span v-if="sortBy === 'name'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th class="return-col" @click="sortBy = 'total_return'">
              報酬率
              <span v-if="sortBy === 'total_return'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th class="sharpe-col" @click="sortBy = 'sharpe_ratio'">
              夏普比率
              <span v-if="sortBy === 'sharpe_ratio'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th class="trades-col" @click="sortBy = 'trades_count'">
              交易次數
              <span v-if="sortBy === 'trades_count'" class="sort-icon">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th class="actions-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="strategy in filteredStrategies"
            :key="strategy.id"
            :class="{ disabled: !strategy.enabled }"
          >
            <td class="status-col">
              <button
                :class="['toggle-btn', { active: strategy.enabled }]"
                @click="$emit('toggle', strategy.id)"
              >
                {{ strategy.enabled ? '●' : '○' }}
              </button>
            </td>
            <td class="name-col">
              <div class="strategy-name">{{ strategy.name }}</div>
              <div class="strategy-params">
                {{ formatParams(strategy.parameters) }}
              </div>
            </td>
            <td class="return-col">
              <span :class="['return-value', getReturnClass(strategy.total_return)]">
                {{ formatPercent(strategy.total_return) }}
              </span>
            </td>
            <td class="sharpe-col">
              {{ strategy.sharpe_ratio?.toFixed(2) || 'N/A' }}
            </td>
            <td class="trades-col">
              {{ strategy.trades_count || 0 }}
            </td>
            <td class="actions-col">
              <button class="action-btn" @click="$emit('edit', strategy)">
                ✏️
              </button>
              <button class="action-btn danger" @click="$emit('delete', strategy.id)">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="filteredStrategies.length === 0" class="empty-state">
        沒有找到策略
      </div>
    </div>
    
    <div class="table-footer">
      <span class="total-count">共 {{ strategies.length }} 個策略</span>
      <span class="enabled-count">
        {{ enabledCount }} 個已啟用
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import formatter from '@/utils/formatter.js';

const props = defineProps({
  strategies: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: '策略列表'
  }
});

const emit = defineEmits(['toggle', 'edit', 'delete']);

const searchQuery = ref('');
const sortBy = ref('total_return');
const sortOrder = ref('desc');

// 篩選 + 排序
const filteredStrategies = computed(() => {
  let result = [...props.strategies];
  
  // 搜索
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(s => 
      s.name.toLowerCase().includes(query) ||
      JSON.stringify(s.parameters).toLowerCase().includes(query)
    );
  }
  
  // 排序
  result.sort((a, b) => {
    let aVal = a[sortBy.value];
    let bVal = b[sortBy.value];
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (sortOrder.value === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  return result;
});

// 啟用數量
const enabledCount = computed(() => 
  props.strategies.filter(s => s.enabled).length
);

// 格式化參數
const formatParams = (params) => {
  if (!params) return '';
  return Object.entries(params)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};

// 格式化百分比
const formatPercent = (value) => {
  if (value === undefined || value === null) return 'N/A';
  const percent = value * 100;
  return formatter.formatPercent(percent);
};

// 報酬率顏色
const getReturnClass = (value) => {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return '';
};
</script>

<style scoped>
.strategy-table {
  background: #1a1a2e;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #2a2a4a;
}

.table-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
}

.table-controls {
  display: flex;
  gap: 12px;
}

.search-input {
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  padding: 8px 12px;
  color: #ffffff;
  width: 200px;
}

.search-input::placeholder {
  color: #a0a0a0;
}

.sort-select {
  background: #16213e;
  border: 1px solid #2a2a4a;
  border-radius: 4px;
  padding: 8px 12px;
  color: #ffffff;
  cursor: pointer;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 16px;
  text-align: left;
}

th {
  background: #16213e;
  color: #a0a0a0;
  font-weight: 500;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}

th:hover {
  color: #ffffff;
}

.sort-icon {
  margin-left: 4px;
}

td {
  border-bottom: 1px solid #2a2a4a;
  color: #ffffff;
}

tr:hover td {
  background: rgba(42, 42, 74, 0.3);
}

tr.disabled td {
  opacity: 0.5;
}

.strategy-name {
  font-weight: 500;
  color: #ffffff;
}

.strategy-params {
  font-size: 12px;
  color: #a0a0a0;
  margin-top: 4px;
}

.status-col {
  width: 40px;
  text-align: center;
}

.toggle-btn {
  background: transparent;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.toggle-btn.active {
  opacity: 1;
  color: #4ecca3;
}

.return-value.positive {
  color: #4ecca3;
}

.return-value.negative {
  color: #e94560;
}

.actions-col {
  width: 80px;
}

.action-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.action-btn:hover {
  opacity: 1;
}

.action-btn.danger:hover {
  color: #e94560;
}

.empty-state {
  padding: 32px;
  text-align: center;
  color: #a0a0a0;
}

.table-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #16213e;
  color: #a0a0a0;
  font-size: 12px;
}

.enabled-count {
  color: #4ecca3;
}

@media (max-width: 768px) {
  .table-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>
