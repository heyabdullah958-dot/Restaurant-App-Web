import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export const fetchRestaurants = createAsyncThunk(
  'restaurant/fetchRestaurants',
  async (filters: { featured?: boolean; city?: string; cuisine?: string } | undefined, { rejectWithValue }) => {
    try {
      let url = '/restaurants/';
      const params = new URLSearchParams();
      if (filters?.featured) params.append('featured', 'true');
      if (filters?.city) params.append('city', filters.city);
      if (filters?.cuisine) params.append('cuisine', filters.cuisine);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const response = await api.get(url);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch restaurants');
    }
  }
);

export const fetchRestaurantDetail = createAsyncThunk(
  'restaurant/fetchRestaurantDetail',
  async (slug: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/restaurants/${slug}/`);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch restaurant details');
    }
  }
);

const initialState = {
  restaurants: [] as any[],
  currentRestaurant: null as any | null,
  loading: false,
  error: null as string | null,
};

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState,
  reducers: {
    clearCurrentRestaurant(state) {
      state.currentRestaurant = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Restaurants
      .addCase(fetchRestaurants.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurants.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload as any;
        let list = payload;
        if (payload && typeof payload === 'object') {
          if ('data' in payload) {
            list = payload.data;
          } else if ('results' in payload) {
            list = payload.results;
          }
        }
        if (list && typeof list === 'object' && !Array.isArray(list)) {
          if ('results' in list) {
            list = list.results;
          }
        }
        state.restaurants = Array.isArray(list) ? list.filter((r: any) => r.is_active !== false) : [];
      })
      .addCase(fetchRestaurants.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch Restaurant Detail
      .addCase(fetchRestaurantDetail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRestaurantDetail.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload as any;
        let detail = payload;
        if (payload && typeof payload === 'object' && 'data' in payload) {
          detail = payload.data;
        }
        state.currentRestaurant = detail;
      })
      .addCase(fetchRestaurantDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentRestaurant } = restaurantSlice.actions;
export default restaurantSlice.reducer;
