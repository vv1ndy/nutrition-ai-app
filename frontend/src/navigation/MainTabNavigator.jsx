import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/home/HomeScreen';
import FoodLogScreen from '../screens/meal/FoodLogScreen';
import ScanFoodScreen from '../screens/meal/ScanFoodScreen'; // Màn hình Scan AI của bạn
import ExerciseScreen from '../screens/health/ExerciseScreen';
import AiSuggestScreen from '../screens/meal/AiSuggestScreen';
const Tab = createBottomTabNavigator();

// Custom nút ở giữa nổi bật cho tab ScanFood
const CustomScanButton = ({ children, onPress }) => (
  <TouchableOpacity
    style={styles.scanButtonContainer}
    onPress={onPress}
  >
    <View style={styles.scanButton}>
      {children}
    </View>
  </TouchableOpacity>
);

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2e7d32',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: styles.tabBar,
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="home" size={size} color={color} />,
          title: 'Trang Chủ'
        }} 
      />

      <Tab.Screen 
        name="FoodLog" 
        component={FoodLogScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="restaurant" size={size} color={color} />,
          title: 'Bữa Ăn'
        }} 
      />

      {/* Tab Scan AI đặt ở chính giữa với nút nổi bật */}
      <Tab.Screen 
        name="ScanFood" 
        component={ScanFoodScreen} 
        options={{ 
          tabBarIcon: () => <Ionicons name="camera" size={30} color="#fff" />,
          tabBarLabel: () => null, // Ẩn chữ đi để nút trông gọn và đẹp hơn
          tabBarButton: (props) => <CustomScanButton {...props} />
        }} 
      />
      <Tab.Screen 
        name="AiSuggest" 
        component={AiSuggestScreen} 
        options={{
          tabBarLabel: 'AI Gợi ý',
          tabBarIcon: ({ color, size }) => (
            // Dùng icon tia sét hoặc bóng đèn (Tùy thuộc vào thư viện icon bạn đang dùng, ví dụ Ionicons)
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }} 
      />

      <Tab.Screen 
  name="Exercise" 
  component={ExerciseScreen} 
  options={{
    tabBarLabel: 'Thể dục',
    // Bạn có thể đổi icon tương ứng ở đây (ví dụ dùng Ionicons 'bicycle' hoặc 'fitness')
      tabBarIcon: ({ color, size }) => (
      <Ionicons name="fitness" color={color} size={size} />
    ),
  }} 
/>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  scanButtonContainer: {
    top: -15, // Tạo hiệu ứng nổi lên trên thanh tab bar
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2e7d32', // Màu xanh chủ đạo
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8, // Hiệu ứng đổ bóng trên Android
  },
});