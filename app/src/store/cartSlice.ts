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

export interface AppliedPromo {
  code: string;
  discount: number;
  discount_type: string;
  discount_value: number;
  min_subtotal: number;
  max_discount?: number | null;
}

export interface CartState {
  items: CartItem[];
  restaurantId: number | null;
  totalQuantity: number;
  totalAmount: number;
  fulfillmentMode: 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN';
  tableNumber: string;
  appliedPromo: AppliedPromo | null;
  promoRemovalNotice: string | null;
  useLoyaltyPoints: boolean;
  redeemedLoyaltyPoints: number;
}

const initialState: CartState = {
  items: [],
  restaurantId: null,
  totalQuantity: 0,
  totalAmount: 0,
  fulfillmentMode: 'DELIVERY',
  tableNumber: '',
  appliedPromo: null,
  promoRemovalNotice: null,
  useLoyaltyPoints: false,
  redeemedLoyaltyPoints: 0,
};

const evaluatePromoState = (state: CartState) => {
  if (!state.appliedPromo) return;
  if (state.items.length === 0 || state.totalAmount < (state.appliedPromo.min_subtotal || 0)) {
    const code = state.appliedPromo.code;
    const minSub = state.appliedPromo.min_subtotal || 0;
    state.appliedPromo = null;
    state.promoRemovalNotice = `Promo code '${code}' removed: Minimum order subtotal of Rs. ${minSub.toFixed(0)} required.`;
  } else if (state.appliedPromo.discount_type === 'percentage') {
    let newDisc = state.totalAmount * (state.appliedPromo.discount_value / 100);
    if (state.appliedPromo.max_discount) {
      newDisc = Math.min(newDisc, state.appliedPromo.max_discount);
    }
    state.appliedPromo.discount = Math.min(newDisc, state.totalAmount);
    state.promoRemovalNotice = null;
  }
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
    applyPromo(state, action: PayloadAction<AppliedPromo>) {
      state.appliedPromo = action.payload;
      state.promoRemovalNotice = null;
      evaluatePromoState(state);
    },
    removePromo(state) {
      state.appliedPromo = null;
      state.promoRemovalNotice = null;
    },
    clearPromoNotice(state) {
      state.promoRemovalNotice = null;
    },
    setUseLoyaltyPoints(state, action: PayloadAction<boolean>) {
      state.useLoyaltyPoints = action.payload;
      if (!action.payload) {
        state.redeemedLoyaltyPoints = 0;
      }
    },
    setRedeemedLoyaltyPoints(state, action: PayloadAction<number>) {
      state.redeemedLoyaltyPoints = Math.max(0, action.payload);
    },
    addItemToCart(state, action: PayloadAction<{ item: CartItem; restaurantId: number }>) {
      const { item, restaurantId } = action.payload;
      
      // If adding an item from a different restaurant, reset cart for the new restaurant
      if (state.restaurantId && state.restaurantId !== restaurantId) {
        state.items = [];
        state.totalQuantity = 0;
        state.totalAmount = 0;
        state.appliedPromo = null;
        state.promoRemovalNotice = null;
        state.useLoyaltyPoints = false;
        state.redeemedLoyaltyPoints = 0;
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
      evaluatePromoState(state);
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
        state.useLoyaltyPoints = false;
        state.redeemedLoyaltyPoints = 0;
      }
      evaluatePromoState(state);
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
      evaluatePromoState(state);
    },
    clearCart(state) {
      state.items = [];
      state.restaurantId = null;
      state.totalQuantity = 0;
      state.totalAmount = 0;
      state.appliedPromo = null;
      state.promoRemovalNotice = null;
      state.useLoyaltyPoints = false;
      state.redeemedLoyaltyPoints = 0;
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
      state.appliedPromo = null;
      state.promoRemovalNotice = null;
      state.useLoyaltyPoints = false;
      state.redeemedLoyaltyPoints = 0;
    };
    builder
      .addCase('user/logout/fulfilled', resetCartState)
      .addCase('user/logout', resetCartState)
      .addCase('user/sessionExpired', resetCartState);
  },
});

export const {
  setFulfillmentMode,
  setTableNumber,
  applyPromo,
  removePromo,
  clearPromoNotice,
  setUseLoyaltyPoints,
  setRedeemedLoyaltyPoints,
  addItemToCart,
  removeItemFromCart,
  updateQuantity,
  clearCart,
} = cartSlice.actions;
export default cartSlice.reducer;

