import React, { useState, useContext, useCallback, useRef, useEffect} from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, Alert, TextInput, ScrollView, Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import * as ImageManipulator from 'expo-image-manipulator';
import apiClient from '../../api/client';
import { AuthContext } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';
import { Ionicons } from '@expo/vector-icons';


export default function ScanFoodScreen({ navigation }) {
  const { userToken } = useContext(AuthContext);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [loaiBuaAn, setLoaiBuaAn] = useState('Sáng');
  const [multiplier, setMultiplier] = useState("1.0"); 

  const [caloConLai, setCaloConLai] = useState(0);
  const [diUng, setDiUng] = useState('Không có');
  const [benhNen, setBenhNen] = useState('Không có');
const scaleAnim = useRef(new Animated.Value(1)).current;

  // Hiệu ứng mascot thở khi loading = true
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15, // Phóng to 15%
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1, // Thu nhỏ về gốc
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
    useCallback(() => {
      const fetchContextForAI = async () => {
        try {
          const d = new Date();
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          const todayStr = d.toISOString().split('T')[0];
          
          const caloRes = await apiClient.get('/meals/by-date', { params: { date: todayStr } });
          const daily = Number(caloRes.data?.daily_goal) || 2000;
          const consumed = Number(caloRes.data?.consumed_calories) || 0;
          setCaloConLai(daily - consumed);

          const userRes = await apiClient.get('/users/me');
          if (userRes.data) {
            setDiUng(userRes.data.di_ung || 'Không có');
            setBenhNen(userRes.data.benh_nen || 'Không có');
          }
        } catch (error) {
          console.log("Lỗi tải context cho AI:", error.message);
        }
      };
      fetchContextForAI();
    }, [])
  );

  const handlePickOrCapture = async (useCamera = true) => {
    let result;
    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert('Lỗi', 'Cần cấp quyền truy cập camera!');
      result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });
    }

    if (!result.canceled) {
      const originalUri = result.assets[0].uri;
      compressAndSend(originalUri);
    }
  };

  const compressAndSend = async (uri) => {
    try {
      setLoading(true);
      setAiResult(null);

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImage(manipulatedImage.uri);

      const formData = new FormData();
      formData.append('file', {
        uri: manipulatedImage.uri,
        name: 'food_scan.jpg',
        type: 'image/jpeg',
      });

      formData.append('calo_con_lai', caloConLai.toString());
      formData.append('di_ung', diUng);
      formData.append('benh_nen', benhNen);

      const response = await apiClient.post('/food/scan-ai', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resultData = response.data.data || response.data.result || response.data;
      
      setAiResult(resultData);
      setMultiplier("1.0");
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể phân tích ảnh món ăn. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };
   
  const handleSaveLog = async () => {
    if (!aiResult) return;
    try {
      setLoading(true);
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
        ten_mon_an: aiResult.ten_mon,
        loai_bua_an: loaiBuaAn,
        so_luong_khau_phan: parseFloat(multiplier),
        meal_calories: parseFloat(aiResult.calories) * parseFloat(multiplier),
        meal_protein_g: parseFloat(aiResult.protein_g) * parseFloat(multiplier),
        meal_carb_g: parseFloat(aiResult.carb_g) * parseFloat(multiplier),
        meal_fat_g: parseFloat(aiResult.fat_g) * parseFloat(multiplier),
        image_url: aiResult.image_url,
        loi_khuyen: aiResult.loi_khuyen || null,
        food_id: null
      };

      await apiClient.post('/meals', payload);
      Alert.alert('Thành công', 'Đã lưu bữa ăn vào lịch sử dinh dưỡng!', [
        { text: 'OK', onPress: () => navigation.navigate('FoodLog') }
      ]);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể lưu lịch sử bữa ăn.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>WIKI SCAN</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.btnCamera} onPress={() => handlePickOrCapture(true)}>
          <Ionicons name="camera" size={22} color="#ffffff" style={styles.iconMargin} />
          <Text style={styles.btnCameraText}>Chụp Ảnh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.btnGallery} onPress={() => handlePickOrCapture(false)}>
          <Ionicons name="images" size={22} color="#5D4037" style={styles.iconMargin} />
          <Text style={styles.btnGalleryText}>Thư Viện</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.btnManual} onPress={() => navigation.navigate('ManualAddFood')}>
        <Ionicons name="pencil" size={20} color="#166534" style={styles.iconMargin} />
        <Text style={styles.btnManualText}>Nhập Món Thủ Công</Text>
      </TouchableOpacity>
      {!image && !loading && !aiResult && (
        <View style={styles.emptyStateContainer}>
          <Image source={require('../../../assets/mascot.png')} style={styles.emptyStateMascot} resizeMode="contain" />
          <Text style={styles.emptyStateTitle}>WiKi đang chờ bạn nè!</Text>
          <Text style={styles.emptyStateSub}>
            Hãy chụp một bức ảnh hoặc chọn từ thư viện để WiKi phân tích xem món này chứa bao nhiêu Calo nhé 🥝
          </Text>
        </View>
      )}
      {image && <Image source={{ uri: image }} style={styles.preview} />}

     {loading && (
        <View style={styles.loadingContainer}>
          <Animated.Image 
            source={require('../../../assets/mascot.png')} 
            style={[styles.animatedMascot, { transform: [{ scale: scaleAnim }] }]} 
          />
          <Text style={styles.loadingTextHighlight}>WiKi đang nhìn kỹ món này...</Text>
          <Text style={styles.loadingSubText}>Chờ xíu nha! 🥝</Text>
        </View>
      )}

      {aiResult && !loading && (
        <View style={styles.resultCard}>
          <Text style={styles.foodName}>{aiResult.ten_mon}</Text>
          <Text style={styles.infoText}>🔥 Mức Calo: <Text style={{fontWeight: '900', color: '#EF4444'}}>{aiResult.calories} kcal</Text></Text>
          <Text style={styles.infoText}>🥩 P: {aiResult.protein_g}g | 🍚 C: {aiResult.carb_g}g | 🥑 F: {aiResult.fat_g}g</Text>
          
          {/* PHẦN LỜI KHUYÊN CỦA MASCOT */}
          {aiResult.loi_khuyen ? (
            <View style={styles.mascotContainer}>
              <Image source={require('../../../assets/mascot.png')} style={styles.mascotImg} resizeMode="contain" />
              <View style={styles.bubble}>
                <Text style={styles.bubbleText}>{aiResult.loi_khuyen}</Text>
                <View style={styles.bubbleArrow} />
              </View>
            </View>
          ) : null}

          <View style={styles.adjustContainer}>
            <Text style={styles.label}>Hệ số khẩu phần (ví dụ 0.5 bát, 2 đĩa):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={multiplier}
              onChangeText={setMultiplier}
            />
          </View>
          
          <View style={styles.mealTypeContainer}>
            <Text style={styles.label}>Chọn bữa ăn:</Text>
            <View style={styles.mealButtonsRow}>
              {['Sáng', 'Trưa', 'Tối', 'Khác'].map((meal) => (
                <TouchableOpacity 
                  key={meal}
                  style={[
                    styles.mealButton, 
                    loaiBuaAn === meal && styles.mealButtonActive 
                  ]}
                  onPress={() => setLoaiBuaAn(meal)}
                >
                  <Text style={[
                    styles.mealButtonText,
                    loaiBuaAn === meal && styles.mealButtonTextActive
                  ]}>
                    {meal}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveLog}>
            <Text style={styles.saveButtonText}>💾 Xác Nhận & Lưu Lịch Sử</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 40, backgroundColor: '#F1F8E9', alignItems: 'center', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '900', marginBottom: 20, color: '#4E342E' },
  loadingContainer: { 
    marginVertical: 30, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  animatedMascot: { 
    width: 80, 
    height: 80, 
    resizeMode: 'contain', 
    marginBottom: 16 
  },
  loadingTextHighlight: { 
    fontSize: 16, 
    fontWeight: '800', 
    color: '#33691E', 
    marginBottom: 6 
  },
  loadingSubText: { 
    fontSize: 14, 
    color: '#689F38', 
    fontStyle: 'italic', 
    fontWeight: '500' 
  },
 // --- BẮT ĐẦU PHẦN STYLE MỚI CHO CÁC NÚT ---
  buttonRow: { 
    flexDirection: 'row', 
    gap: 16, 
    marginBottom: 16, 
    width: '100%' 
  },
  iconMargin: {
    marginRight: 8,
  },
  btnCamera: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    backgroundColor: '#7CB342', 
    paddingVertical: 16, 
    borderRadius: 24, 
    alignItems: 'center', 
    shadowColor: '#388E3C', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.35, 
    shadowRadius: 8, 
    elevation: 6 
  },
  btnCameraText: { 
    color: '#ffffff', 
    fontWeight: '900', 
    fontSize: 16, 
    letterSpacing: 0.5 
  },
  btnGallery: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    backgroundColor: '#ffffff', 
    paddingVertical: 16, 
    borderRadius: 24, 
    alignItems: 'center', 
    borderWidth: 1.5, 
    borderColor: '#7CB342', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 6, 
    elevation: 2 
  },
  btnGalleryText: { 
    color: '#5D4037', 
    fontWeight: '900', 
    fontSize: 16, 
    letterSpacing: 0.5 
  },
  btnManual: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    backgroundColor: '#DCFCE7', 
    borderWidth: 1.5, 
    borderColor: '#86EFAC', 
    paddingVertical: 16, 
    borderRadius: 24, 
    marginBottom: 24, 
    alignItems: 'center', 
    width: '100%', 
    borderStyle: 'dashed' // Tạo viền nét đứt siêu dễ thương
  },
  btnManualText: { 
    color: '#166534', 
    fontWeight: '800', 
    fontSize: 16, 
    letterSpacing: 0.5 
  },
  // --- KẾT THÚC PHẦN STYLE NÚT ---
  
  preview: { width: '100%', height: 220, borderRadius: 16, marginBottom: 20, borderWidth: 2, borderColor: '#DCFCE7' },
  center: { marginVertical: 20, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#689F38', fontWeight: '600' },
  
  resultCard: { width: '100%', backgroundColor: '#ffffff', padding: 20, borderRadius: 20, shadowColor: '#558B2F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  foodName: { fontSize: 22, fontWeight: '900', color: '#4E342E', marginBottom: 12, textAlign: 'center' },
  infoText: { fontSize: 15, color: '#5D4037', marginBottom: 6, fontWeight: '600', textAlign: 'center' },
  
  // Mascot Bubble Style (Cho lời khuyên)
  mascotContainer: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 16 },
  mascotImg: { width: 50, height: 50, marginRight: 12, marginTop: 4 },
  bubble: { flex: 1, backgroundColor: '#DCFCE7', padding: 14, borderRadius: 16, position: 'relative' },
  bubbleText: { fontSize: 13, color: '#166534', fontWeight: '600', lineHeight: 20 },
  bubbleArrow: { position: 'absolute', left: -8, top: 16, width: 0, height: 0, borderTopWidth: 8, borderTopColor: 'transparent', borderBottomWidth: 8, borderBottomColor: 'transparent', borderRightWidth: 8, borderRightColor: '#DCFCE7' },

  adjustContainer: { marginTop: 8, marginBottom: 16 },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#F9FAFB', color: '#4E342E', fontWeight: 'bold', textAlign: 'center' },
  
  mealTypeContainer: { marginBottom: 24 },
  mealButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  mealButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#F3F4F6' },
  mealButtonActive: { backgroundColor: '#7CB342' }, 
  mealButtonText: { color: '#6B7280', fontWeight: '700' },
  mealButtonTextActive: { color: '#ffffff' },
  
  saveButton: { backgroundColor: '#5D4037', padding: 16, borderRadius: 30, alignItems: 'center', shadowColor: '#4E342E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, elevation: 4 },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  emptyStateContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40,
    paddingHorizontal: 20 
  },
  emptyStateMascot: { 
    width: 120, 
    height: 120, 
    marginBottom: 20,
    opacity: 0.8 // Làm mờ nhẹ đi một chút cho ảo diệu
  },
  emptyStateTitle: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: '#689F38', 
    marginBottom: 8 
  },
  emptyStateSub: { 
    fontSize: 14, 
    color: '#6B7280', 
    textAlign: 'center', 
    lineHeight: 22,
    fontWeight: '500'
  }
});