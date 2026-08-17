import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { EditorialCard } from '../../src/components/EditorialCard';
import { SAFETY_TIPS } from '../../src/services/mockData';
import { SafetyTip } from '../../src/types';

export default function LearnFeedScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Preparation', 'SOS Guide', 'AI Health', 'First Aid'];

  const filteredTips = SAFETY_TIPS.filter((tip) => {
    if (selectedCategory === 'All') return true;
    return tip.category === selectedCategory;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <DetailHeader title="Safety Tips & Guides" />

      {/* Category Pill Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.pill, isActive && styles.activePill]}
            >
              <Text style={[styles.pillText, isActive && styles.activePillText]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Feed of Editorial Cards */}
      <View style={styles.feedContainer}>
        {filteredTips.map((tip) => (
          <EditorialCard
            key={tip.id}
            tip={tip}
            onPress={() => router.push(`/learn/${tip.id}`)}
          />
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
  filterScroll: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  pill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activePill: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  activePillText: {
    color: '#FFFFFF',
  },
  feedContainer: {
    paddingHorizontal: 20,
  },
});
