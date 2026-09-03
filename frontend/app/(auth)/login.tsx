import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ShieldCheck, Fingerprint, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function LoginScreen() {
  const { loginWithBiometrics, login, register, isLoading } = useAuthStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleBiometricLogin = async () => {
    const result = await loginWithBiometrics();
    if (result.success) {
      router.replace('/(tabs)');
    } else if (result.message) {
      Alert.alert('Fingerprint unlock', result.message);
    }
  };

  const handleSubmit = async () => {
    setError('');
    try {
      if (isRegistering) await register(name, email, phone, password);
      else await login(email, password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.content}>
        {/* Brand App Mark */}
        <View style={styles.logoBadge}>
          <ShieldCheck size={42} color={COLORS.brand} />
        </View>

        <Text style={styles.appName}>LifeLink AI+</Text>
        <Text style={styles.tagline}>
          AI-Powered Emergency Healthcare & Emergency Wallet
        </Text>

        {/* Feature Highlights Card */}
        <View style={styles.cardHighlight}>
          <View style={styles.highlightRow}>
            <View style={styles.dot} />
            <Text style={styles.highlightText}>Instant SOS & AI Hospital Routing</Text>
          </View>
          <View style={styles.highlightRow}>
            <View style={styles.dot} />
            <Text style={styles.highlightText}>Offline Emergency Wallet & QR Code</Text>
          </View>
          <View style={styles.highlightRow}>
            <View style={styles.dot} />
            <Text style={styles.highlightText}>AI Medical Summary & Readiness Score</Text>
          </View>
        </View>

        {/* Primary Biometric Unlock */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleBiometricLogin}
          disabled={isLoading}
          style={styles.biometricButton}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Fingerprint size={24} color="#FFFFFF" />
              <Text style={styles.biometricButtonText}>Unlock with Biometrics</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.securityCaption}>
          Instant unlock enabled · No passwords required during emergencies
        </Text>

        {isRegistering && <TextInput value={name} onChangeText={setName} placeholder="Full name" style={styles.input} autoCapitalize="words" />}
        <TextInput value={email} onChangeText={setEmail} placeholder="Email address" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
        {isRegistering && <TextInput value={phone} onChangeText={setPhone} placeholder="Phone number" style={styles.input} keyboardType="phone-pad" />}
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" style={styles.input} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          style={styles.guestButton}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.brand} />
          ) : (
            <>
              <Text style={styles.guestButtonText}>{isRegistering ? 'Create account' : 'Sign in'}</Text>
              <ArrowRight size={16} color={COLORS.brand} />
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setIsRegistering(!isRegistering); setError(''); }}>
          <Text style={styles.switchText}>{isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  content: {
    alignItems: 'center',
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.readiness.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(46, 158, 91, 0.2)',
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
    lineHeight: 22,
  },
  cardHighlight: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: SPACING.cardRadius,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.brand,
    marginRight: 12,
  },
  highlightText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
  biometricButton: {
    width: '100%',
    height: 56,
    borderRadius: SPACING.buttonRadius,
    backgroundColor: COLORS.brand,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  biometricButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  securityCaption: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  input: { width: '100%', height: 52, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: SPACING.buttonRadius, paddingHorizontal: 16, marginBottom: 10, color: COLORS.ink },
  error: { width: '100%', color: COLORS.status.red, fontSize: 13, marginBottom: 8 },
  switchText: { color: COLORS.brand, fontWeight: '700', fontSize: 13, marginTop: 8 },
  guestButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brand,
  },
});
