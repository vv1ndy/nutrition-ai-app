import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://172.20.10.3:8000/api', 
  timeout: 60000,
});

apiClient.interceptors.request.use(async (config) => {
  // Lấy token từ AsyncStorage
  const token = await require('@react-native-async-storage/async-storage').default.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;