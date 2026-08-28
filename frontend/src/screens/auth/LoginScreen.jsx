import React, { useState, useContext } from 'react';
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
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; 
import { loginApi } from '../../api/authApi';
import { AuthContext } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu!');
      return;
    }

    setLoading(true);
    try {
      const response = await loginApi({
        email: email,
        password: password
      });

      if (response.status === 200) {
        await login(response.data.access_token);
      }
    } catch (error) {
      let errorMsg = 'Sai tài khoản hoặc mật khẩu.';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') errorMsg = detail;
      else if (Array.isArray(detail)) errorMsg = detail.map(err => err.msg || JSON.stringify(err)).join(', ');
      else if (detail) errorMsg = JSON.stringify(detail);

      Alert.alert('Đăng nhập thất bại', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Thay thế ImageBackground bằng một View với màu nền xanh Kiwi tươi mát
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            
            <View style={styles.headerContainer}>
              {/* Biểu tượng giữ chỗ cho bé WiKi */}
              <Image 
                source={require('../../../assets/mascot.png')} 
                style={styles.mascotImage}
                resizeMode="contain"
              />
              <Text style={styles.appName}>NutriMate</Text>
              <Text style={styles.slogan}>Cùng WiKi sống khỏe mỗi ngày</Text>
            </View>

            {/* Form đăng nhập màu trắng tinh khôi */}
            <View style={styles.formContainer}>
              
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color="#7CB342" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Email / Số điện thoại" 
                  placeholderTextColor="#9CA3AF" 
                  autoCapitalize="none"
                  value={email} 
                  onChangeText={setEmail} 
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

              <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Đăng nhập</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerContainer}>
                <TouchableOpacity onPress={() => Alert.alert('Tính năng đang phát triển')}>
                  <Text style={styles.linkTextUnderline}>Quên mật khẩu?</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.linkTextUnderline}>Đăng ký</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F1F8E9', // Màu xanh nền dịu nhẹ (Kiwi nhạt)
  },
  container: { 
    flex: 1, 
  },
  inner: { 
    flex: 1, 
    justifyContent: 'center', // Đưa form ra giữa màn hình
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
 mascotImage: {
    width: 160,
    height: 160,
    marginBottom: 16,
    // Thêm chút bóng đổ nhẹ cho 3D
    shadowColor: '#558B2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#4E342E', // Màu nâu gỗ/vỏ Kiwi đậm
    letterSpacing: -0.5,
  },
  slogan: {
    fontSize: 15,
    color: '#689F38', // Xanh ruột Kiwi đậm
    marginTop: 4,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: '#ffffff', // Nền trắng để nổi bật trên nền xanh
    padding: 24,
    borderRadius: 24,
    shadowColor: '#558B2F', // Bóng đổ mang sắc xanh
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB', // Màu xám cực nhạt cho ô nhập
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: { 
    flex: 1,
    fontSize: 16,
    color: '#4E342E',
    fontWeight: '500',
  },
  button: { 
    backgroundColor: '#5D4037', // Nút Đăng nhập màu nâu vững chãi
    padding: 16, 
    borderRadius: 30, 
    alignItems: 'center', 
    marginTop: 8,
    shadowColor: '#4E342E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  linkTextUnderline: { 
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '600',
  },
});