# Milestone 3 (R3: Ratings, Loyalty & Admin Settings) — Mobile App Investigation Report

## 1. Observation

Direct code observations from `app/src/`:

### A. API Services (`app/src/services/api.js` & `app/src/services/fallbackData.ts`)
- `app/src/services/api.js` (lines 8–17): Uses `axios` instance configured with base URL `https://getfoodpk-fd9b20442fcf.herokuapp.com/api` and 90s timeout.
- `app/src/services/fallbackData.ts` (lines 36–62): `Restaurant` interface includes `rating: number` (line 58) and `total_reviews: number` (line 59).
- `FALLBACK_RESTAURANTS` (lines 65–421): All 7 fallback restaurant objects have pre-populated rating and total_reviews values (e.g. `seenbanao`: 4.8 / 245 reviews, `jushhpk`: 4.6 / 412 reviews, `tandooristoppk`: 4.5 / 154 reviews).
- Currently, no review submission API endpoints or review fetching methods are defined in `api.js` or Redux slices.

### B. HomeScreen Rating Display (`app/src/screens/HomeScreen.tsx`)
- Lines 201–205 in `RestaurantCard`:
```tsx
<View style={styles.ratingBadge}>
  <Ionicons name="star" size={14} color="#FFC107" />
  <Text style={styles.ratingText}>{Number(brand.rating || 4.5).toFixed(1)}</Text>
</View>
```
- Displays average rating, but does NOT currently display the total review count e.g. `(245)` or `(245 reviews)` on the restaurant card.

### C. RestaurantScreen Rating & Reviews Display (`app/src/screens/RestaurantScreen.tsx`)
- Lines 492–496 in `specsContainer`:
```tsx
<View style={styles.specItem}>
  <Ionicons name="star" size={16} color={COLORS.warning} />
  <Text style={styles.specValue}>{Number(restaurant.rating).toFixed(1)}</Text>
  <Text style={styles.specLabel}>({restaurant.total_reviews}+ reviews)</Text>
</View>
```
- Displays rating and review count in specs card header.
- Lines 532–577: Renders category tabs ("All Dishes", category list). Does NOT currently have a "Reviews" tab or dedicated customer reviews section listing existing reviews.

### D. TrackingScreen Order Status & Prompt Trigger (`app/src/screens/TrackingScreen.tsx`)
- Lines 43–52: Calculates `activeStep` (0 = received, 1 = preparing, 2 = out for delivery, 4 = delivered).
- Lines 239–257: Renders `DELIVERED STAGE` animation card:
```tsx
if (activeStep === 4) {
  return (
    <View style={styles.animCard}>
      <Animated.View style={[styles.animIconBg, { backgroundColor: COLORS.success, transform: [{ scale: successScale }] }]}>
        <Ionicons name="checkmark" size={32} color={COLORS.white} />
      </Animated.View>
      <Text style={[styles.animTitle, { color: COLORS.success }]}>Order Delivered!</Text>
      <Text style={styles.animDesc}>Bon appétit! We hope you love your delicious meal.</Text>
    </View>
  );
}
```
- Delivered state card currently lacks a button to open the Rating & Review modal.

### E. OrdersScreen Action Buttons (`app/src/screens/OrdersScreen.tsx`)
- Lines 232–265: Renders card actions for each order item:
  - Details button: `navigation.navigate('Tracking', { orderId: item.id })`
  - Track button: (hidden when status is `delivered`)
  - Re-order button: `handleReorder(item.id)`
- Does NOT currently have a "Rate Order" button for delivered orders.

### F. Redux Slices (`app/src/store/restaurantSlice.ts` & `app/src/store/orderSlice.ts`)
- `restaurantSlice.ts`: Manages `restaurants`, `currentRestaurant`, `loading`, `error`.
- `orderSlice.ts`: Manages `myOrders`, `currentOrder`, `activeOrder`, `loading`, `error`.
- Neither slice currently handles review submission or fetching review lists.

---

## 2. Logic Chain

