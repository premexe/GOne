import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Clock, Circle } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

export interface StepItem {
  id: string;
  title: string;
  subtitle: string;
  time?: string;
  status: 'complete' | 'active' | 'pending';
}

interface TimelineStepperProps {
  steps: StepItem[];
  isDark?: boolean;
}

export const TimelineStepper: React.FC<TimelineStepperProps> = ({ steps, isDark = true }) => {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <View key={step.id} style={styles.stepRow}>
            {/* Step Icon Column & Connecting Line */}
            <View style={styles.iconColumn}>
              <View style={styles.iconWrapper}>
                {step.status === 'complete' ? (
                  <CheckCircle2
                    size={22}
                    color={isDark ? COLORS.emergency.pulseGreen : COLORS.status.green}
                  />
                ) : step.status === 'active' ? (
                  <Clock
                    size={22}
                    color={isDark ? COLORS.emergency.pulseAmber : COLORS.status.amber}
                  />
                ) : (
                  <Circle
                    size={20}
                    color={isDark ? 'rgba(245, 247, 250, 0.25)' : COLORS.border}
                  />
                )}
              </View>

              {!isLast && (
                <View
                  style={[
                    styles.line,
                    {
                      backgroundColor:
                        step.status === 'complete'
                          ? isDark
                            ? COLORS.emergency.pulseGreen
                            : COLORS.status.green
                          : isDark
                          ? 'rgba(245, 247, 250, 0.15)'
                          : COLORS.border,
                    },
                  ]}
                />
              )}
            </View>

            {/* Step Content */}
            <View style={styles.contentColumn}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.stepTitle,
                    isDark && styles.darkText,
                    step.status === 'active' && {
                      color: isDark ? COLORS.emergency.pulseAmber : COLORS.brand,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {step.title}
                </Text>
                {step.time && (
                  <Text style={[styles.monoTime, isDark && styles.darkTime]}>{step.time}</Text>
                )}
              </View>

              <Text style={[styles.stepSubtitle, isDark && styles.darkSubtitle]}>
                {step.subtitle}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 54,
  },
  iconColumn: {
    alignItems: 'center',
    width: 32,
    marginRight: 14,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  contentColumn: {
    flex: 1,
    paddingBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.ink,
  },
  darkText: {
    color: COLORS.emergency.text,
  },
  stepSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },
  darkSubtitle: {
    color: 'rgba(245, 247, 250, 0.6)',
  },
  monoTime: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  darkTime: {
    color: COLORS.emergency.pulseAmber,
  },
});
