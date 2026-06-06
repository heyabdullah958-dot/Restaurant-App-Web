import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchRestaurants } from '../store/restaurantSlice';
import { COLORS, SHADOWS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { FALLBACK_RESTAURANTS } from '../services/fallbackData';

const MOCK_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'seenbanao': { lat: 31.4700, lng: 74.2800 },
  'dineatblue': { lat: 31.5204, lng: 74.3587 },
  'jushhpk': { lat: 31.4805, lng: 74.3239 },
  'tandooristoppk': { lat: 31.5002, lng: 74.3120 },
  'sandmelts': { lat: 31.4920, lng: 74.3312 },
  'birdmanfoodspk': { lat: 31.4650, lng: 74.3000 },
  'getafomo': { lat: 31.5100, lng: 74.3400 },
};

export default function MapScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loadingLocation, setLoadingLocation] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Fetch restaurants to populate map if not already done
    if (!restaurants || restaurants.length === 0) {
      dispatch(fetchRestaurants());
    }

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoadingLocation(false);
          return;
        }
        setHasPermission(true);
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (error) {
        console.warn('Location request failed:', error);
        setErrorMsg('Failed to fetch location. Please ensure GPS is enabled.');
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, [dispatch]);

  const initialLat = location?.coords?.latitude || 31.5204;
  const initialLng = location?.coords?.longitude || 74.3587;

  if (loadingLocation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.light }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.gray, fontWeight: '500' }}>Loading map...</Text>
      </View>
    );
  }

  // Map restaurant data to passing array, fallback to local data if empty
  const activeRestaurants = restaurants && restaurants.length > 0 ? restaurants : FALLBACK_RESTAURANTS;
  const restaurantMarkers = (activeRestaurants || [])
    .filter((r: any) => r && r.slug)
    .map((r: any) => {
      const coords = MOCK_LOCATIONS[r.slug] || {
        lat: 31.5204 + (Math.random() - 0.5) * 0.05,
        lng: 74.3587 + (Math.random() - 0.5) * 0.05,
      };
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        cuisine: r.cuisine_type || 'Desi BBQ & Fast Food',
        lat: coords.lat,
        lng: coords.lng,
      };
    });

  // Inline Leaflet + OpenStreetMap HTML page
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #F8F9FA;
          user-select: none;
          -webkit-user-select: none;
        }
        #map {
          width: 100%;
          height: 100%;
        }
        
        /* Custom premium popups */
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(26, 26, 46, 0.15);
          border: 1px solid rgba(26, 26, 46, 0.08);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background: #ffffff;
        }
        .leaflet-popup-content {
          margin: 12px 16px;
          font-size: 14px;
          color: #1A1A2E;
        }
        .popup-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 140px;
        }
        .popup-title {
          font-size: 15px;
          font-weight: 700;
          color: #1A1A2E;
          margin-bottom: 2px;
          text-transform: capitalize;
          text-align: center;
        }
        .popup-subtitle {
          font-size: 11px;
          color: #6B7280;
          margin-bottom: 10px;
          text-align: center;
        }
        .popup-btn {
          display: block;
          width: 100%;
          text-align: center;
          background-color: #FF5722;
          color: white !important;
          text-decoration: none;
          padding: 8px 0;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
          border: none;
          box-shadow: 0 4px 6px rgba(255, 87, 34, 0.2);
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .popup-btn:active {
          background-color: #E64A19;
        }
        
        /* Pulsing user location GPS dot */
        .user-gps-dot {
          background: #007AFF;
          border: 2.5px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 0 8px rgba(0, 122, 255, 0.3);
          width: 14px;
          height: 14px;
          animation: pulse 1.8s infinite;
          box-sizing: border-box;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0px rgba(0, 122, 255, 0.5);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 122, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0px rgba(0, 122, 255, 0);
          }
        }
        
        /* Restaurant pin styling */
        .restaurant-pin-wrapper {
          position: relative;
          width: 36px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .restaurant-pin {
          background-color: #FF5722;
          width: 32px;
          height: 32px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #FFFFFF;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 0;
          left: 2px;
        }
        .restaurant-pin-inner {
          transform: rotate(45deg);
          font-size: 16px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Pin pointer helper */
        .pin-shadow {
          position: absolute;
          bottom: 2px;
          left: 14px;
          width: 8px;
          height: 8px;
          background: rgba(0, 0, 0, 0.25);
          border-radius: 50%;
          filter: blur(2px);
          transform: scaleY(0.5);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const emojiMap = {
          seenbanao: '🍢',
          dineatblue: '🐟',
          jushhpk: '🍔',
          tandooristoppk: '🍗',
          sandmelts: '🥪',
          birdmanfoodspk: '🍗',
          getafomo: '☕'
        };

        // Initialize map
        var map = L.map('map', {
          zoomControl: false,
          attributionControl: false
        }).setView([${initialLat}, ${initialLng}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
        }).addTo(map);

        // Zoom controls on bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // User location
        if (${hasPermission && location !== null}) {
          var userIcon = L.divIcon({
            className: 'user-gps-container',
            html: '<div class="user-gps-dot"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });
          L.marker([${location?.coords?.latitude || 31.5204}, ${location?.coords?.longitude || 74.3587}], { icon: userIcon }).addTo(map);
        }

        // Handle navigation back to React Native
        function navigateToRestaurant(slug) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              action: 'NAVIGATE_TO_RESTAURANT',
              slug: slug
            }));
          }
        }

        // Add restaurant markers
        var restaurants = ${JSON.stringify(restaurantMarkers)};
        restaurants.forEach(function(r) {
          const emoji = emojiMap[r.slug] || '🍔';
          var rIcon = L.divIcon({
            className: 'restaurant-pin-container',
            html: '<div class="restaurant-pin-wrapper"><div class="restaurant-pin"><div class="restaurant-pin-inner">' + emoji + '</div></div><div class="pin-shadow"></div></div>',
            iconSize: [36, 42],
            iconAnchor: [18, 42]
          });

          var marker = L.marker([r.lat, r.lng], { icon: rIcon }).addTo(map);
          
          var popupContent = '<div class="popup-container">' +
            '<div class="popup-title">' + r.name + '</div>' +
            '<div class="popup-subtitle">' + r.cuisine + '</div>' +
            '<button class="popup-btn" onclick="navigateToRestaurant(\'' + r.slug + '\')">Order Now</button>' +
            '</div>';

          marker.bindPopup(popupContent, {
            closeButton: false,
            offset: L.point(0, -32)
          });
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.action === 'NAVIGATE_TO_RESTAURANT' && data.slug) {
        navigation.navigate('Restaurant', { slug: data.slug });
      }
    } catch (err) {
      console.error('Failed to parse message from map webview', err);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.floatingHeaderContainer} pointerEvents="box-none">
        <View style={styles.floatingHeader}>
          <Ionicons name="map" size={20} color={COLORS.primary} />
          <Text style={styles.floatingHeaderTitle}>FoodSphere Brand Map</Text>
        </View>
      </SafeAreaView>

      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.map}
        onMessage={handleMessage}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.light }]}
          />
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setErrorMsg('Failed to load map. Please check your internet connection.');
        }}
        renderError={(errorName, errorCode, errorDesc) => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.light, padding: 20 }}>
            <Ionicons name="cloud-offline-outline" size={48} color={COLORS.gray} />
            <Text style={{ marginTop: 12, color: COLORS.dark, fontWeight: '600', fontSize: 16 }}>Failed to load map</Text>
            <Text style={{ marginTop: 4, color: COLORS.gray, textAlign: 'center', fontSize: 13 }}>
              {errorDesc || 'Please ensure you are online and try again.'}
            </Text>
          </View>
        )}
      />
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
  floatingHeaderContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 36,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  floatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...SHADOWS.medium,
    gap: 8,
  },
  floatingHeaderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
});
