import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchOrders, updateOrderStatus, AdminOrder } from '../services/api';

export const STATUS_RANK: Record<string, number> = {
  received: 0,
  preparing: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: -1,
};

export interface OrderState {
  orders: AdminOrder[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: OrderState = {
  orders: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetched: null,
};

export const fetchOrdersThunk = createAsyncThunk(
  'orders/fetchOrders',
  async (params: { isRefresh?: boolean } | undefined, { getState, rejectWithValue }) => {
    try {
      const response = await fetchOrders();
      const fetchedOrders = response.results || [];
      const state = getState() as { orders: OrderState };
      const currentOrders = state.orders.orders || [];

      const currentMap = new Map<number, AdminOrder>();
      currentOrders.forEach((o: AdminOrder) => currentMap.set(o.id, o));

      // Monotonic guard (GEMINI.md Invariant #15): preserve higher rank status if incoming has lower rank
      const mergedOrders = fetchedOrders.map((incoming) => {
        const existing = currentMap.get(incoming.id);
        if (existing) {
          const existingRank = STATUS_RANK[existing.status] ?? 0;
          const incomingRank = STATUS_RANK[incoming.status] ?? 0;

          // If existing is at a higher rank than incoming (and neither is cancelled), keep existing status
          if (
            existing.status !== 'cancelled' &&
            incoming.status !== 'cancelled' &&
            existingRank > incomingRank
          ) {
            return { ...incoming, status: existing.status };
          }
        }
        return incoming;
      });

      // Sort by created_at DESC
      mergedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return mergedOrders;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch orders';
      return rejectWithValue(msg);
    }
  }
);

export const updateOrderStatusThunk = createAsyncThunk(
  'orders/updateOrderStatus',
  async (
    {
      orderId,
      status,
      cancellationReason,
    }: {
      orderId: number;
      status: string;
      cancellationReason?: string;
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { orders: OrderState };
      const targetOrder = state.orders.orders.find((o) => o.id === orderId);

      if (targetOrder) {
        const currentRank = STATUS_RANK[targetOrder.status] ?? 0;
        const newRank = STATUS_RANK[status] ?? 0;

        if (targetOrder.status === 'delivered' || targetOrder.status === 'cancelled') {
          return rejectWithValue(`Cannot change status of a ${targetOrder.status} order.`);
        }

        if (status !== 'cancelled' && newRank <= currentRank) {
          return rejectWithValue(`Monotonic error: Cannot transition from ${targetOrder.status} to ${status}.`);
        }
      }

      const updated = await updateOrderStatus(orderId, status, cancellationReason);
      return updated;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Failed to update order status';
      return rejectWithValue(msg);
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearOrderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Orders
    builder.addCase(fetchOrdersThunk.pending, (state, action) => {
      const isRefresh = action.meta.arg?.isRefresh;
      if (isRefresh) {
        state.isRefreshing = true;
      } else if (state.orders.length === 0) {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(fetchOrdersThunk.fulfilled, (state, action: PayloadAction<AdminOrder[]>) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.orders = action.payload;
      state.lastFetched = Date.now();
      state.error = null;
    });
    builder.addCase(fetchOrdersThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = (action.payload as string) || 'Failed to load orders';
    });

    // Update Status
    builder.addCase(updateOrderStatusThunk.fulfilled, (state, action: PayloadAction<AdminOrder>) => {
      const index = state.orders.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = action.payload;
      } else {
        state.orders.unshift(action.payload);
      }
      state.orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    builder.addCase(updateOrderStatusThunk.rejected, (state, action) => {
      state.error = (action.payload as string) || 'Failed to update order status';
    });
  },
});

export const { clearOrderError } = orderSlice.actions;
export default orderSlice.reducer;
