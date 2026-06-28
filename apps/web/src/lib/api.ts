import axios from 'axios';
import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
      window.location.href = `${base}/login`;
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  register: (data: { email: string; name: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// Quiz API
export const quizApi = {
  create: (data: any) => api.post('/quizzes', data),
  list: (page = 1, limit = 20) => api.get(`/quizzes?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/quizzes/${id}`),
  update: (id: string, data: any) => api.put(`/quizzes/${id}`, data),
  delete: (id: string) => api.delete(`/quizzes/${id}`),
  duplicate: (id: string) => api.post(`/quizzes/${id}/duplicate`),
  addQuestion: (quizId: string, data: any) => api.post(`/quizzes/${quizId}/questions`, data),
  updateQuestion: (questionId: string, data: any) =>
    api.put(`/quizzes/questions/${questionId}`, data),
  deleteQuestion: (questionId: string) => api.delete(`/quizzes/questions/${questionId}`),
  reorderQuestions: (quizId: string, questionIds: string[]) =>
    api.put(`/quizzes/${quizId}/questions/reorder`, { questionIds }),
};

// Sessions API
export const sessionApi = {
  create: (quizId: string) => api.post('/sessions', { quizId }),
  list: (page = 1) => api.get(`/sessions?page=${page}`),
  get: (id: string) => api.get(`/sessions/${id}`),
  end: (id: string) => api.post(`/sessions/${id}/end`),
  results: (id: string) => api.get(`/sessions/${id}/results`),
  activeForQuiz: (quizId: string) => api.get(`/sessions/active-for-quiz?quizId=${quizId}`),
  cancel: (id: string) => api.patch(`/sessions/${id}/cancel`),
  abort: (id: string) => api.patch(`/sessions/${id}/abort`),
};

// Analytics API
export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  quiz: (id: string) => api.get(`/analytics/quizzes/${id}`),
  session: (id: string) => api.get(`/analytics/sessions/${id}`),
};

// Upload API
export const uploadApi = {
  image: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  cover: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/upload/cover', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Admin API
export const adminApi = {
  users: (page = 1, search?: string) =>
    api.get(`/admin/users?page=${page}${search ? `&search=${search}` : ''}`),
  updateRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  toggleStatus: (id: string) => api.patch(`/admin/users/${id}/toggle-status`),
  metrics: () => api.get('/admin/metrics'),
};
