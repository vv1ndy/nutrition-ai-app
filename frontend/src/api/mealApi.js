import apiClient from './client';

export const analyzeFood = (formData) => apiClient.post('/ai/analyze-food', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getHistory = (userId) => apiClient.get(`/meal/history/${userId}`);
export const saveMeal = (mealData) => apiClient.post('/meals', mealData);