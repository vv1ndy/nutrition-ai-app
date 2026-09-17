import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, SectionList, ActivityIndicator, Dimensions, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import apiClient from '../../api/client';

const screenWidth = Dimensions.get("window").width;

export default function FoodLogScreen() {
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [foodLogs, setFoodLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ total_calories: 0, total_protein: 0, total_carb: 0, total_fat: 0 });
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateForAPI = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };
//hiển thị ngày ra giao diện
  const getDisplayDate = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hôm nay";
    if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
    return date.toLocaleDateString('vi-VN'); 
  };

  const fetchFoodLogs = async () => {
    try {
      setLoading(true);
      const dateStr = formatDateForAPI(selectedDate);
      const response = await apiClient.get('/meals/by-date', { params: { date: dateStr } });//Lấy dữ liệu API trả về
      
      const logs = response.data.meals || [];
      const tdee = response.data.daily_goal || 2000; 
      const summaryData = response.data.summary || { total_calories: 0, total_protein: 0, total_carb: 0, total_fat: 0 };
      
      setFoodLogs(logs);
      setSummary(summaryData);
      setDailyGoal(Number(tdee));

    } catch (error) {
      //Nếu có lỗi đưa các chỉ số về 0 để app không bị crash
      console.log("LỖI SERVER TRẢ VỀ:", error.response?.data || error.message);
      setDailyGoal(2000); 
      setSummary({ total_calories: 0, total_protein: 0, total_carb: 0, total_fat: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFoodLogs();
    }, 
    [selectedDate])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFoodLogs();
  };
//Thay đổi ngày để hiển thị danh sách món ăn trong các ngày khác
  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };
