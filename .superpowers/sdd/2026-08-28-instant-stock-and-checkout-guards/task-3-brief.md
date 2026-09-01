# Task 3: Smart Checkout Branch Selection Guard & Error Sanitizer

## Objective
Implement pre-flight cart fulfillment evaluation across all branches on `CheckoutScreen.tsx`, dimming and disabling ineligible branches, showing helpful warnings and dialogs, and sanitizing any raw DRF backend error payloads into human-readable alerts.

## Files to Modify:
1. `app/src/screens/CheckoutScreen.tsx`:
   - In `CheckoutScreen`:
     - Calculate `branchEligibilityMap` using `useMemo`:
       For each branch in `branches`:
         Look through each item in `cart.items`:
         If `cartItem.branch_availability_map && cartItem.branch_availability_map[String(branch.id)] === false`
         Then record this cartItem as unavailable at this branch.
         `branchEligibilityMap[branch.id] = { isEligible: unavailable.length === 0, unavailableCount: unavailable.length, unavailableNames: unavailable }`
     - In the `Select Fulfill Branch` section:
       For each branch `b`:
         const eligibility = branchEligibilityMap[b.id];
         const isEligible = !eligibility || eligibility.isEligible;
         If `!isEligible`:
           Render card with `opacity: 0.55`, a subtle warning border, and a badge:
           `⚠️ ${eligibility.unavailableCount} item${eligibility.unavailableCount > 1 ? 's' : ''} sold out here`
           When tapped:
           Do NOT select `selectedBranchId`.
           Show an informative alert:
           `showAlert('Branch Unavailable for Cart', `The following item(s) in your cart are currently out of stock at ${b.name} Branch:\n\n${eligibility.unavailableNames.map(n => '• ' + n).join('\n')}\n\nPlease select another branch or adjust your cart items.`)`
     - If the currently selected `selectedBranchId` becomes ineligible (e.g. `!branchEligibilityMap[selectedBranchId]?.isEligible`), automatically select the first eligible branch if available.
     - Implement `formatCheckoutError(rawPayload)`:
       If `rawPayload` is a string -> return it.
       If `rawPayload.non_field_errors` -> return array joined or first element.
       If `rawPayload.items` -> return array joined or first element.
       If `rawPayload.message` or `rawPayload.detail` -> return it.
       If `typeof rawPayload === 'object'`: extract values and join into a readable sentence.
       Use `formatCheckoutError(resultAction.payload)` in `handlePlaceOrder` error handling instead of raw `JSON.stringify()`.
2. Verify TypeScript:
   Run `cd app && npx tsc --noEmit` and confirm 0 errors.
3. Commit changes:
   `git commit -am "feat(app): add smart checkout branch fulfillment guard and error sanitizer"`
