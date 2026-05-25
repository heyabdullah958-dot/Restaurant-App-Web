import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export interface UserProfile {
  id: number;
  username: string;
  name?: string;
  email: string;
  phone: string;
  profile_photo: string | null;
  loyalty_points: number;
  is_guest: boolean;
  addresses?: string[];
}

export interface UserState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async Thunks with explicit types
export const loginUser = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string },
  { username: string; password: string },
  { rejectValue: string }
>(
  'user/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      // POST to /auth/login/
      const loginResponse = await api.post('/auth/login/', { username, password }) as any;
      const token = loginResponse.access;
      const refreshToken = loginResponse.refresh;
      
      // Set the default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile info
      const profileResponse = await api.get('/users/profile/') as any;
      const user = profileResponse.data || profileResponse;
      
      return { user, token, refreshToken };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

export const registerUser = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string },
  { username: string; email: string; password: string; phone: string },
  { rejectValue: string }
>(
  'user/register',
  async ({ username, email, password, phone }, { rejectWithValue }) => {
    try {
      // POST to /auth/register/
      const response = await api.post('/auth/register/', { username, email, password, phone }) as any;
      const { user, tokens } = response.data || response;
      const token = tokens.access;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { user, token, refreshToken: tokens.refresh };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Registration failed';
      return rejectWithValue(message);
    }
  }
);

export const guestLogin = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string },
  void,
  { rejectValue: string }
>(
  'user/guestLogin',
  async (_, { rejectWithValue }) => {
    try {
      // POST to /auth/guest/
      const response = await api.post('/auth/guest/') as any;
      const { user, tokens } = response.data || response;
      const token = tokens.access;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { user, token, refreshToken: tokens.refresh };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Guest login failed';
      return rejectWithValue(message);
    }
  }
);

export const fetchUserProfile = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: string }
>(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/users/profile/') as any;
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to fetch profile';
      return rejectWithValue(message);
    }
  }
);

export const updateProfile = createAsyncThunk<
  UserProfile,
  Partial<UserProfile>,
  { rejectValue: string }
>(
  'user/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/users/profile/', profileData) as any;
      return response.data || response;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to update profile';
      return rejectWithValue(message);
    }
  }
);

export const logoutUser = createAsyncThunk<
  void,
  void
>(
  'user/logout',
  async (_, { dispatch }) => {
    delete api.defaults.headers.common['Authorization'];
    dispatch(logout());
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
    updateUserProfile(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Registration failed';
      })
      // Guest Login
      .addCase(guestLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(guestLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(guestLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Guest login failed';
      })
      // Fetch Profile
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Update failed';
      });
  },
});

export const { logout, clearError, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
