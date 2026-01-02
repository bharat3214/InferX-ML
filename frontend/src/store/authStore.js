import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (email, password) => {
                try {
                    const response = await api.post('/auth/login', { email, password })
                    const { access_token, user } = response.data

                    set({
                        user,
                        token: access_token,
                        isAuthenticated: true
                    })

                    // Set token in API headers
                    api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`

                    return { success: true }
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error || 'Login failed'
                    }
                }
            },

            register: async (email, username, password) => {
                try {
                    const response = await api.post('/auth/register', {
                        email,
                        username,
                        password
                    })

                    return { success: true, data: response.data }
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error || 'Registration failed'
                    }
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false
                })
                delete api.defaults.headers.common['Authorization']
            },

            checkAuth: () => {
                const { token } = get()
                if (token) {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
                    set({ isAuthenticated: true })
                }
            }
        }),
        {
            name: 'inferx-auth',
            partialize: (state) => ({
                token: state.token,
                user: state.user
            })
        }
    )
)
