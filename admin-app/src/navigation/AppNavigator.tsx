import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, StatusBar, Alert, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { logoutStaffThunk } from '../store/authSlice';

import { Ionicons } from '@expo/vector-icons';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { SuperDashboardScreen } from '../screens/placeholders/SuperDashboardScreen';
import { TenantManagementScreen } from '../screens/placeholders/TenantManagementScreen';
import { MenuManagementScreen } from '../screens/placeholders/MenuManagementScreen';
import { CustomerManagementScreen } from '../screens/placeholders/CustomerManagementScreen';
import { ManagerManagementScreen } from '../screens/placeholders/ManagerManagementScreen';
import { RiderManagementScreen } from '../screens/placeholders/RiderManagementScreen';
import { NotificationCenterScreen } from '../screens/placeholders/NotificationCenterScreen';
import { PromoManagementScreen } from '../screens/placeholders/PromoManagementScreen';
import { FlashDealManagementScreen } from '../screens/placeholders/FlashDealManagementScreen';
import { BranchDashboardScreen } from '../screens/placeholders/BranchDashboardScreen';
import { OrderManagementScreen } from '../screens/placeholders/OrderManagementScreen';

const AuthStack = createNativeStackNavigator();
const SuperMoreStack = createNativeStackNavigator();
const SuperTab = createBottomTabNavigator();
const BranchTab = createBottomTabNavigator();

// ─── Custom Vector Tab Bar Icon Component with Active Pill ───────────────────

interface TabBarIconProps {
  name: keyof typeof Ionicons.glyphMap;
  focusedName?: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  size?: number;
  activeBg?: string;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({
  name,
  focusedName,
  focused,
  color,
  size = 22,
  activeBg,
}) => {
  const iconName = focused ? (focusedName || name) : name;

  if (activeBg && focused) {
    return (
      <View style={[styles.tabIconPill, { backgroundColor: activeBg }]}>
        <Ionicons name={iconName} size={size} color={color} />
      </View>
    );
  }

  return (
    <View style={styles.tabIconWrapper}>
      <Ionicons name={iconName} size={size} color={color} />
    </View>
  );
};

// ─── Super Admin "More" Screen ───────────────────────────────────────────────

const SuperAdminMoreMain = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const moreItems = [
    { title: 'Tenant Registry', route: 'TenantManagement', description: 'Manage restaurant brands, branches & menus', icon: '🏢', accentBg: 'rgba(6, 182, 212, 0.15)', accentColor: '#06B6D4' },
    { title: 'Customer CRM', route: 'CustomerManagement', description: 'User accounts, loyalty points & order history', icon: '👥', accentBg: 'rgba(139, 92, 246, 0.15)', accentColor: '#8B5CF6' },
    { title: 'Manager Accounts', route: 'ManagerManagement', description: 'Branch manager logins & password controls', icon: '🔐', accentBg: 'rgba(245, 158, 11, 0.15)', accentColor: '#F59E0B' },
    { title: 'Notifications', route: 'NotificationCenter', description: 'FCM push broadcasts & targeted alerts', icon: '🔔', accentBg: 'rgba(59, 130, 246, 0.15)', accentColor: '#3B82F6' },
    { title: 'Promo Codes', route: 'PromoManagement', description: 'Discount vouchers & usage limits', icon: '🎟️', accentBg: 'rgba(236, 72, 153, 0.15)', accentColor: '#EC4899' },
    { title: 'Flash Deals', route: 'FlashDealManagement', description: 'Time-limited promotional discounts', icon: '⚡', accentBg: 'rgba(239, 68, 68, 0.15)', accentColor: '#EF4444' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Super Admin HQ Command Center?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch(logoutStaffThunk()),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.moreContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />
      <ScrollView contentContainerStyle={styles.moreContent}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{user?.username || 'Super Admin'}</Text>
          <Text style={styles.userRole}>Super Admin HQ Access</Text>
        </View>

        <Text style={styles.sectionTitle}>Additional Views</Text>
        {moreItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.moreCard}
            onPress={() => navigation.navigate(item.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconBox, { backgroundColor: item.accentBg }]}>
              <Text style={styles.cardIcon}>{item.icon}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
            </View>
            <Text style={styles.cardArrow}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>🚪 Sign Out of HQ</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const SuperAdminMoreStackNavigator = () => (
  <SuperMoreStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.superAdmin.bg },
      headerTintColor: COLORS.superAdmin.text,
      headerTitleStyle: { fontWeight: 'bold' },
    }}
  >
    <SuperMoreStack.Screen
      name="SuperMoreMain"
      component={SuperAdminMoreMain}
      options={{ title: 'HQ Settings & Tools' }}
    />
    <SuperMoreStack.Screen
      name="TenantManagement"
      component={TenantManagementScreen}
      options={{ title: 'Tenant Registry' }}
    />
    <SuperMoreStack.Screen
      name="CustomerManagement"
      component={CustomerManagementScreen}
      options={{ title: 'Customers' }}
    />
    <SuperMoreStack.Screen
      name="ManagerManagement"
      component={ManagerManagementScreen}
      options={{ title: 'Manager Accounts' }}
    />
    <SuperMoreStack.Screen
      name="NotificationCenter"
      component={NotificationCenterScreen}
      options={{ title: 'Notifications' }}
    />
    <SuperMoreStack.Screen
      name="PromoManagement"
      component={PromoManagementScreen}
      options={{ title: 'Promo Codes' }}
    />
    <SuperMoreStack.Screen
      name="FlashDealManagement"
      component={FlashDealManagementScreen}
      options={{ title: 'Flash Deals' }}
    />
  </SuperMoreStack.Navigator>
);

