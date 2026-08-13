import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  loginStaff,
  logoutStaff,
  refreshStaffToken,
  getUserProfile,
  getStoredToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredTokens,
  decodeToken,
  JWTPayload,
  setSessionExpiredHandler,
} from '../services/api';

export interface StaffUser {
  id: number;
  username: string;
  isStaff: boolean;
  isSuperuser: boolean;
  mustChangePassword?: boolean;
  restaurantId?: number | null;
  branchId?: number | null;
}

export interface AuthState {
  user: StaffUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: 'super_admin' | 'branch_manager' | null;
  restaurantId: number | null;
  branchId: number | null;
  sessionExpired: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // true initially for loadSavedSession
  role: null,
  restaurantId: null,
  branchId: null,
  sessionExpired: false,
  error: null,
};

// ─── Replicated Role Detection Logic ────────────────────────────────────────

export const isSuperAdminUser = (username?: string | null, isSuperuserPayload?: boolean): boolean => {
  const uname = (username || '').toLowerCase().trim();
  if (!uname || uname.startsWith('manager_')) return false;
  return isSuperuserPayload === true || uname === 'admin';
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const loginStaffThunk = createAsyncThunk(
  'auth/loginStaff',
  async ({ username, password }: { username: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await loginStaff(username, password);
      const { access, refresh } = response;
      const decoded: JWTPayload | null = decodeToken(access);

      if (!decoded) {
        return rejectWithValue('Invalid token received from server');
      }

      if (!decoded.is_staff && !decoded.is_superuser && !decoded.username?.startsWith('manager_') && decoded.username !== 'admin') {
        return rejectWithValue('This app is for restaurant staff only.');
      }

      const role: 'super_admin' | 'branch_manager' = isSuperAdminUser(decoded.username, decoded.is_superuser)
        ? 'super_admin'
        : 'branch_manager';

      const user: StaffUser = {
        id: decoded.user_id,
        username: decoded.username || username,
        isStaff: decoded.is_staff ?? true,
        isSuperuser: decoded.is_superuser ?? false,
        mustChangePassword: decoded.must_change_password ?? false,
        restaurantId: decoded.restaurant_id ?? null,
        branchId: decoded.branch_id ?? null,
      };

      await setStoredTokens(access, refresh);

      return {
        user,
        token: access,
        refreshToken: refresh,
        role,
        restaurantId: decoded.restaurant_id ?? null,
        branchId: decoded.branch_id ?? null,
      };
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Login failed';
      return rejectWithValue(msg);
    }
  }
);

export const logoutStaffThunk = createAsyncThunk(
  'auth/logoutStaff',
  async (_, { getState }) => {
    const state = getState() as { auth: AuthState };
    if (state.auth.refreshToken) {
      await logoutStaff(state.auth.refreshToken);
    } else {
      await clearStoredTokens();
    }
  }
);

export const loadSavedSessionThunk = createAsyncThunk(
  'auth/loadSavedSession',
  async (_, { rejectWithValue }) => {
    try {
      const token = await getStoredToken();
      const refresh = await getStoredRefreshToken();

      if (!token || !refresh) {
        await clearStoredTokens();
        return rejectWithValue('No saved session found');
      }

      let activeToken = token;
      let activeRefresh = refresh;
      let decoded: JWTPayload | null = decodeToken(activeToken);

      // Validate session with profile check
      try {
        await getUserProfile();
      } catch (profileErr: any) {
        if (profileErr?.response?.status === 401 || profileErr?.status === 401) {
          // Attempt token refresh
          try {
            const refreshed = await refreshStaffToken(refresh);
            activeToken = refreshed.access;
            if (refreshed.refresh) {
              activeRefresh = refreshed.refresh;
            }
            await setStoredTokens(activeToken, activeRefresh);
            decoded = decodeToken(activeToken);
          } catch {
            await clearStoredTokens();
            return rejectWithValue('Saved session expired');
          }
        }
      }

      if (!decoded) {
        await clearStoredTokens();
        return rejectWithValue('Corrupted token in storage');
      }

      if (!decoded.is_staff && !decoded.is_superuser && !decoded.username?.startsWith('manager_') && decoded.username !== 'admin') {
        await clearStoredTokens();
        return rejectWithValue('Stored session is not a staff account');
      }

      const role: 'super_admin' | 'branch_manager' = isSuperAdminUser(decoded.username, decoded.is_superuser)
        ? 'super_admin'
        : 'branch_manager';

      const user: StaffUser = {
        id: decoded.user_id,
        username: decoded.username || '',
        isStaff: decoded.is_staff ?? true,
        isSuperuser: decoded.is_superuser ?? false,
        mustChangePassword: decoded.must_change_password ?? false,
        restaurantId: decoded.restaurant_id ?? null,
        branchId: decoded.branch_id ?? null,
      };

      return {
        user,
        token: activeToken,
        refreshToken: activeRefresh,
        role,
        restaurantId: decoded.restaurant_id ?? null,
        branchId: decoded.branch_id ?? null,
      };
    } catch {
      await clearStoredTokens();
      return rejectWithValue('Failed to load session');
    }
  }
);

// ─── Slice Definition ────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSessionExpired: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.role = null;
      state.restaurantId = null;
      state.branchId = null;
      state.sessionExpired = true;
      state.isLoading = false;
      state.error = 'Session expired. Please log in again.';
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(loginStaffThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
      state.sessionExpired = false;
    });
    builder.addCase(loginStaffThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.role = action.payload.role;
      state.restaurantId = action.payload.restaurantId;
      state.branchId = action.payload.branchId;
      state.sessionExpired = false;
      state.error = null;
    });
    builder.addCase(loginStaffThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.error = (action.payload as string) || 'Login failed';
    });

    // Logout
    builder.addCase(logoutStaffThunk.fulfilled, (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.role = null;
      state.restaurantId = null;
      state.branchId = null;
      state.sessionExpired = false;
      state.error = null;
    });

    // Load Saved Session
    builder.addCase(loadSavedSessionThunk.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(loadSavedSessionThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.role = action.payload.role;
      state.restaurantId = action.payload.restaurantId;
      state.branchId = action.payload.branchId;
      state.sessionExpired = false;
      state.error = null;
    });
    builder.addCase(loadSavedSessionThunk.rejected, (state) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.role = null;
    });
  },
});

export const { setSessionExpired, clearAuthError } = authSlice.actions;

// Wire up session expired handler with API interceptor
setSessionExpiredHandler(() => {
  // Store dispatch handled in component/store setup
});

export default authSlice.reducer;
