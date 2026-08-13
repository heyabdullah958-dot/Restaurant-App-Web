import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  fetchFlashDeals,
  createFlashDeal,
  updateFlashDeal,
  deleteFlashDeal,
  PromoCoupon,
  FlashDeal,
} from '../services/api';

export interface PromoState {
  coupons: PromoCoupon[];
  flashDeals: FlashDeal[];
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: PromoState = {
  coupons: [],
  flashDeals: [],
  isLoading: false,
  isRefreshing: false,
  isSubmitting: false,
  error: null,
};

export const fetchCouponsThunk = createAsyncThunk(
  'promo/fetchCoupons',
  async (params: { isRefresh?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const coupons = await fetchCoupons();
      return coupons;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch promo coupons';
      return rejectWithValue(msg);
    }
  }
);

export const createCouponThunk = createAsyncThunk(
  'promo/createCoupon',
  async (data: Partial<PromoCoupon>, { rejectWithValue }) => {
    try {
      return await createCoupon(data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create promo coupon';
      return rejectWithValue(msg);
    }
  }
);

export const updateCouponThunk = createAsyncThunk(
  'promo/updateCoupon',
  async (
    { id, data }: { id: number; data: Partial<PromoCoupon> },
    { rejectWithValue }
  ) => {
    try {
      return await updateCoupon(id, data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to update promo coupon';
      return rejectWithValue(msg);
    }
  }
);

export const deleteCouponThunk = createAsyncThunk(
  'promo/deleteCoupon',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteCoupon(id);
      return id;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to delete promo coupon';
      return rejectWithValue(msg);
    }
  }
);

export const fetchFlashDealsThunk = createAsyncThunk(
  'promo/fetchFlashDeals',
  async (params: { isRefresh?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const flashDeals = await fetchFlashDeals();
      return flashDeals;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch flash deals';
      return rejectWithValue(msg);
    }
  }
);

export const createFlashDealThunk = createAsyncThunk(
  'promo/createFlashDeal',
  async (data: Partial<FlashDeal>, { rejectWithValue }) => {
    try {
      return await createFlashDeal(data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create flash deal';
      return rejectWithValue(msg);
    }
  }
);

export const updateFlashDealThunk = createAsyncThunk(
  'promo/updateFlashDeal',
  async (
    { id, data }: { id: number; data: Partial<FlashDeal> },
    { rejectWithValue }
  ) => {
    try {
      return await updateFlashDeal(id, data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to update flash deal';
      return rejectWithValue(msg);
    }
  }
);

export const deleteFlashDealThunk = createAsyncThunk(
  'promo/deleteFlashDeal',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteFlashDeal(id);
      return id;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to delete flash deal';
      return rejectWithValue(msg);
    }
  }
);

const promoSlice = createSlice({
  name: 'promo',
  initialState,
  reducers: {
    clearPromoError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Coupons
    builder.addCase(fetchCouponsThunk.pending, (state, action) => {
      if (action.meta.arg?.isRefresh) {
        state.isRefreshing = true;
      } else if (state.coupons.length === 0) {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(fetchCouponsThunk.fulfilled, (state, action: PayloadAction<PromoCoupon[]>) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.coupons = action.payload;
    });
    builder.addCase(fetchCouponsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = (action.payload as string) || 'Failed to load coupons';
    });

    // Create Coupon
    builder.addCase(createCouponThunk.fulfilled, (state, action: PayloadAction<PromoCoupon>) => {
      state.coupons.unshift(action.payload);
    });

    // Update Coupon
    builder.addCase(updateCouponThunk.fulfilled, (state, action: PayloadAction<PromoCoupon>) => {
      const index = state.coupons.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.coupons[index] = action.payload;
      }
    });

    // Delete Coupon
    builder.addCase(deleteCouponThunk.fulfilled, (state, action: PayloadAction<number>) => {
      state.coupons = state.coupons.filter((c) => c.id !== action.payload);
    });

    // Fetch Flash Deals
    builder.addCase(fetchFlashDealsThunk.fulfilled, (state, action: PayloadAction<FlashDeal[]>) => {
      state.flashDeals = action.payload;
    });

    // Create Flash Deal
    builder.addCase(createFlashDealThunk.fulfilled, (state, action: PayloadAction<FlashDeal>) => {
      state.flashDeals.unshift(action.payload);
    });

    // Update Flash Deal
    builder.addCase(updateFlashDealThunk.fulfilled, (state, action: PayloadAction<FlashDeal>) => {
      const index = state.flashDeals.findIndex((f) => f.id === action.payload.id);
      if (index !== -1) {
        state.flashDeals[index] = action.payload;
      }
    });

    // Delete Flash Deal
    builder.addCase(deleteFlashDealThunk.fulfilled, (state, action: PayloadAction<number>) => {
      state.flashDeals = state.flashDeals.filter((f) => f.id !== action.payload);
    });
  },
});

export const { clearPromoError } = promoSlice.actions;
export default promoSlice.reducer;
