import React, { useState, useContext, useCallback, useRef, useEffect} from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, Image, Modal, TextInput, Alert, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit'; 
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { jwtDecode } from 'jwt-decode';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);

  const [chartData, setChartData] = useState({ labels: [], data: [] });
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [waterChartData, setWaterChartData] = useState({ labels: [], data: [] });
  const [todayWater, setTodayWater] = useState(0);
  const [targetWater, setTargetWater] = useState(2000);
  const [waterLogs, setWaterLogs] = useState([]); 

  // --- THÊM STATE ĐỂ LƯU MỨC NƯỚC ĐANG CHỌN ---
  const [waterModalVisible, setWaterModalVisible] = useState(false);
  const [waterAction, setWaterAction] = useState('add'); 
  const [customWaterAmount, setCustomWaterAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(250); // Mặc định chọn sẵn 250ml

  const { logout, userToken } = useContext(AuthContext);//Xử lý đăng xuất
  // Khai báo biến lưu trạng thái phóng to/thu nhỏ
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Hiệu ứng mascot đập khi màn hình đang tải dữ liệu
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

  let currentUserId = null;
  if (userToken) {
    const decoded = jwtDecode(userToken);
    currentUserId = parseInt(decoded.user_id, 10);
  }
  const fetchData = async () => {
    try {
      setLoading(true);
      const getTodayString = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
      };
      const todayStr = getTodayString();
      
      // Gom 3 API call vào Promise.all để thực hiện song song, tăng tốc độ tải dữ liệu
      const [caloRes, waterTodayRes, waterWeeklyRes] = await Promise.all([
        apiClient.get('/meals/weekly-stats', { params: { date_str: todayStr } }),
        apiClient.get('/water/today').catch(e => ({ data: null, error: e })), // Bắt lỗi riêng từng API
        apiClient.get('/water/weekly-stats').catch(e => ({ data: null, error: e }))
      ]);

      if (caloRes && caloRes.data) {
        setChartData({
          labels: caloRes.data.labels,//Lưu ngày
          data: caloRes.data.data//Lưu calo
        });
        setDailyGoal(caloRes.data.daily_goal || 2000);
      }

      if (waterTodayRes && waterTodayRes.data) {
        setTodayWater(waterTodayRes.data.total_ml || 0);
        setTargetWater(waterTodayRes.data.target_ml || 2000);
        setWaterLogs(waterTodayRes.data.logs || []);
      }

      if (waterWeeklyRes && waterWeeklyRes.data) {
         setWaterChartData(waterWeeklyRes.data);
      }

    } catch (error) {
      console.log("Lỗi tải dữ liệu màn hình chính:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const handleLogWater = async (amount) => {
    if (!amount || isNaN(amount)) return;
    // Xác định lượng nước cuối cùng dựa trên hành động (add/subtract)
    const finalAmount = waterAction === 'subtract' ? -Math.abs(amount) : Math.abs(amount);
    //Đảm bảo lượng nước không âm
    if (waterAction === 'subtract' && todayWater + finalAmount < 0) {
      Alert.alert("Lỗi", "Lượng nước không thể bé hơn 0 ml!");
      return;
    }
    setIsSubmitting(true);//Khóa nút xác nhận để tránh lưu nhầm nhiều lần
    setWaterModalVisible(false);//Đóng khung nhập liệu
    setCustomWaterAmount('');//Xóa ô nhập lượng nước thủ công

    try {
      await apiClient.post('/water/log', { luong_nuoc_ml: finalAmount });
      fetchData();
    } catch (error) {
      console.log("Lỗi lưu nước:", error);
      Alert.alert("Lỗi", "Không thể lưu lượng nước, vui lòng kiểm tra kết nối.");
    } finally {
      setIsSubmitting(false);
    }
  };
//Khởi tạo các giá trị khi mở Modal, bao gồm reset ô nhập tay và khôi phục giá trị mặc định 250 ml
  const openWaterModal = (action) => {
    setWaterAction(action);
    setSelectedAmount(250); // Khôi phục mặc định khi mở Modal
    setCustomWaterAmount(''); // Xóa ô nhập tay
    setWaterModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <Animated.Image 
          source={require('../../../assets/mascot.png')} 
          style={[styles.animatedMascot, { transform: [{ scale: scaleAnim }] }]} 
        />
        <Text style={styles.loadingTextHighlight}>Đang chuẩn bị hồ sơ...</Text>
        <Text style={styles.loadingSubText}>Chờ Kiwi dọn dẹp dữ liệu một chút nhé! 🥝</Text>
      </View>
    );
  }
// Tính toán dữ liệu cho biểu đồ Calo 
  const lineChartData = {
    labels: chartData.labels.length > 0 ? chartData.labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: chartData.data.length > 0 ? chartData.data : [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(124, 179, 66, 1)`,
        strokeWidth: 4 //Độ dày của đường biểu đồ 4 px
      },
      {
        data: chartData.data.length > 0 ? chartData.data.map(() => dailyGoal) : Array(7).fill(dailyGoal),
        color: (opacity = 1) => `rgba(93, 64, 55, 1)`,
        withDots: false,
        strokeWidth: 2,
        strokeDashArray: [4, 4]//Hiển thị đường nét đứt
      }
    ],
    legend: ["Calo thực tế", "Mục tiêu (TDEE)"]
  };
// Tính toán dữ liệu cho biểu đồ Nước
  const waterLineData = {
    labels: waterChartData.labels.length > 0 ? waterChartData.labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        data: waterChartData.data.length > 0 ? waterChartData.data : [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(14, 165, 233, 1)`, 
        strokeWidth: 4 
      },
      {
        data: Array(7).fill(targetWater), 
        color: (opacity = 1) => `rgba(71, 85, 105, 0.6)`,
        withDots: false,
        strokeWidth: 2,
        strokeDashArray: [4, 4] 
      }
    ],
    legend: ["Nước đã uống", `Mục tiêu (${targetWater}ml)`]
  };

  const waterOptions = [
    { label: 'Cốc nhỏ', ml: 150, icon: 'cafe-outline' },
    { label: 'Ly tiêu chuẩn', ml: 250, icon: 'water-outline' },
    { label: 'Lon nước', ml: 350, icon: 'beer-outline' },
    { label: 'Chai / Bình', ml: 500, icon: 'flask-outline' },
  ];

  return (
    //---Hiển thị màn hình chính với ScrollView để cuộn nội dung, tránh bị che bởi các phần tử khác---
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <Image source={require('../../../assets/mascot.png')} style={styles.avatarMascot} resizeMode="contain" />
          <View style={styles.greetingBox}>
            <Text style={styles.greeting}>Xin chào!</Text>
            <Text style={styles.subGreeting}>Hôm nay bạn thế nào?</Text>
          </View>
        </View>

        {/* Biểu đồ Calo */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>🔥 Thống Kê Calo 7 Ngày Qua</Text>
          <LineChart
            data={lineChartData}
            width={screenWidth - 60}
            height={220}
            yAxisSuffix=" kcal"
            fromZero={true}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(200, 200, 200, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(78, 52, 46, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#5D4037" }
            }}
            bezier
            style={styles.chartStyle}
          />
        </View>

        {/* Khu vực quản lý Nước */}
        <View style={[styles.chartCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 }]}>
          <View style={styles.waterHeader}>
            <View>
              <Text style={styles.waterTitle}>💧 Lượng nước hôm nay</Text>
              <Text style={styles.waterValue}>{todayWater} / {targetWater} ml</Text>
            </View>
          </View>
            {/* 2 Nút thêm nước và trừ nước */}
          <View style={styles.waterControlRow}>
            <TouchableOpacity style={styles.waterAddBtn} onPress={() => openWaterModal('add')}>
              <Ionicons name="add-circle" size={20} color="#fff" style={{marginRight: 6}} />
              <Text style={styles.waterAddBtnText}>Thêm nước</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.waterMinusBtn} onPress={() => openWaterModal('subtract')}>
              <Ionicons name="remove-circle-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
          {/* Biểu đồ Nước */}
          <LineChart
            data={waterLineData}
            width={screenWidth - 60}
            height={220}
            yAxisSuffix=" ml"
            fromZero={true}
            chartConfig={{
              backgroundColor: '#F0FDF4',
              backgroundGradientFrom: '#F0FDF4',
              backgroundGradientTo: '#F0FDF4',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(187, 247, 208, ${opacity})`, 
              labelColor: (opacity = 1) => `rgba(78, 52, 46, ${opacity})`, 
              style: { borderRadius: 16 },
              propsForDots: { r: "5", strokeWidth: "2", stroke: "#0284C7" }
            }}
            bezier
            style={styles.chartStyle}
          />
          {/* Lịch sử uống nước trong ngày(slice(0,5)->liệt kê tối đa 5 mục) */} 
          <View style={styles.waterHistoryContainer}>
            <Text style={styles.waterHistoryTitle}>🕒 Lịch sử hôm nay</Text>
            {waterLogs.length === 0 ? (
              <Text style={styles.emptyLogsText}>Bạn chưa uống ngụm nước nào hôm nay.</Text>
            ) : (
              waterLogs.slice(0,5).map((log, index) => (
                <View key={log.id || index} style={styles.waterLogItem}>
                  {/* Hiển thị thời gian và lượng nước, màu đỏ nếu là trừ nước(Mặc định đã là âm nên không cần thêm dấu -), 
                  màu xanh nếu là thêm nước(Thêm dấu + trước lượng nước)*/}
                  <View style={styles.waterLogLeft}>
                    <Ionicons name="water" size={20} color="#0EA5E9" style={{ marginRight: 8 }} />
                    <Text style={styles.waterLogTime}>{log.time}</Text>
                  </View>
                  <Text style={[
                    styles.waterLogAmount, 
                    log.amount_ml < 0 ? { color: '#EF4444' } : { color: '#059669' }
                  ]}>
                    {log.amount_ml > 0 ? '+' : ''}{log.amount_ml} ml
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
            
        <TouchableOpacity style={styles.navButton} onPress={logout}>
          <Text style={styles.navButtonText}>Đăng Xuất</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL CHỌN LƯỢNG NƯỚC */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={waterModalVisible}
        onRequestClose={() => setWaterModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setWaterModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            
            <View style={styles.modalHeader}>
              {/* Hiển thị tiêu đề dựa trên hành động (add/subtract) */}
              <Text style={styles.modalTitle}>
                {waterAction === 'add' ? '💧 Bạn vừa uống bao nhiêu?' : '⚠️ Bạn muốn hoàn tác bao nhiêu?'}
              </Text>
              <TouchableOpacity onPress={() => setWaterModalVisible(false)}>
                <Ionicons name="close" size={28} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View style={styles.quickAddGrid}>
              {/* Hiển thị các nút chọn nhanh */}
              {waterOptions.map((opt, idx) => {
                const isHighlight = opt.ml === selectedAmount; {/* Hàm làm nổi bật nút được chọn */}
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.quickAddBtn, isHighlight && styles.quickAddBtnHighlight]} 
                    onPress={() => {
                      setSelectedAmount(opt.ml); // Lưu thẻ được chọn
                      setCustomWaterAmount(''); // Xóa số nhập tay nếu đang có
                    }}
                  >
                    <Ionicons name={opt.icon} size={24} color={isHighlight ? '#fff' : '#0EA5E9'} />
                    <Text style={[styles.quickAddLabel, isHighlight && {color: '#fff'}]}>{opt.label}</Text>
                    <Text style={[styles.quickAddMl, isHighlight && {color: '#fff'}]}>{opt.ml} ml</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Hiển thị ô nhập tay nếu người dùng muốn nhập lượng nước tùy ý */}
            <Text style={styles.customInputLabel}>Hoặc nhập số lượng tùy ý (ml):</Text>
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                placeholder="VD: 120"
                placeholderTextColor="#9CA3AF"
                value={customWaterAmount}
                onChangeText={(text) => {
                  setCustomWaterAmount(text);//Hiển thị số lượng nước người dùng nhập
                  setSelectedAmount(null); // Khi người dùng tự nhập, tắt sáng tất cả các nút
                }}
              />
              <TouchableOpacity 
                style={[styles.customSubmitBtn, waterAction === 'subtract' && {backgroundColor: '#EF4444'}]}
                onPress={() => {
                  // LOGIC XÁC NHẬN: Ưu tiên ô nhập tay, nếu ô nhập trống thì mới lấy số lượng ở nút chọn nhanh
                  const amountToSubmit = customWaterAmount ? parseFloat(customWaterAmount) : selectedAmount;
                  if (amountToSubmit) {
                    handleLogWater(amountToSubmit);
                  } else {
                    Alert.alert("Nhắc nhở", "Vui lòng chọn hoặc nhập lượng nước!");
                  }
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.customSubmitText}>Xác nhận</Text>}
              </TouchableOpacity>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F1F8E9' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F8E9' },
  animatedMascot: { width: 85, height: 85, resizeMode: 'contain', marginBottom: 20 },
  loadingTextHighlight: { fontSize: 17, fontWeight: '900', color: '#33691E', marginBottom: 8 },
  loadingSubText: { fontSize: 14, color: '#689F38', fontStyle: 'italic', fontWeight: '500' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, marginTop: 20, backgroundColor: '#ffffff', padding: 16, borderRadius: 20, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  avatarMascot: { width: 60, height: 60, marginRight: 16 },
  greetingBox: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: '900', color: '#4E342E' },
  subGreeting: { fontSize: 14, color: '#689F38', marginTop: 2, fontWeight: '600' },
  
  chartCard: { backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 20, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 4, alignItems: 'center' },
  chartTitle: { fontSize: 17, fontWeight: '800', color: '#5D4037', marginBottom: 16, alignSelf: 'flex-start' },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 16 },
  waterTitle: { fontSize: 15, fontWeight: 'bold', color: '#2E7D32', marginBottom: 6 },
  waterValue: { fontSize: 20, color: '#1B5E20', fontWeight: '900' },
  
  waterControlRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 20, gap: 12 },
  waterAddBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#0EA5E9', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 4 },
  waterAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  waterMinusBtn: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FECACA' },

  waterHistoryContainer: { width: '100%', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#BBF7D0' },
  waterHistoryTitle: { fontSize: 15, fontWeight: 'bold', color: '#2E7D32', marginBottom: 12 },
  emptyLogsText: { color: '#6B7280', fontStyle: 'italic', textAlign: 'center', marginTop: 8 },
  waterLogItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  waterLogLeft: { flexDirection: 'row', alignItems: 'center' },
  waterLogTime: { fontSize: 14, color: '#4B5563', fontWeight: '600' },
  waterLogAmount: { fontSize: 15, fontWeight: '800' },

  navButton: { backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#FFCDD2' },
  navButtonText: { color: '#D32F2F', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: {width: 0, height: -4}, shadowOpacity: 0.1, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#1E3A8A' },
  
  quickAddGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 24 },
  quickAddBtn: { width: '47%', backgroundColor: '#F0F9FF', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E0F2FE' },
  quickAddBtnHighlight: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' }, // Bỏ elevation ở đây
  quickAddLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 8, marginBottom: 2 },
  quickAddMl: { fontSize: 16, color: '#0369A1', fontWeight: '900' },
  
  customInputLabel: { fontSize: 14, color: '#4B5563', fontWeight: '700', marginBottom: 10 },
  customInputRow: { flexDirection: 'row', gap: 12 },
  customInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 14, padding: 14, fontSize: 16, color: '#1F2937', fontWeight: '800' },
  customSubmitBtn: { backgroundColor: '#0EA5E9', paddingHorizontal: 20, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  customSubmitText: { color: '#fff', fontSize: 15, fontWeight: '800' }
});