1. **Review Submission & Fetching API Integration**:
   - Backend endpoints: `POST /api/restaurants/{id}/reviews/` (with body `{ order: order_id, rating: number, comment: string }`) and `GET /api/restaurants/{id}/reviews/`.
   - Adding `submitReview` and `fetchRestaurantReviews` thunks to `restaurantSlice.ts` or `orderSlice.ts` enables full integration with DRF backend endpoints.
   - Preserving fallback state ensures the app functions smoothly even offline or before backend review data is seeded.

2. **App Rating Prompt & Review Modal Component (`ReviewModal.tsx`)**:
   - Creating a reusable component `app/src/components/ReviewModal.tsx` allows triggering review prompt from multiple screens (`TrackingScreen`, `OrdersScreen`, `HomeScreen`).
   - Modal requires:
     - 5-star interactive rating picker (`Ionicons name={star <= selectedRating ? 'star' : 'star-outline'}`)
     - Comment text input (`TextInput`, multiline)
     - Submit button invoking `submitReview` thunk
     - Error/Success handling with user feedback.

3. **Prompts on Delivered Orders**:
   - In `TrackingScreen.tsx`: When `activeStep === 4` (delivered), display a "Rate Your Order" button on the delivered card that opens `ReviewModal`.
   - In `OrdersScreen.tsx`: For delivered orders (`status === 'delivered'`), add a "Rate Order" button next to "Re-order".

4. **Restaurant Rating & Reviews Display**:
   - In `HomeScreen.tsx`: Enhance `RestaurantCard` rating badge to show rating AND review count e.g. `⭐ 4.8 (245)`.
   - In `RestaurantScreen.tsx`: Add a "Reviews" tab button alongside category tabs or add a dedicated Reviews list section showing customer reviews with star ratings, reviewer names, dates, and comments.

---

## 3. Caveats

1. **Read-Only Scope**: This report is read-only. Source code under `app/src/` was NOT modified during this task.
2. **Backend Endpoints Alignment**: Endpoint paths `/api/restaurants/{id}/reviews/` align with backend explorer findings. The Worker should check payload field names (`order` or `order_id`) against backend serializer.
3. **Guest User Reviews**: If guest users (who do not have JWT auth) attempt to review, backend may require auth token or accept guest review submissions. `api.js` handles authorization token inclusion automatically.

---

## 4. Conclusion & Implementation Blueprint for Worker

The Worker should implement the following step-by-step changes:

### Step 1: Create `app/src/components/ReviewModal.tsx`
Create a new file `app/src/components/ReviewModal.tsx` with:
- **Props**:
  ```typescript
  interface ReviewModalProps {
    visible: boolean;
    orderId?: number;
    restaurantId: number;
    restaurantName: string;
    onClose: () => void;
    onSuccess?: () => void;
  }
  ```
- **State**:
  - `rating`: number (1 to 5, default 5 or 0)
  - `comment`: string
  - `submitting`: boolean
  - `error`: string | null
- **UI Structure**:
  - Modal overlay & content card with `COLORS.white`, rounded corners (20).
  - Title: "Rate Your Experience" and subtitle `restaurantName`.
  - Star Rating Selector: Row of 5 star icons (`Ionicons` `star` / `star-outline`, size 36, color `#FFC107`), clickable.
  - Feedback Comment Box: Multiline `TextInput`, placeholder "Write a comment (optional)...".
  - Submit Button: Primary button calling dispatch of `submitReview`.
  - Close/Cancel Button.

### Step 2: Update Redux Slices (`app/src/store/restaurantSlice.ts`)
- Add `reviews: [] as any[]` to `initialState`.
- Add `fetchRestaurantReviews` createAsyncThunk:
  ```typescript
  export const fetchRestaurantReviews = createAsyncThunk(
    'restaurant/fetchRestaurantReviews',
    async (restaurantId: number, { rejectWithValue }) => {
      try {
        const response = await api.get(`/restaurants/${restaurantId}/reviews/`);
        return response.data || response;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
      }
    }
  );
  ```
