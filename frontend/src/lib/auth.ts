import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Don't set Content-Type for FormData, let browser set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })
    return Promise.reject(error)
  }
)

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },

  register: async (name: string, email: string, password: string, role: string) => {
    const response = await api.post('/auth/register', { name, email, password, role })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

export const studentService = {
  getAll: async () => {
    const response = await api.get('/students')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/students/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await api.post('/students', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/students/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/students/${id}`)
    return response.data
  },
}

export const teacherService = {
  getAll: async () => {
    const response = await api.get('/teachers')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/teachers/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await api.post('/teachers', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/teachers/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/teachers/${id}`)
    return response.data
  },
}

export const classService = {
  getAll: async () => {
    const response = await api.get('/classes')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/classes/${id}`)
    return response.data
  },

  create: async (data: any) => {
    const response = await api.post('/classes', data)
    return response.data
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/classes/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/classes/${id}`)
    return response.data
  },
}

export const profileService = {
  getProfile: async () => {
    const response = await api.get('/profile')
    return response.data
  },

  updateProfile: async (formData: FormData) => {
    const response = await api.put('/profile/update', formData)
    return response.data
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.put('/profile/change-password', {
      currentPassword,
      newPassword,
    })
    return response.data
  },
}