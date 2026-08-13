import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchCustomers,
  adjustCustomerLoyalty,
  CustomerProfile,
} from '../services/api';

export interface CustomerState {
  customers: CustomerProfile[];
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  error: string | null;
  searchQuery: string;
}

const initialState: CustomerState = {
  customers: [],
  isLoading: false,
  isRefreshing: false,
  isSubmitting: false,
  error: null,
  searchQuery: '',
};

export const fetchCustomersThunk = createAsyncThunk(
  'customer/fetchCustomers',
  async (
    params: { search?: string; isRefresh?: boolean } | undefined,
    { rejectWithValue }
  ) => {
    try {
      const customers = await fetchCustomers(params?.search);
      return customers;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch customers';
      return rejectWithValue(msg);
    }
  }
);

export const adjustLoyaltyThunk = createAsyncThunk(
  'customer/adjustLoyalty',
  async (
    {
      customerId,
      points,
      reason,
    }: { customerId: number; points: number; reason: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await adjustCustomerLoyalty(customerId, points, reason);
      return { customerId, newPoints: result.new_points };
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to adjust loyalty points';
      return rejectWithValue(msg);
    }
  }
);

const customerSlice = createSlice({
  name: 'customer',
  initialState,
  reducers: {
    setCustomerSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    clearCustomerError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Customers
    builder.addCase(fetchCustomersThunk.pending, (state, action) => {
      if (action.meta.arg?.isRefresh) {
        state.isRefreshing = true;
      } else if (state.customers.length === 0) {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(
      fetchCustomersThunk.fulfilled,
      (state, action: PayloadAction<CustomerProfile[]>) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.customers = action.payload;
        state.error = null;
      }
    );
    builder.addCase(fetchCustomersThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = (action.payload as string) || 'Failed to load customers';
    });

    // Adjust Loyalty
    builder.addCase(adjustLoyaltyThunk.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(
      adjustLoyaltyThunk.fulfilled,
      (state, action: PayloadAction<{ customerId: number; newPoints: number }>) => {
        state.isSubmitting = false;
        const index = state.customers.findIndex((c) => c.id === action.payload.customerId);
        if (index !== -1) {
          state.customers[index].loyalty_points = action.payload.newPoints;
        }
      }
    );
    builder.addCase(adjustLoyaltyThunk.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = (action.payload as string) || 'Failed to adjust loyalty points';
    });
  },
});

export const { setCustomerSearchQuery, clearCustomerError } = customerSlice.actions;
export default customerSlice.reducer;
