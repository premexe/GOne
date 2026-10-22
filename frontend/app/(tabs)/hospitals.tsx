import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MapPin, Navigation, Search, Sparkles, ChevronRight, List, Map, RefreshCw } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { COLORS, TYPOGRAPHY, SPACING } from '../../src/constants/theme';
import { StatusBadge } from '../../src/components/StatusBadge';
import { useHospitalStore } from '../../src/store/useHospitalStore';

let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (_) {
    NativeWebView = null;
  }
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/* ── helpers ─────────────────────────────────────────────────────────── */
interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  beds: number;
  specialty: string;
  address?: string;
  distanceKm?: number;
}

function buildMapHtml(markers: MapMarker[], userLoc: { lat: number; lng: number }): string {
  const safeMarkers = markers.map((m) => ({
    id: m.id,
    name: m.name.replace(/['"<>&]/g, (c) => ({ "'": '&#39;', '"': '&quot;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c)),
    lat: m.lat,
    lng: m.lng,
    beds: m.beds,
    specialty: m.specialty,
    address: (m.address || 'Medical District').replace(/['"<>&]/g, (c) => ({ "'": '&#39;', '"': '&quot;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] || c)),
    dist: m.distanceKm ? `${m.distanceKm.toFixed(1)} km` : '',
  }));

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #eef3f4; }
    .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    
    /* User pulse marker */
    .user-pulse-wrap { position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
    .user-pulse-ring {
      position: absolute; width: 24px; height: 24px; border-radius: 50%;
      background: rgba(37, 99, 235, 0.35); animation: pulse 2s infinite ease-out;
    }
    .user-dot {
      width: 14px; height: 14px; border-radius: 50%; background: #2563eb;
      border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); z-index: 2;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 1; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    /* Hospital pin marker */
    .hosp-pin { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
    .hosp-badge {
      min-width: 34px; height: 34px; border-radius: 17px; background: #0e7c86;
      border: 2.5px solid #ffffff; box-shadow: 0 3px 10px rgba(0,0,0,0.28);
      display: flex; align-items: center; justify-content: center; color: #ffffff;
      font-size: 13px; font-weight: 800; padding: 0 4px;
    }
    .hosp-pin.has-beds .hosp-badge { background: #0e7c86; }
    .hosp-pin.low-beds .hosp-badge { background: #d97706; }
    .hosp-pin.zero-beds .hosp-badge { background: #dc2626; }
    .hosp-tail {
      width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent;
      border-top: 7px solid #0e7c86; margin-top: -1px;
    }
    .hosp-pin.low-beds .hosp-tail { border-top-color: #d97706; }
    .hosp-pin.zero-beds .hosp-tail { border-top-color: #dc2626; }

    /* Popups */
    .leaflet-popup-content-wrapper {
      border-radius: 14px; box-shadow: 0 8px 24px rgba(15,23,42,0.18);
      padding: 0; overflow: hidden;
    }
    .leaflet-popup-content { margin: 12px 14px; min-width: 200px; }
    .popup-title { font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 3px; line-height: 1.3; }
    .popup-addr { font-size: 11px; color: #64748b; margin-bottom: 8px; line-height: 1.3; }
    .popup-tags { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap; }
    .popup-bed-badge {
      font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 10px;
      background: #ecfdf5; color: #059669;
    }
    .popup-bed-badge.low { background: #fffbeb; color: #d97706; }
    .popup-dist { font-size: 11px; font-weight: 700; color: #0e7c86; }
    .popup-btn {
      display: block; width: 100%; text-align: center; background: #0e7c86; color: #ffffff;
      font-weight: 700; font-size: 12px; padding: 8px 0; border-radius: 8px;
      text-decoration: none; cursor: pointer; border: none; margin-top: 4px;
    }
    .map-ctrl-btn {
      position: absolute; right: 12px; z-index: 1000; background: #ffffff;
      border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; padding: 8px 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-size: 12px; font-weight: 700;
      color: #0e7c86; cursor: pointer;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <button class="map-ctrl-btn" style="bottom: 16px;" onclick="centerAll()">🎯 View All (${safeMarkers.length})</button>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map;
    var allBounds = [];
    var userCoord = [${userLoc.lat}, ${userLoc.lng}];
    var hospitals = ${JSON.stringify(safeMarkers)};

    function initMap() {
      if (!window.L) {
        document.getElementById('map').innerHTML = '<div style="padding:20px;text-align:center;">Loading map tiles...</div>';
        return;
      }

      map = L.map('map', { zoomControl: true, attributionControl: false });
      
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      // User Marker
      var userIcon = L.divIcon({
        className: '',
        html: '<div class="user-pulse-wrap"><div class="user-pulse-ring"></div><div class="user-dot"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      var userMarker = L.marker(userCoord, { icon: userIcon }).addTo(map);
      userMarker.bindPopup('<b>📍 Your Current Location</b><br><span style="font-size:11px;color:#64748b">Emergency GPS active</span>');
      allBounds.push(userCoord);

      // Hospital Markers
      hospitals.forEach(function(h, idx) {
        if (!h.lat || !h.lng) return;
        var rank = idx + 1;
        var bedClass = h.beds > 10 ? 'has-beds' : (h.beds > 0 ? 'low-beds' : 'zero-beds');
        var pinHtml = '<div class="hosp-pin ' + bedClass + '">' +
          '<div class="hosp-badge">#' + rank + '</div>' +
          '<div class="hosp-tail"></div>' +
          '</div>';

        var hospIcon = L.divIcon({
          className: '',
          html: pinHtml,
          iconSize: [34, 42],
          iconAnchor: [17, 42],
          popupAnchor: [0, -38]
        });

        var bedBadgeClass = h.beds > 10 ? 'popup-bed-badge' : 'popup-bed-badge low';
        var popupContent = '<div class="popup-title">' + h.name + '</div>' +
          '<div class="popup-addr">' + h.address + '</div>' +
          '<div class="popup-tags">' +
            '<span class="' + bedBadgeClass + '">' + h.beds + ' Beds Available</span>' +
            (h.dist ? '<span class="popup-dist">📍 ' + h.dist + '</span>' : '') +
          '</div>' +
          '<button class="popup-btn" onclick="selectHosp(\\'' + h.id + '\\')">View Hospital Details →</button>';

        var marker = L.marker([h.lat, h.lng], { icon: hospIcon }).addTo(map);
        marker.bindPopup(popupContent, { maxWidth: 240 });
        allBounds.push([h.lat, h.lng]);
      });

      centerAll();
      setTimeout(function() { map.invalidateSize(); }, 350);
    }

    function centerAll() {
      if (allBounds.length > 1) {
        map.fitBounds(allBounds, { padding: [35, 35], maxZoom: 15 });
      } else {
        map.setView(userCoord, 14);
      }
    }

    function selectHosp(id) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_hospital', id: id }));
      } else {
        window.location.href = '/hospitals/' + id;
      }
    }

    window.onload = initMap;
    if (document.readyState === 'complete') { initMap(); }
  </script>
</body>
</html>`;
}

/* ── component ───────────────────────────────────────────────────────── */
export default function HospitalsScreen() {
  const [mapError, setMapError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState(19.697);
  const [userLng, setUserLng] = useState(72.766);
  const [isFullMap, setIsFullMap] = useState(false);
  const webViewKey = useRef(0);

  const {
    hospitals,
    selectedSpecialty,
    searchQuery,
    viewMode,
    isLoading,
    setSelectedSpecialty,
    setSearchQuery,
    setViewMode,
    fetchHospitals,
  } = useHospitalStore();

  /* Fetch user location + hospitals on mount */
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLat(loc.coords.latitude);
          setUserLng(loc.coords.longitude);
          fetchHospitals(loc.coords.latitude, loc.coords.longitude);
        } else {
          fetchHospitals(userLat, userLng);
        }
      } catch {
        fetchHospitals(userLat, userLng);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const specialties = ['cardiac', 'trauma', 'icu', 'general', 'pediatrics'];

  const filteredHospitals = useMemo(() => {
    return hospitals.filter((h) => {
      const matchesSearch =
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSpecialty =
        !selectedSpecialty || h.specialties.some((s) => s.toLowerCase() === selectedSpecialty);
      return matchesSearch && matchesSpecialty;
    });
  }, [hospitals, searchQuery, selectedSpecialty]);

  const hospitalMarkers: MapMarker[] = useMemo(
    () =>
      filteredHospitals.map((h) => ({
        id: h.id,
        name: h.name,
        lat: h.lat,
        lng: h.lng,
        beds: h.availableBeds ?? 0,
        specialty: h.specialties[0] ?? 'General',
        address: h.address,
        distanceKm: h.distanceKm,
      })),
    [filteredHospitals]
  );

  const mapHtml = useMemo(
    () => buildMapHtml(hospitalMarkers, { lat: userLat, lng: userLng }),
    [hospitalMarkers, userLat, userLng]
  );

  /* Refresh map by remounting WebView */
  const handleRefreshMap = () => {
    setMapError(null);
    webViewKey.current += 1;
    fetchHospitals(userLat, userLng);
  };

  /* ── map view (interactive full/split screen) ── */
  if (viewMode === 'map') {
    return (
      <View style={styles.container}>
        {/* Sticky header */}
        <View style={styles.mapHeader}>
          <View>
            <Text style={styles.title}>Hospital Map</Text>
            <Text style={styles.subtitle}>Showing nearby medical facilities</Text>
          </View>
          <View style={styles.toggleContainer}>
            <TouchableOpacity onPress={() => setViewMode('list')} style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}>
              <List size={16} color={viewMode === 'list' ? COLORS.brand : COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('map')} style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}>
              <Map size={16} color={viewMode === 'map' ? COLORS.brand : COLORS.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pill count & controls */}
        <View style={styles.mapCountRow}>
          <MapPin size={14} color={COLORS.brand} />
          <Text style={styles.mapCountText}>
            {filteredHospitals.length} hospitals located on map
          </Text>
          <TouchableOpacity
            onPress={() => setIsFullMap(!isFullMap)}
            style={styles.expandToggleBtn}
          >
            <Text style={styles.expandToggleText}>{isFullMap ? 'Split List' : 'Full Map'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRefreshMap} style={styles.refreshBtn}>
            <RefreshCw size={14} color={COLORS.brand} />
          </TouchableOpacity>
        </View>

        {/* Map Viewport */}
        <View style={[styles.mapFull, isFullMap && { flex: 1, height: undefined }]}>
          {isLoading && filteredHospitals.length === 0 ? (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.brand} />
              <Text style={styles.mapLoadingText}>Locating nearby hospitals on map…</Text>
            </View>
          ) : Platform.OS === 'web' ? (
            <iframe
              key={webViewKey.current}
              title="Nearby hospitals"
              srcDoc={mapHtml}
              style={{ width: '100%', height: '100%', border: 'none' } as any}
            />
          ) : NativeWebView ? (
            <NativeWebView
              key={webViewKey.current}
              originWhitelist={['*']}
              source={{ html: mapHtml }}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="compatibility"
              allowsInlineMediaPlayback
              style={{ flex: 1 }}
              onError={() =>
                setMapError('Map could not load. Check internet connection.')
              }
              onMessage={(event: any) => {
                try {
                  const msg = JSON.parse(event.nativeEvent.data);
                  if (msg.type === 'open_hospital' && msg.id) {
                    router.push(`/hospitals/${msg.id}`);
                  }
                } catch (_) {}
              }}
            />
          ) : (
            <View style={styles.mapUnavailable}>
              <MapPin size={40} color={COLORS.brand} />
              <Text style={styles.mapText}>Interactive map running</Text>
              <Text style={styles.mapSubtext}>{filteredHospitals.length} hospitals located nearby</Text>
            </View>
          )}

          {mapError ? (
            <View style={styles.mapErrorBanner}>
              <Text style={styles.mapErrorText}>{mapError}</Text>
            </View>
          ) : null}
        </View>

        {/* Mini list underneath (when not in full map mode) */}
        {!isFullMap && (
          <ScrollView style={styles.miniList} contentContainerStyle={{ padding: 16, gap: 10 }}>
            {filteredHospitals.map((h, i) => (
              <TouchableOpacity
                key={h.id}
                style={styles.miniCard}
                onPress={() => router.push(`/hospitals/${h.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.miniCardRank}>
                  <Text style={styles.miniCardRankText}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.miniCardName} numberOfLines={1}>{h.name}</Text>
                  <Text style={styles.miniCardSub} numberOfLines={1}>
                    {h.distanceKm ? `${h.distanceKm.toFixed(1)} km` : 'Near you'} · {h.availableBeds} beds available
                  </Text>
                </View>
                <StatusBadge
                  status={h.availableBeds > 10 ? 'green' : h.availableBeds > 0 ? 'amber' : 'red'}
                  text={`${h.availableBeds} beds`}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  /* ── list view ── */
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Nearby Hospitals</Text>
            <Text style={styles.subtitle}>AI Ranked by Distance, Specialty &amp; Bed Capacity</Text>
          </View>
          <View style={styles.toggleContainer}>
            <TouchableOpacity onPress={() => setViewMode('list')} style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}>
              <List size={16} color={viewMode === 'list' ? COLORS.brand : COLORS.muted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('map')} style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}>
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

        {/* Loading state */}
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.brand} />
            <Text style={styles.loadingText}>Finding nearby hospitals…</Text>
          </View>
        )}

        {/* Hospital Cards */}
        <View style={styles.listContainer}>
          {filteredHospitals.map((hospital, index) => {
            const isTopMatch = index === 0;
            return (
              <TouchableOpacity
                key={hospital.id}
                activeOpacity={0.88}
                onPress={() => router.push(`/hospitals/${hospital.id}`)}
                style={[styles.hospitalCard, isTopMatch && styles.topMatchCard]}
              >
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
                  <Text style={styles.viewDetailText}>View Capacity &amp; Directions</Text>
                  <ChevronRight size={16} color={COLORS.brand} />
                </View>
              </TouchableOpacity>
            );
          })}

          {!isLoading && filteredHospitals.length === 0 && (
            <View style={styles.emptyState}>
              <MapPin size={32} color={COLORS.muted} />
              <Text style={styles.emptyText}>No hospitals found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or specialty filter</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ── styles ────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  /* List view */
  content: { paddingHorizontal: 20, paddingTop: 54, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  title: {
    fontSize: TYPOGRAPHY.size.title, fontWeight: '900',
    color: COLORS.ink, letterSpacing: -0.5,
  },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  toggleContainer: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 3,
  },
  toggleBtn: { padding: 8, borderRadius: 9 },
  toggleBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: COLORS.ink },
  filterScroll: { marginBottom: 16 },
  filterPill: {
    backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  activeFilterPill: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterText: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  activeFilterText: { color: '#FFFFFF' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  loadingText: { fontSize: 13, color: COLORS.muted },
  listContainer: { gap: 16 },
  hospitalCard: {
    backgroundColor: '#FFFFFF', borderRadius: SPACING.cardRadius,
    padding: SPACING.padding, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#0B2545', shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  topMatchCard: { backgroundColor: COLORS.hospitals?.bg ?? '#FFF9ED', borderColor: 'rgba(232,163,61,0.3)' },
  aiReasonBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, marginBottom: 12,
  },
  aiReasonText: { fontSize: 11, fontWeight: '700', color: COLORS.ink, flex: 1 },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  hospitalName: {
    fontSize: TYPOGRAPHY.size.subheading, fontWeight: '800',
    color: COLORS.ink, marginBottom: 2,
  },
  hospitalAddress: { fontSize: 12, color: COLORS.muted },
  metricsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  metricBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(14,124,134,0.1)', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 10,
  },
  metricText: { fontSize: 12, fontWeight: '700', color: COLORS.brand },
  specialtiesRow: { flexDirection: 'row', gap: 4 },
  specTag: {
    backgroundColor: 'rgba(0,0,0,0.04)', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8,
  },
  specTagText: { fontSize: 10, fontWeight: '600', color: COLORS.muted, textTransform: 'capitalize' },
  cardFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingTop: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
  },
  viewDetailText: { fontSize: 13, fontWeight: '700', color: COLORS.brand },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: COLORS.ink },
  emptySubtext: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  /* Map view */
  mapHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 10,
    backgroundColor: COLORS.bg,
  },
  mapCountRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingBottom: 8, backgroundColor: COLORS.bg,
  },
  mapCountText: { fontSize: 13, color: COLORS.brand, fontWeight: '700', flex: 1 },
  refreshBtn: {
    padding: 6, backgroundColor: 'rgba(14,124,134,0.1)',
    borderRadius: 8,
  },
  expandToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brand,
  },
  mapFull: {
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#eef3f4',
    overflow: 'hidden',
  },
  mapLoadingOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  mapLoadingText: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  mapUnavailable: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapText: { fontSize: 16, fontWeight: '800', color: COLORS.ink, marginTop: 10 },
  mapSubtext: { fontSize: 12, color: COLORS.muted },
  mapErrorBanner: {
    position: 'absolute', left: 12, right: 12, bottom: 12,
    backgroundColor: 'rgba(255,255,255,0.94)', padding: 10, borderRadius: 10,
  },
  mapErrorText: { color: COLORS.status?.red ?? '#dc2626', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  /* Mini list under map */
  miniList: { flex: 1, backgroundColor: COLORS.bg },
  miniCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  miniCardRank: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.brand, alignItems: 'center', justifyContent: 'center',
  },
  miniCardRankText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  miniCardName: { fontSize: 13, fontWeight: '800', color: COLORS.ink },
  miniCardSub: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
});
