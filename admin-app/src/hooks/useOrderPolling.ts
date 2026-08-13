import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchOrdersThunk } from '../store/orderSlice';

export const useOrderPolling = (intervalMs: number = 15000) => {
  const dispatch = useAppDispatch();
  const orders = useAppSelector((state) => state.orders.orders);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  const knownOrderIdsRef = useRef<Set<number>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);
  const [newOrderIds, setNewOrderIds] = useState<number[]>([]);
  const [isPollingActive, setIsPollingActive] = useState<boolean>(true);

  const pollOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await dispatch(fetchOrdersThunk({ isRefresh: true }));
    } catch (err) {
      console.warn('Order polling fetch failed:', err);
    }
  }, [dispatch, isAuthenticated]);

  // Handle order diffing whenever orders state changes
  useEffect(() => {
    if (orders.length === 0) return;

    if (isInitialFetchRef.current) {
      // Mark all existing orders as known on first fetch
      const initialSet = new Set<number>();
      orders.forEach((o) => initialSet.add(o.id));
      knownOrderIdsRef.current = initialSet;
      isInitialFetchRef.current = false;
      return;
    }

    const newlyArrived: number[] = [];
    orders.forEach((o) => {
      if (!knownOrderIdsRef.current.has(o.id)) {
        knownOrderIdsRef.current.add(o.id);
        if (o.status === 'received') {
          newlyArrived.push(o.id);
        }
      }
    });

    if (newlyArrived.length > 0) {
      setNewOrderIds((prev) => [...prev, ...newlyArrived]);
    }
  }, [orders]);

  // Polling loop with AppState listener
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial fetch on mount
    pollOrders();

    let timerId: ReturnType<typeof setInterval> | null = null;

    const startTimer = () => {
      if (timerId) clearInterval(timerId);
      timerId = setInterval(() => {
        pollOrders();
      }, intervalMs);
      setIsPollingActive(true);
    };

    const stopTimer = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      setIsPollingActive(false);
    };

    startTimer();

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        pollOrders();
        startTimer();
      } else {
        stopTimer();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopTimer();
      subscription.remove();
    };
  }, [isAuthenticated, intervalMs, pollOrders]);

  return {
    newOrderCount: newOrderIds.length,
    newOrderIds,
    isPollingActive,
    clearNewOrderAlerts: () => setNewOrderIds([]),
  };
};
