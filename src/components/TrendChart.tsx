import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { COLORS, SPACING } from '../constants/theme';

interface DataPoint {
  date: string;
  score: number;
}

interface TrendChartProps {
  data: DataPoint[];
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, height = 180 }) => {
  const chartHeight = height - 30; // space for labels
  const maxScore = 100;

  return (
    <View style={styles.card}>
      <Text style={styles.chartHeaderTitle}>Readiness Trend</Text>

      <View style={[styles.chartContainer, { height }]}>
        <View style={styles.barsRow}>
          {data.map((item, index) => {
            const barHeight = (item.score / maxScore) * chartHeight;
            const isHighest = item.score >= 80;

            return (
              <View key={index} style={styles.barColumn}>
                <View style={[styles.barWrapper, { height: chartHeight }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(barHeight, 8),
                        backgroundColor: isHighest ? COLORS.brand : 'rgba(14, 124, 134, 0.35)',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{item.date}</Text>
              </View>
            );
          })}
        </View>

        {/* Right axis labels */}
        <View style={styles.axisColumn}>
          <Text style={styles.axisLabel}>100%</Text>
          <Text style={styles.axisLabel}>50%</Text>
          <Text style={styles.axisLabel}>0%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  chartHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    justifyContent: 'flex-end',
    width: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 12,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    marginTop: 8,
  },
  axisColumn: {
    height: '100%',
    justifyContent: 'space-between',
    paddingBottom: 22,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  axisLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '500',
  },
});
