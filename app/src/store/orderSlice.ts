import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guestLogin, loginUser, registerUser, logoutUser, sessionExpired } from './userSlice';
import type { RootState } from './index';

export const placeOrder = createAsyncThunk(
  'order/placeOrder',
  async (orderData: {
    restaurant: number;
    branch?: number;
    guest_name?: string;
    guest_phone?: string;
    items: Array<{ menu_item: number; quantity: number; special_notes?: string; selected_options?: any[] }>;
    payment_method: string;
    delivery_address: string;
    delivery_lat?: number;
    delivery_lng?: number;
    special_instructions?: string;
    use_loyalty_points?: boolean;
    points_to_redeem?: number;
    coupon_code?: string;
  }, { dispatch, getState, rejectWithValue }) => {
    try {
      const response = await api.post('/orders/', orderData);
      const data = response.data || response;
      // Validate we got a real order back (must have an id)
      if (!data || !data.id) {
        if (__DEV__) console.error('[placeOrder] Backend returned no order id. Response:', JSON.stringify(data));
        return rejectWithValue('Order creation failed — no order ID returned from server.');
      }
      if (__DEV__) console.log('[placeOrder] Order created successfully:', data.id, 'Restaurant:', data.restaurant);
      return data;
    } catch (error: any) {
      const status = error.response?.status ? `${error.response.status}` : 'Network/Timeout';
      if (__DEV__) console.log('Order submission status:', status, error.response?.data || error.message);

      // Handle HTTP 500 Internal Server Errors cleanly
      if (error.response?.status >= 500) {
        return rejectWithValue('An unexpected server issue occurred while processing your order. Please try tapping Place Order again.');
      }

      // Handle HTTP 429 Throttling rate limits
      if (error.response?.status === 429 || JSON.stringify(error.response?.data || '').includes('throttled')) {
        return rejectWithValue('High request volume detected. Please wait a few seconds before placing your order again.');
      }

      // If 401 invalid/expired token error occurs, check user role before retry
      if (error.response?.status === 401 || JSON.stringify(error.response?.data || '').includes('token')) {
        const isGuest = (getState() as RootState).user.user?.is_guest;
        if (isGuest) {
          try {
            delete api.defaults.headers.common['Authorization'];
            await AsyncStorage.removeItem('auth_token');
            await AsyncStorage.removeItem('refresh_token');
            const guestRes = await dispatch(guestLogin()).unwrap();
            if (guestRes && guestRes.token) {
              const retryResponse = await api.post('/orders/', orderData);
              const retryData = retryResponse.data || retryResponse;
              if (!retryData || !retryData.id) {
                return rejectWithValue('Order retry failed — no order ID returned from server.');
              }
              if (__DEV__) console.log('[placeOrder] Retry succeeded. Order:', retryData.id);
              return retryData;
            } else {
              return rejectWithValue('Guest session expired. Please tap Place Order again.');
            }
          } catch (retryErr: any) {
            if (__DEV__) console.warn('[placeOrder] Retry failed:', retryErr?.response?.status, retryErr?.response?.data || retryErr?.message);
            return rejectWithValue('Session expired. Please try placing your order again.');
          }
        } else {
          dispatch(sessionExpired());
          return rejectWithValue('Session expired. Please log in again.');
        }
      }

      const errorData = error.response?.data;
      let errMsg = 'Failed to place order';
      if (errorData) {
        const rawJson = JSON.stringify(errorData);
        if (rawJson.includes('Invalid pk') || rawJson.includes('does not exist')) {
          errMsg = 'Some items in your cart are no longer available in the menu. Please refresh your cart and select fresh items.';
        } else if (typeof errorData === 'string') {
          errMsg = errorData;
        } else if (errorData.message && typeof errorData.message === 'string') {
          errMsg = errorData.message;
        } else if (errorData.detail && typeof errorData.detail === 'string') {
          errMsg = errorData.detail;
        } else if (typeof errorData === 'object') {
          const messages: string[] = [];
          Object.entries(errorData).forEach(([key, val]) => {
            if (key === 'success' || key === 'status') return;
            if (typeof val === 'string') {
              messages.push(`${key}: ${val}`);
            } else if (Array.isArray(val)) {
              val.forEach((item) => {
                if (typeof item === 'string') {
                  messages.push(`${key}: ${item}`);
                } else if (typeof item === 'object' && item !== null) {
                  Object.entries(item).forEach(([childKey, childVal]) => {
                    const childStr = Array.isArray(childVal) ? childVal.join(', ') : String(childVal);
                    messages.push(`${childKey}: ${childStr}`);
                  });
                }
              });
            } else if (typeof val === 'object' && val !== null) {
              messages.push(`${key}: ${JSON.stringify(val)}`);
            }
          });
          errMsg = messages.length > 0 ? messages.join('\n') : 'Failed to place order';
        }
      } else if (error.message && (error.message.includes('Network Error') || error.message.includes('timeout'))) {
        errMsg = 'Server is waking up or connection was slow. Please try placing your order again now.';
      } else if (error.message) {
        errMsg = error.message;
      }
      return rejectWithValue(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

export const fetchOrderTrack = createAsyncThunk(
  'order/fetchOrderTrack',
  async ({ orderId, token }: { orderId?: number | string; token?: string }, { rejectWithValue }) => {
    if (!orderId && !token) {
      return rejectWithValue('No active order ID or tracking token provided');
    }
    try {
      let url = orderId ? `/orders/${orderId}/track/` : `/orders/track/`;
      if (token) {
        url += (url.includes('?') ? '&' : '?') + `token=${token}`;
      }
      const response = await api.get(url);
      const resData = response.data || response;
      const order = resData.data || resData;
      return order;
    } catch (error: any) {
      if (orderId) {
        try {
          let fbUrl = `/orders/${orderId}/`;
          if (token) fbUrl += `?tracking_token=${token}`;
          const fallbackRes = await api.get(fbUrl);
          const fbData = fallbackRes.data || fallbackRes;
          return fbData.data || fbData;
        } catch (e: any) {}
      }
      const errorData = error.response?.data;
      let errMsg = sanitizeErrorMessage(errorData, 'Order tracking details are currently unavailable. Please refresh or check Order History.');
      return rejectWithValue(errMsg);
    }
  }
);

const sanitizeErrorMessage = (errorData: any, defaultMsg: string): string => {
  if (!errorData) return defaultMsg;
  let errMsg = defaultMsg;
  if (typeof errorData === 'string') {
    errMsg = errorData;
  } else if (errorData.message) {
    errMsg = String(errorData.message);
  } else if (errorData.detail) {
    errMsg = String(errorData.detail);
  } else if (errorData.error) {
    errMsg = String(errorData.error);
  } else if (typeof errorData === 'object') {
    const parts: string[] = [];
    Object.entries(errorData).forEach(([key, val]) => {
      let cleanVal = '';
      if (Array.isArray(val)) {
        cleanVal = val.map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))).join(' ');
      } else if (typeof val === 'object' && val !== null) {
        cleanVal = JSON.stringify(val);
      } else {
        cleanVal = String(val);
      }
      if (key === 'non_field_errors' || key === 'detail' || key === 'message' || key === 'error') {
        parts.push(cleanVal);
      } else {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        parts.push(`${formattedKey}: ${cleanVal}`);
      }
    });
    if (parts.length > 0) errMsg = parts.join('\n');
  }
  if (typeof errMsg === 'string' && (errMsg.includes('<html') || errMsg.includes('<!doctype') || errMsg.includes('<h1'))) {
    return defaultMsg;
  }
  return errMsg;
};

export const fetchOrderDetails = createAsyncThunk(
  'order/fetchOrderDetails',
  async (orderId: number | string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/${orderId}/track/`);
      const resData = response.data || response;
      return resData.data || resData;
    } catch (error: any) {
      try {
        const fallbackRes = await api.get(`/orders/${orderId}/`);
        return fallbackRes.data || fallbackRes;
      } catch (fbErr: any) {
        const errorData = error.response?.data || fbErr.response?.data;
        let errMsg = sanitizeErrorMessage(errorData, 'Failed to fetch order details');
        return rejectWithValue(errMsg);
      }
    }
  }
);

export const fetchGuestOrderStatus = createAsyncThunk(
  'order/fetchGuestOrderStatus',
  async (token: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/track/?token=${token}`);
      const resData = response.data || response;
      return resData.data || resData;
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = sanitizeErrorMessage(errorData, 'Failed to fetch guest order status');
      return rejectWithValue(errMsg);
    }
  }
);

