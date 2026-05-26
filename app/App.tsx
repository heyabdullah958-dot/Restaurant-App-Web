import React from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { store } from './src/store';
import { setupInterceptors } from './src/services/api';

// Set up response interceptors to catch 401 errors globally
setupInterceptors(store);
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import RestaurantScreen from './src/screens/RestaurantScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import AuthScreen from './src/screens/AuthScreen';
import TrackingScreen from './src/screens/TrackingScreen';

// Type declarations for Navigator stack
type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Restaurant: { slug: string };
  Cart: undefined;
  Checkout: undefined;
  Auth: undefined;
  Tracking: { orderId: number };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#F8F9FA' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Restaurant" component={RestaurantScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} />
        </Stack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </Provider>
  );
}