- Add `submitReview` createAsyncThunk:
  ```typescript
  export const submitReview = createAsyncThunk(
    'restaurant/submitReview',
    async ({ restaurantId, orderId, rating, comment }: { restaurantId: number; orderId?: number; rating: number; comment: string }, { rejectWithValue }) => {
      try {
        const response = await api.post(`/restaurants/${restaurantId}/reviews/`, {
          order: orderId,
          rating,
          comment,
        });
        return response.data || response;
      } catch (error: any) {
        return rejectWithValue(error.response?.data?.message || 'Failed to submit review');
      }
    }
  );
  ```
- Add extraReducers for `fetchRestaurantReviews` (populating `state.reviews`) and `submitReview`.

### Step 3: Update `TrackingScreen.tsx` (`app/src/screens/TrackingScreen.tsx`)
- Import `ReviewModal`.
- Add state `const [showReviewModal, setShowReviewModal] = useState(false)`.
- In `renderStatusAnimation()` for `activeStep === 4` (delivered stage, lines 239–257):
  - Add a "Rate Your Order" button e.g.:
    ```tsx
    <TouchableOpacity
      style={styles.rateOrderBtn}
      onPress={() => setShowReviewModal(true)}
    >
      <Ionicons name="star" size={18} color={COLORS.white} />
      <Text style={styles.rateOrderBtnText}>Rate Your Order</Text>
    </TouchableOpacity>
    ```
- Render `<ReviewModal>` at the bottom of `TrackingScreen`.

### Step 4: Update `OrdersScreen.tsx` (`app/src/screens/OrdersScreen.tsx`)
- Import `ReviewModal`.
- Add state for selected order to review `[reviewingOrder, setReviewingOrder] = useState<any | null>(null)`.
- In `renderOrderItem` (lines 232–265):
  - For delivered orders (`item.status === 'delivered'`), add a "Rate" action button:
    ```tsx
    {item.status === 'delivered' && (
      <TouchableOpacity
        style={styles.rateBtn}
        onPress={() => setReviewingOrder(item)}
      >
        <Ionicons name="star-outline" size={18} color={COLORS.warning} />
        <Text style={styles.rateBtnText}>Rate</Text>
      </TouchableOpacity>
    )}
    ```
- Render `<ReviewModal>` controlled by `reviewingOrder !== null`.

### Step 5: Update `HomeScreen.tsx` (`app/src/screens/HomeScreen.tsx`)
- In `RestaurantCard` (lines 201–205):
  - Update rating badge to display total review count:
    ```tsx
    <View style={styles.ratingBadge}>
      <Ionicons name="star" size={14} color="#FFC107" />
      <Text style={styles.ratingText}>
        {Number(brand.rating || 4.5).toFixed(1)} ({brand.total_reviews || 0})
      </Text>
    </View>
    ```

### Step 6: Update `RestaurantScreen.tsx` (`app/src/screens/RestaurantScreen.tsx`)
- Add a "Reviews" tab next to categories tab bar or add a dedicated Reviews section in `ListHeaderComponent` / menu view.
- When Reviews tab is selected, dispatch `fetchRestaurantReviews(restaurant.id)` and display list of reviews.
- Review item layout:
  - User avatar/initials
  - Rating stars (`Ionicons` `star`, size 14, color `#FFC107`)
  - Date formatted
  - Review comment text
  - Empty state message if no reviews exist ("No reviews yet. Be the first to leave a review!").

---

## 5. Verification Method

1. **Static Analysis & Type Check**:
   - Run Expo / TypeScript check if configured or inspect syntax in all modified components.
2. **Review Modal Verification**:
   - Open `TrackingScreen` for a delivered order. Verify "Rate Your Order" button appears.
   - Tap button, verify 5-star selector and comment input render in modal.
   - Select 5 stars, type feedback, tap Submit. Verify API call / thunk dispatches correctly.
3. **Orders Screen Verification**:
   - Navigate to `OrdersScreen`, select "Delivered" tab. Verify "Rate" button appears on delivered order cards.
   - Tap "Rate" button, verify `ReviewModal` opens with order and restaurant context.
4. **Rating & Reviews Display Verification**:
   - Check `HomeScreen` restaurant cards — verify rating badge displays rating and review count e.g. `4.8 (245)`.
   - Open `RestaurantScreen` — verify specs header displays rating & review count, and select Reviews tab to inspect customer reviews list.
