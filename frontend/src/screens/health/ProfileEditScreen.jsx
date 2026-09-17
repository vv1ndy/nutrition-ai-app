import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import apiClient from '../../api/client';

export default function ProfileEditScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [gioiTinh, setGioiTinh] = useState('Nam');
  const [namSinh, setNamSinh] = useState('');
  const [chieuCao, setChieuCao] = useState('');
  const [canNang, setCanNang] = useState('');
  const [mucDoVanDong, setMucDoVanDong] = useState('Vừa');
  const [mucTieuCanNang, setMucTieuCanNang] = useState('Giữ cân');
  const [benhNen, setBenhNen] = useState('');
  const [diUng, setDiUng] = useState('');

  // Ánh xạ value cũ với label mới kèm chỉ số T để người dùng dễ hiểu
  const activityLevels = [
    { label: 'Ít vận động (T = 1.2)', value: 'Ít vận động' },
    { label: 'Vận động nhẹ (T = 1.375)', value: 'Nhẹ' },
    { label: 'Vận động vừa (T = 1.55)', value: 'Vừa' },
    { label: 'Vận động nhiều (T = 1.725)', value: 'Nhiều' },
    { label: 'Cường độ cao (T = 1.9)', value: 'Rất nhiều' }
  ];

  useEffect(() => {
    fetchMyProfile();
  }, []);

  const fetchMyProfile = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/me');
      
      const data =  res.data; 
      console.log("👉 Dữ liệu lấy về từ Backend:", data);

      if (data.gioi_tinh) 
      {
        const genderStr = data.gioi_tinh.trim().toLowerCase();
        if (genderStr.includes('N?') || genderStr.includes('n?') || genderStr.toLowerCase() === 'nữ') {
          setGioiTinh('Nữ');
        } else {
          setGioiTinh('Nam');
        }
      }
      if (data.nam_sinh) setNamSinh(data.nam_sinh.toString());
      if (data.chieu_cao) setChieuCao(data.chieu_cao.toString());
      if (data.can_nang) setCanNang(data.can_nang.toString());
      if (data.muc_tieu_can_nang) setMucTieuCanNang(data.muc_tieu_can_nang);
      if (data.muc_do_van_dong) 
      {
        const validLevels = ['Ít vận động', 'Nhẹ', 'Vừa', 'Nhiều', 'Rất nhiều'];
        let rawMucDo = data.muc_do_van_dong.trim();
        let finalMucDo = 'Vừa'; // Đặt mức Vừa làm cứu cánh an toàn
        
        // Nếu dữ liệu đã chuẩn (sau khi lưu lại thành công), lấy dùng luôn
        if (validLevels.includes(rawMucDo)) {
            finalMucDo = rawMucDo;
        } else {
            // Nếu bị lỗi font,  quét các chữ cái không dấu
            let lower = rawMucDo.toLowerCase();
            if (lower.includes('r')) finalMucDo = 'Rất nhiều';             // Bắt chữ 'r' trong Rất nhiều
            else if (lower.includes('nhi')) finalMucDo = 'Nhiều';          // Bắt chữ 'nhi' trong Nhiều
            else if (lower.includes('nh')) finalMucDo = 'Nhẹ';             // Bắt chữ 'nh' trong Nhẹ
            else if (lower.includes('v')) finalMucDo = 'Vừa';              // Bắt chữ 'v' trong Vừa
            else if (lower.includes('t')) finalMucDo = 'Ít vận động';      // Bắt chữ 't' trong Ít vận động
        }
        setMucDoVanDong(finalMucDo);
      }
      if (data.benh_nen) setBenhNen(data.benh_nen.normalize ? data.benh_nen.normalize('NFC') : data.benh_nen);
      if (data.di_ung) setDiUng(data.di_ung.normalize ? data.di_ung.normalize('NFC') : data.di_ung);

    } catch (error) {
      console.log("Lỗi fetch profile:", error);
      Alert.alert('Lỗi', 'Không thể tải thông tin cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!namSinh || !chieuCao || !canNang) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ Năm sinh, Chiều cao và Cân nặng!');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        gioi_tinh: gioiTinh,
        nam_sinh: parseInt(namSinh, 10),
        chieu_cao: parseFloat(chieuCao),
        can_nang: parseFloat(canNang),
        muc_do_van_dong: mucDoVanDong,
        muc_tieu_can_nang: mucTieuCanNang,
        benh_nen: benhNen.trim() || null,
        di_ung: diUng.trim() || null
      };

      const res = await apiClient.put('/users/me', payload);

      if (res.status === 200) {
        Alert.alert(
          'Thành công', 
          'Hồ sơ đã được cập nhật! WiKi đã tính toán lại mục tiêu calo cho bạn.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu thay đổi. Vui lòng thử lại!');
    } finally {
      setSaving(false);
    }
  };

  if (loading || saving) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#7CB342" />
        <Text style={{ marginTop: 12, color: '#689F38', fontWeight: '600' }}>Đang tải hồ sơ... 🥝</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
      
      <View style={styles.header}>
        <Text style={styles.title}>Hồ Sơ Của Bạn</Text>
        <Text style={styles.subtitle}>Cập nhật để WiKi tính toán thật chuẩn xác nhé!</Text>
      </View>

      {/* KHU VỰC MASCOT CHAT BUBBLE (Trên cùng) */}
      <View style={styles.mascotContainer}>
        <Image source={require('../../../assets/mascot.png')} style={styles.mascotImg} resizeMode="contain" />
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>Bật mí nha: Chiều cao và Cân nặng là 2 yếu tố quan trọng nhất để tính TDEE đó! 🥝</Text>
          <View style={styles.bubbleArrow} />
        </View>
      </View>

      <View style={styles.formCard}>
        {/* Hàng 1 */}
        <View style={styles.row}>
          <View style={[styles.inputWrapper, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>Giới tính</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={gioiTinh}
                onValueChange={(itemValue) => setGioiTinh(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Nam" value="Nam" />
                <Picker.Item label="Nữ" value="Nữ" />
              </Picker>
            </View>
          </View>

          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <Text style={styles.label}>Năm sinh</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric"
              placeholder="VD: 2000" 
              placeholderTextColor="#9CA3AF"
              value={namSinh} 
              onChangeText={setNamSinh} 
            />
          </View>
        </View>

        {/* Hàng 2 */}
        <View style={styles.row}>
          <View style={[styles.inputWrapper, { flex: 1, marginRight: 12 }]}>
            <Text style={styles.label}>Chiều cao (cm)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric"
              placeholder="VD: 170"
              placeholderTextColor="#9CA3AF"
              value={chieuCao} 
              onChangeText={setChieuCao} 
            />
          </View>

          <View style={[styles.inputWrapper, { flex: 1 }]}>
            <Text style={styles.label}>Cân nặng (kg)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric"
              placeholder="VD: 65"
              placeholderTextColor="#9CA3AF"
              value={canNang} 
              onChangeText={setCanNang} 
            />
          </View>
        </View>
      </View>

      {/* KHỐI MỨC ĐỘ VẬN ĐỘNG & MỤC TIÊU */}
      <View style={styles.formCard}>
        {/* Lựa chọn Mục tiêu */}
        <Text style={styles.label}>Mục tiêu cân nặng</Text>
        <View style={[styles.pickerBox, { marginBottom: mucTieuCanNang !== 'Giữ cân' ? 12 : 20 }]}>
            {/*Hiển thị giá trị hiện tại từ state mucTieuCanNang, và khi người dùng thay đổi thì setMucTieuCanNang được gọi*/}
          <Picker selectedValue={mucTieuCanNang} onValueChange={(itemValue) => setMucTieuCanNang(itemValue)} style={styles.picker}>
            <Picker.Item label="Giữ cân" value="Giữ cân" />
            <Picker.Item label="Giảm cân" value="Giảm cân" />
            <Picker.Item label="Tăng cân" value="Tăng cân" />
          </Picker>
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
        {/* Lựa chọn Vận động */}
        <Text style={[styles.label,{marginTop: 16}]}>Mức độ vận động của bạn</Text>
        <View style={[styles.pickerBox, { marginBottom: 16 }]}>
            {/*Hiển thị danh sách các mức độ vận động từ mảng activityLevels, và khi người dùng chọn thì setMucDoVanDong được gọi*/}
          <Picker
            selectedValue={mucDoVanDong}
            onValueChange={(itemValue) => setMucDoVanDong(itemValue)}
            style={styles.picker}
          >
            {activityLevels.map(item => (
              <Picker.Item key={item.value} label={item.label} value={item.value} />
            ))}
          </Picker>
        </View>

        {/* Mascot hướng dẫn chọn mức độ vận động */}
        <View style={styles.guideContainer}>
          <View style={styles.guideHeader}>
            <Image source={require('../../../assets/mascot.png')} style={styles.mascotImgMini} resizeMode="contain" />
            <Text style={styles.guideTitle}>Kiwi hướng dẫn chọn nhé:</Text>
          </View>
          <View style={styles.guideContent}>
            <Text style={styles.guideItem}><Text style={styles.boldText}>• Ít vận động (1.2):</Text> Làm việc văn phòng, sinh hoạt nhẹ nhàng, không tập luyện.</Text>
            <Text style={styles.guideItem}><Text style={styles.boldText}>• Vận động nhẹ (1.375):</Text> Tập thể dục thể thao nhẹ nhàng từ 1 đến 3 ngày/tuần.</Text>
            <Text style={styles.guideItem}><Text style={styles.boldText}>• Vận động vừa (1.55):</Text> Tập luyện ở cường độ trung bình từ 3 đến 5 ngày/tuần.</Text>
            <Text style={styles.guideItem}><Text style={styles.boldText}>• Vận động nhiều (1.725):</Text> Tập luyện thể thao cường độ cao từ 6 đến 7 ngày/tuần.</Text>
            <Text style={styles.guideItem}><Text style={styles.boldText}>• Cường độ cao (1.9):</Text> Vận động viên chuyên nghiệp hoặc lao động chân tay nặng nhọc.</Text>
          </View>
        </View>
      </View>

      {/* THÔNG TIN BỔ SUNG */}
      <View style={styles.formCard}>
        <Text style={styles.label}>Bệnh nền (Không bắt buộc)</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Ví dụ: Tiểu đường, Cao huyết áp..." 
          placeholderTextColor="#9CA3AF"
          value={benhNen} 
          // Bắt font chuẩn ngay lúc người dùng gõ
          onChangeText={(text) => setBenhNen(text.normalize ? text.normalize('NFC') : text)} 
        />

        <Text style={styles.label}>Dị ứng (Không bắt buộc)</Text>
        <TextInput 
          style={[styles.input, {marginBottom: 0}]} 
          placeholder="Ví dụ: Hải sản, Đậu phộng..." 
          placeholderTextColor="#9CA3AF"
          value={diUng} 
          // Bắt font chuẩn ngay lúc người dùng gõ
          onChangeText={(text) => setDiUng(text.normalize ? text.normalize('NFC') : text)} 
        />
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleUpdateProfile}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>💾 Lưu & Tính Lại Calo</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F8E9', padding: 20 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F8E9' },
  
  header: { alignItems: 'center', marginTop: 20, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: '#4E342E', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#689F38', fontWeight: '600', marginTop: 4 },

  // Mascot Bubble Style (Trên cùng)
  mascotContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
  mascotImg: { width: 65, height: 65, marginRight: 12 },
  bubble: { flex: 1, backgroundColor: '#ffffff', padding: 14, borderRadius: 16, borderColor: '#DCFCE7', borderWidth: 1, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2, position: 'relative' },
  bubbleText: { fontSize: 13, color: '#166534', fontWeight: '700', lineHeight: 20 },
  bubbleArrow: { position: 'absolute', left: -8, top: 20, width: 0, height: 0, borderTopWidth: 8, borderTopColor: 'transparent', borderBottomWidth: 8, borderBottomColor: 'transparent', borderRightWidth: 8, borderRightColor: '#ffffff' },

  formCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 20, marginBottom: 20, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  
  inputWrapper: { marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '800', color: '#4E342E', marginBottom: 8, marginLeft: 4 },
  
  input: { backgroundColor: '#F9FAFB', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#DCFCE7', fontSize: 16, color: '#4E342E', fontWeight: 'bold', marginBottom: 16 },
  
  pickerBox: { backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: '#DCFCE7', overflow: 'hidden', justifyContent: 'center' },
  picker: { height: 50, width: '100%', color: '#4E342E' },
  targetMascotContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#E0F2FE', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#BAE6FD' },
  targetMascotImg: { width: 45, height: 45, marginRight: 10 },
  targetMascotText: { flex: 1, fontSize: 13, color: '#0369A1', fontWeight: '600', lineHeight: 18 },
  guideContainer: { backgroundColor: '#F1F8E9', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#C8E6C9' },
  guideHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  mascotImgMini: { width: 30, height: 30, marginRight: 8 },
  guideTitle: { fontSize: 14, fontWeight: '800', color: '#2E7D32' },
  guideContent: { paddingLeft: 4 },
  guideItem: { fontSize: 12.5, color: '#33691E', lineHeight: 20, marginBottom: 4, fontWeight: '500' },
  boldText: { fontWeight: '800', color: '#1B5E20' },
  button: { backgroundColor: '#558B2F', padding: 18, borderRadius: 30, alignItems: 'center', marginTop: 5, shadowColor: '#33691E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 5 },
  buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 }
});