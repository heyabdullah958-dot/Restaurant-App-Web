import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchRestaurants } from '../store/restaurantSlice';
import { COLORS, SHADOWS, SPACING } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { FALLBACK_RESTAURANTS } from '../services/fallbackData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BranchLocation {
  id: string;
  brandSlug: string;
  brandName: string;
  branchName: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
  emoji: string;
  accentColor: string;
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
}

// REAL Verified Branch Locations Database (3 Active Brands, 7 Real Branches)
const REAL_BRANCH_LOCATIONS: BranchLocation[] = [
  // Jush PK Branches
  {
    id: 'jush-dha-1',
    brandSlug: 'jushhpk',
    brandName: 'Jush PK',
    branchName: 'DHA Phase 1 Branch',
    address: 'F9JW+R3G, Sector H Dha Phase 1, Lahore, Pakistan',
    phone: '03257217221',
    lat: 31.4745,
    lng: 74.3855,
    emoji: '🍔',
    accentColor: '#FF6B00',
    opensAt: '11:00 AM',
    closesAt: '03:00 AM',
    isOpen: true,
  },
  {
    id: 'jush-johar-town',
    brandSlug: 'jushhpk',
    brandName: 'Jush PK',
    branchName: 'Johar Town Branch',
    address: 'Block R2, 256 / A, Near Shaukat Khanum Hospital Rd, Phase 2 Johar Town, Lahore',
    phone: '03269946142',
    lat: 31.4690,
    lng: 74.2917,
    emoji: '🍔',
    accentColor: '#FF6B00',
    opensAt: '11:00 AM',
    closesAt: '03:00 AM',
    isOpen: true,
  },
  {
    id: 'jush-lake-city',
    brandSlug: 'jushhpk',
    brandName: 'Jush PK',
    branchName: 'Lake City Branch',
    address: 'C 4-6 plaza Number, business bay, M1, Block M 1 Lake City, Lahore',
    phone: '03244441735',
    lat: 31.3650,
    lng: 74.2480,
    emoji: '🍔',
    accentColor: '#FF6B00',
    opensAt: '11:00 AM',
    closesAt: '03:00 AM',
    isOpen: true,
  },

  // Get A Fomo Branches
  {
    id: 'fomo-gulberg-3',
    brandSlug: 'getafomo',
    brandName: 'Get A Fomo',
    branchName: 'Gulberg III Branch',
    address: '65, Block D1 Gulberg III, Lahore, Pakistan',
    phone: '03212784841',
    lat: 31.5150,
    lng: 74.3450,
    emoji: '☕',
    accentColor: '#8E44AD',
    opensAt: '10:00 AM',
    closesAt: '01:00 AM',
    isOpen: true,
  },

  // Tandoori Stop Branches
  {
    id: 'tandoori-johar-town',
    brandSlug: 'tandooristoppk',
    brandName: 'Tandoori Stop',
    branchName: 'Johar Town Branch',
    address: 'PIA Road, Hakim Chowk, Johar Town, Lahore',
    phone: '0327-4945947',
    lat: 31.4620,
    lng: 74.2850,
    emoji: '🍗',
    accentColor: '#E74C3C',
    opensAt: '12:00 PM',
    closesAt: '02:00 AM',
    isOpen: true,
  },
  {
    id: 'tandoori-lake-city',
    brandSlug: 'tandooristoppk',
    brandName: 'Tandoori Stop',
    branchName: 'Lake City Branch',
    address: 'Opposite Lake City Mall, Raiwind Road, Lahore',
    phone: '0324-4441735',
    lat: 31.3670,
    lng: 74.2490,
    emoji: '🍗',
    accentColor: '#E74C3C',
    opensAt: '12:00 PM',
    closesAt: '02:00 AM',
    isOpen: true,
  },
  {
    id: 'tandoori-baghbanpura',
    brandSlug: 'tandooristoppk',
    brandName: 'Tandoori Stop',
    branchName: 'GT Road Baghbanpura Branch',
    address: 'GT Road, Baghbanpura, Lahore',
    phone: '0326-6811177',
    lat: 31.5714,
    lng: 74.3800,
    emoji: '🍗',
    accentColor: '#E74C3C',
    opensAt: '12:00 PM',
    closesAt: '02:00 AM',
    isOpen: true,
  },
];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'nearby' | 'all'>('nearby');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState<boolean>(false);

  const { restaurants } = useSelector((state: RootState) => state.restaurant);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (!restaurants || restaurants.length === 0) {
      dispatch(fetchRestaurants());
    }

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation(loc);
        }
      } catch (error) {
        console.warn('Location request error:', error);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, [dispatch]);

  const userLat = userLocation?.coords?.latitude || 31.4690;
  const userLng = userLocation?.coords?.longitude || 74.2917;

  // Compute branches with distance
  const processedBranches = useMemo(() => {
    return REAL_BRANCH_LOCATIONS.map((branch) => {
      const dist = haversineKm(userLat, userLng, branch.lat, branch.lng);
      return {
        ...branch,
        distanceKm: dist,
        formattedDistance: dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`,
      };
    });
  }, [userLat, userLng]);

  // Filtered branches
  const filteredBranches = useMemo(() => {
    return processedBranches.filter((b) => {
      const matchesBrand = selectedBrandFilter === 'all' || b.brandSlug === selectedBrandFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        b.brandName.toLowerCase().includes(q) ||
        b.branchName.toLowerCase().includes(q) ||
        b.address.toLowerCase().includes(q);
      return matchesBrand && matchesQuery;
    }).sort((a, b) => (activeTab === 'nearby' ? a.distanceKm - b.distanceKm : 0));
  }, [processedBranches, selectedBrandFilter, searchQuery, activeTab]);

  const selectedBranch = useMemo(() => {
    return processedBranches.find((b) => b.id === selectedBranchId) || null;
  }, [processedBranches, selectedBranchId]);

  // Handle focusing map on a branch
  const focusOnBranch = (branch: BranchLocation) => {
    setSelectedBranchId(branch.id);
    if (webViewRef.current) {
      const js = `window.focusMarker('${branch.id}', ${branch.lat}, ${branch.lng}); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  };

  // Recenter to user GPS
  const recenterUserLocation = () => {
    if (webViewRef.current) {
      const js = `window.recenterMap(${userLat}, ${userLng}); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  };

  const makePhoneCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch((err) => {
      console.warn('Could not open phone dialer:', err);
    });
  };

  // HTML Leaflet Map Template with CartoDB tiles & custom pins
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map {
          margin: 0; padding: 0; width: 100%; height: 100%;
          background: #EBF0F5; user-select: none; -webkit-user-select: none;
        }

        /* Pulsing user location GPS dot */
        .user-gps-dot {
          background: #FF5722;
          border: 3px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 0 10px rgba(255, 87, 34, 0.3);
          width: 16px;
          height: 16px;
          animation: pulse 1.8s infinite;
          box-sizing: border-box;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0px rgba(255, 87, 34, 0.4); }
          70% { box-shadow: 0 0 0 14px rgba(255, 87, 34, 0); }
          100% { box-shadow: 0 0 0 0px rgba(255, 87, 34, 0); }
        }

        /* Custom restaurant pin */
        .mcd-pin-container {
          position: relative;
          cursor: pointer;
        }
        .mcd-pin-badge {
          background: #FFFFFF;
          border: 2.5px solid #FF5722;
          border-radius: 20px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          white-space: nowrap;
          transition: transform 0.2s ease;
        }
        .mcd-pin-badge.brand-jushhpk {
          border-color: #FF6B00;
        }
        .mcd-pin-badge.brand-getafomo {
          border-color: #8E44AD;
        }
        .mcd-pin-badge.brand-tandooristoppk {
          border-color: #E74C3C;
        }
        .mcd-pin-badge:active {
          transform: scale(1.1);
        }
        .mcd-pin-emoji {
          font-size: 16px;
          line-height: 1;
        }
        .mcd-pin-title {
          font-size: 12px;
          font-weight: 800;
          color: #0F172A;
        }

        /* Popup Box Styling */
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0,0,0,0.22);
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
          width: 230px !important;
        }
        .popup-card {
          padding: 14px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .popup-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        .popup-brand {
          font-size: 11px;
          font-weight: 800;
          color: #FF5722;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .popup-title {
          font-size: 14px;
          font-weight: 800;
          color: #0F172A;
          margin-bottom: 4px;
        }
        .popup-address {
          font-size: 11px;
          color: #64748B;
          line-height: 1.3;
          margin-bottom: 10px;
        }
        .popup-btn {
          display: block;
          width: 100%;
          background: #FF5722;
          color: #FFFFFF;
          font-weight: 800;
          font-size: 12px;
          text-align: center;
          padding: 9px 0;
          border-radius: 10px;
          text-decoration: none;
          border: none;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${userLat}, ${userLng}], 12);

        // Primary reliable CartoDB Voyager tiles (never blocks webviews, crisp design)
        var tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);

        // Fallback tile handler if network glitches
        tileLayer.on('tileerror', function() {
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Force Leaflet to calculate full height
        setTimeout(function() {
          map.invalidateSize();
        }, 300);

        // User GPS dot
        var userMarker = L.marker([${userLat}, ${userLng}], {
          icon: L.divIcon({
            className: 'user-gps-container',
            html: '<div class="user-gps-dot"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(map);

        var markersMap = {};

        var branches = ${JSON.stringify(processedBranches)};
        branches.forEach(function(b) {
          var pinIcon = L.divIcon({
            className: 'mcd-pin-container',
            html: '<div class="mcd-pin-badge brand-' + b.brandSlug + '" id="pin-' + b.id + '">' +
                    '<span class="mcd-pin-emoji">' + b.emoji + '</span>' +
                    '<span class="mcd-pin-title">' + b.branchName.replace(' Branch', '') + '</span>' +
                  '</div>',
            iconAnchor: [40, 20]
          });

          var marker = L.marker([b.lat, b.lng], { icon: pinIcon }).addTo(map);
          markersMap[b.id] = marker;

          var popupHtml = '<div class="popup-card">' +
            '<div class="popup-header"><span class="popup-brand">' + b.brandName + '</span></div>' +
            '<div class="popup-title">' + b.branchName + '</div>' +
            '<div class="popup-address">' + b.address + '</div>' +
            '<button class="popup-btn" onclick="onSelectBranch(\'' + b.id + '\', \'' + b.brandSlug + '\')">🛵 Order From Here</button>' +
          '</div>';

          marker.bindPopup(popupHtml, { closeButton: false, offset: L.point(0, -10) });

          marker.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                action: 'SELECT_BRANCH',
                branchId: b.id
              }));
            }
          });
        });

        function onSelectBranch(branchId, brandSlug) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              action: 'ORDER_FROM_BRANCH',
              branchId: branchId,
              brandSlug: brandSlug
            }));
          }
        }

        window.focusMarker = function(branchId, lat, lng) {
          map.flyTo([lat, lng], 15, { duration: 1.2 });
          if (markersMap[branchId]) {
            markersMap[branchId].openPopup();
          }
        };

        window.recenterMap = function(lat, lng) {
          map.flyTo([lat, lng], 13, { duration: 1 });
        };
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === 'SELECT_BRANCH' && data.branchId) {
        setSelectedBranchId(data.branchId);
      } else if (data.action === 'ORDER_FROM_BRANCH' && data.brandSlug) {
        navigation.navigate('Restaurant', { slug: data.brandSlug });
      }
    } catch (e) {
      console.warn('Map WebView message parse error:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Interactive Map View */}
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.map}
        onMessage={handleMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[StyleSheet.absoluteFill, styles.centerLoader]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 10, color: COLORS.gray, fontWeight: '600', fontSize: 12 }}>
              Loading FoodSphere Map...
            </Text>
          </View>
        )}
      />

      {/* Creative Floating Header & 3-Brand Hero Cards Row */}
      <SafeAreaView style={styles.floatingTopContainer} pointerEvents="box-none">
        <View style={styles.searchHeaderCard}>
          {/* Search Row */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={COLORS.gray} />
            <TextInput
              placeholder="Search Johar Town, DHA, Lake City, Gulberg..."
              placeholderTextColor={COLORS.gray}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          {/* Creative 3-Brand Hero Cards Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandHeroScroll}>
            {/* Card 0: All Outlets */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedBrandFilter('all')}
              style={[
                styles.brandHeroCard,
                selectedBrandFilter === 'all' && styles.brandHeroCardActive,
                { borderColor: '#007AFF' },
              ]}
            >
              <View style={[styles.brandHeroIconCircle, { backgroundColor: '#E0F2FE' }]}>
                <Text style={{ fontSize: 16 }}>🌟</Text>
              </View>
              <View>
                <Text style={styles.brandHeroTitle}>All Brands</Text>
                <Text style={styles.brandHeroSub}>7 Active Outlets</Text>
              </View>
            </TouchableOpacity>

            {/* Card 1: Jush PK */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedBrandFilter('jushhpk')}
              style={[
                styles.brandHeroCard,
                selectedBrandFilter === 'jushhpk' && styles.brandHeroCardActive,
                { borderColor: '#FF6B00' },
              ]}
            >
              <View style={[styles.brandHeroIconCircle, { backgroundColor: '#FFEDD5' }]}>
                <Text style={{ fontSize: 16 }}>🍔</Text>
              </View>
              <View>
                <Text style={styles.brandHeroTitle}>Jush PK</Text>
                <Text style={styles.brandHeroSub}>3 Outlets · Burgers & Doner</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Get A Fomo */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedBrandFilter('getafomo')}
              style={[
                styles.brandHeroCard,
                selectedBrandFilter === 'getafomo' && styles.brandHeroCardActive,
                { borderColor: '#8E44AD' },
              ]}
            >
              <View style={[styles.brandHeroIconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Text style={{ fontSize: 16 }}>☕</Text>
              </View>
              <View>
                <Text style={styles.brandHeroTitle}>Get A Fomo</Text>
                <Text style={styles.brandHeroSub}>Gulberg III · Trendy Café</Text>
              </View>
            </TouchableOpacity>

            {/* Card 3: Tandoori Stop */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedBrandFilter('tandooristoppk')}
              style={[
                styles.brandHeroCard,
                selectedBrandFilter === 'tandooristoppk' && styles.brandHeroCardActive,
                { borderColor: '#E74C3C' },
              ]}
            >
              <View style={[styles.brandHeroIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Text style={{ fontSize: 16 }}>🍗</Text>
              </View>
              <View>
                <Text style={styles.brandHeroTitle}>Tandoori Stop</Text>
                <Text style={styles.brandHeroSub}>3 Outlets · BBQ & Naan</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Floating Recenter GPS Button */}
      <TouchableOpacity
        style={styles.recenterBtn}
        onPress={recenterUserLocation}
        activeOpacity={0.8}
      >
        <Ionicons name="navigate-circle" size={26} color={COLORS.primary} />
      </TouchableOpacity>

      {/* McDonald's Style Bottom Sheet Branch Drawer */}
      <View style={[styles.bottomSheet, isBottomSheetExpanded && styles.bottomSheetExpanded]}>
        {/* Drag Handle & Header */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setIsBottomSheetExpanded(!isBottomSheetExpanded)}
          style={styles.sheetHeader}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab('nearby')}
              style={[styles.tabBtn, activeTab === 'nearby' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === 'nearby' && styles.tabTextActive]}>
                📍 Nearby Outlets ({filteredBranches.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('all')}
              style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                📋 All Locations
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Branch Cards List */}
        <ScrollView style={styles.branchList} showsVerticalScrollIndicator={false}>
          {filteredBranches.map((branch) => {
            const isSelected = selectedBranchId === branch.id;
            return (
              <View
                key={branch.id}
                style={[styles.branchCard, isSelected && styles.branchCardSelected]}
              >
                {/* Top Row: Brand & Distance */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandEmoji}>{branch.emoji}</Text>
                    <Text style={styles.brandNameText}>{branch.brandName}</Text>
                  </View>
                  <View style={styles.distanceBadge}>
                    <Ionicons name="location-outline" size={12} color={COLORS.primary} />
                    <Text style={styles.distanceText}>{branch.formattedDistance}</Text>
                  </View>
                </View>

                {/* Branch Name & Address */}
                <Text style={styles.branchTitle}>{branch.branchName}</Text>
                <Text style={styles.branchAddress}>{branch.address}</Text>

                {/* Phone & Status */}
                <View style={styles.metaRow}>
                  <View style={styles.statusBadge}>
                    <View style={styles.greenDot} />
                    <Text style={styles.statusText}>Open Now ({branch.opensAt} - {branch.closesAt})</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => makePhoneCall(branch.phone)}
                    style={styles.phoneBadge}
                  >
                    <Ionicons name="call" size={12} color="#059669" />
                    <Text style={styles.phoneText}>{branch.phone}</Text>
                  </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.showMapBtn}
                    onPress={() => focusOnBranch(branch)}
                  >
                    <Ionicons name="map-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.showMapBtnText}>Show Map</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.orderNowBtn}
                    onPress={() => navigation.navigate('Restaurant', { slug: branch.brandSlug })}
                  >
                    <Ionicons name="cart" size={14} color={COLORS.white} />
                    <Text style={styles.orderNowBtnText}>🛵 Order Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {filteredBranches.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={36} color={COLORS.gray} />
              <Text style={styles.emptyText}>No restaurant branches found nearby.</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  map: {
    flex: 1,
  },
  centerLoader: {
    justify: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  floatingTopContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 30,
    left: 14,
    right: 14,
    zIndex: 10,
  },
  searchHeaderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    ...SHADOWS.medium,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    padding: 0,
  },
  brandHeroScroll: {
    marginTop: 10,
    flexDirection: 'row',
  },
  brandHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  brandHeroCardActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  brandHeroIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandHeroTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandHeroSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  recenterBtn: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'ios' ? 150 : 170,
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 8,
    ...SHADOWS.medium,
    zIndex: 9,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.42,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...SHADOWS.large,
    zIndex: 15,
  },
  bottomSheetExpanded: {
    height: SCREEN_HEIGHT * 0.75,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 10,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  branchList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  branchCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  branchCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#FFF7ED',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  brandEmoji: {
    fontSize: 12,
  },
  brandNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.dark,
    textTransform: 'uppercase',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
  },
  branchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  branchAddress: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  phoneText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  showMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 8,
  },
  showMapBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  orderNowBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 8,
  },
  orderNowBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
    marginTop: 8,
  },
});
