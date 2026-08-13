import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer, { setSessionExpired } from './authSlice';
import orderReducer from './orderSlice';
import menuReducer from './menuSlice';
import riderReducer from './riderSlice';
import analyticsReducer from './analyticsSlice';
import tenantReducer from './tenantSlice';
import customerReducer from './customerSlice';
import promoReducer from './promoSlice';
import { setSessionExpiredHandler } from '../services/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: orderReducer,
    menu: menuReducer,
    riders: riderReducer,
    analytics: analyticsReducer,
    tenant: tenantReducer,
    customer: customerReducer,
    promo: promoReducer,
  },
});

// Wire API 401 interceptor session expiration to Redux store
setSessionExpiredHandler(() => {
  store.dispatch(setSessionExpired());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
