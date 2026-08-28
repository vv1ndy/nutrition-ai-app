import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import apiClient from '../../api/client'; 

export default function ManualAddFoodScreen({ navigation }) {
  const [foodName, setFoodName] = useState('');
  
  // Trạng thái lưu trữ định lượng & tính toán
  const [khauPhan, setKhauPhan] = useState(1); 
  const [unit, setUnit] = useState(''); 
  const [weightPerUnit, setWeightPerUnit] = useState(0); 
  
  // Lưu chỉ số gốc (cho 1 khẩu phần) để nhân lên khi bấm Stepper
  const [baseMacros, setBaseMacros] = useState({ calories: 0, protein: 0, carb: 0, fat: 0 });
  
  // AI Advice
  const [aiAdvice, setAiAdvice] = useState('');
  
  const [mealType, setMealType] = useState('Lunch');
  const [foodId, setFoodId] = useState(null);
  
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  const funnyPhrases = [
    "🥝 Kiwi đang lật sổ tay...",
    "🔍 Đang soi lượng mỡ...",
    "🧮 Chờ xíu, Kiwi đang tính toán...",
    "💪 Cử tạ tí trong lúc chờ nhé...",
    "🧠 AI đang vắt óc suy nghĩ..."
  ];  
  const mealTypes = [
    { id: 'Breakfast', label: 'Sáng' },
    { id: 'Lunch', label: 'Trưa' },
    { id: 'Dinner', label: 'Tối' },
    { id: 'Snack', label: 'Phụ' },
  ];
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
 const handleLookup = async () => {
    if (!foodName.trim()) {
      Alert.alert('Chưa nhập tên', 'NutriMate cần biết bạn định ăn món gì để tra cứu nha!');
      return;
    }

    try {
      setLoadingSearch(true);
      
      // THÊM CẤU HÌNH TIMEOUT 30 GIÂY RIÊNG CHO AI
      const res = await apiClient.post('/food/manual-entry', {
        ten_mon_an: foodName,
        khau_phan: 1.0 
      }, {
        timeout: 30000 // Bắt Frontend đợi tối đa 30 giây
      });
    
    
      if (res.data && res.data.data) {
        console.log("📦 DỮ LIỆU TỪ BACKEND:", res.data.data);// In toàn bộ dữ liệu ra log để xem Backend thực sự trả về những tên biến gì
        const dataObj = typeof res.data.data === 'string' ? JSON.parse(res.data.data) : res.data.data;
        const {food_id, calories, protein_g, carb_g, fat_g, unit = "phần", weight_in_grams = 100} = dataObj;
        
        setBaseMacros({
          calories: calories || 0,
          protein: protein_g || 0,
          carb: carb_g || 0,
          fat: fat_g || 0
        });

        setFoodId(food_id || null);
        setUnit(unit);
        setWeightPerUnit(weight_in_grams);
        setKhauPhan(1); 
        const actualAdvice = dataObj?.loi_khuyen
                          || dataObj?.loi_khuyen_ai
                          || 'Món này trông ngon quá! Nhớ ăn kèm thêm chút rau xanh cho đủ chất bạn nhé!';
        // Đã đảm bảo dùng đúng biến loi_khuyen
        setAiAdvice(actualAdvice);
      }
    } catch (error) {
      // IN ĐÚNG THÔNG ĐIỆP LỖI CỦA JAVASCRIPT ĐỂ DỄ BẮT BỆNH VỀ SAU
      console.log("CHI TIẾT LỖI:", error.message || error);
      Alert.alert('Không tìm thấy', 'Hệ thống chưa nhận diện được món này. Bạn có thể tự nhập tay số liệu bên dưới nhé.');
    } finally {
      setLoadingSearch(false);
    }
  };
  const handleKhauPhanChange = (type) => {
    if (type === 'minus' && khauPhan > 0.5) {
      setKhauPhan(prev => prev - 0.5);
    } else if (type === 'plus') {
      setKhauPhan(prev => prev + 0.5);
    }
  };

  const handleSaveManual = async () => {
    const finalCalories = baseMacros.calories * khauPhan;
    
    if (!foodName.trim() || finalCalories === 0) {
      Alert.alert('Thiếu thông tin', 'Vui lòng đảm bảo đã có tên món ăn và lượng calo > 0 nhé!');
      return;
    }

    try {
      setLoadingSave(true);
      const localDate = new Date();
      const ngayAn = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

      const payload = {
        user_id: 8, 
        loai_bua_an: mealType,
        ngay_an: ngayAn,
        ten_mon_an: foodName,
        so_luong_khau_phan: parseFloat(khauPhan),
        meal_calories: finalCalories,
        meal_protein_g: baseMacros.protein * khauPhan,
        meal_carb_g: baseMacros.carb * khauPhan,
        meal_fat_g: baseMacros.fat * khauPhan,
        image_url: null, 
        food_id: foodId,
        loi_khuyen: aiAdvice
      };

      await apiClient.post('/meals', payload);
      
      Alert.alert('Hoan hô! 🎉', 'NutriMate đã ghi chú món ăn này vào sổ tay của bạn rồi!', [
        { text: 'Tuyệt vời', onPress: () => navigation.goBack() } 
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
      <Text style={styles.headerTitle}>Ghi Chép Bữa Ăn 🍱</Text>
      
      {/* KHỐI 1: TÌM KIẾM MÓN ĂN */}
      <View style={styles.searchSection}>
        <Text style={styles.label}>Hôm nay bạn ăn món gì thế? <Text style={{color: '#e53935'}}>*</Text></Text>
        <TextInput 
          style={styles.inputSearch} 
          placeholder="VD: Cơm trắng, Trứng gà luộc..." 
          value={foodName} 
          onChangeText={setFoodName} 
        />
        <TouchableOpacity style={styles.lookupButton} onPress={handleLookup} disabled={loadingSearch}>
          {loadingSearch ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
              <Text style={styles.lookupButtonText}>{loadingText}</Text>
            </View>
          ) : (
            <Text style={styles.lookupButtonText}>✨ Trợ lý phân tích (AI/DB)</Text>
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
              <Text style={styles.bubbleTitle}>Kiwi Lực Điền khuyên:</Text>
              <Text style={styles.bubbleText}>{aiAdvice}</Text>
            </View>
          </View>

          {/* KHỐI 2: CHỌN ĐỊNH LƯỢNG KÈM KIWI HƯỚNG DẪN */}
          <View style={styles.card}>
            <View style={styles.stepperHeader}>
              <Text style={styles.label}>Định lượng (Khẩu phần)</Text>
              {/* Lời nhắc nhỏ của Mascot */}
              <View style={styles.miniMascotGuide}>
                <Image source={require('../../../assets/mascot.png')} style={styles.mascotImgMini} />
                <View style={styles.miniBubble}>
                  <Text style={styles.miniBubbleText}>Bấm + / - để chỉnh lượng ăn nhé!</Text>
                </View>
              </View>
            </View>

            <View style={styles.stepperContainer}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleKhauPhanChange('minus')}>
                <Text style={styles.stepperBtnText}>-</Text>
              </TouchableOpacity>
              
              <View style={styles.stepperValueBox}>
                <Text style={styles.stepperValueText}>{khauPhan}</Text>
                {unit ? (
                  <Text style={styles.stepperUnitText}>{unit} ({weightPerUnit * khauPhan}g)</Text>
                ) : (
                  <Text style={styles.stepperUnitText}>phần</Text>
                )}
              </View>
              
              <TouchableOpacity style={styles.stepperBtn} onPress={() => handleKhauPhanChange('plus')}>
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      {/* KHỐI 3: LOẠI BỮA ĂN & THÔNG SỐ */}
      <View style={styles.card}>
        <Text style={styles.label}>Đây là bữa nào trong ngày?</Text>
        <View style={styles.mealTypeContainer}>
          {mealTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeButton, mealType === type.id && styles.typeButtonActive]}
              onPress={() => setMealType(type.id)}
            >
              <Text style={[styles.typeText, mealType === type.id && styles.typeTextActive]}>{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hiện thông số Calo & Macros */}
        <View style={styles.statsBox}>
          <Text style={styles.statsMain}>🔥 {(baseMacros.calories * khauPhan).toFixed(0)} Kcal</Text>
          <View style={styles.macroRow}>
            <Text style={styles.macroText}>🥩 Pro: {(baseMacros.protein * khauPhan).toFixed(1)}g</Text>
            <Text style={styles.macroText}>🍚 Carb: {(baseMacros.carb * khauPhan).toFixed(1)}g</Text>
            <Text style={styles.macroText}>🥑 Fat: {(baseMacros.fat * khauPhan).toFixed(1)}g</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveManual} disabled={loadingSave}>
        {loadingSave ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Ghi vào Nhật ký ngay!</Text>}
      </TouchableOpacity>
      
      <View style={{height: 30}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#FDFDFD', flexGrow: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#689F38', marginBottom: 20, textAlign: 'center' }, // Chỉnh màu xanh mượt hơn của Kiwi
  
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
  stepperHeader: { marginBottom: 12 },
  miniMascotGuide: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  mascotImgMini: { width: 28, height: 28, marginRight: 8, resizeMode: 'contain' },
  miniBubble: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderTopLeftRadius: 0 },
  miniBubbleText: { fontSize: 12, color: '#E65100', fontWeight: '700' },

  // Stepper Styles
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA', borderRadius: 16, padding: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  stepperBtn: { width: 50, height: 50, backgroundColor: '#fff', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, borderWidth: 1, borderColor: '#F5F5F5' },
  stepperBtnText: { fontSize: 26, fontWeight: 'bold', color: '#7CB342' }, // Đổi màu dấu cộng trừ sang xanh Kiwi
  stepperValueBox: { flex: 1, alignItems: 'center' },
  stepperValueText: { fontSize: 26, fontWeight: '900', color: '#33691E' },
  stepperUnitText: { fontSize: 14, color: '#757575', marginTop: 2, fontWeight: '500' },
  
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
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' }
});