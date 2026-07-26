import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { guestLogin, loginUser, registerUser, logoutUser } from './userSlice';

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
  }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.post('/orders/', orderData);
      const data = response.data || response;
      // Validate we got a real order back (must have an id)
      if (!data || !data.id) {
        console.error('[placeOrder] Backend returned no order id. Response:', JSON.stringify(data));
        return rejectWithValue('Order creation failed — no order ID returned from server.');
      }
      console.log('[placeOrder] Order created successfully:', data.id, 'Restaurant:', data.restaurant);
      return data;
    } catch (error: any) {
      const status = error.response?.status ? `${error.response.status}` : 'Network/Timeout';
      const detailMsg = error.response?.data ? JSON.stringify(error.response.data) : (error.message || 'Unknown network error');
      console.error(`[placeOrder] Error (${status}):`, detailMsg);

      // Handle HTTP 429 Throttling rate limits
      if (error.response?.status === 429 || JSON.stringify(error.response?.data || '').includes('throttled')) {
        return rejectWithValue('High request volume detected. Please wait a few seconds before placing your order again.');
      }

      // If 401 invalid/expired token error occurs, automatically clear bad token and retry with a fresh guest session
      if (error.response?.status === 401 || JSON.stringify(error.response?.data || '').includes('token')) {
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
            console.log('[placeOrder] Retry succeeded. Order:', retryData.id);
            return retryData;
          } else {
            return rejectWithValue('Guest session expired. Please tap Place Order again.');
          }
        } catch (retryErr: any) {
          console.error('[placeOrder] Retry failed:', retryErr?.response?.status, JSON.stringify(retryErr?.response?.data || retryErr?.message));
          return rejectWithValue('Session expired. Please try placing your order again.');
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
        } else if (errorData.message) {
          errMsg = String(errorData.message);
        } else if (errorData.detail) {
          errMsg = String(errorData.detail);
        } else if (typeof errorData === 'object') {
          const messages: string[] = [];
          Object.entries(errorData).forEach(([key, val]) => {
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
    }
  }
);

export const fetchOrderTrack = createAsyncThunk(
  'order/fetchOrderTrack',
  async ({ orderId, token }: { orderId?: number; token?: string }, { rejectWithValue }) => {
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
          const fallbackRes = await api.get(`/orders/${orderId}/`);
          const fbData = fallbackRes.data || fallbackRes;
          return fbData.data || fbData;
        } catch (e: any) {}
      }
      const errorData = error.response?.data;
      let errMsg = 'Failed to fetch live order tracking';
      if (errorData) {
        if (typeof errorData === 'string') errMsg = errorData;
        else if (errorData.message) errMsg = errorData.message;
        else if (errorData.detail) errMsg = errorData.detail;
      }
      return rejectWithValue(errMsg);
    }
  }
);

export const fetchOrderDetails = createAsyncThunk(
  'order/fetchOrderDetails',
  async (orderId: number, { rejectWithValue }) => {
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
        let errMsg = 'Failed to fetch order details';
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
      let errMsg = 'Failed to fetch guest order status';
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
      // Reset state on auth boundary changes (security: prevent cross-account data leak)
      .addCase(loginUser.pending, (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      .addCase(registerUser.pending, (state) => {
        state.myOrders = [];
        state.currentOrder = null;
        state.activeOrder = null;
      })
      .addCase(guestLogin.pending, (state) => {
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
        state.currentOrder = action.payload;
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
        state.currentOrder = action.payload;
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
        state.currentOrder = action.payload;
      })
      .addCase(fetchGuestOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch My Orders
      .addCase(fetchMyOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        state.myOrders = (payload && Array.isArray(payload.results)) ? payload.results : (Array.isArray(payload) ? payload : []);
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentOrder, clearActiveOrder, resetOrders } = orderSlice.actions;
export default orderSlice.reducer;
