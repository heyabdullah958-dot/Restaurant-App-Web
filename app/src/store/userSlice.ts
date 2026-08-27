import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Platform } from 'react-native';
import api, { API_BASE_URL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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

export const purgeGuestSessionStorage = async (): Promise<void> => {
  const keys = [
    '@foodsphere_guest_name',
    '@foodsphere_guest_phone',
    '@foodsphere_guest_address',
    'guest_address',
    'guest_tracking_token',
    '@getfood_active_guest_order',
    'foodsphere_guest_active_order_id',
    'foodsphere_in_app_notifications',
    'foodsphere_order_status_tracker',
  ];
  await AsyncStorage.multiRemove(keys).catch(() => {});
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
      
      let activeToken: string = token;
      
      // Set default auth header synchronously first
      api.defaults.headers.common['Authorization'] = `Bearer ${activeToken}`;
      
      // Fetch user profile info to verify token works
      try {
        const profileResponse = await api.get('/users/profile/') as any;
        let user = profileResponse;
        if (profileResponse && typeof profileResponse === 'object') {
          if ('data' in profileResponse) {
            user = profileResponse.data;
          }
        }
        
        try {
          const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
          if (savedAddress) {
            user.addresses = [savedAddress];
          }
          await AsyncStorage.setItem('user_profile', JSON.stringify(user));
        } catch (e) {}

        return { user, token: activeToken, refreshToken: refreshToken || '' };
      } catch (profileErr: any) {
        const isAuthError = profileErr?.response?.status === 401 || profileErr?.response?.status === 403;
        
        // ONLY if profile fetch failed with 401/403, attempt a single refresh if refreshToken exists
        if (isAuthError && refreshToken) {
          try {
            const refreshUrl = `${API_BASE_URL}/auth/refresh/`;
            const refreshResponse = await axios.post(refreshUrl, { refresh: refreshToken }, {
              headers: { 'Content-Type': 'application/json' }
            });
            
            const newAccessToken = refreshResponse.data?.access || refreshResponse.data?.data?.access;
            const newRefreshToken = refreshResponse.data?.refresh || refreshResponse.data?.data?.refresh;
            if (newAccessToken) {
              await AsyncStorage.setItem('auth_token', newAccessToken);
              if (newRefreshToken) {
                await AsyncStorage.setItem('refresh_token', newRefreshToken);
              }
              api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
              
              // Retry fetching user profile with new access token
              const profileRetryResponse = await api.get('/users/profile/') as any;
              let user = profileRetryResponse;
              if (profileRetryResponse && typeof profileRetryResponse === 'object' && 'data' in profileRetryResponse) {
                user = profileRetryResponse.data;
              }
              return { user, token: newAccessToken, refreshToken: newRefreshToken || refreshToken };
            }
          } catch (refreshErr) {
            if (__DEV__) console.log('[loadSavedToken] Token refresh failed on app launch:', refreshErr);
          }
        }

        if (isAuthError) {
          delete api.defaults.headers.common['Authorization'];
          try {
            await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_profile']);
          } catch (e) {}
          return rejectWithValue('Session expired');
        }

        // Network error / timeout offline fallback: restore cached user profile if available
        const cachedUserJson = await AsyncStorage.getItem('user_profile').catch(() => null);
        if (cachedUserJson) {
          try {
            const cachedUser = JSON.parse(cachedUserJson);
            return { user: cachedUser, token: activeToken, refreshToken: refreshToken || '' };
          } catch (e) {}
        }
        return rejectWithValue(profileErr.message || 'Network error');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Session expired');
    }
  }
);


