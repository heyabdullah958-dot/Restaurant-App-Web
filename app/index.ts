import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

// Global Unhandled Error & Promise Rejection Interception
// Prevents unhandled JavaScript runtime exceptions from terminating the native Android Activity in release builds
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler && ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    console.error('[GlobalErrorHandler] Intercepted error:', error, 'isFatal:', isFatal);
    if (__DEV__ && defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
}

// Global unhandled promise rejection interception
if (typeof Promise !== 'undefined' && (Promise as any)._setUnhandledRejectionHandler) {
  (Promise as any)._setUnhandledRejectionHandler((id: any, error: any) => {
    console.warn('[UnhandledPromiseRejection]', id, error);
  });
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
