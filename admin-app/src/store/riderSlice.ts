import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchRiders,
  createRider,
  updateRider,
  deleteRider,
  BranchRider,
} from '../services/api';

export interface RiderState {
  riders: BranchRider[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: string; // 'ALL' | 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE'
}

const initialState: RiderState = {
  riders: [],
  isLoading: false,
  isRefreshing: false,
  error: null,
  searchQuery: '',
  statusFilter: 'ALL',
};

export const fetchRidersThunk = createAsyncThunk(
  'riders/fetchRiders',
  async (
    params:
      | {
          branch_id?: number;
          restaurant_id?: number;
          status?: string;
          is_active?: boolean;
          isRefresh?: boolean;
        }
      | undefined,
    { rejectWithValue }
  ) => {
    try {
      const riders = await fetchRiders(params);
      return riders;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch riders';
      return rejectWithValue(msg);
    }
  }
);

export const createRiderThunk = createAsyncThunk(
  'riders/createRider',
  async (data: Partial<BranchRider>, { rejectWithValue }) => {
    try {
      return await createRider(data);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to create rider';
      return rejectWithValue(msg);
    }
  }
);

export const updateRiderThunk = createAsyncThunk(
  'riders/updateRider',
  async (
    { id, data }: { id: number; data: Partial<BranchRider> },
    { dispatch, getState, rejectWithValue }
  ) => {
    // Optimistic UI Update
    const state = getState() as { riders: RiderState };
    const originalRider = state.riders.riders.find((r) => r.id === id);
    if (originalRider) {
      dispatch(updateRiderOptimistic({ id, data }));
    }

    try {
      const updated = await updateRider(id, data);
      return updated;
    } catch (err: any) {
      // Revert Optimistic Update
      if (originalRider) {
        dispatch(updateRiderOptimistic({ id, data: originalRider }));
      }
      const msg = err?.response?.data?.detail || err?.message || 'Failed to update rider';
      return rejectWithValue(msg);
    }
  }
);

export const deleteRiderThunk = createAsyncThunk(
  'riders/deleteRider',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteRider(id);
      return id;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to delete rider';
      return rejectWithValue(msg);
    }
  }
);

const riderSlice = createSlice({
  name: 'riders',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload;
    },
    updateRiderOptimistic: (
      state,
      action: PayloadAction<{ id: number; data: Partial<BranchRider> }>
    ) => {
      const { id, data } = action.payload;
      const index = state.riders.findIndex((r) => r.id === id);
      if (index !== -1) {
        state.riders[index] = { ...state.riders[index], ...data };
      }
    },
    clearRiderError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Riders
    builder.addCase(fetchRidersThunk.pending, (state, action) => {
      if (action.meta.arg?.isRefresh) {
        state.isRefreshing = true;
      } else if (state.riders.length === 0) {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(fetchRidersThunk.fulfilled, (state, action: PayloadAction<BranchRider[]>) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.riders = action.payload;
      state.error = null;
    });
    builder.addCase(fetchRidersThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = (action.payload as string) || 'Failed to load riders';
    });

    // Create Rider
    builder.addCase(createRiderThunk.fulfilled, (state, action: PayloadAction<BranchRider>) => {
      state.riders.unshift(action.payload);
    });

    // Update Rider
    builder.addCase(updateRiderThunk.fulfilled, (state, action: PayloadAction<BranchRider>) => {
      const index = state.riders.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.riders[index] = action.payload;
      }
    });

    // Delete Rider
    builder.addCase(deleteRiderThunk.fulfilled, (state, action: PayloadAction<number>) => {
      state.riders = state.riders.filter((r) => r.id !== action.payload);
    });
  },
});

export const {
  setSearchQuery,
  setStatusFilter,
  updateRiderOptimistic,
  clearRiderError,
} = riderSlice.actions;

export default riderSlice.reducer;
