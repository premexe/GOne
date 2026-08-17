import React from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Clock, BookOpen, Share2 } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { SAFETY_TIPS } from '../../src/services/mockData';

export default function ArticleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tip = SAFETY_TIPS.find((t) => t.id === id) || SAFETY_TIPS[0];

  if (!tip) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DetailHeader title="Article Reader" />

      <Image
        source={{ uri: tip.imageUrl || 'https://images.unsplash.com/photo-1516549655169-df83a0774514' }}
        style={styles.bannerImage}
        resizeMode="cover"
      />

      <View style={styles.bodyContent}>
        <View style={styles.badgeRow}>
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{tip.category}</Text>
          </View>
          <View style={styles.timeRow}>
            <Clock size={14} color={COLORS.muted} />
            <Text style={styles.timeText}>{tip.readTime}</Text>
          </View>
        </View>

        <Text style={styles.title}>{tip.title}</Text>
        <Text style={styles.subtitle}>{tip.subtitle}</Text>

        <View style={styles.divider} />

        {tip.content.map((paragraph, idx) => (
          <Text key={idx} style={styles.paragraph}>
            {paragraph}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingBottom: 40,
  },
  bannerImage: {
    width: '100%',
    height: 220,
    backgroundColor: COLORS.surface,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  catBadge: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  catBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  title: {
    fontSize: TYPOGRAPHY.size.title,
    fontWeight: '900',
    color: COLORS.ink,
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.body,
    color: COLORS.muted,
    lineHeight: 22,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 15,
    color: COLORS.ink,
    lineHeight: 24,
    marginBottom: 16,
  },
});
