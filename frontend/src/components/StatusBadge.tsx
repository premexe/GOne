import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface StatusBadgeProps {
  status: 'green' | 'amber' | 'red';
  text: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  const dotColor =
    status === 'green'
      ? COLORS.status.green
      : status === 'amber'
      ? COLORS.status.amber
      : COLORS.status.red;

  const bgStyle =
    status === 'green'
      ? { backgroundColor: 'rgba(46, 158, 91, 0.12)' }
      : status === 'amber'
      ? { backgroundColor: 'rgba(232, 163, 61, 0.12)' }
      : { backgroundColor: 'rgba(215, 38, 61, 0.12)' };

  return (
    <View style={[styles.badge, bgStyle]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: dotColor }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
