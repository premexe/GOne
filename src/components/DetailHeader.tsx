import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

interface DetailHeaderProps {
  title: string;
  actionText?: string;
  onActionPress?: () => void;
  selectedRange?: string;
  onRangeSelect?: (range: string) => void;
  ranges?: string[];
  isDark?: boolean;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  title,
  actionText,
  onActionPress,
  selectedRange,
  onRangeSelect,
  ranges = ['D', 'W', 'M', '6M', 'Y'],
  isDark = false,
}) => {
  const textColor = isDark ? COLORS.emergency.text : COLORS.ink;
  const backIconColor = isDark ? COLORS.emergency.text : COLORS.ink;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && styles.darkBackButton]}
        >
          <ArrowLeft size={20} color={backIconColor} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: textColor }]}>{title}</Text>

        {actionText ? (
          <TouchableOpacity onPress={onActionPress}>
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {onRangeSelect && (
        <View style={styles.segmentedContainer}>
          {ranges.map((r) => {
            const isActive = selectedRange === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => onRangeSelect(r)}
                style={[
                  styles.pill,
                  isActive && styles.activePill,
                  isDark && isActive && styles.darkActivePill,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    isActive && styles.activePillText,
                    isDark && { color: isDark && !isActive ? COLORS.muted : COLORS.emergency.text },
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBackButton: {
    backgroundColor: COLORS.emergency.cardBg,
  },
  title: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '700',
  },
  actionText: {
    fontSize: TYPOGRAPHY.size.caption,
    fontWeight: '600',
    color: COLORS.brand,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 4,
    marginTop: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 10,
  },
  activePill: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  darkActivePill: {
    backgroundColor: COLORS.brand,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  activePillText: {
    color: COLORS.brand,
    fontWeight: '700',
  },
});
