<template>
  <div class="backtest-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <div class="chart-controls">
        <button
          v-for="type in chartTypes"
          :key="type.value"
          :class="['chart-btn', { active: currentType === type.value }]"
          @click="currentType = type.value"
        >
          {{ type.label }}
        </button>
      </div>
    </div>
    <div class="chart-container" :style="{ height: `${height}px` }">
      <Line
        v-if="currentType === 'equity'"
        :data="equityData"
        :options="lineOptions"
      />
      <Line
        v-else-if="currentType === 'drawdown'"
        :data="drawdownData"
        :options="areaOptions"
      />
      <Line
        v-else-if="currentType === 'return'"
        :data="returnData"
        :options="barOptions"
      />
    </div>
    <div class="chart-stats">
      <div class="stat">
        <span class="label">最終權益</span>
        <span class="value">{{ formatCurrency(data.finalEquity) }}</span>
      </div>
      <div class="stat">
        <span class="label">總報酬</span>
        <span :class="['value', data.totalReturn >= 0 ? 'positive' : 'negative']">
          {{ formatPercent(data.totalReturn) }}
        </span>
      </div>
      <div class="stat">
        <span class="label">最大回撤</span>
        <span class="value negative">{{ formatPercent(data.maxDrawdown) }}</span>
      </div>
      <div class="stat">
        <span class="label">夏普比率</span>
        <span class="value">{{ data.sharpeRatio?.toFixed(2) || 'N/A' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import formatter from '@/utils/formatter.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: 'Equity Curve'
  },
  height: {
    type: Number,
    default: 300
  }
});

const chartTypes = [
  { label: '權益', value: 'equity' },
  { label: '回撤', value: 'drawdown' },
  { label: '報酬', value: 'return' }
];

const currentType = ref('equity');

// 權益曲線數據
const equityData = computed(() => ({
  labels: props.data.labels || [],
  datasets: [
    {
      label: 'Equity',
      data: props.data.equity || [],
      borderColor: '#4ecca3',
      backgroundColor: 'rgba(78, 204, 163, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4
    }
  ]
}));

// 回撤數據
const drawdownData = computed(() => ({
  labels: props.data.labels || [],
  datasets: [
    {
      label: 'Drawdown',
      data: props.data.drawdown || [],
      borderColor: '#e94560',
      backgroundColor: 'rgba(233, 69, 96, 0.2)',
      fill: true,
      tension: 0.4,
      pointRadius: 0
    }
  ]
}));

// 報酬數據
const returnData = computed(() => ({
  labels: props.data.labels || [],
  datasets: [
    {
      label: 'Return',
      data: props.data.returns || [],
      backgroundColor: props.data.returns?.map(r => 
        r >= 0 ? 'rgba(78, 204, 163, 0.8)' : 'rgba(233, 69, 96, 0.8)'
      ) || [],
      borderColor: 'transparent'
    }
  ]
}));

// 圖表選項
const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: '#2a2a4a',
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: (context) => ` ${formatter.formatCurrency(context.raw)}`
      }
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(42, 42, 74, 0.5)'
      },
      ticks: {
        color: '#a0a0a0',
        maxTicksLimit: 10
      }
    },
    y: {
      grid: {
        color: 'rgba(42, 42, 74, 0.5)'
      },
      ticks: {
        color: '#a0a0a0',
        callback: (value) => formatter.formatCurrency(value)
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index'
  }
};

const areaOptions = {
  ...lineOptions,
  scales: {
    ...lineOptions.scales,
    y: {
      ...lineOptions.scales.y,
      ticks: {
        ...lineOptions.scales.y.ticks,
        callback: (value) => formatter.formatPercent(Math.abs(value))
      }
    }
  }
};

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#1a1a2e',
      callbacks: {
        label: (context) => ` ${formatter.formatPercent(context.raw)}`
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        color: '#a0a0a0',
        maxTicksLimit: 10
      }
    },
    y: {
      grid: {
        color: 'rgba(42, 42, 74, 0.5)'
      },
      ticks: {
        color: '#a0a0a0',
        callback: (value) => formatter.formatPercent(value)
      }
    }
  }
};

// 格式化工具
const formatCurrency = (value) => formatter.formatCurrency(value || 0);
const formatPercent = (value) => formatter.formatPercent((value || 0) * 100);
</script>

<style scoped>
.backtest-chart {
  background: #1a1a2e;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #2a2a4a;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
}

.chart-controls {
  display: flex;
  gap: 8px;
}

.chart-btn {
  background: transparent;
  border: 1px solid #2a2a4a;
  color: #a0a0a0;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.chart-btn:hover {
  border-color: #4ecca3;
  color: #ffffff;
}

.chart-btn.active {
  background: #4ecca3;
  border-color: #4ecca3;
  color: #1a1a2e;
}

.chart-container {
  background: #16213e;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.chart-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stat {
  text-align: center;
}

.stat .label {
  display: block;
  color: #a0a0a0;
  font-size: 12px;
  margin-bottom: 4px;
}

.stat .value {
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
}

.stat .value.positive {
  color: #4ecca3;
}

.stat .value.negative {
  color: #e94560;
}

@media (max-width: 768px) {
  .chart-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