// ─── Super Admin Tab Navigator (9 views total via 4 tabs) ───────────────────

const SuperAdminTabNavigator = () => (
  <SuperTab.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.superAdmin.bg },
      headerTintColor: COLORS.superAdmin.text,
      tabBarStyle: {
        backgroundColor: COLORS.superAdmin.card,
        borderTopColor: COLORS.superAdmin.border,
        height: 60,
        paddingBottom: 8,
      },
      tabBarActiveTintColor: COLORS.superAdmin.accent,
      tabBarInactiveTintColor: COLORS.superAdmin.muted,
    }}
  >
    <SuperTab.Screen
      name="SuperDashboard"
      component={SuperDashboardScreen}
      options={{
        title: 'HQ Home',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="stats-chart-outline"
            focusedName="stats-chart"
            focused={focused}
            color={color}
            activeBg={COLORS.superAdmin.tint}
          />
        ),
      }}
    />
    <SuperTab.Screen
      name="MenuManagement"
      component={MenuManagementScreen}
      options={{
        title: 'Menu',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="restaurant-outline"
            focusedName="restaurant"
            focused={focused}
            color={color}
            activeBg={COLORS.superAdmin.tint}
          />
        ),
      }}
    />
    <SuperTab.Screen
      name="RiderManagement"
      component={RiderManagementScreen}
      options={{
        title: 'Riders',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="bicycle-outline"
            focusedName="bicycle"
            focused={focused}
            color={color}
            activeBg={COLORS.superAdmin.tint}
          />
        ),
      }}
    />
    <SuperTab.Screen
      name="SuperMore"
      component={SuperAdminMoreStackNavigator}
      options={{
        headerShown: false,
        title: 'More (6)',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="grid-outline"
            focusedName="grid"
            focused={focused}
            color={color}
            activeBg={COLORS.superAdmin.tint}
          />
        ),
      }}
    />
  </SuperTab.Navigator>
);

// ─── Branch Manager Header Logout Component ─────────────────────────────────

