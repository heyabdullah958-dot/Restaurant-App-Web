import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchStaffManagers,
  createStaffManager,
  changeManagerPassword,
  StaffManager,
} from '../services/api';

export interface TenantState {
  managers: StaffManager[];
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: TenantState = {
  managers: [],
  isLoading: false,
  isRefreshing: false,
  isSubmitting: false,
  error: null,
};

export const fetchManagersThunk = createAsyncThunk(
  'tenant/fetchManagers',
  async (params: { isRefresh?: boolean } | undefined, { rejectWithValue }) => {
    try {
      const managers = await fetchStaffManagers();
      return managers;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch staff managers';
      return rejectWithValue(msg);
    }
  }
);

export const createManagerThunk = createAsyncThunk(
  'tenant/createManager',
  async (
    data: {
      restaurant_id: number;
      branch_id: number;
      notification_email: string;
      password?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await createStaffManager(data);
      return result;
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to create manager account';
      return rejectWithValue(msg);
    }
  }
);

export const changeManagerPasswordThunk = createAsyncThunk(
  'tenant/changeManagerPassword',
  async (
    { managerId, password }: { managerId: number; password: string },
    { rejectWithValue }
  ) => {
    try {
      const result = await changeManagerPassword(managerId, password);
      return { managerId, result };
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err?.message || 'Failed to reset manager password';
      return rejectWithValue(msg);
    }
  }
);

const tenantSlice = createSlice({
  name: 'tenant',
  initialState,
  reducers: {
    clearTenantError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Managers
    builder.addCase(fetchManagersThunk.pending, (state, action) => {
      if (action.meta.arg?.isRefresh) {
        state.isRefreshing = true;
      } else if (state.managers.length === 0) {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(
      fetchManagersThunk.fulfilled,
      (state, action: PayloadAction<StaffManager[]>) => {
        state.isLoading = false;
        state.isRefreshing = false;
        state.managers = action.payload;
        state.error = null;
      }
    );
    builder.addCase(fetchManagersThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = (action.payload as string) || 'Failed to load staff managers';
    });

    // Create Manager
    builder.addCase(createManagerThunk.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(createManagerThunk.fulfilled, (state) => {
      state.isSubmitting = false;
    });
    builder.addCase(createManagerThunk.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = (action.payload as string) || 'Failed to create manager account';
    });

    // Change Password
    builder.addCase(changeManagerPasswordThunk.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(changeManagerPasswordThunk.fulfilled, (state) => {
      state.isSubmitting = false;
    });
    builder.addCase(changeManagerPasswordThunk.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = (action.payload as string) || 'Failed to change password';
    });
  },
});

export const { clearTenantError } = tenantSlice.actions;
export default tenantSlice.reducer;
