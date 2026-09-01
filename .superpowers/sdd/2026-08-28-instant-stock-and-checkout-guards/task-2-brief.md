# Task 2: Customer Mobile App Zero-Lag Stock Resolution & Cross-Branch Switcher

## Objective
Implement instant 0ms menu stock evaluation, interactive cross-branch switcher pills, and updated type definitions across the customer React Native app.

## Files to Modify:
1. `app/src/types/index.ts`:
   - Extend `MenuItem` interface with:
     `branch_availability_map?: Record<string, boolean>;`
     `other_available_branches?: Array<{ id: number; name: string }>;`
2. `app/src/screens/RestaurantScreen.tsx`:
   - In `MenuItemCard`:
     - Calculate `isOutOfStock` synchronously:
       If `item.is_available === false && !item.branch_availability_map` -> true.
       If `selectedBranchId && item.branch_availability_map`: check `item.branch_availability_map[String(selectedBranchId)]` (if false -> out of stock).
       Otherwise `item.is_available === false`.
     - When `isOutOfStock === true` and `item.other_available_branches && item.other_available_branches.length > 0`:
       Render a clean interactive pill below the item description or price:
       `📍 In stock at ${item.other_available_branches.map(b => b.name).join(', ')} · Tap to switch`
       On press, trigger an alert/modal prompt:
       "Switch Branch?"
       "This item is in stock at ${firstBranch.name}. Would you like to switch your active branch to ${firstBranch.name}?"
       Actions: `[Cancel]` `[Switch Branch]`
       On confirmation, call `onSwitchBranch(firstBranch.id)` or set `selectedBranchId(firstBranch.id)`.
     - Pass `selectedBranchId` and `onSwitchBranch` callback down to `MenuItemCard`.
   - In `handleAddToCart` and `confirmAddVariantToCart`:
     - Synchronously check `item.branch_availability_map[String(selectedBranchId)] === false` and block adding out-of-stock items.
3. `app/src/services/fallbackData.ts`:
   - Ensure fallback restaurant items have default `branch_availability_map` entries matching active branch IDs.
4. Verify TypeScript:
   Run `cd app && npx tsc --noEmit` and ensure 0 compilation errors.
5. Commit changes:
   `git commit -am "feat(app): add zero-lag stock resolution and cross-branch switch pill"`