export const fetchMyOrders = createAsyncThunk(
  'order/fetchMyOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/orders/my-orders/');
      return response.data || response;
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = 'Failed to fetch order history';
      if (errorData) {
        if (typeof errorData === 'string') {
          errMsg = errorData;
        } else if (errorData.message) {
          errMsg = errorData.message;
        } else if (errorData.detail) {
          errMsg = errorData.detail;
        } else if (typeof errorData === 'object') {
          errMsg = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n');
        }
      }
      return rejectWithValue(errMsg);
    }
  }
);

export const confirmCODPayment = createAsyncThunk(
  'order/confirmCODPayment',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/cod/confirm/', { order_id: orderId });
      return response.data || response;
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = 'Failed to confirm COD payment';
      if (errorData) {
        if (typeof errorData === 'string') {
          errMsg = errorData;
        } else if (errorData.message) {
          errMsg = errorData.message;
        } else if (errorData.detail) {
          errMsg = errorData.detail;
        } else if (typeof errorData === 'object') {
          errMsg = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n');
        }
      }
      return rejectWithValue(errMsg);
    }
  }
);

export const createStripeIntent = createAsyncThunk(
  'order/createStripeIntent',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/stripe/create/', { order_id: orderId });
      return response.data || response;
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = 'Failed to create Stripe payment intent';
      if (errorData) {
        if (typeof errorData === 'string') {
          errMsg = errorData;
        } else if (errorData.message) {
          errMsg = errorData.message;
        } else if (errorData.detail) {
          errMsg = errorData.detail;
        } else if (typeof errorData === 'object') {
          errMsg = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n');
        }
      }
      return rejectWithValue(errMsg);
    }
  }
);

