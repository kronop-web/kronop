import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, TextInput } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../template';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    
    setEmailError('');
    setPasswordError('');
    setLoginError('');

    if (!email.trim()) {
      setEmailError('ईमेल खाली नहीं हो सकता!');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('सही ईमेल डालें!');
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError('पासवर्ड खाली नहीं हो सकता!');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('पासवर्ड कम से कम 6 अक्षर का होना चाहिए!');
      isValid = false;
    }

    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setLoginError('');
      
      
      // Use Supabase authentication
      const result = await login(email, password);
      
      
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        setLoginError(result.error || 'गलत पासवर्ड या ईमेल!');
      }
    } catch (error: any) {
      console.error('💥 Login Error:', error);
      setLoginError(error.message || 'गलत पासवर्ड या ईमेल!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Image 
            source={require('../assets/images/logo.svg')} 
            style={styles.logo}
            resizeMode="contain" 
          />
          <Text style={styles.title}>Welcome to Kronop</Text>
          <Text style={styles.subtitle}>Watch, Share, and Earn.</Text>
        </View>

        <View style={styles.actions}>
          {/* Login Error Message */}
          {loginError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              placeholder="Email Address"
              placeholderTextColor={theme.colors.text.tertiary}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setEmailError('');
                setLoginError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {emailError ? (
            <Text style={styles.fieldErrorText}>{emailError}</Text>
          ) : null}

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.text.secondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, passwordError ? styles.inputError : null]}
              placeholder="Password"
              placeholderTextColor={theme.colors.text.tertiary}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
                setLoginError('');
              }}
              secureTextEntry
            />
          </View>
          {passwordError ? (
            <Text style={styles.fieldErrorText}>{passwordError}</Text>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.primaryButton, (!email || !password || loading) ? styles.buttonDisabled : null]} 
            onPress={handleLogin}
            disabled={loading || !email || !password}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>Login / Sign Up</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  errorContainer: {
    backgroundColor: '#FF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  fieldErrorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF4444',
    borderWidth: 2,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
    lineHeight: 18,
  },
});
