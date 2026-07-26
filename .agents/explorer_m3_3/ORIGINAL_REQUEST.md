## 2026-07-26T15:00:10Z
<USER_REQUEST>
You are Explorer 3 for Milestone 3 (R3: Ratings, Loyalty & Admin Settings).
Your working directory is `d:/sitesdata/Resturent App/.agents/explorer_m3_3/`. Create this directory if it doesn't exist.

TASK: Investigate the Mobile App (`app/src/`) implementation details for Ratings & Reviews prompt and display:
1. App Rating Prompt & Review Modal:
   - Rating modal or prompt component when an order status reaches `delivered` or `completed` in `app/src/screens/TrackingScreen.tsx` or `HomeScreen.tsx` / `ProfileScreen.tsx`.
   - Star rating selector (1-5 stars), text input for review comment, submit button calling backend review API.
2. Restaurant Rating Display:
   - Display average rating and review count on `RestaurantScreen.tsx` and restaurant cards on `HomeScreen.tsx`.
   - Reviews tab or section on `RestaurantScreen.tsx` to list existing customer reviews.
3. Review Submission API Integration:
   - API service functions in `app/src/services/api.ts` for posting reviews and fetching restaurant reviews.

Investigate existing screen components, state management, and API services in `app/src/`.
Write a detailed investigation report and handoff to `d:/sitesdata/Resturent App/.agents/explorer_m3_3/handoff.md`. Include exact file paths, line numbers, and UI implementation details for the Worker.
Communicate completion back to parent via `send_message`.
</USER_REQUEST>
