import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 90000,
})

const RETRY_LIMIT = 2

function isTransient(error: any) {
  const status = error.response?.status
  return !error.response || status === 502 || status === 503 || status === 504
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flow_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    if (error.response?.status === 401 && !config?.url?.includes('/auth/login')) {
      localStorage.removeItem('flow_token')
      window.location.href = '/login'
      return Promise.reject(error)
    }
    // The API host sleeps when idle, so the first call after a quiet period can
    // fail or time out while it starts back up.
    if (config && isTransient(error)) {
      config.__retryCount = (config.__retryCount ?? 0) + 1
      if (config.__retryCount <= RETRY_LIMIT) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * config.__retryCount))
        return api(config)
      }
    }
    return Promise.reject(error)
  },
)

export default api
