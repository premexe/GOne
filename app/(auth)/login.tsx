import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { ShieldCheck, Fingerprint, Lock, ArrowRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/useAuthStore';

export default function LoginScreen() {
  const { loginWithBiometrics, loginAsGuest, isLoading } = useAuthStore();

  const handleBiometricLogin = async () => {
    const success = await loginWithBiometrics();
    if (success) {
      router.replace('/(tabs)');
    }
  };

  const handleGuestLogin = async () => {
    await loginAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
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

        {/* Guest Demo Login */}
        <TouchableOpacity
          onPress={handleGuestLogin}
          disabled={isLoading}
          style={styles.guestButton}
        >
          <Text style={styles.guestButtonText}>Enter Demo Workspace</Text>
          <ArrowRight size={16} color={COLORS.brand} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
  guestButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.brand,
  },
});
