import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack'; // 1. Import Stack

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import ManualAddFoodScreen from '../screens/meal/ManualAddFoodScreen';

// 🔥 Bước 1: Import màn hình ProfileEditScreen 
// (Lưu ý: Hãy sửa lại đường dẫn '../screens/health/ProfileEditScreen' cho khớp với thư mục thực tế bạn đang lưu file này nhé)
import ProfileEditScreen from '../screens/health/ProfileEditScreen'; 

import { AuthContext } from '../context/AuthContext'; 

// 2. Khởi tạo Stack
const Stack = createNativeStackNavigator(); 

export default function AppNavigator() {
  const { userToken, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {userToken !== null ? (
        // 3. Dùng Stack để quản lý chung Tab và các màn hình phụ
        <Stack.Navigator>
          {/* Màn hình chính chứa các tab dưới đáy (ẩn header để không bị thanh tiêu đề kép) */}
          <Stack.Screen 
            name="MainTabs" 
            component={MainTabNavigator} 
            options={{ headerShown: false }} 
          />
          
          {/* Màn hình thêm món thủ công */}
          <Stack.Screen 
            name="ManualAddFood" 
            component={ManualAddFoodScreen} 
            options={{ title: 'Thêm Món Thủ Công' }} 
          />

          {/* 🔥 Bước 2: Khai báo màn hình ProfileEditScreen vào đây */}
          <Stack.Screen 
            name="ProfileEditScreen" 
            component={ProfileEditScreen} 
            options={{ title: 'Chỉnh Sửa Hồ Sơ' }} 
          />
          
        </Stack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}