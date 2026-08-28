import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra token khi ứng dụng khởi động
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
      } catch (e) {
        console.log('Lỗi đọc token:', e);
      } finally {
        setIsLoading(false); // Đảm bảo luôn tắt loading dù thành công hay lỗi
      }
    };
    loadToken();
  }, []);

  const login = async (token) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      setUserToken(token); // Cập nhật token, app sẽ tự động chuyển sang MainTabNavigator
    } catch (e) {
      console.log('Lỗi lưu token:', e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setUserToken(null); // Xóa token, app tự động chuyển về AuthNavigator
    } catch (e) {
      console.log('Lỗi đăng xuất:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ userToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};