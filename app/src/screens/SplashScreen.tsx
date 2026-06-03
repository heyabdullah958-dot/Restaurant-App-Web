import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../theme';
import { RootState } from '../store';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: { navigation: any }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtextOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run animations in sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 10,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(subtextOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate after a delay
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        // Navigate to the main/tab screen if already authenticated
        navigation.replace('Main');
      } else {
        // Otherwise, show the onboarding screen
        navigation.replace('Onboarding');
      }
    }, 2800);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigation]);

  return (
    <LinearGradient
      colors={['#FF5722', '#FF9800', '#E91E63']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar style="light" />
      <View style={styles.contentContainer}>
        {/* Animated Brand Logo Icon */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="restaurant" size={54} color={COLORS.primary} />
          </View>
        </Animated.View>

        {/* Animated Brand Name */}
        <Animated.View style={{ opacity: textOpacity }}>
          <Text style={styles.brandName}>
            Food<Text style={styles.brandHighlight}>Sphere</Text>
          </Text>
        </Animated.View>

        {/* Animated Subtitle */}
        <Animated.View style={{ opacity: subtextOpacity }}>
          <Text style={styles.tagline}>One App · Seven Unique Dining Experiences</Text>
        </Animated.View>

        {/* Food Popups */}
        <View style={styles.foodPopups}>
          <Animated.Text style={[styles.foodEmoji, { opacity: subtextOpacity, transform: [{ translateY: subtextOpacity.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>🥤</Animated.Text>
          <Animated.Text style={[styles.foodEmoji, { opacity: subtextOpacity, transform: [{ translateY: subtextOpacity.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>🍔</Animated.Text>
          <Animated.Text style={[styles.foodEmoji, { opacity: subtextOpacity, transform: [{ translateY: subtextOpacity.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>🍟</Animated.Text>
        </View>
      </View>

      {/* Loading Indicator or Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Premium Restaurant Aggregator</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  logoContainer: {
    marginBottom: SPACING.md,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  brandName: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandHighlight: {
    color: COLORS.dark,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: SPACING.sm,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  foodPopups: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  foodEmoji: {
    fontSize: 32,
  },
});
