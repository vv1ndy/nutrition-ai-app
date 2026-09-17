import React, { useState, useEffect, useContext, useCallback,useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Image, Animated} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../../api/client'; 
import { AuthContext } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

export default function AiSuggestScreen() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [buaAn, setBuaAn] = useState('Sáng'); 
  const [caloConLai, setCaloConLai] = useState(0);
  const [isCalculating, setIsCalculating] = useState(true);//Tránh hiện thông báo "Bạn còn 0 kcal" khi màn hình mới được load
  const [savingIndex, setSavingIndex] = useState(null);//Đánh dấu index của món ăn đang được lưu vào server để hiển thị loading indicator
  const { userToken } = useContext(AuthContext);
  const mealTypes = ['Sáng', 'Trưa', 'Tối', 'Phụ'];
  const scaleAnim = useRef(new Animated.Value(1)).current;
//Tạo hiệu ứng thở cho Mascot khi đang loading
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      scaleAnim.setValue(1); 
    }
  }, [loading]);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;//Kiểm tra xem màn hình còn đang hiện hay không trước khi setCaloConLai để tránh leak memory
      //Lấy dữ liệu calo còn lại trong ngày hiện tại mỗi khi người dùng quay lại màn hình này
      const fetchTodayCalories = async () => {
        try {
          setIsCalculating(true);
          const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
          const response = await apiClient.get('/meals/by-date', {
            params: { date: todayStr }
          });
          
          const dailyGoal = Number(response.data.daily_goal) || 2000;
          const consumedCalories = Number(response.data.consumed_calories) || 0;
          const remaining = dailyGoal - consumedCalories;
          
          if (isMounted) {
            setCaloConLai(isNaN(remaining) ? 0 : Math.round(remaining));
          }
        } catch (error) {
          if (isMounted) setCaloConLai(0);
        } finally {
          if (isMounted) setIsCalculating(false);
        }
      };

      fetchTodayCalories();

      return () => {
        isMounted = false;// Cleanup khi màn hình bị unmount
      };
    }, [])
  );

  const handleGetSuggestion = async () => {
    try {
      setLoading(true);
      setSuggestions([]); 
      
      const response = await apiClient.get('/ai/suggest-meal', {
        params: { 
          bua_an: buaAn
        }
      });

      if (response.data && response.data.status === 'success') {
        setSuggestions(response.data.data.goi_y);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lấy gợi ý từ AI lúc này. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMeal = async (item, index) => {
    try {
      setSavingIndex(index); 
      let currentUserId = null;
      if (userToken) {
        const decoded = jwtDecode(userToken);
        currentUserId = parseInt(decoded.user_id, 10);
      }
      const getTodayString = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
      };
      const payload = {
        user_id: currentUserId,
        ngay_an: getTodayString(),
        ten_mon_an: item.ten_mon_an, 
        loai_bua_an: buaAn, 
        so_luong_khau_phan: 1.0,
        meal_calories: item.meal_calories, 
        meal_protein_g: item.meal_protein_g, 
        meal_carb_g: item.meal_carb_g, 
        meal_fat_g: item.meal_fat_g,
        loi_khuyen: item.loi_khuyen || null,
        image_url: null,
        food_id: null
      };

      const response = await apiClient.post('/meals', payload);

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Thành công', `Đã thêm "${item.ten_mon_an}" vào nhật ký ăn uống!`,[{ text: 'OK', onPress: () => {} }]);
        setCaloConLai(prev => prev - item.meal_calories);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu món ăn vào nhật ký. Vui lòng thử lại!');
    } finally {
      setSavingIndex(null);
    }
  };

  // Logic sinh lời thoại cho Mascot
  const getMascotMessage = () => {
    if (isCalculating) return "Đợi WiKi tính toán sổ sách chút nha... 🧮";
    if (caloConLai > 0) return `Bạn còn ${caloConLai} kcal. Chọn một bữa bên dưới để WiKi thiết kế thực đơn nhé! 🥝`;
    return `Úi! Đã lố ${Math.abs(caloConLai)} kcal rồi. Nếu bạn đói, WiKi sẽ tìm món thật nhẹ nhàng nhé! 🥬`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}>
        <Text style={styles.title}>Trợ Lý Gợi Ý</Text>
        <Text style={styles.subtitle}>Thực đơn thiết kế riêng cho bạn 🥝</Text>
      </View>

      {/* KHU VỰC MASCOT CHAT BUBBLE */}
      <View style={styles.mascotContainer}>
        <Image source={require('../../../assets/mascot.png')} style={styles.mascotImg} resizeMode="contain" />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{getMascotMessage()}</Text>
          <View style={styles.bubbleArrow} />
        </View>
      </View>

      <View style={styles.tabContainer}>
        {mealTypes.map((meal) => (
          <TouchableOpacity 
            key={meal} 
            style={[styles.tabButton, buaAn === meal && styles.tabButtonActive]}
            onPress={() => setBuaAn(meal)}
          >
            <Text style={[styles.tabText, buaAn === meal && styles.tabTextActive]}>{meal}</Text>
          </TouchableOpacity>
        ))}
      </View>
{/* NÚT BẤM TẠO THỰC ĐƠN */}
      <TouchableOpacity 
        style={[styles.button, loading && { opacity: 0.7 }]} 
        onPress={handleGetSuggestion} 
        disabled={loading || isCalculating}
      >
        <Text style={styles.buttonText}>
          {loading ? `Đang thiết kế bữa ${buaAn}...` : `Tạo Thực Đơn Bữa ${buaAn}`}
        </Text>
      </TouchableOpacity>

      {/* HIỆU ỨNG MASCOT THỞ */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Animated.Image 
            source={require('../../../assets/mascot.png')} 
            style={[styles.animatedMascot, { transform: [{ scale: scaleAnim }] }]} 
          />
          <Text style={styles.loadingTextHighlight}>WiKi đang vắt óc suy nghĩ...</Text>
          <Text style={styles.loadingSubText}>Vui lòng chờ khoảng 10-15 giây nhé! 🥝</Text>
        </View>
      )}
{/* HIỂN THỊ DANH SÁCH KẾT QUẢ GỢI Ý TỪ AI */}
      {!loading && suggestions.length > 0 && (
        <View style={styles.resultContainer}>
          <Text style={styles.cardTitle}>✨ Món ngon WiKi đề xuất:</Text>
          {suggestions.map((item, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.foodName}>{item.ten_mon_an}</Text>
              
              <View style={styles.macroRow}>
                <View style={styles.macroBadge}><Text style={styles.macroBadgeText}>🔥 {item.meal_calories} kcal</Text></View>
                <View style={[styles.macroBadge, {backgroundColor: '#FEE2E2'}]}><Text style={[styles.macroBadgeText, {color: '#EF4444'}]}>P: {item.meal_protein_g}g</Text></View>
                <View style={[styles.macroBadge, {backgroundColor: '#DBEAFE'}]}><Text style={[styles.macroBadgeText, {color: '#3B82F6'}]}>C: {item.meal_carb_g}g</Text></View>
                <View style={[styles.macroBadge, {backgroundColor: '#FEF3C7'}]}><Text style={[styles.macroBadgeText, {color: '#D97706'}]}>F: {item.meal_fat_g}g</Text></View>
              </View>

              <View style={styles.adviceBox}>
                <Text style={styles.adviceText}>💡 {item.loi_khuyen}</Text>
              </View>

              <TouchableOpacity 
                style={styles.selectMealButton}
                onPress={() => handleSelectMeal(item, index)}
                disabled={savingIndex === index}
              >
                {savingIndex === index ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.selectMealButtonText}>✅ Chọn món này</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, backgroundColor: '#F1F8E9', flexGrow: 1 },
  
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '900', color: '#4E342E', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#689F38', fontWeight: '600', marginTop: 4 },
  
  // Mascot Bubble Style
  mascotContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
  mascotImg: { width: 65, height: 65, marginRight: 12 },
  bubble: { flex: 1, backgroundColor: '#ffffff', padding: 14, borderRadius: 16, borderColor: '#DCFCE7', borderWidth: 1, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2, position: 'relative' },
  bubbleText: { fontSize: 14, color: '#4E342E', fontWeight: '700', lineHeight: 20 },
  bubbleArrow: { position: 'absolute', left: -8, top: 20, width: 0, height: 0, borderTopWidth: 8, borderTopColor: 'transparent', borderBottomWidth: 8, borderBottomColor: 'transparent', borderRightWidth: 8, borderRightColor: '#ffffff' },

  tabContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  tabButton: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 14, backgroundColor: '#ffffff', flex: 1, marginHorizontal: 4, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  tabButtonActive: { backgroundColor: '#7CB342' },
  tabText: { color: '#6B7280', fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#ffffff' },
  
  button: { backgroundColor: '#5D4037', padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 16, shadowColor: '#4E342E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 4 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  
  resultContainer: { marginTop: 10 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#4E342E', marginBottom: 16 },
  
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 20, marginBottom: 20, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  foodName: { fontSize: 18, fontWeight: '900', color: '#2E7D32', marginBottom: 12, textAlign: 'center' },
  
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 12 },
  macroBadge: { backgroundColor: '#F3F4F6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  macroBadgeText: { fontSize: 12, fontWeight: '800', color: '#4B5563' },
  
  adviceBox: { marginTop: 10, backgroundColor: '#DCFCE7', padding: 12, borderRadius: 12 },
  adviceText: { fontSize: 13, color: '#166534', fontStyle: 'italic', lineHeight: 20, fontWeight: '500' },
  
  selectMealButton: { backgroundColor: '#7CB342', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 16 },
  selectMealButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  loadingContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
  animatedMascot: { width: 80, height: 80, resizeMode: 'contain', marginBottom: 20 },
  loadingTextHighlight: { fontSize: 16, fontWeight: '800', color: '#33691E', marginBottom: 8 },
  loadingSubText: { fontSize: 14, color: '#757575', fontStyle: 'italic' },
});