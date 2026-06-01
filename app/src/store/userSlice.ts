import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
export const loadSavedToken = createAsyncThunk<
  { user: UserProfile; token: string; refreshToken: string } | null,
  void,
  { rejectValue: string }
>(
  'user/loadSavedToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      
      if (!token) return null;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile info to verify token works
      const profileResponse = await api.get('/users/profile/') as any;
      const user = profileResponse.data || profileResponse;
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      
      return { user, token, refreshToken: refreshToken || '' };
    } catch (error: any) {
      // If profile fails, clean up token
      delete api.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem('auth_token').catch(() => {});
      await AsyncStorage.removeItem('refresh_token').catch(() => {});
      return rejectWithValue(error.message || 'Session expired');
    }
  }
);

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
      
      // Save token locally
      try {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', refreshToken);
      } catch (err) {
        console.error('Failed to save token to AsyncStorage:', err);
      }
      
      // Fetch user profile info
      const profileResponse = await api.get('/users/profile/') as any;
      const user = profileResponse.data || profileResponse;
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      
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
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      const token = tokens.access;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Save token locally
      try {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
      } catch (err) {
        console.error('Failed to save token to AsyncStorage:', err);
      }
      
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
      try {
        let savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (!savedAddress) {
          savedAddress = await AsyncStorage.getItem('guest_address');
        }
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      const token = tokens.access;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Save token locally
      try {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
      } catch (err) {
        console.error('Failed to save token to AsyncStorage:', err);
      }
      
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
      const user = response.data || response;
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      return user;
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
      const user = response.data || response;
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}
      return user;
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
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
    } catch (err) {
      console.error('Failed to remove token from AsyncStorage:', err);
    }
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
      // Load Saved Token
      .addCase(loadSavedToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSavedToken.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken;
          state.isAuthenticated = true;
        }
      })
      .addCase(loadSavedToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load token';
        state.isAuthenticated = false;
      })
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