export const confirmStripePayment = createAsyncThunk(
  'order/confirmStripePayment',
  async (paymentIntentId: string, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/stripe/confirm/', { payment_intent_id: paymentIntentId });
      return response.data || response;
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = 'Failed to confirm Stripe payment';
      if (errorData) {
        if (typeof errorData === 'string') {
          errMsg = errorData;
        } else if (errorData.message) {
          errMsg = errorData.message;
        } else if (errorData.detail) {
          errMsg = errorData.detail;
        } else if (typeof errorData === 'object') {
          errMsg = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n');
        }
      }
      return rejectWithValue(errMsg);
    }
  }
);

export const createPayFastPayment = createAsyncThunk(
  'order/createPayFastPayment',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await api.post('/payments/payfast/create/', { order_id: orderId });
      return response.data || response;
    } catch (error: any) {
      const errorData = error.response?.data;
      let errMsg = 'Failed to create PayFast payment';
      if (errorData) {
        if (typeof errorData === 'string') {
          errMsg = errorData;
        } else if (errorData.message) {
          errMsg = errorData.message;
        } else if (errorData.detail) {
          errMsg = errorData.detail;
        } else if (typeof errorData === 'object') {
          errMsg = Object.entries(errorData)
            .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
            .join('\n');
        }
      }
      return rejectWithValue(errMsg);
    }
  }
);

const STATUS_RANK_MAP: Record<string, number> = {
  'pending': 0,
  'received': 1,
  'accepted': 1,
  'preparing': 2,
  'out_for_delivery': 3,
  'out for delivery': 3,
  'delivered': 4,
  'cancelled': -1,
};

export const getStatusRank = (status?: string): number => {
  if (!status) return 0;
  const s = status.toLowerCase().trim();
  return STATUS_RANK_MAP[s] ?? 0;
};

const mergeMonotonicOrder = (existing: any, incoming: any) => {
  if (!existing || !incoming) return incoming;
  if (String(existing.id) === String(incoming.id)) {
    const prevRank = getStatusRank(existing.status);
    const nextRank = getStatusRank(incoming.status);
    // Prevent rollback to a lower status rank unless order is cancelled
    if (nextRank >= 0 && nextRank < prevRank) {
      return {
        ...incoming,
        status: existing.status,
      };
    }
  }
  return incoming;
};

const initialState = {
  myOrders: [] as any[],
  currentOrder: null as any | null,
  activeOrder: null as any | null,
  loading: false,
  error: null as string | null,
};

