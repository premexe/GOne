import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Phone, ShieldCheck, MapPin, CheckCircle2, Truck, User as UserIcon, Clock, AlertCircle, Building2, ChevronRight, Stethoscope } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING } from '../../src/constants/theme';
import { DetailHeader } from '../../src/components/DetailHeader';
import { TimelineStepper, StepItem } from '../../src/components/TimelineStepper';
import { useEmergencyStore } from '../../src/store/useEmergencyStore';

// Safe dynamic require for react-native-webview on native platforms
let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (e) {
    NativeWebView = null;
  }
}

export default function TrackEmergencyScreen() {
  const activeRequest = useEmergencyStore((s) => s.activeRequest);
  const refreshActiveEmergency = useEmergencyStore((s) => s.refreshActiveEmergency);
  const endEmergency = useEmergencyStore((s) => s.endEmergency);

  const [mapLoaded, setMapLoaded] = useState(false);

  const hospital = activeRequest?.acceptedHospital || activeRequest?.matchedHospital;
  const ambulance = activeRequest?.assignedAmbulance;
  const doctor = activeRequest?.assignedDoctor;

  // Poll for SOS updates every 2.5 seconds
  useEffect(() => {
    refreshActiveEmergency();
    const timer = setInterval(() => {
      refreshActiveEmergency();
    }, 2500);
    return () => clearInterval(timer);
  }, [refreshActiveEmergency]);

  const isResolved = activeRequest?.status === 'closed';
  const isAccepted = Boolean(activeRequest?.acceptedHospital || (activeRequest as any)?.hospitalId || activeRequest?.dispatchStatus === 'ACCEPTED' || activeRequest?.dispatchStatus === 'AMBULANCE_ASSIGNED' || activeRequest?.dispatchStatus === 'EN_ROUTE');
  const isAmbulanceAssigned = Boolean(ambulance);
  const isDoctorAssigned = Boolean(doctor);

  // User and Hospital Coordinates
  const userLat = activeRequest?.userLatitude || 19.076;
  const userLng = activeRequest?.userLongitude || 72.877;
  const hospLat = hospital?.lat || 19.082;
  const hospLng = hospital?.lng || 72.882;

  // Simulated ambulance position between hospital and user
  const ambLat = (hospLat * 0.4 + userLat * 0.6);
  const ambLng = (hospLng * 0.4 + userLng * 0.6);

  // Generate Leaflet OpenStreetMap HTML
  const leafletHtml = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #070d1e; }
    .leaflet-container { background: #070d1e !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .pulse-user {
      width: 20px;
      height: 20px;
      background: #ef4444;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 14px rgba(239, 68, 68, 1);
      animation: pulse-ring 1.8s infinite;
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.8); }
      70% { box-shadow: 0 0 0 16px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .hosp-marker {
      background: #10b981;
      border: 2px solid #ffffff;
      border-radius: 8px;
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);
    }
    .amb-marker {
      background: #3b82f6;
      border: 2px solid #ffffff;
      border-radius: 50%;
      color: #ffffff;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      box-shadow: 0 0 14px rgba(59, 130, 246, 0.9);
      animation: amb-bounce 2s infinite ease-in-out;
    }
    @keyframes amb-bounce {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.12); }
    }
    .leaflet-popup-content-wrapper {
      background: #111a33 !important;
      color: #f8fafc !important;
      border-radius: 10px !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
      font-size: 12px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
    }
    .leaflet-popup-tip { background: #111a33 !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map);

    var userIcon = L.divIcon({
      className: '',
      html: '<div class="pulse-user"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    var hospIcon = L.divIcon({
      className: '',
      html: '<div class="hosp-marker">🏥</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    var ambIcon = L.divIcon({
      className: '',
      html: '<div class="amb-marker">🚑</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    var userMarker = L.marker([${userLat}, ${userLng}], { icon: userIcon }).addTo(map);
    userMarker.bindPopup('<b>Your Location</b><br>Emergency SOS Active');

    var hospMarker = L.marker([${hospLat}, ${hospLng}], { icon: hospIcon }).addTo(map);
    hospMarker.bindPopup('<b>${(hospital?.name || 'Partner Hospital').replace(/'/g, "\\'")}</b><br>${(hospital?.address || 'ER Receiving Desk').replace(/'/g, "\\'")}');

    var points = [[${userLat}, ${userLng}], [${hospLat}, ${hospLng}]];

    ${isAmbulanceAssigned ? `
    var ambMarker = L.marker([${ambLat}, ${ambLng}], { icon: ambIcon }).addTo(map);
    ambMarker.bindPopup('<b>${(ambulance?.vehicleNumber || 'Emergency Ambulance').replace(/'/g, "\\'")}</b><br>Driver: ${(ambulance?.driverName || 'En Route').replace(/'/g, "\\'")}');
    points.push([${ambLat}, ${ambLng}]);
    ` : ''}

    var route = L.polyline([[${hospLat}, ${hospLng}], ${isAmbulanceAssigned ? `[${ambLat}, ${ambLng}],` : ''} [${userLat}, ${userLng}]], {
      color: '#3b82f6',
      weight: 4,
      opacity: 0.85,
      dashArray: '8, 8'
    }).addTo(map);

    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  </script>
</body>
</html>`;
  }, [userLat, userLng, hospLat, hospLng, ambLat, ambLng, hospital, ambulance, isAmbulanceAssigned]);

  const timelineSteps: StepItem[] = [
    {
      id: 't1',
      title: 'SOS Alert Triggered',
      subtitle: 'Patient GPS location broadcasted to network',
      time: 'Confirmed',
      status: 'complete',
    },
    {
      id: 't2',
      title: 'Hospitals Notified',
      subtitle: 'Nearby emergency triage desks receiving broadcast',
      time: 'Confirmed',
      status: 'complete',
    },
    {
      id: 't3',
      title: isAccepted ? 'Hospital Accepted Admission' : 'Awaiting Hospital Admission',
      subtitle: hospital
        ? `${hospital.name} accepted admission & reserved ER bed`
        : 'Awaiting ER desk confirmation from nearby hospitals',
      time: isAccepted ? 'Confirmed' : 'Pending',
      status: isAccepted ? 'complete' : 'active',
    },
    {
      id: 't4',
      title: 'Responder Unit Dispatched',
      subtitle: ambulance
        ? `${ambulance.vehicleNumber} (Driver: ${ambulance.driverName}) en route`
        : 'Hospital dispatching nearest emergency vehicle',
      time: ambulance ? 'Dispatched' : 'Pending',
      status: isResolved ? 'complete' : isAmbulanceAssigned ? 'active' : 'pending',
    },
    {
      id: 't5',
      title: 'Arrived at Location',
      subtitle: 'Paramedics on scene for patient care',
      time: isResolved ? 'Completed' : 'Estimated 4-6 min',
      status: isResolved ? 'complete' : 'pending',
    },
  ];

  const handleCallResponder = () => {
    const phone = ambulance?.driverPhone || hospital?.contact || '+1 800-555-0199';
    Linking.openURL(`tel:${phone}`);
  };

  const handleCallHospital = () => {
    const phone = hospital?.contact || '+1 800-555-0199';
    Linking.openURL(`tel:${phone}`);
  };

  const handleCallDoctor = () => {
    if (doctor?.phone) {
      Linking.openURL(`tel:${doctor.phone}`);
    }
  };

  const handleEndEmergency = async () => {
    await endEmergency();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DetailHeader title="Emergency SOS Tracking" isDark={true} />

        {/* Live Acceptance Status Banner */}
        <View style={[styles.statusBanner, isAccepted ? styles.statusBannerAccepted : styles.statusBannerPending]}>
          <View style={styles.bannerHeader}>
            <View style={styles.bannerBadge}>
              <View style={[styles.statusDot, isAccepted ? styles.dotGreen : styles.dotAmber]} />
              <Text style={styles.bannerBadgeText}>
                {isAccepted ? 'HOSPITAL ADMISSION ACCEPTED' : 'BROADCASTING SOS'}
              </Text>
            </View>
            <Text style={styles.liveClockText}>LIVE SYNC</Text>
          </View>

          {isAccepted && hospital ? (
            <View style={styles.acceptedHospitalInfo}>
              <Text style={styles.acceptedHospitalName}>{hospital.name}</Text>
              <Text style={styles.acceptedHospitalSub}>
                {hospital.address || 'Emergency Trauma Center'} · Emergency Bed Reserved
              </Text>
            </View>
          ) : (
            <Text style={styles.pendingText}>
              Your emergency signal is visible on all partner hospital triage screens. Waiting for nearest ER desk to accept...
            </Text>
          )}
        </View>

        {/* Real-time OpenStreetMap View */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeaderRow}>
            <View style={styles.mapHeaderLeft}>
              <MapPin size={16} color={COLORS.emergency.pulseRed} />
              <Text style={styles.mapHeaderTitle}>LIVE OPENSTREETMAP TRACKING</Text>
            </View>
            <View style={styles.etaBadge}>
              <Clock size={12} color="#FFFFFF" />
              <Text style={styles.etaText}>ETA 4 MIN</Text>
            </View>
          </View>

          {/* Interactive Map Container */}
          <View style={styles.mapViewport}>
            {Platform.OS === 'web' ? (
              // Web Browser iframe rendering
              <iframe
                srcDoc={leafletHtml}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
                title="Live Emergency Map"
              />
            ) : NativeWebView ? (
              // Mobile Native WebView rendering
              <NativeWebView
                originWhitelist={['*']}
                source={{ html: leafletHtml }}
                style={{ flex: 1, backgroundColor: '#070d1e' }}
              />
            ) : (
              // Fallback if webview not available
              <View style={styles.mapFallback}>
                <Truck size={32} color={COLORS.emergency.pulseAmber} />
                <Text style={styles.mapFallbackText}>Live GPS Synced: {userLat.toFixed(4)}, {userLng.toFixed(4)}</Text>
              </View>
            )}
          </View>

          {/* Legend bar below map */}
          <View style={styles.mapLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>You (SOS)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.legendText}>{hospital?.name ? hospital.name.split(' ')[0] : 'Hospital'}</Text>
            </View>
            {isAmbulanceAssigned && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.legendText}>Ambulance</Text>
              </View>
            )}
          </View>
        </View>

        {/* Assigned Responder & Doctor Card */}
        {(isAmbulanceAssigned || isDoctorAssigned) && (
          <View style={styles.assignedUnitsCard}>
            <Text style={styles.sectionHeaderTitle}>ASSIGNED EMERGENCY MEDICAL TEAM</Text>

            {ambulance && (
              <View style={styles.unitRow}>
                <View style={styles.unitIconBox}>
                  <Truck size={20} color="#3b82f6" />
                </View>
                <View style={styles.unitInfo}>
                  <Text style={styles.unitPrimary}>{ambulance.vehicleNumber}</Text>
                  <Text style={styles.unitSecondary}>
                    Driver: {ambulance.driverName} · Status: {ambulance.status}
                  </Text>
                </View>
                {ambulance.driverPhone ? (
                  <TouchableOpacity style={styles.smallCallBtn} onPress={handleCallResponder}>
                    <Phone size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {doctor && (
              <View style={[styles.unitRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 12 }]}>
                <View style={[styles.unitIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Stethoscope size={20} color="#10b981" />
                </View>
                <View style={styles.unitInfo}>
                  <Text style={styles.unitPrimary}>Dr. {doctor.name}</Text>
                  <Text style={styles.unitSecondary}>
                    {doctor.specialization || 'Attending Physician'} · {doctor.department || 'ER Unit'}
                  </Text>
                </View>
                {doctor.phone ? (
                  <TouchableOpacity style={[styles.smallCallBtn, { backgroundColor: '#10b981' }]} onPress={handleCallDoctor}>
                    <Phone size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Timeline Stepper */}
        <View style={styles.stepperCard}>
          <Text style={styles.stepperHeaderTitle}>EMERGENCY LIFECYCLE PROGRESS</Text>
          <TimelineStepper steps={timelineSteps} isDark={true} />
        </View>

        {/* Contact Dispatch Actions */}
        <View style={styles.contactBar}>
          <TouchableOpacity
            style={styles.callDispatchBtn}
            onPress={handleCallResponder}
          >
            <Phone size={18} color="#FFFFFF" />
            <Text style={styles.callDispatchText}>
              {ambulance ? `Call Driver (${ambulance.driverName})` : 'Call Emergency Dispatch'}
            </Text>
          </TouchableOpacity>

          {hospital?.contact && (
            <TouchableOpacity
              style={styles.callHospitalBtn}
              onPress={handleCallHospital}
            >
              <Building2 size={18} color="#3b82f6" />
              <Text style={styles.callHospitalText}>Call Hospital Desk</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={handleEndEmergency}
          >
            <Text style={styles.resolveBtnText}>Close / Safe</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.emergency.bg,
  },
  content: {
    paddingBottom: 40,
  },
  statusBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statusBannerAccepted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  statusBannerPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  dotAmber: {
    backgroundColor: '#f59e0b',
    boxShadow: '0 0 8px #f59e0b',
  },
  bannerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.6,
  },
  liveClockText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  acceptedHospitalInfo: {
    marginTop: 4,
  },
  acceptedHospitalName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
  },
  acceptedHospitalSub: {
    fontSize: 12,
    color: 'rgba(245, 247, 250, 0.8)',
    marginTop: 2,
  },
  pendingText: {
    fontSize: 12,
    color: 'rgba(245, 247, 250, 0.8)',
    lineHeight: 18,
  },
  mapCard: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    overflow: 'hidden',
  },
  mapHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emergency.text,
    letterSpacing: 0.5,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mapViewport: {
    height: 240,
    width: '100%',
    backgroundColor: '#070d1e',
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapFallbackText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  mapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  assignedUnitsCard: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  sectionHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.8,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitInfo: {
    flex: 1,
  },
  unitPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  unitSecondary: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  smallCallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCard: {
    backgroundColor: COLORS.emergency.cardBg,
    borderRadius: SPACING.cardRadius,
    padding: SPACING.padding,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.emergency.border,
  },
  stepperHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emergency.pulseAmber,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  contactBar: {
    marginHorizontal: 16,
    gap: 10,
  },
  callDispatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
  },
  callDispatchText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  callHospitalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    paddingVertical: 12,
    borderRadius: 14,
  },
  callHospitalText: {
    color: '#3b82f6',
    fontSize: 13,
    fontWeight: '700',
  },
  resolveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  resolveBtnText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
});