const HeaderLogoutButton = () => {
  const dispatch = useAppDispatch();

  const handleLogoutPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your manager session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch(logoutStaffThunk()),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.headerLogout}
      onPress={handleLogoutPress}
      activeOpacity={0.7}
    >
      <Ionicons name="log-out-outline" size={15} color={COLORS.neutral700} style={{ marginRight: 4 }} />
      <Text style={styles.headerLogoutText}>Sign Out</Text>
    </TouchableOpacity>
  );
};

// ─── Branch Manager Tab Navigator (4 views) ─────────────────────────────────

const BranchManagerTabNavigator = () => (
  <BranchTab.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: COLORS.branchManager.card,
        borderBottomColor: COLORS.branchManager.border,
        borderBottomWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTitleStyle: {
        ...TYPOGRAPHY.h3,
        color: COLORS.branchManager.text,
      },
      headerTintColor: COLORS.branchManager.text,
      headerRight: () => <HeaderLogoutButton />,
      tabBarStyle: {
        backgroundColor: COLORS.branchManager.card,
        borderTopColor: COLORS.branchManager.border,
        borderTopWidth: 1,
        height: 64,
        paddingBottom: 8,
        paddingTop: 6,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
      tabBarActiveTintColor: COLORS.branchManager.primary,
      tabBarInactiveTintColor: COLORS.branchManager.muted,
    }}
  >
    <BranchTab.Screen
      name="BranchDashboard"
      component={BranchDashboardScreen}
      options={{
        title: 'Workspace',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="storefront-outline"
            focusedName="storefront"
            focused={focused}
            color={color}
            activeBg={COLORS.branchManager.tint}
          />
        ),
      }}
    />
    <BranchTab.Screen
      name="OrderManagement"
      component={OrderManagementScreen}
      options={{
        title: 'Orders',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="receipt-outline"
            focusedName="receipt"
            focused={focused}
            color={color}
            activeBg={COLORS.branchManager.tint}
          />
        ),
      }}
    />
    <BranchTab.Screen
      name="MenuManagement"
      component={MenuManagementScreen}
      options={{
        title: 'Stock',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="restaurant-outline"
            focusedName="restaurant"
            focused={focused}
            color={color}
            activeBg={COLORS.branchManager.tint}
          />
        ),
      }}
    />
    <BranchTab.Screen
      name="RiderManagement"
      component={RiderManagementScreen}
      options={{
        title: 'Riders',
        tabBarIcon: ({ focused, color }) => (
          <TabBarIcon
            name="bicycle-outline"
            focusedName="bicycle"
            focused={focused}
            color={color}
            activeBg={COLORS.branchManager.tint}
          />
        ),
      }}
    />
  </BranchTab.Navigator>
);

// ─── Root App Navigator ───────────────────────────────────────────────────────

export const AppNavigator = () => {
  const { isAuthenticated, role } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      ) : role === 'super_admin' ? (
        <SuperAdminTabNavigator />
      ) : (
        <BranchManagerTabNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  moreContainer: {
    flex: 1,
    backgroundColor: COLORS.superAdmin.bg,
  },
  moreContent: {
    padding: SPACING.lg,
  },
  userHeader: {
    backgroundColor: COLORS.superAdmin.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
  },
  userName: {
    color: COLORS.superAdmin.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    color: COLORS.superAdmin.accent,
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  moreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.superAdmin.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardIcon: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  cardArrow: {
    color: COLORS.superAdmin.muted,
    fontSize: 24,
    fontWeight: '300',
    marginLeft: SPACING.sm,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
  headerLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    backgroundColor: COLORS.neutral100,
    borderColor: COLORS.neutral200,
    borderWidth: 1,
    borderRadius: RADIUS.round,
  },
  headerLogoutIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  headerLogoutText: {
    color: COLORS.neutral700,
    fontSize: 12,
    fontWeight: '600',
  },
  tabIconWrapper: {
    width: 38,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconPill: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
