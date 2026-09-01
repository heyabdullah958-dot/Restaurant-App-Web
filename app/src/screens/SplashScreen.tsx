import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Dimensions, Image } from 'react-native';
import { useSelector } from 'react-redux';
import { StatusBar } from 'expo-status-bar';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';
import { RootState } from '../store';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: { navigation: any }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtextOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run animations in sequence
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 14,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(subtextOpacity, {
        toValue: 1,
        duration: 400,
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
    }, 1900);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.contentContainer}>
        {/* Animated Brand Logo Icon from PDF */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../assets/images/getfood_logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Animated Subtitle */}
        <Animated.View style={{ opacity: subtextOpacity, marginTop: SPACING.md }}>
          <Text style={styles.tagline}>Fast Food & Dining, Delivered</Text>
        </Animated.View>

        {/* Food Popups */}
        <View style={styles.foodPopups}>
          <Animated.Text style={[styles.foodEmoji, { opacity: subtextOpacity }]}>🍗</Animated.Text>
          <Animated.Text style={[styles.foodEmoji, { opacity: subtextOpacity }]}>🍔</Animated.Text>
          <Animated.Text style={[styles.foodEmoji, { opacity: subtextOpacity }]}>☕</Animated.Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>GetFood Multi-Brand Dining</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImage: {
    width: Math.min(width * 0.78, 320),
    height: 90,
  },
  tagline: {
    fontSize: 15,
    color: COLORS.neutral600,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: SPACING.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.neutral500,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  foodPopups: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  foodEmoji: {
    fontSize: 26,
  },
});
