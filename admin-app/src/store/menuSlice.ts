import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchRestaurantMenu,
  toggleBranchItemAvailability,
  createMenuCategory,
  deleteMenuCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  MenuCategoryData,
  MenuItemData,
} from '../services/api';

export interface MenuState {
  categories: MenuCategoryData[];
  selectedBrandId: number | null;
  selectedBrandSlug: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchTerm: string;
}

const initialState: MenuState = {
  categories: [],
  selectedBrandId: null,
  selectedBrandSlug: 'seenbanao',
  isLoading: false,
  isRefreshing: false,
  error: null,
  searchTerm: '',
};

export const fetchMenuThunk = createAsyncThunk(
  'menu/fetchMenu',
  async (
    {
      restaurantSlugOrId,
      branchId,
      isRefresh,
    }: {
      restaurantSlugOrId: string | number;
      branchId?: number;
      isRefresh?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const res = await fetchRestaurantMenu(restaurantSlugOrId, branchId);
      const categoryList: MenuCategoryData[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : res?.results || [];

      return categoryList;
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch menu';
      return rejectWithValue(msg);
    }
  }
);

export const toggleItemAvailabilityThunk = createAsyncThunk(
  'menu/toggleItemAvailability',
  async (
    {
      branchId,
      menuItemId,
      isAvailable,
    }: {
      branchId: number;
      menuItemId: number;
      isAvailable: boolean;
    },
    { dispatch, rejectWithValue }
  ) => {
    // Optimistic Redux Update
    dispatch(setItemAvailabilityOptimistic({ menuItemId, isAvailable }));
    try {
      const res = await toggleBranchItemAvailability(branchId, menuItemId, isAvailable);
      return res;
    } catch (err: any) {
      // Revert Optimistic Update on Failure
      dispatch(setItemAvailabilityOptimistic({ menuItemId, isAvailable: !isAvailable }));
      const msg = err?.response?.data?.detail || err?.message || 'Failed to toggle availability';
      return rejectWithValue(msg);
    }
  }
);

export const createCategoryThunk = createAsyncThunk(
  'menu/createCategory',
  async (data: { restaurant: number; name: string }, { rejectWithValue }) => {
    try {
      return await createMenuCategory(data);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || 'Failed to create category');
    }
  }
);

export const deleteCategoryThunk = createAsyncThunk(
  'menu/deleteCategory',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteMenuCategory(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || 'Failed to delete category');
    }
  }
);

export const createItemThunk = createAsyncThunk(
  'menu/createItem',
  async (data: any, { rejectWithValue }) => {
    try {
      return await createMenuItem(data);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || 'Failed to create item');
    }
  }
);

export const updateItemThunk = createAsyncThunk(
  'menu/updateItem',
  async ({ id, data }: { id: number; data: any }, { rejectWithValue }) => {
    try {
      return await updateMenuItem(id, data);
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || 'Failed to update item');
    }
  }
);

export const deleteItemThunk = createAsyncThunk(
  'menu/deleteItem',
  async (id: number, { rejectWithValue }) => {
    try {
      await deleteMenuItem(id);
      return id;
    } catch (err: any) {
      return rejectWithValue(err?.response?.data?.detail || err?.message || 'Failed to delete item');
    }
  }
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setSelectedBrand: (
      state,
      action: PayloadAction<{ brandId: number | null; brandSlug: string }>
    ) => {
      state.selectedBrandId = action.payload.brandId;
      state.selectedBrandSlug = action.payload.brandSlug;
    },
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },
    setItemAvailabilityOptimistic: (
      state,
      action: PayloadAction<{ menuItemId: number; isAvailable: boolean }>
    ) => {
      const { menuItemId, isAvailable } = action.payload;
      state.categories.forEach((cat) => {
        cat.items.forEach((item) => {
          if (item.id === menuItemId) {
            item.is_available = isAvailable;
          }
        });
      });
    },
    clearMenuError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Menu
    builder.addCase(fetchMenuThunk.pending, (state, action) => {
      if (action.meta.arg?.isRefresh) {
        state.isRefreshing = true;
      } else {
        state.isLoading = true;
      }
      state.error = null;
    });
    builder.addCase(fetchMenuThunk.fulfilled, (state, action: PayloadAction<MenuCategoryData[]>) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.categories = action.payload;
      state.error = null;
    });
    builder.addCase(fetchMenuThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isRefreshing = false;
      state.error = (action.payload as string) || 'Failed to load menu';
    });

    // Delete Category
    builder.addCase(deleteCategoryThunk.fulfilled, (state, action: PayloadAction<number>) => {
      state.categories = state.categories.filter((cat) => cat.id !== action.payload);
    });

    // Delete Item
    builder.addCase(deleteItemThunk.fulfilled, (state, action: PayloadAction<number>) => {
      state.categories.forEach((cat) => {
        cat.items = cat.items.filter((item) => item.id !== action.payload);
      });
    });
  },
});

export const {
  setSelectedBrand,
  setSearchTerm,
  setItemAvailabilityOptimistic,
  clearMenuError,
} = menuSlice.actions;

export default menuSlice.reducer;
