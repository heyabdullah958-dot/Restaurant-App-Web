import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchPlatformAnalytics, PlatformAnalyticsData } from '../services/api';

export interface AnalyticsState {
  data: PlatformAnalyticsData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  data: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
};

export const fetchAnalyticsThunk = createAsyncThunk(
  'analytics/fetchAnalytics',
  async (params: { isRefresh?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const analytics = await fetchPlatformAnalytics();
      return analytics;
    } catch (err: any) {
      let msg = 'Failed to fetch platform analytics';
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        msg = 'Authentication Required: Please sign in as Super Admin to view platform analytics.';
      } else if (err?.response?.data?.detail) {
        msg = err.response.data.detail;
      } else if (err?.response?.data?.error) {
        msg = err.response.data.error;
      } else if (err?.message) {
        msg = err.message;
      }
      return rejectWithValue(msg);
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAnalyticsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchAnalyticsThunk.pending, (state, action) => {
      if (action.meta.arg?.isRefresh) {
        state.isRefreshing = true;
      } else if (!state.data) {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(
      fetchAnalyticsThunk.fulfilled,
      (state, action: PayloadAction<PlatformAnalyticsData>) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.data = action.payload;
        state.error = null;
      }
    );
    builder.addCase(fetchAnalyticsThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = (action.payload as string) || 'Failed to load analytics';
    });
  },
});

export const { clearAnalyticsError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
