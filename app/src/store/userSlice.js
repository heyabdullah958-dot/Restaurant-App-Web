import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null, // { id, name, email, phone, loyaltyPoints, addresses: [] }
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    authStart(state) {
      state.loading = true;
      state.error = null;
    },
    authSuccess(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
    },
    authFail(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    updateUserProfile(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    updateLoyaltyPoints(state, action) {
      if (state.user) {
        state.user.loyaltyPoints = action.payload;
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },
  },
});

export const { authStart, authSuccess, authFail, updateUserProfile, updateLoyaltyPoints, logout } = userSlice.actions;
export default userSlice.reducer;
