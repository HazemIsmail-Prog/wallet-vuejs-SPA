import axios, { type AxiosError } from 'axios'
import type { ApiError } from '../types/api'

const app = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

app.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 419) {
      window.location.assign('/login')
    }

    return Promise.reject(error)
  },
)

export function apiError(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error) && error.response) {
    const { data } = error.response

    if (data.errors) {
      return Object.values(data.errors).flat()[0] ?? data.message
    }

    return data.message
  }

  return 'Something went wrong.'
}

export default app