const formatDRFErrorMessage = (error: any, fallback: string): string => {
  if (error?.userFriendlyMessage) {
    return error.userFriendlyMessage;
  }
  if (error.response && error.response.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    
    // DRF Field errors e.g. { username: ["Enter a valid username..."], email: [...] }
    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        const parts: string[] = [];
        keys.forEach((key) => {
          const val = data[key];
          const prefix = key === 'non_field_errors' || key === 'detail' ? '' : `${key.charAt(0).toUpperCase() + key.slice(1)}: `;
          if (Array.isArray(val)) {
            parts.push(`${prefix}${val.join(' ')}`);
          } else if (typeof val === 'string') {
            parts.push(`${prefix}${val}`);
          }
        });
        if (parts.length > 0) return parts.join('\n');
      }
    }
  }
  if (error.message?.includes('Network Error') || error.code === 'ERR_NETWORK') {
    return 'Unable to connect to backend server. Tap the GetFood logo 3 times to check server settings.';
  }
  return error.message || fallback;
};

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
      const loginData = loginResponse.data || loginResponse;
      const token = loginData.access;
      const refreshToken = loginData.refresh;
      
      if (!token || !refreshToken) {
        throw new Error('Invalid login response from authentication server');
      }
      
      // Set the default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Fetch user profile info
      const profileResponse = await api.get('/users/profile/') as any;
      let user = profileResponse;
      if (profileResponse && typeof profileResponse === 'object') {
        if ('data' in profileResponse) {
          user = profileResponse.data;
        }
      }
      
      try {
        const savedAddress = await AsyncStorage.getItem(`user_address_${user.id}`);
        if (savedAddress) {
          user.addresses = [savedAddress];
        }
      } catch (e) {}

      // Save token & user profile locally
      try {
        await purgeGuestSessionStorage();
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', refreshToken);
        await AsyncStorage.setItem('user_profile', JSON.stringify(user));
      } catch (err) {
        if (__DEV__) console.error('Failed to save token to AsyncStorage:', err);
      }
      
      return { user, token, refreshToken };
    } catch (error: any) {
      const message = formatDRFErrorMessage(error, 'Login failed');
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
      const responseData = response.data || response;
      const payload = (responseData.data && responseData.data.user) ? responseData.data : responseData;
      const { user, tokens } = payload;
      
      if (!user || !tokens || !tokens.access) {
        throw new Error('Invalid registration response from server');
      }
      
      const token = tokens.access;
      
      // Set default auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Save token & user profile locally
      try {
        await purgeGuestSessionStorage();
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
        await AsyncStorage.setItem('user_profile', JSON.stringify(user));
      } catch (err) {
        if (__DEV__) console.error('Failed to save token to AsyncStorage:', err);
      }
      
      return { user, token, refreshToken: tokens.refresh };
    } catch (error: any) {
      const message = formatDRFErrorMessage(error, 'Registration failed');
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
      // Clear stale authorization headers so SimpleJWT does not reject guest authentication
      delete api.defaults.headers.common['Authorization'];
      await AsyncStorage.removeItem('auth_token').catch(() => {});
      await AsyncStorage.removeItem('refresh_token').catch(() => {});
      await AsyncStorage.removeItem('user_profile').catch(() => {});

      // Race API call against a 10-second timeout to prevent UI hangs during Heroku cold-starts
      const GUEST_AUTH_TIMEOUT = 10000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GUEST_AUTH_TIMEOUT')), GUEST_AUTH_TIMEOUT)
      );

      const response = await Promise.race([
        api.post('/auth/guest/') as Promise<any>,
        timeoutPromise,
      ]);

      const responseData = response.data || response;
      const payload = (responseData.data && responseData.data.user) ? responseData.data : responseData;
      const { user, tokens } = payload;
      
      if (!user || !tokens || !tokens.access) {
        throw new Error('Invalid guest login response from server');
      }
      
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
      
      // Save token & user profile locally
      try {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('refresh_token', tokens.refresh);
        await AsyncStorage.setItem('user_profile', JSON.stringify(user));
      } catch (err) {
        if (__DEV__) console.error('Failed to save token to AsyncStorage:', err);
      }
      
      return { user, token, refreshToken: tokens.refresh };
    } catch (error: any) {
      if (__DEV__) console.warn('Guest auth timed out or failed. Using local session state.');
      delete api.defaults.headers.common['Authorization'];
      const fallbackUser: UserProfile = {
        id: 9999,
        username: 'Guest User',
        name: 'Guest User',
        email: 'guest@getfood.pk',
        phone: '',
        is_guest: true,
        addresses: [],
        profile_photo: '',
        loyalty_points: 0,
      };
      return { user: fallbackUser, token: '', refreshToken: '' };
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
      let user = response;
      if (response && typeof response === 'object') {
        if ('data' in response) {
          user = response.data;
        }
      }
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
      let user = response;
      if (response && typeof response === 'object') {
        if ('data' in response) {
          user = response.data;
        }
      }
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
      await purgeGuestSessionStorage();
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user_profile');
    } catch (err) {
      if (__DEV__) console.error('Failed to remove token from AsyncStorage:', err);
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
    // FIX 1B: Dedicated action for auto-logout due to session expiry (401 interceptor).
    // Unlike `logout` (which clears error = null), this sets a user-visible error message
    // so the AuthScreen banner renders after the session expires silently.
    sessionExpired(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = 'Your session has expired. Please log in again.';
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
          state.isAuthenticated = Boolean(action.payload.user && !action.payload.user.is_guest);
        }
      })
      .addCase(loadSavedToken.rejected, (state) => {
        state.loading = false;
        state.error = null;
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
        state.isAuthenticated = false;
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

export const { logout, sessionExpired, clearError, updateUserProfile } = userSlice.actions;
export default userSlice.reducer;
