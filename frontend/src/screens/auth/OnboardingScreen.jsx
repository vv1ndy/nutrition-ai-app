import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../api/client';

export default function OnboardingScreen({ route, navigation }) {
  const { userId } = route.params || {}; 

  const [gioiTinh, setGioiTinh] = useState('');
  const [namSinh, setNamSinh] = useState('');
  const [chieuCao, setChieuCao] = useState('');
  const [canNang, setCanNang] = useState('');
  const [mucTieuCanNang, setMucTieuCanNang] = useState('Giữ cân'); // Thêm state mục tiêu
  const [mucDoVanDong, setMucDoVanDong] = useState('');
  const [benhNen, setBenhNen] = useState('');
  const [diUng, setDiUng] = useState('');
  const [bmiResult, setBmiResult] = useState(null);

  useEffect(() => {
    const h = parseFloat(chieuCao) / 100; 
    const w = parseFloat(canNang);
    if (h > 0 && w > 0) {
      const bmi = (w / (h * h)).toFixed(1);
      setBmiResult(bmi);
    }
  }, [chieuCao, canNang]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString()); 
  const heights = Array.from({ length: 111 }, (_, i) => (120 + i).toString()); 
  const weights = Array.from({ length: 121 }, (_, i) => (30 + i).toString()); 
  
  const activityLevels = [
    { label: 'Ít vận động (T = 1.2)', value: 'Ít vận động' },
    { label: 'Vận động nhẹ (T = 1.375)', value: 'Nhẹ' },
    { label: 'Vận động vừa (T = 1.55)', value: 'Vừa' },
    { label: 'Vận động nhiều (T = 1.725)', value: 'Nhiều' },
    { label: 'Cường độ cao (T = 1.9)', value: 'Rất nhiều' }
  ];

  const handleFinishOnboarding = async () => {
    if (!gioiTinh || !namSinh || !chieuCao || !canNang || !mucDoVanDong) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đủ thông số cơ thể để WiKi tính toán nhé!');
      return;
    }
    
    try {
      await apiClient.post('/users/onboarding', {
        user_id: userId,
        gioi_tinh: gioiTinh, 
        nam_sinh: parseInt(namSinh, 10),
        chieu_cao: parseFloat(chieuCao), 
        can_nang: parseFloat(canNang),
        muc_tieu_can_nang: mucTieuCanNang, // Thêm mục tiêu vào api
        muc_do_van_dong: mucDoVanDong,
        benh_nen: benhNen.trim() || null,
        di_ung: diUng.trim() || null
      });

      Alert.alert(
        'Hoàn tất!', 
        'Hồ sơ sức khỏe của bạn đã sẵn sàng.',
        [{ text: 'Vào app thôi', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thông số cơ thể.');
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.mascotIcon}>🥝</Text>
          <Text style={styles.title}>Làm quen chút nhé!</Text>
          <Text style={styles.subtitle}>Cung cấp vài thông tin để WiKi thiết kế thực đơn chuẩn xác nhất cho bạn.</Text>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.row}>
            <View style={[styles.pickerBox, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={gioiTinh} onValueChange={setGioiTinh} style={styles.picker}>
                  <Picker.Item color="#9CA3AF" label="Chọn" value="" />
                  <Picker.Item label="Nam" value="Nam" />
                  <Picker.Item label="Nữ" value="Nữ" />
                </Picker>
              </View>
            </View>

            <View style={[styles.pickerBox, { flex: 1 }]}>
              <Text style={styles.label}>Năm sinh</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={namSinh} onValueChange={setNamSinh} style={styles.picker}>
                  <Picker.Item color="#9CA3AF" label="Chọn" value="" />
                  {years.map(year => <Picker.Item key={year} label={year} value={year} />)}
                </Picker>
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.pickerBox, { flex: 1, marginRight: 12 }]}>
              <Text style={styles.label}>Chiều cao</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={chieuCao} onValueChange={setChieuCao} style={styles.picker}>
                  <Picker.Item color="#9CA3AF" label="Chọn" value="" />
                  {heights.map(h => <Picker.Item key={h} label={`${h} cm`} value={h} />)}
                </Picker>
              </View>
            </View>

            <View style={[styles.pickerBox, { flex: 1 }]}>
              <Text style={styles.label}>Cân nặng</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={canNang} onValueChange={setCanNang} style={styles.picker}>
                  <Picker.Item color="#9CA3AF" label="Chọn" value="" />
                  {weights.map(w => <Picker.Item key={w} label={`${w} kg`} value={w} />)}
                </Picker>
              </View>
            </View>
          </View>

          {/* CHỌN MỤC TIÊU CÂN NẶNG */}
          <View style={[styles.pickerBox, { marginBottom: mucTieuCanNang !== 'Giữ cân' ? 12 : 16 }]}>
            <Text style={styles.label}>Mục tiêu cân nặng</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={mucTieuCanNang} onValueChange={setMucTieuCanNang} style={styles.picker}>
                <Picker.Item label="Giữ cân" value="Giữ cân" />
                <Picker.Item label="Giảm cân" value="Giảm cân" />
                <Picker.Item label="Tăng cân" value="Tăng cân" />
              </Picker>
            </View>
          </View>

          {/* Mascot cảnh báo an toàn */}
          {mucTieuCanNang !== 'Giữ cân' && (
            <View style={styles.targetMascotContainer}>
              <Image source={require('../../../assets/mascot.png')} style={styles.targetMascotImg} resizeMode="contain" />
              <Text style={styles.targetMascotText}>
                Để an toàn, KIWI sẽ điều chỉnh Calo để bạn {mucTieuCanNang.toLowerCase()} từ từ khoảng <Text style={{fontWeight: '900', color: '#0284C7'}}>500 gram / tuần</Text> nhé! 🥝
              </Text>
            </View>
          )}

          <View style={styles.pickerBox}>
            <Text style={styles.label}>Mức độ vận động</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={mucDoVanDong} onValueChange={setMucDoVanDong} style={styles.picker}>
                <Picker.Item color="#9CA3AF" label="-- Chọn mức độ --" value="" />
                {activityLevels.map(item => (
                  <Picker.Item key={item.value} label={item.label} value={item.value} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.guideContainer}>
            <View style={styles.guideHeader}>
              <Image source={require('../../../assets/mascot.png')} style={styles.mascotImgMini} resizeMode="contain" />
              <Text style={styles.guideTitle}>Kiwi hướng dẫn chọn nhé:</Text>
            </View>
            <View style={styles.guideContent}>
              <Text style={styles.guideItem}><Text style={styles.boldText}>• Ít vận động (1.2):</Text> Làm việc văn phòng, sinh hoạt nhẹ nhàng.</Text>
              <Text style={styles.guideItem}><Text style={styles.boldText}>• Vận động nhẹ (1.375):</Text> Tập thể dục nhẹ 1 đến 3 ngày/tuần.</Text>
              <Text style={styles.guideItem}><Text style={styles.boldText}>• Vận động vừa (1.55):</Text> Tập luyện trung bình 3 đến 5 ngày/tuần.</Text>
              <Text style={styles.guideItem}><Text style={styles.boldText}>• Vận động nhiều (1.725):</Text> Tập luyện cường độ cao 6-7 ngày/tuần.</Text>
              <Text style={styles.guideItem}><Text style={styles.boldText}>• Cường độ cao (1.9):</Text> Vận động viên hoặc lao động nặng nhọc.</Text>
            </View>
          </View>

        </View>

        <View style={styles.cardContainer}>
          <Text style={styles.label}>Bệnh lý nền (Không bắt buộc)</Text>
          <TextInput style={styles.input} placeholder="Ví dụ: Tiểu đường, Cao huyết áp..." placeholderTextColor="#9CA3AF" value={benhNen} onChangeText={setBenhNen} />

          <Text style={styles.label}>Dị ứng thực phẩm (Không bắt buộc)</Text>
          <TextInput style={styles.input} placeholder="Ví dụ: Hải sản, Đậu phộng..." placeholderTextColor="#9CA3AF" value={diUng} onChangeText={setDiUng} />
        </View>

        {bmiResult && (
          <View style={styles.bmiCard}>
            <Text style={styles.bmiText}>BMI hiện tại của bạn là</Text>
            <Text style={styles.bmiValue}>{bmiResult}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleFinishOnboarding}>
          <Text style={styles.buttonText}>Khởi động hành trình 🚀</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F1F8E9' },
  scrollContent: { padding: 24, paddingBottom: 60 },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  mascotIcon: { fontSize: 45, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '900', color: '#4E342E', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#689F38', textAlign: 'center', lineHeight: 20, paddingHorizontal: 10 },
  
  cardContainer: { backgroundColor: '#ffffff', padding: 20, borderRadius: 20, marginBottom: 20, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  pickerBox: { marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#5D4037', marginBottom: 8, marginLeft: 4 },
  pickerWrapper: { backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: '#DCFCE7', overflow: 'hidden' },
  picker: { height: 50, width: '100%', color: '#4E342E' },
  
  // Style Mascot Mục tiêu mới
  targetMascotContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#E0F2FE', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD' },
  targetMascotImg: { width: 45, height: 45, marginRight: 10 },
  targetMascotText: { flex: 1, fontSize: 13, color: '#0369A1', fontWeight: '600', lineHeight: 18 },

  input: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 14, borderWidth: 1, borderColor: '#DCFCE7', marginBottom: 16, fontSize: 15, color: '#4E342E', fontWeight: '500' },
  guideContainer: { backgroundColor: '#F1F8E9', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#C8E6C9', marginTop: 16 },
  guideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mascotImgMini: { width: 30, height: 30, marginRight: 8 },
  guideTitle: { fontSize: 14, fontWeight: '800', color: '#2E7D32' },
  guideContent: { paddingLeft: 4 },
  guideItem: { fontSize: 12.5, color: '#33691E', lineHeight: 20, marginBottom: 4, fontWeight: '500' },
  boldText: { fontWeight: '800', color: '#1B5E20' },
  bmiCard: { backgroundColor: '#DCFCE7', padding: 20, borderRadius: 20, marginBottom: 24, alignItems: 'center', borderWidth: 2, borderColor: '#BBF7D0', borderStyle: 'dashed' },
  bmiText: { fontSize: 15, color: '#166534', fontWeight: '600', marginBottom: 4 },
  bmiValue: { fontWeight: '900', fontSize: 36, color: '#15803D' },
  button: { backgroundColor: '#7CB342', padding: 18, borderRadius: 30, alignItems: 'center', shadowColor: '#388E3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 }
});