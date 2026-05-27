import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  iconBg: string;
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'One App, 7 Brands',
    subtitle: 'Endless Dining Options',
    description: 'Explore 7 unique restaurant brands in one place. BBQ, gourmet seafood, burgers, tandoori classics, sandwiches, and premium cafes.',
    icon: 'restaurant-outline',
    color: COLORS.primary,
    iconBg: 'rgba(255, 87, 34, 0.1)',
  },
  {
    id: '2',
    title: 'Earn Loyalty Points',
    subtitle: 'Dine & Get Rewarded',
    description: 'Earn loyalty points with every order you place. Accumulate points and redeem them for massive discounts or completely free meals!',
    icon: 'gift-outline',
    color: COLORS.secondary,
    iconBg: 'rgba(255, 152, 0, 0.1)',
  },
  {
    id: '3',
    title: 'Fast Checkout & Tracking',
    subtitle: 'Stripe, PayFast or COD',
    description: 'Pay quickly using secure global card payments via Stripe, local options via PayFast, or pay cash on delivery. Track your order in real-time.',
    icon: 'speedometer-outline',
    color: COLORS.accent,
    iconBg: 'rgba(233, 30, 99, 0.1)',
  },
];

export default function OnboardingScreen({ navigation }: { navigation: any }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const updateCurrentSlideIndex = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / width);
    setCurrentSlideIndex(currentIndex);
  };

  const handleNext = () => {
    const nextSlideIndex = currentSlideIndex + 1;
    if (nextSlideIndex < slides.length) {
      const offset = nextSlideIndex * width;
      flatListRef.current?.scrollToOffset({ offset });
      setCurrentSlideIndex(nextSlideIndex);
    } else {
      navigation.replace('Auth');
    }
  };

  const handleSkip = () => {
    navigation.replace('Auth');
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={styles.slideContainer}>
        {/* Animated Graphic/Icon Area with decorative elements */}
        <View style={[styles.graphicContainer, { backgroundColor: item.iconBg }]}>
          <View style={[styles.outerCircle, { backgroundColor: `${item.color}20` }]}>
            <View style={[styles.innerCircle, { backgroundColor: COLORS.white, shadowColor: item.color }]}>
              <Ionicons name={item.icon} size={90} color={item.color} />
            </View>
          </View>
          {/* Decorative circles */}
          <View style={[styles.decorCircle1, { backgroundColor: `${item.color}15` }]} />
          <View style={[styles.decorCircle2, { backgroundColor: `${item.color}10` }]} />
        </View>

        {/* Text Area */}
        <View style={styles.textContainer}>
          <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle.toUpperCase()}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Top Header - Skip Button */}
      <View style={styles.header}>
        {currentSlideIndex < slides.length - 1 ? (
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ height: 20 }} />
        )}
      </View>

      {/* Slide List */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={updateCurrentSlideIndex}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
      />

      {/* Footer Navigation */}
      <View style={styles.footer}>
        {/* Dot Indicators */}
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentSlideIndex === index && styles.activeIndicator,
                currentSlideIndex === index && { backgroundColor: slides[index].color }
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleNext}
          style={[
            styles.ctaButton,
            { backgroundColor: slides[currentSlideIndex].color },
            SHADOWS.medium,
          ]}
        >
          <Text style={styles.ctaButtonText}>
            {currentSlideIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons
            name={currentSlideIndex === slides.length - 1 ? 'arrow-forward' : 'chevron-forward'}
            size={20}
            color={COLORS.white}
            style={{ marginLeft: 5 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  flatList: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  graphicContainer: {
    height: height * 0.35,
    width: width - 40,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  outerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: SPACING.xs,
  },
  title: {
    ...FONTS.title,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: SPACING.md,
    color: COLORS.dark,
  },
  description: {
    ...FONTS.body,
    fontSize: 15,
    textAlign: 'center',
    color: COLORS.gray,
    lineHeight: 22,
  },
  footer: {
    height: height * 0.2,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  indicator: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 4,
  },
  activeIndicator: {
    width: 24,
  },
  ctaButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  decorCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -80,
    right: -80,
    zIndex: -1,
  },
  decorCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -50,
    left: -50,
    zIndex: -1,
  },
});
