import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const placeOrder = createAsyncThunk(
  'order/placeOrder',
  async (orderData: {
    restaurant: number;
    guest_name?: string;
    guest_phone?: string;
    items: Array<{ menu_item: number; quantity: number; special_notes?: string }>;
    payment_method: string;
    delivery_address: string;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post('/orders/', orderData);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to place order');
    }
  }
);

export const fetchOrderDetails = createAsyncThunk(
  'order/fetchOrderDetails',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/${orderId}/`);
      return response.data || response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order details');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order history');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm COD payment');
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
      return rejectWithValue(error.response?.data?.message || 'Failed to create Stripe payment intent');
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
  },
  extraReducers: (builder) => {
    builder
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
      // Fetch My Orders
      .addCase(fetchMyOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.myOrders = action.payload;
      })
      .addCase(fetchMyOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentOrder, clearActiveOrder } = orderSlice.actions;
export default orderSlice.reducer;
