import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: any;
  image?: string;
  [key: string]: any; // Allow other optional fields
}

export interface CartState {
  items: CartItem[];
  restaurantId: number | null;
  totalQuantity: number;
  totalAmount: number;
  fulfillmentMode: 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN';
  tableNumber: string;
}

const initialState: CartState = {
  items: [],
  restaurantId: null,
  totalQuantity: 0,
  totalAmount: 0,
  fulfillmentMode: 'DELIVERY',
  tableNumber: '',
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setFulfillmentMode(state, action: PayloadAction<'DELIVERY' | 'TAKEAWAY' | 'DINE_IN'>) {
      state.fulfillmentMode = action.payload;
    },
    setTableNumber(state, action: PayloadAction<string>) {
      state.tableNumber = action.payload;
    },
    addItemToCart(state, action: PayloadAction<{ item: CartItem; restaurantId: number }>) {
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

      const addedQty = item.quantity || 1;

      if (!existingItem) {
        state.items.push({
          ...item,
          quantity: addedQty,
        });
      } else {
        existingItem.quantity += addedQty;
      }

      state.totalQuantity += addedQty;
      state.totalAmount += (item.price * addedQty);
    },
    removeItemFromCart(state, action: PayloadAction<{ id: number; selectedOptions?: any }>) {
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
    updateQuantity(state, action: PayloadAction<{ id: number; selectedOptions?: any; quantity: number }>) {
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
  extraReducers: (builder) => {
    const resetCartState = (state: any) => {
      state.items = [];
      state.restaurantId = null;
      state.totalQuantity = 0;
      state.totalAmount = 0;
      state.fulfillmentMode = 'DELIVERY';
      state.tableNumber = '';
    };
    builder
      .addCase('user/login/pending', resetCartState)
      .addCase('user/register/pending', resetCartState)
      .addCase('user/logout/fulfilled', resetCartState)
      .addCase('user/logout', resetCartState)
      .addCase('user/sessionExpired', resetCartState);
  },
});

export const { setFulfillmentMode, setTableNumber, addItemToCart, removeItemFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
