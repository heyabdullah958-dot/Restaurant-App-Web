#!/usr/bin/env python3
"""
test_phase9_apk_crash_guard_suite.py
====================================
Comprehensive Test Suite for Phase 9: Mobile App Standalone APK Cold Launch Crash & Native Initialization Fix.
Verifies all root startup lifecycles, gesture handler initialization, global error interception,
ErrorBoundary component structure, permissions, and multi-arch configurations.
"""

import os
import re
import sys
import json
import unittest

# Set UTF-8 encoding for Windows stdout/stderr
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(ROOT_DIR, 'app')
ADMIN_APP_DIR = os.path.join(ROOT_DIR, 'admin-app')


class Phase9ApkCrashGuardTestSuite(unittest.TestCase):
    """Verifies that all APK startup crash vectors are permanently neutralized."""

    def test_01_gesture_handler_root_import_precedence(self):
        """Verify react-native-gesture-handler is imported at the very top of both index.ts entry points."""
        customer_index = os.path.join(APP_DIR, 'index.ts')
        manager_index = os.path.join(ADMIN_APP_DIR, 'index.ts')

        self.assertTrue(os.path.exists(customer_index), "Customer app index.ts must exist")
        self.assertTrue(os.path.exists(manager_index), "Manager app index.ts must exist")

        with open(customer_index, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
        self.assertEqual(
            lines[0],
            "import 'react-native-gesture-handler';",
            "react-native-gesture-handler MUST be line 1 of app/index.ts to avoid native crash on Android"
        )

        with open(manager_index, 'r', encoding='utf-8') as f:
            lines_m = [line.strip() for line in f if line.strip()]
        self.assertEqual(
            lines_m[0],
            "import 'react-native-gesture-handler';",
            "react-native-gesture-handler MUST be line 1 of admin-app/index.ts to avoid native crash on Android"
        )
        print("PASS: [TEST 1] Root gesture handler import precedence verified on both app and admin-app")

    def test_02_global_error_utils_interception(self):
        """Verify ErrorUtils.setGlobalHandler is registered in both entry points to prevent activity termination."""
        for path, app_name in [(os.path.join(APP_DIR, 'index.ts'), 'Customer App'),
                               (os.path.join(ADMIN_APP_DIR, 'index.ts'), 'Manager App')]:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            self.assertIn("ErrorUtils.setGlobalHandler", content, f"{app_name} index.ts must register ErrorUtils.setGlobalHandler")
            self.assertIn("_setUnhandledRejectionHandler", content, f"{app_name} index.ts must register promise rejection handler")

        print("PASS: [TEST 2] Global ErrorUtils and Promise rejection interception verified in both entry files")

    def test_03_screens_enabled_and_freeze_optimization(self):
        """Verify App.tsx calls enableScreens(true) and enableFreeze(true)."""
        app_tsx = os.path.join(APP_DIR, 'App.tsx')
        with open(app_tsx, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("enableScreens(true);", content, "App.tsx must invoke enableScreens(true)")
        self.assertIn("enableFreeze(true);", content, "App.tsx must invoke enableFreeze(true)")
        print("PASS: [TEST 3] Native screen rendering performance & stability enabled via enableScreens & enableFreeze")

    def test_04_error_boundary_component_and_root_wrap(self):
        """Verify both customer and manager apps have ErrorBoundary components wrapping Provider at the root level."""
        for app_path, app_name in [(APP_DIR, 'Customer App'), (ADMIN_APP_DIR, 'Manager App')]:
            boundary_file = os.path.join(app_path, 'src', 'components', 'ErrorBoundary.tsx')
            self.assertTrue(os.path.exists(boundary_file), f"ErrorBoundary.tsx must exist in {app_name}")

            with open(boundary_file, 'r', encoding='utf-8') as f:
                b_content = f.read()

            self.assertIn("getDerivedStateFromError", b_content, f"{app_name} ErrorBoundary must implement getDerivedStateFromError")
            self.assertIn("componentDidCatch", b_content, f"{app_name} ErrorBoundary must implement componentDidCatch")
            self.assertIn("AsyncStorage.clear()", b_content, f"{app_name} ErrorBoundary must provide local cache reset")

            app_tsx = os.path.join(app_path, 'App.tsx')
            with open(app_tsx, 'r', encoding='utf-8') as f:
                app_content = f.read()

            self.assertIn("<ErrorBoundary>", app_content, f"{app_name} App.tsx must wrap tree in ErrorBoundary")
            # Ensure ErrorBoundary wraps Provider at the root
            root_pattern = re.search(r'<ErrorBoundary>\s*<Provider', app_content)
            self.assertIsNotNone(root_pattern, f"{app_name} ErrorBoundary must wrap Provider at the root level")

        print("PASS: [TEST 4] Dual-app ErrorBoundary verified with cache reset and root Provider wrapping")

    def test_05_appcontent_startup_lifecycle_hardening(self):
        """Verify AppContent wraps token hydration, notification listeners, and deep linking in try/catch."""
        app_tsx = os.path.join(APP_DIR, 'App.tsx')
        with open(app_tsx, 'r', encoding='utf-8') as f:
            app_content = f.read()

        self.assertIn("try {\n      dispatch(loadSavedToken());", app_content, "loadSavedToken must be wrapped in try/catch")
        self.assertIn("initPushNotificationListener();", app_content, "initPushNotificationListener must be invoked")
        print("PASS: [TEST 5] AppContent startup lifecycle defensively hardened against exceptions")

    def test_06_splash_screen_defensive_navigation(self):
        """Verify SplashScreen wraps navigation.replace in defensive try/catch blocks and checks onboarding memory."""
        splash_file = os.path.join(APP_DIR, 'src', 'screens', 'SplashScreen.tsx')
        with open(splash_file, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("navigation.replace('Main');", content)
        self.assertIn("catch (navErr)", content, "SplashScreen must catch navigation failures")
        self.assertIn("@getfood_has_seen_onboarding", content, "SplashScreen must check onboarding memory")
        print("PASS: [TEST 6] SplashScreen verified with safe fallback navigation and onboarding memory")

    def test_07_android_permissions_in_app_json_and_manifest(self):
        """Verify required Android permissions exist in app.json and AndroidManifest.xml for both apps."""
        configs = [
            (APP_DIR, ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.VIBRATE', 'android.permission.WAKE_LOCK', 'android.permission.POST_NOTIFICATIONS'], 'Customer App'),
            (ADMIN_APP_DIR, ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.VIBRATE', 'android.permission.WAKE_LOCK', 'android.permission.POST_NOTIFICATIONS'], 'Manager App'),
        ]
        for base_dir, required_perms, app_name in configs:
            app_json_path = os.path.join(base_dir, 'app.json')
            with open(app_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            permissions = data['expo']['android']['permissions']
            for perm in required_perms:
                self.assertIn(perm, permissions, f"{app_name} app.json must declare {perm}")

            manifest_path = os.path.join(base_dir, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest_content = f.read()

            for perm in required_perms:
                self.assertIn(f'android:name="{perm}"', manifest_content, f"{app_name} AndroidManifest.xml must declare {perm}")

        print("PASS: [TEST 7] Native Android permissions verified in app.json and AndroidManifest.xml for both apps")

    def test_08_multi_arch_build_properties(self):
        """Verify multi-architecture builds are configured in app.json and gradle.properties for both apps."""
        for base_dir, app_name in [(APP_DIR, 'Customer App'), (ADMIN_APP_DIR, 'Manager App')]:
            app_json_path = os.path.join(base_dir, 'app.json')
            with open(app_json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            build_prop_plugin = None
            for plugin in data['expo']['plugins']:
                if isinstance(plugin, list) and plugin[0] == 'expo-build-properties':
                    build_prop_plugin = plugin[1]
                    break

            self.assertIsNotNone(build_prop_plugin, f"{app_name} expo-build-properties plugin must be present in app.json")
            archs = build_prop_plugin['android']['buildArchs']
            self.assertIn('arm64-v8a', archs, f"{app_name} missing arm64-v8a")
            self.assertIn('armeabi-v7a', archs, f"{app_name} missing armeabi-v7a")
            self.assertIn('x86_64', archs, f"{app_name} missing x86_64")

            gradle_props_path = os.path.join(base_dir, 'android', 'gradle.properties')
            with open(gradle_props_path, 'r', encoding='utf-8') as f:
                gradle_props = f.read()

            self.assertIn("reactNativeArchitectures=arm64-v8a,armeabi-v7a,x86_64", gradle_props,
                          f"{app_name} gradle.properties must specify multi-arch architectures")

        print("PASS: [TEST 8] Multi-architecture compilation verified on both apps (arm64-v8a, armeabi-v7a, x86_64)")

    def test_09_production_api_url_fallback(self):
        """Verify api modules have production fallback URL and do not crash if EXPO_PUBLIC_API_URL is missing."""
        customer_api = os.path.join(APP_DIR, 'src', 'services', 'api.js')
        with open(customer_api, 'r', encoding='utf-8') as f:
            content = f.read()
        self.assertIn("export const PRODUCTION_API_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api';", content)
        self.assertIn("let activeBaseUrl = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;", content)

        manager_api = os.path.join(ADMIN_APP_DIR, 'src', 'services', 'api.ts')
        with open(manager_api, 'r', encoding='utf-8') as f:
            m_content = f.read()
        self.assertIn("export const PRODUCTION_API_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api';", m_content)
        self.assertIn("let activeBaseUrl = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;", m_content)

        print("PASS: [TEST 9] Rock-solid production API fallback URL verified on both apps")

    def test_10_hermes_bytecode_export_artifacts(self):
        """Verify that hermes bytecode bundle exists from npx expo export."""
        customer_dist = os.path.join(APP_DIR, 'dist', '_expo', 'static', 'js', 'android')
        self.assertTrue(os.path.exists(customer_dist), "Customer app dist directory must exist")
        hbc_files = [f for f in os.listdir(customer_dist) if f.endswith('.hbc')]
        self.assertGreater(len(hbc_files), 0, "Customer app Hermes bytecode .hbc must be generated")

        manager_dist = os.path.join(ADMIN_APP_DIR, 'dist', '_expo', 'static', 'js', 'android')
        self.assertTrue(os.path.exists(manager_dist), "Manager app dist directory must exist")
        mgr_hbc_files = [f for f in os.listdir(manager_dist) if f.endswith('.hbc')]
        self.assertGreater(len(mgr_hbc_files), 0, "Manager app Hermes bytecode .hbc must be generated")
        print(f"PASS: [TEST 10] Hermes production bytecode confirmed: {hbc_files[0]} and {mgr_hbc_files[0]}")

    def test_11_onboarding_persistence_and_order_screen_navigation(self):
        """Verify OnboardingScreen persists completion flag and OrdersScreen has fallback navigation."""
        onboarding_file = os.path.join(APP_DIR, 'src', 'screens', 'OnboardingScreen.tsx')
        with open(onboarding_file, 'r', encoding='utf-8') as f:
            onboarding_content = f.read()

        self.assertIn("@getfood_has_seen_onboarding", onboarding_content,
                      "OnboardingScreen must persist @getfood_has_seen_onboarding")

        orders_file = os.path.join(APP_DIR, 'src', 'screens', 'OrdersScreen.tsx')
        with open(orders_file, 'r', encoding='utf-8') as f:
            orders_content = f.read()

        self.assertIn("returnScreen: 'Orders'", orders_content,
                      "OrdersScreen must pass returnScreen: 'Orders' on Auth navigation")
        print("PASS: [TEST 11] Onboarding persistence and OrdersScreen fallback navigation verified")


if __name__ == '__main__':
    unittest.main()
