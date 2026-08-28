import apiClient from './client';

export const createPrescription = (data) => apiClient.post('/medicine', data);
export const getPrescriptions = (userId) => apiClient.get(`/medicine/${userId}`);
export const logMedicine = (data) => apiClient.post('/medicine/log', data);