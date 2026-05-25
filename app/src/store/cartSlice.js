import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [], // Array of { id, name, price, quantity, selectedOptions, ... }
  restaurantId: null, // The restaurant ID the cart belongs to (to enforce ordering from one restaurant at a time)
  totalQuantity: 0,
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addItemToCart(state, action) {
      const { item, restaurantId } = action.payload;
      
      // If adding an item from a different restaurant, reset cart for the new restaurant
      if (state.restaurantId && state.restaurantId !== restaurantId) {
        state.items = [];
        state.totalQuantity = 0;
        state.totalAmount = 0;
      }
      
      state.restaurantId = restaurantId;

      const existingItem = state.items.find(
        (i) => i.id === item.id && JSON.stringify(i.selectedOptions) === JSON.stringify(item.selectedOptions)
      );

      if (!existingItem) {
        state.items.push({
          ...item,
          quantity: item.quantity || 1,
        });
      } else {
        existingItem.quantity += item.quantity || 1;
      }

      state.totalQuantity += item.quantity || 1;
      state.totalAmount += (item.price * (item.quantity || 1));
    },
    removeItemFromCart(state, action) {
      const { id, selectedOptions } = action.payload;
      const existingItem = state.items.find(
        (i) => i.id === id && JSON.stringify(i.selectedOptions) === JSON.stringify(selectedOptions)
      );

      if (existingItem) {
        state.totalQuantity -= existingItem.quantity;
        state.totalAmount -= (existingItem.price * existingItem.quantity);
        state.items = state.items.filter(
          (i) => !(i.id === id && JSON.stringify(i.selectedOptions) === JSON.stringify(selectedOptions))
        );
      }

      if (state.items.length === 0) {
        state.restaurantId = null;
      }
    },
    updateQuantity(state, action) {
      const { id, selectedOptions, quantity } = action.payload;
      const existingItem = state.items.find(
        (i) => i.id === id && JSON.stringify(i.selectedOptions) === JSON.stringify(selectedOptions)
      );

      if (existingItem && quantity > 0) {
        const difference = quantity - existingItem.quantity;
        existingItem.quantity = quantity;
        state.totalQuantity += difference;
        state.totalAmount += (existingItem.price * difference);
      }
    },
    clearCart(state) {
      state.items = [];
      state.restaurantId = null;
      state.totalQuantity = 0;
      state.totalAmount = 0;
    },
  },
});

export const { addItemToCart, removeItemFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
