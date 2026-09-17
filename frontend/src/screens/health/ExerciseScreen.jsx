import React, { useState, useEffect, useContext, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Image, Dimensions, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native'; 
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { BarChart } from 'react-native-chart-kit'; 
import apiClient from '../../api/client'; 
import { AuthContext } from '../../context/AuthContext'; 
import { Ionicons } from '@expo/vector-icons'; 

WebBrowser.maybeCompleteAuthSession();

const STRAVA_CLIENT_ID = '273787'; 
const screenWidth = Dimensions.get("window").width;

export default function ExerciseScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  
  const [activities, setActivities] = useState([]);
  const [groupedActivities, setGroupedActivities] = useState([]);
  const [exerciseList, setExerciseList] = useState([]); 

  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showManualForm, setShowManualForm] = useState(false);
  const [exerciseKey, setExerciseKey] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [isExchanging, setIsExchanging] = useState(false); 

  const [todayBurned, setTodayBurned] = useState(0);
  const [weeklyChartData, setWeeklyChartData] = useState({ labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], data: [0,0,0,0,0,0,0] });

  const redirectUri = AuthSession.makeRedirectUri();
//Hàm mở AuthSession
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: STRAVA_CLIENT_ID,
      scopes: ['read', 'activity:read_all'],
      redirectUri,
      responseType: 'code',
    },
    { authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize' }
  );

  const fetchActivityDictionary = async () => {
    try {
      const res = await apiClient.get('/health/activity-dic');
      setExerciseList(res.data);
      if(res.data.length > 0 && !exerciseKey) {
          setExerciseKey(res.data[0].value); 
      }
    } catch (error) {
      console.log("Lỗi tải từ điển bài tập:", error);
    }
  };

  const fetchWeeklyChart = async () => {
    try {
      const res = await apiClient.get('/health/weekly-stats');
      setWeeklyChartData(res.data);
      if (res.data.data && res.data.data.length > 0) {
        setTodayBurned(res.data.data[res.data.data.length - 1]);
      }
    } catch (error) {
      console.log("Lỗi tải biểu đồ thể dục:", error);
    }
  };

  const fetchActivities = async (currentSkip = 0, isAppend = false) => {
    try {
      if (currentSkip > 0) setLoadingMore(true);
      const res = await apiClient.get(`/health/strava-activities?skip=${currentSkip}&limit=20`);
      
      if (res.data.length < 20) setHasMore(false);
      else setHasMore(true);

      if (isAppend) setActivities(prev => [...prev, ...res.data]);
      else setActivities(res.data);
    } catch (error) {
      console.log("Lỗi tải lịch sử thể dục:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const loadDataSequentially = async () => {
        await fetchActivityDictionary();
        setSkip(0);
        await fetchActivities(0, false);
        await fetchWeeklyChart();
      };
      
      loadDataSequentially();
    }, [])
  );

  useEffect(() => {
    if (response?.type === 'success' && !isExchanging) {
      setIsExchanging(true);
      const { code } = response.params;
      sendCodeToBackend(code);
    }
  }, [response]);

  useEffect(() => {
    if (activities && activities.length > 0) {
      const groups = {};
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 2); 
      limitDate.setHours(0, 0, 0, 0);

      activities.forEach(act => {
        if (!act.start_date) return;
        const datePart = act.start_date.split('T')[0];
        const actDate = new Date(datePart);
        
        if (actDate >= limitDate) {
            if (!groups[datePart]) groups[datePart] = [];
            groups[datePart].push(act);
        }
      });

      const groupedArr = Object.keys(groups).sort((a,b) => new Date(b) - new Date(a)).map(date => ({
        date,
        data: groups[date]
      }));
      setGroupedActivities(groupedArr);
    } else {
      setGroupedActivities([]);
    }
  }, [activities]);
  const sendCodeToBackend = async (code) => {
    try {
      await apiClient.post('/health/strava-exchange', { code: code });
      Alert.alert('Thành công', 'Đã kết nối Strava! Đang tải dữ liệu...');
      
      setSkip(0);
      await fetchActivities(0, false);
      await fetchWeeklyChart();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kết nối với Strava');
    } finally {
      setIsExchanging(false);
    }
  };

  const handleAddManualActivity = async () => {
    if (!durationMinutes || isNaN(durationMinutes)) {
      Alert.alert('Thông báo', 'Vui lòng nhập số phút tập hợp lệ!');
      return;
    }

    try {
      const payload = { exercise_key: exerciseKey, duration_minutes: parseFloat(durationMinutes) };
      const res = await apiClient.post('/health/activity', payload);
      Alert.alert('Thành công', `Đã lưu! Tiêu hao khoảng ${res.data.calories} kcal 🔥`);
      
      setDurationMinutes('');
      setShowManualForm(false);
      
      setSkip(0);
      await fetchActivities(0, false);
      await fetchWeeklyChart();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tính toán calo bài tập');
    }
  };

  const getMascotMessage = () => {
    if (todayBurned > 0) return `Tuyệt vời! Hôm nay bạn đã đốt cháy ${Math.round(todayBurned)} kcal. Cứ đà này thì vóc dáng chuẩn không cần chỉnh luôn! 🔥🥝`;
    return `Đổ mồ hôi, sôi calo! Ghi lại bài tập để WiKi cộng thêm calo cho bạn ăn ngon nhé! 💪🥝`;
  };

  // HÀM LẤY ICON ĐỒNG BỘ  VỚI DATABASE
  const getDynamicIcon = (act) => {
    if (!act) return '🏋️'; 

    // 1. Nếu là bài tập nhập thủ công, ưu tiên khớp chính xác tên với Database
    const foundAct = exerciseList.find(e => e.name === act.name);
    if (foundAct && foundAct.icon) {
        return foundAct.icon;
    }

    // 2. Nếu không khớp hoàn toàn (như tên từ Strava: "Morning Run"), quét từ khóa linh hoạt
    const nameLower = (act.name || '').toLowerCase();
    
    // Hàm phụ tìm icon trong Database thông qua 'value' (ví dụ: 'chay_bo', 'dap_xe')
    const getIconFromDB = (dbKey, fallbackIcon) => {
        const match = exerciseList.find(e => e.value.includes(dbKey));
        return match ? match.icon : fallbackIcon;
    };

// --- CÁC MÔN PHỔ BIẾN (CARDIO) ---
    if (nameLower.includes('chạy') || nameLower.includes('run')) return getIconFromDB('chay_bo_vua', '🏃');
    if (nameLower.includes('đi bộ') || nameLower.includes('walk')) return getIconFromDB('di_bo_binh_thuong', '🚶');
    if (nameLower.includes('đạp xe') || nameLower.includes('ride') || nameLower.includes('bike') || nameLower.includes('cycling')) return getIconFromDB('dap_xe_nhe', '🚴');
    if (nameLower.includes('bơi') || nameLower.includes('swim')) return getIconFromDB('boi_loi_nhe', '🏊');
    
    // --- CÁC MÔN THỂ HÌNH & TẬP LUYỆN KHÁC ---
    if (nameLower.includes('tạ') || nameLower.includes('gym') || nameLower.includes('weight')) return getIconFromDB('tap_ta_nhe', '💪');
    if (nameLower.includes('bodyweight') || nameLower.includes('kháng lực')) return getIconFromDB('bodyweight', '🤸');
    if (nameLower.includes('hiit') || nameLower.includes('crossfit')) return getIconFromDB('hiit', '⏱️');
    if (nameLower.includes('yoga')) return getIconFromDB('yoga', '🧘');
    if (nameLower.includes('pilates')) return getIconFromDB('pilates', '🧘‍♀️');
    if (nameLower.includes('zumba') || nameLower.includes('nhảy')) return getIconFromDB('zumba', '🕺');
    if (nameLower.includes('aerobic')) return getIconFromDB('aerobic', '💃');
    
    // --- THỂ THAO VỚI VỢT / GẬY ---
    if (nameLower.includes('cầu lông') || nameLower.includes('badminton')) return getIconFromDB('cau_long', '🏸');
    if (nameLower.includes('tennis') || nameLower.includes('quần vợt')) return getIconFromDB('tennis', '🎾');
    if (nameLower.includes('bóng bàn') || nameLower.includes('ping pong') || nameLower.includes('table tennis')) return getIconFromDB('bong_ban', '🏓');
    if (nameLower.includes('pickleball')) return getIconFromDB('pickleball', '🏓');
    if (nameLower.includes('golf')) return getIconFromDB('golf', '⛳');
    
    // --- THỂ THAO ĐỒNG ĐỘI (BÓNG) ---
    if (nameLower.includes('bóng đá') || nameLower.includes('football') || nameLower.includes('soccer')) return getIconFromDB('bong_da', '⚽');
    if (nameLower.includes('bóng rổ') || nameLower.includes('basketball')) return getIconFromDB('bong_ro', '🏀');
    if (nameLower.includes('bóng chuyền') || nameLower.includes('volleyball')) return getIconFromDB('bong_chuyen', '🏐');
    
    // --- CÁC MÔN KHÁC & VẬN ĐỘNG NHẸ ---
    if (nameLower.includes('nhảy dây') || nameLower.includes('jump rope')) return getIconFromDB('nhay_day_vua', '🪢');
    if (nameLower.includes('đá cầu')) return getIconFromDB('da_cau', '🦶');
    if (nameLower.includes('lắc vòng')) return getIconFromDB('lac_vong', '⭕');
    if (nameLower.includes('elip') || nameLower.includes('elliptical')) return getIconFromDB('may_elip', '⛷️');
    if (nameLower.includes('leo cầu thang') || nameLower.includes('stair')) return getIconFromDB('leo_cau_thang', '🧗');
    
    // --- VÕ THUẬT & TRƯỢT/CHÈO ---
    if (nameLower.includes('võ') || nameLower.includes('martial arts')) return getIconFromDB('vo_thuat', '🥋');
    if (nameLower.includes('boxing') || nameLower.includes('đấm bốc') || nameLower.includes('bao cát')) return getIconFromDB('dam_bao_cat', '🥊');
    if (nameLower.includes('patin') || nameLower.includes('roller') || nameLower.includes('inline skate')) return getIconFromDB('truot_patin', '🛼');
    if (nameLower.includes('trượt băng') || nameLower.includes('ice skate')) return getIconFromDB('truot_bang', '⛸️');
    if (nameLower.includes('chèo') || nameLower.includes('rowing') || nameLower.includes('sup') || nameLower.includes('kayak')) return getIconFromDB('cheo_sup', '🚣');
    
    // --- GIẢI TRÍ ---
    if (nameLower.includes('bida') || nameLower.includes('billiards') || nameLower.includes('pool')) return getIconFromDB('bida', '🎱');
    if (nameLower.includes('bowling')) return getIconFromDB('bowling', '🎳');

    return act.type === 'STRAVA' ? '🔥' : '🏋️';
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(78, 52, 46, ${opacity})`,
    style: { borderRadius: 16 },
    barPercentage: 0.6,
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Nhật Ký Vận Động</Text>
        <TouchableOpacity style={styles.settingsIconButton} onPress={() => navigation.navigate('ProfileEditScreen')}>
          <Ionicons name="settings" size={24} color="#689F38" />
        </TouchableOpacity>
      </View>

      <View style={styles.mascotContainer}>
        <Image source={require('../../../assets/mascot.png')} style={styles.mascotImg} resizeMode="contain" />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{getMascotMessage()}</Text>
          <View style={styles.bubbleArrow} />
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>📊 Thống kê 7 ngày qua</Text>
        <BarChart
          data={{ labels: weeklyChartData.labels, datasets: [{ data: weeklyChartData.data }] }}
          width={screenWidth - 60}
          height={220}
          yAxisSuffix=" kcal"
          fromZero={true}
          chartConfig={chartConfig}
          style={styles.chartStyle}
          showValuesOnTopOfBars={true}
        />
      </View>

      <TouchableOpacity style={styles.stravaButton} disabled={!request} onPress={() => promptAsync()}>
        <Ionicons name="fitness" size={20} color="#fff" style={{marginRight: 8}} />
        <Text style={styles.stravaButtonText}>Kết nối với Strava</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.manualToggleButton} onPress={() => setShowManualForm(!showManualForm)}>
        <Ionicons name={showManualForm ? "close-circle" : "add-circle"} size={20} color="#5D4037" style={{marginRight: 8}} />
        <Text style={styles.manualToggleText}>
          {showManualForm ? 'Đóng form thủ công' : 'Thêm bài tập thủ công'}
        </Text>
      </TouchableOpacity>

      {showManualForm && (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Chọn môn thể thao:</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer} contentContainerStyle={{ paddingRight: 20 }}>
            {exerciseList.map((ex) => (
              <TouchableOpacity
                key={ex.value}
                style={[styles.chip, exerciseKey === ex.value && styles.chipActive]}
                onPress={() => setExerciseKey(ex.value)}
              >
                <Text style={[styles.chipText, exerciseKey === ex.value && styles.chipTextActive]}>{ex.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Thời gian tập (Phút):</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="time-outline" size={22} color="#7CB342" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="VD: 45"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={durationMinutes}
              onChangeText={setDurationMinutes}
            />
          </View>
          
          <TouchableOpacity style={styles.submitButton} onPress={handleAddManualActivity}>
            <Ionicons name="save-outline" size={20} color="#ffffff" style={{marginRight: 8}} />
            <Text style={styles.submitButtonText}>Lưu & Tính Calo</Text>
          </TouchableOpacity>
        </View>
      )}

      {groupedActivities.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Chưa có dữ liệu bài tập trong 3 ngày gần đây. Hãy đứng lên và vận động thôi nào! 🏃‍♀️</Text>
        </View>
      ) : (
        groupedActivities.map((group, index) => {
          const now = new Date();
          now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
          const todayStr = now.toISOString().split('T')[0];
          
          const isToday = group.date === todayStr;
          const [year, month, day] = group.date.split('-');
          const dateLabel = isToday ? 'Hôm nay' : `${day}/${month}/${year}`;
          
          const dayTotalCal = group.data.reduce((sum, act) => sum + (parseFloat(act.calories) || 0), 0);

          return (
            <View key={index} style={styles.dayGroup}>
              <View style={styles.dayHeader}>
                <View style={styles.dateLabelContainer}>
                  <Ionicons name="calendar" size={20} color="#EA580C" style={{marginRight: 6}} />
                  <Text style={styles.dayTitle}>{dateLabel}</Text>
                </View>
                <View style={styles.dayTotalBadge}>
                  <Text style={styles.dayTotalText}>🔥 {Math.round(dayTotalCal)} kcal</Text>
                </View>
              </View>

              {group.data.map((act, actIndex) => (
                <View key={actIndex} style={styles.activityCard}>
                  <View style={styles.activityLeft}>
                    <View style={styles.iconContainer}>
                       <Text style={styles.actIcon}>{getDynamicIcon(act)}</Text>
                    </View>
                    <View style={styles.actInfo}>
                      <Text style={styles.actName}>{act.name}</Text>
                      {act.distance > 0 && (
                        <Text style={styles.actDetail}>📏 {(act.distance / 1000).toFixed(2)} km</Text>
                      )}
                      <Text style={[styles.actSource, act.type === 'STRAVA' ? styles.sourceStrava : styles.sourceManual]}>
                        {act.type === 'STRAVA' ? 'Đồng bộ Strava' : 'Nhập thủ công'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.caloBadge}>
                    <Text style={styles.caloBadgeText}>+{Math.round(act.calories)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )
        })
      )}

      {hasMore && activities.length > 0 && (
        <TouchableOpacity 
          style={styles.loadMoreButton} 
          onPress={() => {
            const nextSkip = skip + 20;
            setSkip(nextSkip);
            fetchActivities(nextSkip, true);
          }}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <ActivityIndicator color="#558B2F" />
          ) : (
            <Text style={styles.loadMoreText}>Tải thêm dữ liệu cũ</Text>
          )}
        </TouchableOpacity>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#F1F8E9', flexGrow: 1, paddingTop: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#4E342E', letterSpacing: -0.5 },
  settingsIconButton: { backgroundColor: '#ffffff', padding: 10, borderRadius: 14, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
  mascotContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
  mascotImg: { width: 65, height: 65, marginRight: 12 },
  bubble: { flex: 1, backgroundColor: '#ffffff', padding: 14, borderRadius: 16, borderColor: '#DCFCE7', borderWidth: 1, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2, position: 'relative' },
  bubbleText: { fontSize: 13, color: '#166534', fontWeight: '700', lineHeight: 20 },
  bubbleArrow: { position: 'absolute', left: -8, top: 20, width: 0, height: 0, borderTopWidth: 8, borderTopColor: 'transparent', borderBottomWidth: 8, borderBottomColor: 'transparent', borderRightWidth: 8, borderRightColor: '#ffffff' },
  chartCard: { backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 24, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 4, alignItems: 'center' },
  chartTitle: { fontSize: 17, fontWeight: '900', color: '#EA580C', marginBottom: 16, alignSelf: 'flex-start' },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  stravaButton: { flexDirection: 'row', justifyContent: 'center', backgroundColor: '#fc4c02', padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 12, shadowColor: '#fc4c02', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 4 },
  stravaButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  manualToggleButton: { flexDirection: 'row', justifyContent: 'center', backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#7CB342', padding: 16, borderRadius: 20, alignItems: 'center', marginBottom: 24 },
  manualToggleText: { color: '#5D4037', fontSize: 15, fontWeight: '800' },
  formContainer: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, marginBottom: 24, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  formTitle: { fontSize: 16, fontWeight: '900', marginBottom: 12, color: '#4E342E' },
  chipContainer: { marginBottom: 20, flexDirection: 'row' },
  chip: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#7CB342', borderColor: '#7CB342', shadowColor: '#7CB342', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, elevation: 3 },
  chipText: { color: '#4B5563', fontWeight: '700', fontSize: 14 },
  chipTextActive: { color: '#ffffff', fontWeight: '900' },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 8, fontWeight: '700' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#DCFCE7', marginBottom: 20, paddingHorizontal: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, color: '#4E342E', fontSize: 16, fontWeight: '800' },
  submitButton: { flexDirection: 'row', justifyContent: 'center', backgroundColor: '#5D4037', padding: 16, borderRadius: 20, alignItems: 'center', shadowColor: '#4E342E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 4 },
  submitButtonText: { color: '#ffffff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  emptyBox: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#DCFCE7', borderStyle: 'dashed' },
  emptyText: { color: '#689F38', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  dayGroup: { marginBottom: 24 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4, borderBottomWidth: 1.5, borderBottomColor: '#DCFCE7', paddingBottom: 8 },
  dateLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  dayTitle: { fontSize: 17, fontWeight: '900', color: '#4E342E' },
  dayTotalBadge: { backgroundColor: '#FFEDD5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dayTotalText: { fontSize: 13, fontWeight: '800', color: '#EA580C' },
  activityCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 16, marginBottom: 12, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  activityLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { backgroundColor: '#F1F8E9', width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actIcon: { fontSize: 22 },
  actInfo: { flex: 1 },
  actName: { fontSize: 16, fontWeight: '800', color: '#1F2937', marginBottom: 2 },
  actDetail: { color: '#6B7280', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  actSource: { fontSize: 11, fontWeight: '700' },
  sourceStrava: { color: '#fc4c02' },
  sourceManual: { color: '#7CB342' },
  caloBadge: { backgroundColor: '#DCFCE7', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, marginLeft: 10 },
  caloBadgeText: { color: '#166534', fontWeight: '900', fontSize: 15 },
  loadMoreButton: { padding: 14, alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 16, marginTop: 10, marginBottom: 30, borderWidth: 1, borderColor: '#C8E6C9' },
  loadMoreText: { color: '#388E3C', fontWeight: '800', fontSize: 15 }
});