import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { COLORS, SHADOWS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

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
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      } catch (error) {
        console.warn('Location request failed:', error);
        setErrorMsg('Failed to fetch location. Please ensure GPS is enabled.');
      }
    })();
  }, []);

  // Default to Lahore center if location not loaded yet
  const initialRegion = {
    latitude: location ? location.coords.latitude : 31.5204,
    longitude: location ? location.coords.longitude : 74.3587,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map} 
        initialRegion={initialRegion} 
        showsUserLocation={true}
        provider={null}
      >
        {restaurants.map((restaurant: any) => {
          const coords = MOCK_LOCATIONS[restaurant.slug] || {
            // Random offset if not found
            lat: 31.5204 + (Math.random() - 0.5) * 0.05,
            lng: 74.3587 + (Math.random() - 0.5) * 0.05,
          };

          return (
            <Marker
              key={restaurant.id}
              coordinate={{ latitude: coords.lat, longitude: coords.lng }}
            >
              {/* Custom Red Pin UI */}
              <View style={styles.customPinContainer}>
                <View style={styles.customPin}>
                  <Ionicons name="restaurant" size={16} color={COLORS.white} />
                </View>
                <View style={styles.pinPointer} />
              </View>
              
              <Callout onPress={() => navigation.navigate('Restaurant', { slug: restaurant.slug })}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{restaurant.name}</Text>
                  <Text style={styles.calloutText}>Tap to order</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  callout: {
    padding: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: COLORS.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  calloutText: {
    fontSize: 12,
    color: COLORS.dark,
    textAlign: 'center',
  },
  customPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 50,
  },
  customPin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
    zIndex: 2,
  },
  pinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
    marginTop: -2,
    zIndex: 1,
  },
});
