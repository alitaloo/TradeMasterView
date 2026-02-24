// Toast Composable - 全局錯誤處理
import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

export function useToast() {
  const addToast = (message, type = 'error', duration = 5000) => {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    
    // 自動移除
    setTimeout(() => {
      removeToast(id)
    }, duration)
    
    return id
  }
  
  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }
  
  const error = (message, duration) => addToast(message, 'error', duration)
  const success = (message, duration) => addToast(message, 'success', duration)
  const warning = (message, duration) => addToast(message, 'warning', duration)
  const info = (message, duration) => addToast(message, 'info', duration)
  
  return {
    toasts,
    addToast,
    removeToast,
    error,
    success,
    warning,
    info
  }
}
