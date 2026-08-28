import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { registerApi } from '../../api/authApi';

export default function RegisterScreen({ navigation }) {
  const [hoTen, setHoTen] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!hoTen || !email || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin!');
      return;
    }

    setLoading(true);
    try {
      const response = await registerApi({
        ho_ten: hoTen,
        email: email,
        password: password,
        muc_do_van_dong: "ACTIVE"
      });

      if (response.status === 200) {
        Alert.alert('Thành công', 'Tuyệt vời! Chào mừng bạn đến với NutriMate.');
        navigation.replace('Onboarding', { userId: response.data.user_id });
      }
    } catch (error) {
      Alert.alert('Lỗi đăng ký', error.response?.data?.detail || 'Email này đã được sử dụng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
            
            <View style={styles.headerContainer}>
              <Text style={styles.mascotPlaceholder}>🌱</Text> 
              <Text style={styles.title}>Tạo Tài Khoản</Text>
              <Text style={styles.subtitle}>Cùng WiKi bắt đầu hành trình mới!</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="person" size={20} color="#7CB342" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Họ và tên của bạn" 
                  placeholderTextColor="#9CA3AF" 
                  value={hoTen} 
                  onChangeText={setHoTen} 
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color="#7CB342" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Email" 
                  placeholderTextColor="#9CA3AF" 
                  value={email} 
                  onChangeText={setEmail} 
                  autoCapitalize="none" 
                  keyboardType="email-address" 
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed" size={20} color="#7CB342" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Mật khẩu" 
                  placeholderTextColor="#9CA3AF" 
                  secureTextEntry={!showPassword} 
                  value={password} 
                  onChangeText={setPassword} 
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#7CB342" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Đăng Ký Ngay</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
                <Text style={styles.linkText}>Đã có tài khoản? <Text style={styles.linkBold}>Đăng nhập</Text></Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F1F8E9' },
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  mascotPlaceholder: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#4E342E', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#689F38', marginTop: 4, fontWeight: '600' },
  formContainer: {
    backgroundColor: '#ffffff', padding: 24, borderRadius: 24,
    shadowColor: '#558B2F', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#4E342E', fontWeight: '500' },
  button: { 
    backgroundColor: '#5D4037', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 10,
    shadowColor: '#4E342E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4,
  },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  loginLink: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: 15, color: '#6B7280' },
  linkBold: { color: '#5D4037', fontWeight: 'bold', textDecorationLine: 'underline' }
});