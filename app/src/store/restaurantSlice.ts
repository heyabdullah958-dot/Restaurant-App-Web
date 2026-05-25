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
      // Backend format is { success: true, data: [...] } or direct list depending on API documentation.
      // API.md shows GET /api/restaurants/ lists all active restaurants.
      // Custom exceptions middleware maps response success: true, data: [...]
      return response.data || response;
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
      return response.data || response;
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
        state.restaurants = Array.isArray(action.payload) ? action.payload : action.payload.results || [];
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
        state.currentRestaurant = action.payload;
      })
      .addCase(fetchRestaurantDetail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentRestaurant } = restaurantSlice.actions;
export default restaurantSlice.reducer;
