import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { BookOpen, Clock, ChevronRight } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { SafetyTip } from '../types';

interface EditorialCardProps {
  tip: SafetyTip;
  onPress?: () => void;
}

export const EditorialCard: React.FC<EditorialCardProps> = ({ tip, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: tip.imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514' }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{tip.category}</Text>
        </View>
      </View>

      <View style={styles.contentPadding}>
        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>
          {tip.subtitle}
        </Text>

        <View style={styles.footerRow}>
          <View style={styles.readTimeRow}>
            <Clock size={14} color={COLORS.muted} />
            <Text style={styles.readTimeText}>{tip.readTime}</Text>
          </View>
          <View style={styles.readMoreRow}>
            <Text style={styles.readMoreText}>Read Article</Text>
            <ChevronRight size={16} color={COLORS.brand} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentPadding: {
    padding: SPACING.padding,
  },
  title: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '800',
    color: COLORS.ink,
    lineHeight: 24,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.caption,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brand,
  },
});
