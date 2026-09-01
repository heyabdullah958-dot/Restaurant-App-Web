# Merchant Manager Mobile App (`/admin-app`) Architecture & Invariants

## Key Invariants
1. **Root Entry Point**: Line 1 of `index.ts` must execute `import 'react-native-gesture-handler';`.
2. **Gesture & Error Boundary**: Root component tree in `App.tsx` must be wrapped with `<GestureHandlerRootView style={{ flex: 1 }}>` and `<ErrorBoundary>`.
3. **Role-Differentiated Theming**:
   - Super Admin: Dark slate theme (`COLORS.superAdmin.*`).
   - Branch Manager: Warm light theme (`COLORS.branchManager.*`).
4. **Navigation Vector Icons**: Bottom tab bar must use `@expo/vector-icons` (`Ionicons`) with active pill highlights (`tabIconPill`), not raw emoji unicode text.
5. **Rider Modal Target Route**: Button navigation from dispatch modal must navigate to `'RiderManagement'`.
6. **Foreground Order Ringing**: `NewOrderAlertService` + `useOrderPolling` + `expo-av` (with loop fallback) + `expo-keep-awake`.
7. **Production APK Build**: `app.json` must include permissions `"android.permission.VIBRATE"`, `"android.permission.WAKE_LOCK"`, `"android.permission.POST_NOTIFICATIONS"` and `buildArchs: ["arm64-v8a", "armeabi-v7a", "x86_64"]`.

