import React from 'react';
import { Alert, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, MapPin, Wallet, User } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { COLORS, SPACING } from '../constants/theme';
import { SOSButton } from './SOSButton';
import { useEmergencyStore } from '../store/useEmergencyStore';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const triggerSOS = useEmergencyStore((s) => s.triggerSOS);

  const tabs = [
    { key: 'home', route: '/(tabs)', icon: Home },
    { key: 'hospitals', route: '/(tabs)/hospitals', icon: MapPin },
    { key: 'wallet', route: '/(tabs)/wallet', icon: Wallet },
    { key: 'profile', route: '/(tabs)/profile', icon: User },
  ];

  const handleSOSConfirm = async () => {
    try {
      await triggerSOS();
      router.push('/sos/emergency');
    } catch (error) {
      Alert.alert('SOS not delivered', error instanceof Error ? error.message : 'Please sign in again and retry.');
    }
  };

  const handleSOSQuickTap = () => {
    router.push('/sos/provide-info');
  };

  return (
    <View style={styles.navContainer}>
      <View style={styles.pillBar}>
        {/* Left tabs: Home, Hospitals */}
        <View style={styles.tabGroup}>
          {tabs.slice(0, 2).map((tab) => {
            const IconComponent = tab.icon;
            const isActive =
              tab.route === '/(tabs)'
                ? pathname === '/' || pathname === '/(tabs)'
                : pathname.includes(tab.key);

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => router.push(tab.route as any)}
                style={[styles.circleButton, isActive && styles.activeCircleButton]}
              >
                <IconComponent
                  size={20}
                  color={isActive ? '#FFFFFF' : COLORS.muted}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Center Gap for Floating SOS FAB */}
        <View style={styles.centerGap} />

        {/* Right tabs: Wallet, Profile */}
        <View style={styles.tabGroup}>
          {tabs.slice(2, 4).map((tab) => {
            const IconComponent = tab.icon;
            const isActive = pathname.includes(tab.key);

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => router.push(tab.route as any)}
                style={[styles.circleButton, isActive && styles.activeCircleButton]}
              >
                <IconComponent
                  size={20}
                  color={isActive ? '#FFFFFF' : COLORS.muted}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Floating Centered SOS Button */}
      <SOSButton onConfirmSOS={handleSOSConfirm} onQuickTap={handleSOSQuickTap} />
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  pillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  centerGap: {
    width: 60,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircleButton: {
    backgroundColor: COLORS.brand,
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});
