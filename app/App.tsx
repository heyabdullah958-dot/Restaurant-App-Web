import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { View, Text, Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { store, AppDispatch, RootState } from './src/store';
import { setupInterceptors } from './src/services/api';
import { loadSavedToken } from './src/store/userSlice';
import { setNavigationRef, initPushNotificationListener } from './src/services/notificationService';
import { COLORS } from './src/theme';


import { enableFreeze } from 'react-native-screens';

// Enable freeze on unfocused screens for 60 FPS transition performance
enableFreeze(true);

// Set up response interceptors to catch 401 errors globally
setupInterceptors(store);

// Import Screens
import SplashScreen from './src/screens/SplashScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import SearchScreen from './src/screens/SearchScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RestaurantScreen from './src/screens/RestaurantScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderConfirmationScreen from './src/screens/OrderConfirmationScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import LegalScreen from './src/screens/LegalScreen';

// Type declarations for Stack Navigator
type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  Restaurant: { slug: string };
  Cart: undefined;
  Checkout: undefined;
  OrderConfirmation: { orderId: number; loyaltyPointsEarned?: number };
  Tracking: { orderId: number };
  Rewards: undefined;
  Legal: { uri: string; title?: string };
};

type MainTabParamList = {
  Home: undefined;
  Map: undefined;
  Search: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Global Error Boundary — catches unhandled render errors in any screen
// Must be a class component: React hooks do NOT support getDerivedStateFromError
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA', padding: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😵</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1E293B', textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
            The app encountered an unexpected error. Please try again.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#FF6B35', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const cartItemCount = useSelector((state: RootState) => state.cart.items.length);
  const bottomInset = Platform.OS === 'android' ? Math.max(insets.bottom, 12) : insets.bottom;
  const tabHeight = 58 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'basket' : 'basket-outline';
          } else if (route.name === 'Orders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          if (route.name === 'Cart') {
            return (
              <View>
                <Ionicons name={iconName} size={size || 22} color={color} />
                {cartItemCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: COLORS.primary,
                    borderRadius: 8,
                    minWidth: 16,
                    height: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 2,
                  }}>
                    <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          }

          return <Ionicons name={iconName} size={size || 22} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.lightGray,
          paddingBottom: bottomInset,
          paddingTop: 6,
          height: tabHeight,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ tabBarLabel: 'Home' }} 
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ tabBarLabel: 'Map' }} 
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{ tabBarLabel: 'Search' }} 
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ tabBarLabel: 'Cart' }} 
      />
      <Tab.Screen 
        name="Orders" 
        component={OrdersScreen} 
        options={{ tabBarLabel: 'Orders' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile' }} 
      />
    </Tab.Navigator>
  );
}

import NotificationToast from './src/components/NotificationToast';

function AppContent() {
  const dispatch = useDispatch<AppDispatch>();
  const navRef = useNavigationContainerRef();

  useEffect(() => {
    // Load saved auth token from AsyncStorage on app startup
    dispatch(loadSavedToken());

    // Register navigation reference for push notification deep-linking
    setNavigationRef(navRef);
    const cleanup = initPushNotificationListener();

    // Check for any pending notification deep-link stored in AsyncStorage
    AsyncStorage.getItem('pending_deep_link').then((val) => {
      if (val) {
        try {
          const link = JSON.parse(val);
          AsyncStorage.removeItem('pending_deep_link');
          if (navRef.isReady() && link?.screen) {
            (navRef as any).navigate(link.screen, link.params);
          }
        } catch (e) {}
      }
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [dispatch, navRef]);

  return (
    <NavigationContainer ref={navRef}>
      <ErrorBoundary>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8F9FA' },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Restaurant" component={RestaurantScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderConfirmation" component={OrderConfirmationScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
      </Stack.Navigator>
      </ErrorBoundary>
      <NotificationToast navigationRef={navRef} />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}


export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
