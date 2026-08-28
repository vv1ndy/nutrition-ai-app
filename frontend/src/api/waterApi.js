import apiClient from './client';

export const logWater = (data) => apiClient.post('/water/log', data);
export const getWaterStats = (userId) => apiClient.get(`/water/stats/${userId}`);