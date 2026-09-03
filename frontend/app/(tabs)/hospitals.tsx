import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { MapPin, Navigation, Phone, Search, Sparkles, ChevronRight, List, Map } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useHospitalStore } from '../../src/store/useHospitalStore';

export default function HospitalsScreen() {
  const {
    hospitals,
    selectedSpecialty,
    searchQuery,
    viewMode,
    setSelectedSpecialty,
    setSearchQuery,
    setViewMode,
  } = useHospitalStore();

  const specialties = ['cardiac', 'trauma', 'icu', 'general', 'pediatrics'];

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Nearby Hospitals</Text>
            <Text style={styles.subtitle}>AI Ranked by Distance, Specialty & Bed Capacity</Text>
          </View>

          {/* List / Map Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              onPress={() => setViewMode('list')}
              style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            >
              <List size={16} color={viewMode === 'list' ? COLORS.brand : COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('map')}
              style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            >
              <Map size={16} color={viewMode === 'map' ? COLORS.brand : COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search hospital name or specialty..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* Specialty Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            onPress={() => setSelectedSpecialty(null)}
            style={[styles.filterPill, !selectedSpecialty && styles.activeFilterPill]}
          >
            <Text style={[styles.filterText, !selectedSpecialty && styles.activeFilterText]}>
              All Specialties
            </Text>
          </TouchableOpacity>

          {specialties.map((spec) => {
            const isActive = selectedSpecialty === spec;
            return (
              <TouchableOpacity
                key={spec}
                onPress={() => setSelectedSpecialty(isActive ? null : spec)}
                style={[styles.filterPill, isActive && styles.activeFilterPill]}
              >
                <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                  {spec.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Map View Simulation */}
        {viewMode === 'map' ? (
          <View style={styles.mapContainer}>
            <MapPin size={36} color={COLORS.brand} />
            <Text style={styles.mapText}>Interactive OpenStreetMap View</Text>
            <Text style={styles.mapSubtext}>Showing 4 hospital pins within 5km radius</Text>
          </View>
        ) : (
          /* Hospital Cards List */
          <View style={styles.listContainer}>
            {filteredHospitals.map((hospital, index) => {
              const isTopMatch = index === 0;

              return (
                <TouchableOpacity
                  key={hospital.id}
                  activeOpacity={0.88}
                  onPress={() => router.push(`/hospitals/${hospital.id}`)}
                  style={[
                    styles.hospitalCard,
                    isTopMatch && styles.topMatchCard,
                  ]}
                >
                  {/* Top Rank AI Explanation Banner */}
                  {isTopMatch && hospital.recommendationReason && (
                    <View style={styles.aiReasonBanner}>
                      <Sparkles size={14} color={COLORS.brand} />
                      <Text style={styles.aiReasonText}>{hospital.recommendationReason}</Text>
                    </View>
                  )}

                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hospitalName}>{hospital.name}</Text>
                      <Text style={styles.hospitalAddress}>{hospital.address}</Text>
                    </View>

                    <StatusBadge
                      status={hospital.availableBeds > 10 ? 'green' : hospital.availableBeds > 0 ? 'amber' : 'red'}
                      text={`${hospital.availableBeds} Beds`}
                    />
                  </View>

                  {/* Metrics Row */}
                  <View style={styles.metricsRow}>
                    <View style={styles.metricBadge}>
                      <Navigation size={14} color={COLORS.brand} />
                      <Text style={styles.metricText}>
                        {hospital.distanceKm || 2.1} km · {hospital.etaMinutes || 6} min ETA
                      </Text>
                    </View>

                    <View style={styles.specialtiesRow}>
                      {hospital.specialties.slice(0, 3).map((spec) => (
                        <View key={spec} style={styles.specTag}>
                          <Text style={styles.specTagText}>{spec}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailText}>View Capacity & Directions</Text>
                    <ChevronRight size={16} color={COLORS.brand} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: TYPOGRAPHY.size.title,
    fontWeight: '900',
    color: COLORS.ink,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    padding: 8,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.ink,
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterPill: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  mapContainer: {
    height: 320,
    backgroundColor: COLORS.hospitals.bg,
    borderRadius: SPACING.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 163, 61, 0.3)',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.ink,
    marginTop: 10,
  },
  mapSubtext: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  listContainer: {
    gap: 16,
  },
  hospitalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0B2545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  topMatchCard: {
    backgroundColor: COLORS.hospitals.bg,
    borderColor: 'rgba(232, 163, 61, 0.3)',
  },
  aiReasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  aiReasonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.ink,
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  hospitalName: {
    fontSize: TYPOGRAPHY.size.subheading,
    fontWeight: '800',
    color: COLORS.ink,
    marginBottom: 2,
  },
  hospitalAddress: {
    fontSize: 12,
    color: COLORS.muted,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(14, 124, 134, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brand,
  },
  specialtiesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  specTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  specTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'capitalize',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.brand,
  },
});
