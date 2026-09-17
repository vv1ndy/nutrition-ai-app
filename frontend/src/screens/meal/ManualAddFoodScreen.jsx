import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import apiClient from '../../api/client'; 
import { AuthContext } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

export default function ManualAddFoodScreen({ navigation }) {
  const [foodName, setFoodName] = useState('');
  
  // Trạng thái lưu trữ định lượng & tính toán
  const [khauPhan, setKhauPhan] = useState(1); 
  const [unit, setUnit] = useState(''); 
  const [weightPerUnit, setWeightPerUnit] = useState(0); 
  
  // Lưu chỉ số gốc (cho 1 khẩu phần) để nhân lên 
  const [baseMacros, setBaseMacros] = useState({ calories: 0, protein: 0, carb: 0, fat: 0 });
  
  // AI Advice
  const [aiAdvice, setAiAdvice] = useState('');
  
  const [mealType, setMealType] = useState('Trưa');
  const [foodId, setFoodId] = useState(null);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  const funnyPhrases = [
    "🥝 WIKI đang lật sổ tay...",
    "🔍 Đang soi lượng mỡ...",
    "🧮 Chờ xíu, WIKI đang tính toán...",
    "💪 Cử tạ tí trong lúc chờ nhé...",
    "🧠 WIKI đang vắt óc suy nghĩ..."
  ];  
  const mealTypes = [
    { id: 'Sáng', label: 'Sáng' },
    { id: 'Trưa', label: 'Trưa' },
    { id: 'Tối', label: 'Tối' },
    { id: 'Phụ', label: 'Phụ' },
  ];
  //Xử lý hiệu ứng loading khi đang tra cứu món ăn 
  useEffect(() => {
    let interval;
    if (loadingSearch) {
      let index = 0;
      setLoadingText(funnyPhrases[0]); 
      
      interval = setInterval(() => {
        index = (index + 1) % funnyPhrases.length; 
        setLoadingText(funnyPhrases[index]);
      }, 2000); 
    } else {
      setLoadingText(''); 
    }

    return () => clearInterval(interval);
  }, [loadingSearch]);
  //Hàm tra cứu tên món ăn và lấy thông số dinh dưỡng từ backend
 const handleLookup = async () => {
    if (!foodName.trim()) {
      Alert.alert('Chưa nhập tên món ăn', 'NutriMate cần biết bạn định ăn món gì để tra cứu nha!');
      return;
    }

    try {
      setLoadingSearch(true);
      
      // THÊM CẤU HÌNH TIMEOUT 40 GIÂY RIÊNG CHO AI
      const res = await apiClient.post('/food/manual-entry', {
        ten_mon_an: foodName,
        khau_phan: 1.0 
      }, {
        timeout: 40000 
      });
    
    
      if (res.data && res.data.data) {
        console.log("📦 DỮ LIỆU TỪ BACKEND:", res.data.data);// In toàn bộ dữ liệu ra log 
        const dataObj = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;//Đảm bảo res.data.data luôn là object
        const {food_id, calories, protein_g, carb_g, fat_g, unit, kich_thuoc_khau_phan} = dataObj;//Bóc tách dữ liệu
        
        setBaseMacros({
          calories: calories ?? 0,
          protein: protein_g ?? 0,
          carb: carb_g ?? 0,
          fat: fat_g ?? 0
        });

        setFoodId(food_id || null);
        setUnit(unit);
        setKhauPhan(1); 
        const actualAdvice = dataObj.loi_khuyen
                          || 'Món này rất ngon đấy! Chúc bạn ngon miệng nhé!';
        setAiAdvice(actualAdvice);
      }
    } catch (error) {
      // IN ĐÚNG THÔNG ĐIỆP LỖI CỦA JAVASCRIPT ĐỂ DỄ BẮT LỖI 
      console.log("CHI TIẾT LỖI:", error.message || error);
      Alert.alert('Không tìm thấy', 'NutriMate chưa tra cứu được món này. Bạn vui lòng thử lại nhé.');
    } finally {
      setLoadingSearch(false);
    }
  };


  const handleSaveManual = async () => {
    
    const currentMultiplier = parseFloat(khauPhan) || 1;
    const finalCalories = baseMacros.calories * currentMultiplier;
    let displayUnit = unit || 'phần';
      if (displayUnit.startsWith('1 ')) {
        displayUnit = displayUnit.substring(2);
      }
      //Bóc tách số và đơn vị ra để nhân với currentMultiplier, làm tròn kết quả và giữ nguyên đơn vị gốc (g, ml,...)
      displayUnit = displayUnit.replace(/(\d+)(\s*(?:g|ml))/i, (match, number, unitText) => {
        // number sẽ lấy được số, unitText lấy được chữ "g" hoặc "ml"
        const newWeight = Math.round(parseFloat(number) * currentMultiplier);
        return `${newWeight}${unitText}`;
      });
    if (currentMultiplier !== 1) {
        displayUnit = displayUnit.replace(/khoảng|~/i, 'tổng khoảng');
      }
    if (!foodName.trim() || finalCalories === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng đảm bảo đã có tên món ăn và lượng calo > 0 nhé!');
      return;
    }
    const tenMonHoanChinh = `${foodName.trim()} (${currentMultiplier} ${displayUnit})`;
    try {
      setLoadingSave(true);
      const localDate = new Date();
      const ngayAn = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      const payload = {
        loai_bua_an: mealType,
        ngay_an: ngayAn,
        ten_mon_an: tenMonHoanChinh,
        so_luong_khau_phan: currentMultiplier,
        meal_calories: finalCalories,
        meal_protein_g: baseMacros.protein * currentMultiplier,
        meal_carb_g: baseMacros.carb * currentMultiplier,
        meal_fat_g: baseMacros.fat * currentMultiplier,
        image_url: null, 
        food_id: foodId,
        loi_khuyen: aiAdvice
      };

      await apiClient.post('/meals', payload);
      console.log("PAYLOAD TRƯỚC KHI GỬI:", payload);
      
      Alert.alert('Hoan hô! 🎉', 'NutriMate đã ghi chú món ăn này vào sổ tay của bạn rồi!', [
        { text: 'Xem nhật ký', onPress: () => navigation.navigate('FoodLog') } 
      ]);

    } catch (error) {
      console.log("Lỗi thêm thủ công:", error.response?.data || error.message);
      Alert.alert('Oops!', 'Hệ thống đang nghẽn một chút, không thể lưu món ăn lúc này.');
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>Nhập Món Ăn 🍱</Text>
      
      {/* KHỐI 1: TÌM KIẾM MÓN ĂN */}
      <View style={styles.searchSection}>
        <Text style={styles.label}>Hôm nay bạn ăn món gì thế? <Text style={{color: '#e53935'}}>*</Text></Text>
        <TextInput 
          style={styles.inputSearch} 
          placeholder="VD: Phở bò, Cơm gà xối mỡ,..." 
          value={foodName} 
          onChangeText={setFoodName} 
        />
        <TouchableOpacity style={styles.lookupButton} onPress={handleLookup} disabled={loadingSearch}>
          {loadingSearch ? 
          (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
              <Text style={styles.lookupButtonText}>{loadingText}</Text>
            </View>
          ) : 
          (
            <Text style={styles.lookupButtonText}>🥝 Để WIKI tìm kiếm nhé! </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* HIỂN THỊ KHI ĐÃ TÌM THẤY MÓN ĂN */}
      {baseMacros.calories > 0 && (
        <>
          {/* LỜI KHUYÊN AI */}
          <View style={styles.mascotAdviceSection}>
            <Image source={require('../../../assets/mascot.png')} style={styles.mascotImgLarge} />
            <View style={styles.bubbleAdvice}>
              <Text style={styles.bubbleTitle}>WIKI Lực Điền khuyên:</Text>
              <Text style={styles.bubbleText}>{aiAdvice}</Text>
            </View>
          </View>

          {/* KHỐI 2: CHỌN ĐỊNH LƯỢNG */}
          <View style={styles.card}>
            <View style={styles.stepperHeader}>
              <Text style={styles.label}>Định lượng (Khẩu phần)</Text>
              
              {/* Mascot báo định lượng chuẩn của 1 phần */}
              <View style={styles.miniMascotGuide}>
                <Image source={require('../../../assets/mascot.png')} style={styles.mascotImgMini} />
                <View style={styles.miniBubble}>
                  <Text style={styles.miniBubbleText}>
                    1 phần chuẩn = {unit} 
                  </Text>
                </View>
              </View>
            </View>

            {/* Các nút chọn nhanh hệ số */}
            <View style={styles.presetRow}>
              {[0.5, 1.0, 1.5, 2.0].map((val) => (
                <TouchableOpacity 
                  key={val} 
                  style={[styles.presetBtn, parseFloat(khauPhan) === val && styles.presetBtnActive]} 
                  onPress={() => setKhauPhan(val.toString())}
                >
                  <Text style={[styles.presetBtnText, parseFloat(khauPhan) === val && styles.presetBtnTextActive]}>
                    {/*Hiển thị dấu x & số khẩu phần trong các nút*/}
                    x{val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ô nhập tay hệ số */}
            <TextInput 
              keyboardType="numeric" 
              onChangeText={setKhauPhan} 
              placeholder="Hoặc tự nhập số (VD: 0.8)" 
              style={styles.input} 
              value={khauPhan.toString()}
            />
          </View>
        </>
      )}

      {/* KHỐI 3: LOẠI BỮA ĂN & THÔNG SỐ */}
      <View style={styles.card}>
        <Text style={styles.label}>Đây là bữa ăn nào trong ngày?</Text>
        <View style={styles.mealTypeContainer}>
          {mealTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeButton, mealType === type.id && styles.typeButtonActive]}
              onPress={() => setMealType(type.id)}
            >
              
              <Text style={[styles.typeText, mealType === type.id && styles.typeTextActive]}>
                {/*Hiển thị tên bữa ăn trong 4 nút*/}
                {type.label}
                </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hiện thông số Calo & Macros */}
        <View style={styles.statsBox}>
          <Text style={styles.statsMain}>🔥 {(baseMacros.calories * (parseFloat(khauPhan) || 0)).toFixed(0)} Kcal</Text>
          <View style={styles.macroRow}>
            <Text style={styles.macroText}>🥩 Pro: {(baseMacros.protein * (parseFloat(khauPhan) || 0)).toFixed(1)}g</Text>
            <Text style={styles.macroText}>🍚 Carb: {(baseMacros.carb * (parseFloat(khauPhan) || 0)).toFixed(1)}g</Text>
            <Text style={styles.macroText}>🥑 Fat: {(baseMacros.fat * (parseFloat(khauPhan) || 0)).toFixed(1)}g</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveManual} disabled={loadingSave}>
       {/*Hiển thị ActivityIndicator khi đang lưu, ngược lại hiển thị text "Xác Nhận & Lưu Lịch Sử" */}
        {loadingSave ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>💾 Xác Nhận & Lưu Lịch Sử</Text>}
      </TouchableOpacity>
      
      <View style={{height: 30}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FDFDFD', flexGrow: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#689F38', marginBottom: 20, textAlign: 'center' }, // Chỉnh màu xanh mượt hơn của WIKI
  
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 16, shadowColor: '#689F38', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  
  searchSection: { backgroundColor: '#F1F8E9', padding: 16, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#DCEDC8' }, // Tone xanh nhạt
  label: { fontSize: 15, fontWeight: '800', color: '#33691E', marginBottom: 10 },
  
  inputSearch: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#AED581', borderRadius: 14, padding: 14, fontSize: 16, color: '#333', fontWeight: '500', marginBottom: 12 },
  
  lookupButton: { backgroundColor: '#7CB342', padding: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#7CB342', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
  lookupButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  // Mascot Advice Styles (Lời khuyên lớn)
  mascotAdviceSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  mascotImgLarge: { width: 65, height: 65, marginRight: 12, resizeMode: 'contain' },
  bubbleAdvice: { flex: 1, backgroundColor: '#E8F5E9', padding: 14, borderRadius: 18, borderTopLeftRadius: 0, borderWidth: 1, borderColor: '#C8E6C9' },
  bubbleTitle: { fontSize: 13, fontWeight: '900', color: '#2E7D32', marginBottom: 4 },
  bubbleText: { fontSize: 14, color: '#1B5E20', lineHeight: 22, fontWeight: '500' },
  
  // Mini Mascot Guide (Hướng dẫn chỉnh khẩu phần)
 
  miniMascotGuide: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  mascotImgMini: { width: 28, height: 28, marginRight: 8, resizeMode: 'contain' },
  miniBubble: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderTopLeftRadius: 0 },
  miniBubbleText: { fontSize: 12, color: '#E65100', fontWeight: '700' },
  
  // Meal Type Styles
  mealTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  typeButton: { flex: 1, paddingVertical: 12, backgroundColor: '#F5F5F5', borderRadius: 14, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: '#E0E0E0' },
  typeButtonActive: { backgroundColor: '#7CB342', borderColor: '#7CB342' },
  typeText: { color: '#757575', fontWeight: '800', fontSize: 13 },
  typeTextActive: { color: '#fff' },
  
  // Stats Box
  statsBox: { marginTop: 20, backgroundColor: '#F9FBE7', padding: 18, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E6EE9C' }, // Màu vàng xanh nhạt
  statsMain: { fontSize: 26, fontWeight: '900', color: '#EF6C00', marginBottom: 12 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  macroText: { fontSize: 14, fontWeight: '700', color: '#558B2F' },
  
  // Save Button
  saveButton: { backgroundColor: '#558B2F', padding: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#558B2F', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' },

  // Preset Buttons Styles
  presetRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  presetBtn: { flex: 1, backgroundColor: '#F1F8E9', paddingVertical: 12, borderRadius: 12, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: '#DCEDC8' },
  presetBtnActive: { backgroundColor: '#7CB342', borderColor: '#7CB342' },
  presetBtnText: { color: '#558B2F', fontWeight: 'bold', fontSize: 16 },
  presetBtnTextActive: { color: '#fff' },
  
  // Input Styles
  input: { backgroundColor: '#F9FBE7', borderWidth: 1, borderColor: '#E6EE9C', borderRadius: 12, padding: 14, fontSize: 16, color: '#33691E', fontWeight: 'bold', textAlign: 'center' },
  
  // Total Weight Display
  totalWeightText: { textAlign: 'center', marginTop: 12, fontSize: 14, color: '#E65100', fontWeight: '800' },
});