const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearCurrentOrder(state) {
      state.currentOrder = null;
    },
    clearActiveOrder(state) {
      state.activeOrder = null;
    },
    resetOrders(state) {
      state.myOrders = [];
      state.currentOrder = null;
      state.activeOrder = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Reset state on auth boundary changes (security: prevent cross-account data leak).
      // BUG FIX: myOrders is cleared on .fulfilled (not .pending) to prevent a race where
      // loginUser.pending wipes orders immediately, causing the Orders tab to flash empty
      // and then the 4s polling interval re-fires loading=true before fetchMyOrders completes.
      // Security invariant is still met: old account's orders are wiped the instant the new
      // account token is confirmed, before new orders are fetched.
      .addCase(loginUser.pending, (state) => {
        state.currentOrder = null;
        state.activeOrder = null;
        // Note: myOrders intentionally NOT cleared here — cleared in loginUser.fulfilled below
      })
      .addCase(registerUser.pending, (state) => {
        state.currentOrder = null;
        state.activeOrder = null;
        // Note: myOrders intentionally NOT cleared here — cleared in registerUser.fulfilled below
      })
      // Clear orders on login/register fulfilled — this is when we KNOW a new account has authenticated.
      // Clearing here (not on .pending) prevents the race: orders no longer flash empty while the
      // login request is in-flight, and security is maintained because old orders are purged the
      // instant the new account token is confirmed (before fetchMyOrders runs for the new user).
      .addCase(loginUser.fulfilled, (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      .addCase(guestLogin.pending, (state) => {
        state.loading = true;
      })

      .addCase(logoutUser.pending, (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      .addCase('user/logout', (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      .addCase('user/sessionExpired', (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      // Place Order
      .addCase(placeOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.activeOrder = action.payload;
        if (action.payload && action.payload.id) {
          const exists = state.myOrders.some((o: any) => String(o.id) === String(action.payload.id));
          if (!exists) {
            state.myOrders = [action.payload, ...state.myOrders];
          }
        }
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Live Order Track (Silent Background Refresh — prevents UI spinner flicker on polling)
      .addCase(fetchOrderTrack.pending, (state) => {
        if (!state.currentOrder) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchOrderTrack.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = mergeMonotonicOrder(state.currentOrder, action.payload);
      })
      .addCase(fetchOrderTrack.rejected, (state, action) => {
        state.loading = false;
        if (!state.currentOrder) {
          state.error = action.payload as string;
        }
      })
      // Fetch Order Details
      .addCase(fetchOrderDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = mergeMonotonicOrder(state.currentOrder, action.payload);
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Guest Order Status
      .addCase(fetchGuestOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGuestOrderStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = mergeMonotonicOrder(state.currentOrder, action.payload);
      })
      .addCase(fetchGuestOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch My Orders
      .addCase(fetchMyOrders.pending, (state) => {
        // BUG FIX: Only set loading=true on the FIRST fetch (no existing orders).
        // If myOrders already has data, polling silently refreshes in background without
        // triggering the loading guard in OrdersScreen that blanks the list.
        if (state.myOrders.length === 0 && !state.loading) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        let fetchedArray: any[] = [];
        if (payload && Array.isArray(payload.results)) {
          fetchedArray = payload.results;
        } else if (payload && Array.isArray(payload.data)) {
          fetchedArray = payload.data;
        } else if (Array.isArray(payload)) {
          fetchedArray = payload;
        }

        const map = new Map<string, any>();
        state.myOrders.forEach((o: any) => {
          if (o && o.id) map.set(String(o.id), o);
        });
        fetchedArray.forEach((o: any) => {
          if (o && o.id) {
            const existing = map.get(String(o.id));
            map.set(String(o.id), existing ? mergeMonotonicOrder(existing, o) : o);
          }
        });

        const merged = Array.from(map.values());
        merged.sort((a: any, b: any) => {
          const tA = new Date(a.created_at || 0).getTime();
          const tB = new Date(b.created_at || 0).getTime();
          return tB - tA;
        });

        state.myOrders = merged;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentOrder, clearActiveOrder, resetOrders } = orderSlice.actions;
export default orderSlice.reducer;