//Gom nhóm lại các món ăn lấy về từ backend rồi hiển thị theo các bữa ăn
  const getGroupedMeals = () => {
    const groups = { 'Sáng': [], 'Trưa': [], 'Tối': [], 'Khác': [] };
    
    foodLogs.forEach(log => {
      const type = (log.loai_bua_an || '').normalize('NFC').toLowerCase().trim();
      if (type.includes('sáng')|| type.includes('breakfast')) groups['Sáng'].push(log);
      else if (type.includes('trưa')|| type.includes('lunch')) groups['Trưa'].push(log);
      else if (type.includes('tối')|| type.includes('dinner')) groups['Tối'].push(log);
      else groups['Khác'].push(log);
    });

    return [
      { title: '🌅 Bữa Sáng', data: groups['Sáng'] },
      { title: '☀️ Bữa Trưa', data: groups['Trưa'] },
      { title: '🌙 Bữa Tối', data: groups['Tối'] },
      { title: '🥪 Bữa Phụ / Khác', data: groups['Khác'] },
    ].filter(section => section.data.length > 0);
  };

  const currentCalories = summary.total_calories;
  const progressPercentage = Math.min((currentCalories / dailyGoal) * 100, 100);
  const progressBarColor = currentCalories > dailyGoal ? '#EF4444' : '#7CB342';
  
  const remainingCalories = dailyGoal - currentCalories;
  let mascotMessage = "";
  if (remainingCalories > 0) {
    mascotMessage = `Cố lên! Bạn còn ${remainingCalories.toFixed(0)} kcal cho hôm nay. Nhớ chọn món thật Healthy nhé! 🥗`;
  } 
  else if(remainingCalories < 100 && remainingCalories >= 0) 
  {
    mascotMessage = `Úi chà! Hôm nay bạn sắp hoàn thành mục tiêu calo của ngày hôm nay rồi. Chú ý chọn những món ít calo, lành mạnh nhé! 🥝`;
  }
  else {
    mascotMessage = `Úi chà! Hôm nay bạn đã nạp thừa ${Math.abs(remainingCalories).toFixed(0)} calo rồi. Nếu ăn thêm nhớ vận động để tiêu hao nhé! 🏃‍♂️`;
  }

  const totalMacros = summary.total_protein + summary.total_carb + summary.total_fat;
  const hasMacroData = totalMacros > 0;
  
  let pPercent = 0, cPercent = 0, fPercent = 0;
  if (hasMacroData) {
    pPercent = Math.round((summary.total_protein / totalMacros) * 100);
    cPercent = Math.round((summary.total_carb / totalMacros) * 100);
    fPercent = Math.round((summary.total_fat / totalMacros) * 100);
  }

  const chartData = [
    { name: `g Protein (${pPercent}%)`, population: Math.round(summary.total_protein), color: "#EF4444", legendFontColor: "#4E342E", legendFontSize: 13 },
    { name: `g Carb (${cPercent}%)`, population: Math.round(summary.total_carb), color: "#3B82F6", legendFontColor: "#4E342E", legendFontSize: 13 },
    { name: `g Fat (${fPercent}%)`, population: Math.round(summary.total_fat), color: "#F59E0B", legendFontColor: "#4E342E", legendFontSize: 13 }
  ];

  if (loading && !refreshing && foodLogs.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#7CB342" />
      </View>
    );
  }

  // --- HÀM GỘP GIAO DIỆN NẰM Ở TRÊN CÙNG ---
  const renderHeader = () => (
    <View style={{ paddingBottom: 10 }}>
      {/* 2 THANH ĐIỀU HƯỚNG NGÀY VÀ HIỂN THỊ NGÀY Ở TRÊN CÙNG */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
          <Text style={styles.dateBtnText}>◀</Text>
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Nhật Ký Dinh Dưỡng</Text>
          <Text style={styles.headerSubtitle}>{getDisplayDate(selectedDate)}</Text>
        </View>

        <TouchableOpacity 
          onPress={() => changeDate(1)} 
          style={styles.dateBtn}
          disabled={selectedDate.toDateString() === new Date().toDateString()} 
        >
          <Text style={[styles.dateBtnText, selectedDate.toDateString() === new Date().toDateString() && { opacity: 0.2 }]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* KHU VỰC MASCOT CHAT BUBBLE */}
      <View style={styles.mascotContainer}>
        <Image source={require('../../../assets/mascot.png')} style={styles.mascotImg} resizeMode="contain" />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{mascotMessage}</Text>
          <View style={styles.bubbleArrow} />
        </View>
      </View>

      {/* TỔNG KẾT CALO & MACRO */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Tổng Kết {getDisplayDate(selectedDate)}</Text>
        <Text style={styles.caloriesText}>🔥 {summary.total_calories.toFixed(0)} <Text style={{fontSize: 16, fontWeight: '600'}}>Kcal</Text></Text>
        
        <View style={{ marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: '#4E342E', fontSize: 13, fontWeight: '700' }}>Tiến độ nạp Calo</Text>
            <Text style={{ color: '#5D4037', fontSize: 13, fontWeight: '900' }}>
              {currentCalories.toFixed(0)} / {dailyGoal} kcal
            </Text>
          </View>
          
          <View style={{ height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${progressPercentage}%`, backgroundColor: progressBarColor, borderRadius: 6 }} />
          </View>
        </View>

        {hasMacroData ? (
          <View style={styles.chartWrapper}>
            <Text style={styles.chartTitle}>Tỉ lệ cân bằng Dinh dưỡng</Text>
            <PieChart
              data={chartData}
              width={screenWidth - 60}
              height={140}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"5"}
              absolute
            />
          </View>
        ) : (
          <View style={styles.macroRow}>
            <View style={styles.macroItem}><Text style={styles.macroLabel}>Protein</Text><Text style={styles.macroValue}>0g</Text></View>
            <View style={styles.macroItem}><Text style={styles.macroLabel}>Carb</Text><Text style={styles.macroValue}>0g</Text></View>
            <View style={styles.macroItem}><Text style={styles.macroLabel}>Fat</Text><Text style={styles.macroValue}>0g</Text></View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    //Thanh hiển thị danh sách món ăn theo ngày
    <View style={styles.container}>
      <SectionList
        ListHeaderComponent={renderHeader}
        sections={getGroupedMeals()}
        keyExtractor={(item, index) => item.meal_id?.toString() || index.toString()}//Gán key cho từng món ăn
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7CB342']} />}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionTitle}>{title}</Text>//Hiển thị tên các bữa ăn( Sáng, Trưa, Tối, Phụ)
        )}
          renderItem={({ item }) => (
          <View style={[styles.foodItemCard, { flexDirection: 'column' }]}>
            
            {/* --- KHỐI 1: Tên món ăn (trái) và Calo & Macro (phải) --- */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Text style={[styles.foodName, { flex: 1, marginRight: 10, lineHeight: 22 }]}>
                {item.ten_mon_an}
              </Text>
              
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                <Text style={styles.foodCalories}>{parseFloat(item.meal_calories).toFixed(0)} kcal</Text>
                <Text style={styles.foodMacro}>
                  P: {parseFloat(item.meal_protein_g).toFixed(1)}g | 
                  C: {parseFloat(item.meal_carb_g).toFixed(1)}g | 
                  F: {parseFloat(item.meal_fat_g).toFixed(1)}g
                </Text>
              </View>
            </View>

            {/* --- KHỐI 2: Hình ảnh (Hiển thị to, full chiều ngang) --- */}
            <View style={{width: '100%', marginBottom: item.loi_khuyen ? 12 : 0 }}>
              <Image 
                source={
                  item.image_url
                    ? { uri: item.image_url } 
                    : require('../../../assets/icon.png') 
                } 
                style={{ 
                  width: '100%', 
                  height: 160, //  có thể tăng lên 180 hoặc 200 nếu muốn ảnh to hơn nữa
                  borderRadius: 8, 
                  backgroundColor: '#f0f0f0',
                  resizeMode: 'cover' 
                }} 
              />
            </View>

            {/* --- KHỐI 3: Lời khuyên (Nằm dưới cùng, tràn đủ chiều ngang) --- */}
            {item.loi_khuyen ? (
              <View>
                <Text style={{ fontSize: 13, color: '#689F38', fontStyle: 'italic', lineHeight: 20 }}>
                  💡 {item.loi_khuyen}
                </Text>
              </View>
            ) : null}
            
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>🍽️ Chưa ghi nhận bữa ăn nào vào ngày hôm nay</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F8E9', paddingHorizontal: 16, paddingTop: 40 }, 
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F8E9' },
  
  dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  dateBtn: { padding: 10, backgroundColor: '#ffffff', borderRadius: 12, width: 44, alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 2 },
  dateBtnText: { fontSize: 16, fontWeight: '900', color: '#5D4037' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#4E342E' },
  headerSubtitle: { fontSize: 15, color: '#689F38', fontWeight: '700' },
  
  mascotContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  mascotImg: { width: 60, height: 60, marginRight: 12 },
  bubble: { flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: 16, borderColor: '#DCFCE7', borderWidth: 1, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2, position: 'relative' },
  bubbleText: { fontSize: 13, color: '#4E342E', fontWeight: '600', lineHeight: 18 },
  bubbleArrow: { position: 'absolute', left: -8, top: 20, width: 0, height: 0, borderTopWidth: 8, borderTopColor: 'transparent', borderBottomWidth: 8, borderBottomColor: 'transparent', borderRightWidth: 8, borderRightColor: '#ffffff' },

  summaryCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  summaryTitle: { color: '#6B7280', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  caloriesText: { color: '#4E342E', fontSize: 32, fontWeight: '900', marginBottom: 16 },
  
  chartWrapper: { alignItems: 'center', marginTop: 10, backgroundColor: '#F9FAFB', borderRadius: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  chartTitle: { fontSize: 13, fontWeight: 'bold', color: '#6B7280', marginBottom: -10, zIndex: 1 },

  macroRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 14, marginTop: 10 },
  macroItem: { alignItems: 'center', flex: 1 },
  macroLabel: { color: '#6B7280', fontSize: 12, marginBottom: 4, fontWeight: '600' },
  macroValue: { color: '#4E342E', fontSize: 15, fontWeight: '900' },
  
  sectionTitle: { fontSize: 17, fontWeight: '900', marginTop: 10, marginBottom: 12, color: '#5D4037', backgroundColor: '#F1F8E9' },
  foodItemCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#558B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  foodName: { fontSize: 16, fontWeight: '800', color: '#4E342E' },
  foodCalories: { fontSize: 16, fontWeight: '900', color: '#EF4444' },
  foodMacro: { fontSize: 12, color: '#4E342E', marginTop: 4, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#689F38', textAlign: 'center' },
});