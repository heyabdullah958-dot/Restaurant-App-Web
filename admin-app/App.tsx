import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { store, useAppDispatch, useAppSelector } from './src/store';
import { loadSavedSessionThunk } from './src/store/authSlice';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useOrderPolling } from './src/hooks/useOrderPolling';
import { alertService } from './src/services/NewOrderAlertService';
import { NewOrderAlertOverlay } from './src/components/NewOrderAlertOverlay';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Optimize native screen rendering performance & stability
enableScreens(true);

const OrderPollingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { newOrderIds, clearNewOrderAlerts } = useOrderPolling(15000);
  const orders = useAppSelector((state) => state.orders.orders);
  const { isAuthenticated, role } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated || role !== 'branch_manager' || newOrderIds.length === 0) return;

    const newOrders = orders.filter((o) => newOrderIds.includes(o.id));
    if (newOrders.length > 0) {
      alertService.triggerAlert(newOrders);
    }
    clearNewOrderAlerts();
  }, [newOrderIds, orders, isAuthenticated, role, clearNewOrderAlerts]);

  return <>{children}</>;
};

const AppInitializer = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(loadSavedSessionThunk());
  }, [dispatch]);

  return (
    <OrderPollingProvider>
      <AppNavigator />
      <NewOrderAlertOverlay />
    </OrderPollingProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <ErrorBoundary>
            <AppInitializer />
          </ErrorBoundary>
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

