import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

interface SummaryCardProps {
  category: 'readiness' | 'records' | 'hospitals' | 'wallet';
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  sparklineData?: number[];
  onPress?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  category,
  title,
  value,
  subtitle,
  icon,
  sparklineData = [40, 55, 60, 65, 70, 78, 82],
  onPress,
}) => {
  const theme = COLORS[category];

  // Generate SVG path for sparkline
  const renderSparkline = () => {
    const width = 80;
    const height = 32;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData) || 100;
    const range = max - min || 1;

    const points = sparklineData.map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    });

    const pathD = `M ${points.join(' L ')}`;

    return (
      <Svg width={width} height={height}>
        <Path
          d={pathD}
          fill="none"
          stroke={theme.accent}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.bg }]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>{icon}</View>
        <View style={styles.headerRight}>
          <Text style={[styles.categoryLabel, { color: theme.accent }]}>{title}</Text>
          <ChevronRight size={18} color={COLORS.muted} />
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.textContainer}>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>
        </View>
        <View style={styles.sparklineContainer}>{renderSparkline()}</View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  valueText: {
    fontSize: TYPOGRAPHY.size.title,
    fontWeight: '800',
    color: COLORS.ink,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.muted,
    fontWeight: '500',
  },
  sparklineContainer: {
    paddingBottom: 4,
  },
});
