/*
import apiClient from './client';

export const register = (userData) => apiClient.post('/auth/register', userData);
export const login = (formData) => apiClient.post('/auth/login', formData, {
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
});
*/
import apiClient from './client';

export const registerApi = (userData) => {
  return apiClient.post('/auth/register', userData);
};

export const loginApi = (credentials) => {
  return apiClient.post('/auth/login', credentials, {
    headers: { 'Content-Type': 'application/json' }
  });
};