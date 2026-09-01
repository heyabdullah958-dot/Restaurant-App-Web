import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, SPACING } from '../theme';

type LegalTab = 'privacy' | 'terms';

export default function LegalScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  
  // Resolve initial tab based on route params
  const initialTitle = route.params?.title || '';
  const initialUri = route.params?.uri || '';
  const isTermsInitial =
    initialTitle.toLowerCase().includes('terms') ||
    initialUri.toLowerCase().includes('terms');

  const [activeTab, setActiveTab] = useState<LegalTab>(isTermsInitial ? 'terms' : 'privacy');

  useEffect(() => {
    if (isTermsInitial) {
      setActiveTab('terms');
    }
  }, [isTermsInitial]);

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
        </Text>
        <View style={styles.headerRightIcon}>
          <Ionicons
            name={activeTab === 'privacy' ? 'shield-checkmark-outline' : 'document-text-outline'}
            size={22}
            color={COLORS.primary}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>
              {activeTab === 'privacy' ? '🛡️ GETFOOD PLATFORM IDENTITY' : '📦 GETFOOD LEGAL TERMS'}
            </Text>
          </View>
          <Text style={styles.heroTitle}>
            {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.gray} />
              <Text style={styles.metaText}>
                Effective: <Text style={styles.metaBold}>July 26, 2026</Text>
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={14} color={COLORS.gray} />
              <Text style={styles.metaText}>
                Version: <Text style={styles.metaBold}>1.0.0</Text>
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="phone-portrait-outline" size={14} color={COLORS.gray} />
              <Text style={styles.metaText}>
                Scope: <Text style={styles.metaBold}>Mobile App & Web</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Segmented Tab Bar Switcher */}
        <View style={styles.tabBarContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'privacy' && styles.tabButtonActive]}
            onPress={() => setActiveTab('privacy')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'privacy' ? 'shield-checkmark' : 'shield-outline'}
              size={16}
              color={activeTab === 'privacy' ? COLORS.primary : COLORS.gray}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabButtonText, activeTab === 'privacy' && styles.tabButtonTextActive]}
            >
              Privacy Policy
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'terms' && styles.tabButtonActive]}
            onPress={() => setActiveTab('terms')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'terms' ? 'document-text' : 'document-outline'}
              size={16}
              color={activeTab === 'terms' ? COLORS.primary : COLORS.gray}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[styles.tabButtonText, activeTab === 'terms' && styles.tabButtonTextActive]}
            >
              Terms of Service
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back Link CTA */}
        <TouchableOpacity
          style={styles.returnLink}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-undo-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.returnLinkText}>Return to GetFood Platform</Text>
        </TouchableOpacity>

        {/* Body Content */}
        {activeTab === 'privacy' ? (
          <PrivacyPolicyContent onEmailPress={handleEmailPress} />
        ) : (
          <TermsOfServiceContent onEmailPress={handleEmailPress} />
        )}

        {/* Clean Light Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogoRow}>
            <Text style={styles.footerLogoEmoji}>🍽️</Text>
            <Text style={styles.footerLogoText}>GetFood</Text>
          </View>
          <Text style={styles.footerCopyright}>
            © 2026 GetFood (FoodSphere Multi-Tenant Platform). All rights reserved.
          </Text>
          <Text style={styles.footerBrands}>
            Operating 7 Brands: Tandoori Stop · Jushh PK · GetAFomo · Seen Banao · Dine At Blue · SandMelts · Birdman Foods
          </Text>
          <Text style={styles.footerLocation}>
            Lahore, Punjab, Pakistan
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// -------------------------------------------------------------
// Privacy Policy Content Subcomponent
// -------------------------------------------------------------
function PrivacyPolicyContent({ onEmailPress }: { onEmailPress: (email: string) => void }) {
  return (
    <View style={styles.contentContainer}>
      {/* Clause 1 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>1</Text>
          </View>
          <Text style={styles.clauseTitle}>Overview & Platform Identity</Text>
        </View>
        <Text style={styles.paragraph}>
          Welcome to <Text style={styles.boldText}>GetFood</Text> (operating on the <Text style={styles.boldText}>FoodSphere</Text> multi-tenant aggregator architecture). GetFood serves as a unified digital ecosystem providing culinary discovery, order aggregation, and delivery logistics for seven specialized restaurant brands: <Text style={styles.italicText}>Jushh PK, Tandoori Stop, GetAFomo, Seen Banao, Dine At Blue, SandMelts, and Birdman Foods</Text>.
        </Text>
        <Text style={styles.paragraph}>
          This Privacy Policy outlines how GetFood ("we", "us", or "our") collects, processes, protects, and discloses personal data when you interact with our mobile application and affiliated brand web portals.
        </Text>
      </View>

      {/* Clause 2 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>2</Text>
          </View>
          <Text style={styles.clauseTitle}>Information We Collect</Text>
        </View>
        <Text style={styles.paragraph}>
          We collect information strictly necessary to fulfill food orders and enhance platform reliability:
        </Text>
        <View style={styles.bulletList}>
          <BulletItem bold="Account Information:" text=" Name, phone number, email address, and encrypted authentication tokens provided during registration or checkout." />
          <BulletItem bold="Delivery Coordinates:" text=" Street address, landmark instructions, and GPS coordinates for routing and Haversine distance verification." />
          <BulletItem bold="Order Transactions:" text=" Menu items, price modifiers, branch selections, order statuses, and loyalty point redemptions." />
          <BulletItem bold="Device & Telemetry:" text=" Device model, operating system, push notification tokens (FCM), and diagnostic crash logs." />
        </View>
      </View>

      {/* Clause 3 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>3</Text>
          </View>
          <Text style={styles.clauseTitle}>Geolocation & Live Order Tracking</Text>
        </View>
        <Text style={styles.paragraph}>
          Our platform requests foreground location permissions to determine the closest operational branch and compute precise delivery estimates.
        </Text>
        <View style={styles.calloutBox}>
          <View style={styles.calloutHeader}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.calloutTitle}>Live Delivery Tracking Security</Text>
          </View>
          <Text style={styles.calloutText}>
            Real-time delivery coordinates are accessed exclusively during active order fulfillment. Customer location data is never sold, broadcasted to third parties, or stored beyond order completion.
          </Text>
        </View>
      </View>

      {/* Clause 4 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>4</Text>
          </View>
          <Text style={styles.clauseTitle}>How We Use Your Information</Text>
        </View>
        <View style={styles.bulletList}>
          <BulletItem bold="Order Routing:" text=" Transmitting order items and cooking instructions to designated branch kitchen displays." />
          <BulletItem bold="Rider Dispatch:" text=" Relaying customer delivery address and contact phone number to assigned delivery riders." />
          <BulletItem bold="Loyalty Rewards:" text=" Calculating earn/redemption points and maintaining customer ledger records." />
          <BulletItem bold="Operational Notifications:" text=" Sending transactional SMS, WhatsApp dispatch receipts, and order progress notifications." />
        </View>
      </View>

      {/* Clause 5 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>5</Text>
          </View>
          <Text style={styles.clauseTitle}>Data Sharing & Multi-Tenant Isolation</Text>
        </View>
        <Text style={styles.paragraph}>
          We enforce strict data isolation between restaurant brands. Restaurant managers and kitchen personnel can only inspect order data relevant to their assigned branch.
        </Text>
        <Text style={styles.paragraph}>
          We do not sell, rent, or monetize personal customer records to external advertising brokers. Data is shared solely with certified cloud hosting infrastructure (Heroku, Cloudflare, AWS) under strict confidentiality agreements.
        </Text>
      </View>

      {/* Clause 6 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>6</Text>
          </View>
          <Text style={styles.clauseTitle}>Payment Security & COD Protocol</Text>
        </View>
        <Text style={styles.paragraph}>
          <Text style={styles.boldText}>Cash on Delivery (COD)</Text> is our primary fulfillment method. For digital payments, all credit/debit card transactions are processed through tokenized, PCI-DSS Level 1 compliant payment gateways (Stripe & PayFast). GetFood servers never store raw credit card numbers or CVV codes.
        </Text>
      </View>

      {/* Clause 7 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>7</Text>
          </View>
          <Text style={styles.clauseTitle}>Data Retention & Account Deletion</Text>
        </View>
        <Text style={styles.paragraph}>
          Customer profiles remain active until deletion is requested. Transaction audit logs are preserved for 3 years to comply with local commercial tax requirements.
        </Text>
        <View style={styles.calloutBox}>
          <View style={styles.calloutHeader}>
            <Ionicons name="trash-outline" size={16} color={COLORS.primary} />
            <Text style={styles.calloutTitle}>Account Deletion Protocol</Text>
          </View>
          <Text style={styles.calloutText}>
            You have the right to request permanent deletion of your account and personal records. Submit an email to <Text style={styles.linkText} onPress={() => onEmailPress('privacy@getfood.pk')}>privacy@getfood.pk</Text>. Deletion requests are completed within 7 business days.
          </Text>
        </View>
      </View>

      {/* Contact Card */}
      <View style={styles.contactCard}>
        <Text style={styles.contactCardTitle}>Legal & Privacy Operations Desk</Text>
        <Text style={styles.contactCardSubtitle}>FoodSphere Aggregator Services, Lahore, Pakistan</Text>
        <View style={styles.contactItem}>
          <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
          <Text style={styles.contactLink} onPress={() => onEmailPress('privacy@getfood.pk')}>
            privacy@getfood.pk
          </Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="help-buoy-outline" size={16} color={COLORS.primary} />
          <Text style={styles.contactLink} onPress={() => onEmailPress('support@getfood.pk')}>
            support@getfood.pk
          </Text>
        </View>
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// Terms of Service Content Subcomponent
// -------------------------------------------------------------
function TermsOfServiceContent({ onEmailPress }: { onEmailPress: (email: string) => void }) {
  return (
    <View style={styles.contentContainer}>
      {/* Clause 1 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>1</Text>
          </View>
          <Text style={styles.clauseTitle}>Acceptance of Terms</Text>
        </View>
        <Text style={styles.paragraph}>
          These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and <Text style={styles.boldText}>GetFood Platform</Text> (operating on the <Text style={styles.boldText}>FoodSphere</Text> multi-tenant architecture).
        </Text>
        <Text style={styles.paragraph}>
          By installing, registering, accessing, or placing orders via the GetFood mobile application or affiliated brand portals, you agree to be bound by these Terms and our Privacy Policy.
        </Text>
      </View>

      {/* Clause 2 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>2</Text>
          </View>
          <Text style={styles.clauseTitle}>Multi-Tenant Brand Aggregation</Text>
        </View>
        <Text style={styles.paragraph}>
          GetFood functions as a multi-brand food delivery aggregator connecting customers with 7 distinct culinary brands:
        </Text>
        <View style={styles.bulletList}>
          <BulletItem bold="Tandoori Stop:" text=" Desi tandoori BBQ, artisanal naan & handi specialties." />
          <BulletItem bold="Jushh PK:" text=" Gourmet smashed burgers, fried chicken & shakes." />
          <BulletItem bold="GetAFomo:" text=" Café beverages, specialty desserts & continental brunch." />
          <BulletItem bold="Seen Banao:" text=" Traditional BBQ & authentic karahi specialties." />
          <BulletItem bold="Dine At Blue:" text=" Premium seafood specialty dishes." />
          <BulletItem bold="SandMelts:" text=" Melts, grilled sandwiches & artisan beverages." />
          <BulletItem bold="Birdman Foods:" text=" Crispy fried & flame-grilled chicken." />
        </View>
      </View>

      {/* Clause 3 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>3</Text>
          </View>
          <Text style={styles.clauseTitle}>Order Placement & Guest Protocol</Text>
        </View>
        <Text style={styles.paragraph}>
          Users may browse menus and manage carts in Guest mode. However, order placement requires authentication (or guest-form registration) to bind delivery addresses and assign riders.
        </Text>
        <Text style={styles.paragraph}>
          All submitted orders undergo atomic server-side validation to verify real-time item availability, modifier prices, and delivery radius constraints.
        </Text>
      </View>

      {/* Clause 4 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>4</Text>
          </View>
          <Text style={styles.clauseTitle}>Delivery Radius & Haversine Limits</Text>
        </View>
        <Text style={styles.paragraph}>
          To maintain temperature and food quality standards, each branch enforces a strict maximum delivery radius.
        </Text>
        <View style={styles.calloutBox}>
          <View style={styles.calloutHeader}>
            <Ionicons name="navigate-circle" size={16} color={COLORS.primary} />
            <Text style={styles.calloutTitle}>Delivery Boundary Validation</Text>
          </View>
          <Text style={styles.calloutText}>
            Distances are computed using the mathematical Haversine algorithm between customer GPS coordinates and the branch physical address. Addresses outside the serviceable radius will be restricted from checkout.
          </Text>
        </View>
      </View>

      {/* Clause 5 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>5</Text>
          </View>
          <Text style={styles.clauseTitle}>Cash on Delivery & Payment Obligations</Text>
        </View>
        <Text style={styles.paragraph}>
          By placing a Cash on Delivery (COD) order, you obligate yourself to tender the exact invoice amount upon rider arrival.
        </Text>
        <Text style={styles.paragraph}>
          Fraudulent orders, repeated refusals of confirmed deliveries, or spoofed contact information will trigger immediate device ID suspension and legal blacklisting.
        </Text>
      </View>

      {/* Clause 6 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>6</Text>
          </View>
          <Text style={styles.clauseTitle}>Loyalty Program & Flash Deals Rules</Text>
        </View>
        <View style={styles.bulletList}>
          <BulletItem bold="Points Accrual:" text=" Points accrue automatically on completed orders based on dynamic platform rates." />
          <BulletItem bold="Non-Monetary:" text=" Loyalty points have no direct cash value outside the GetFood ecosystem and cannot be transferred." />
          <BulletItem bold="Cancellation Reversal:" text=" If an order is cancelled, redeemed loyalty points are restored to your balance automatically." />
          <BulletItem bold="Flash Deals:" text=" Flash Deals operate under strict countdown timers and per-user redemption caps." />
        </View>
      </View>

      {/* Clause 7 */}
      <View style={styles.clauseCard}>
        <View style={styles.clauseHeader}>
          <View style={styles.clauseNumberBadge}>
            <Text style={styles.clauseNumberText}>7</Text>
          </View>
          <Text style={styles.clauseTitle}>Governing Law & Jurisdiction</Text>
        </View>
        <Text style={styles.paragraph}>
          These Terms are governed by and construed in accordance with the laws of Pakistan. Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in Lahore, Pakistan.
        </Text>
      </View>

      {/* Contact Card */}
      <View style={styles.contactCard}>
        <Text style={styles.contactCardTitle}>GetFood Legal Operations Department</Text>
        <Text style={styles.contactCardSubtitle}>FoodSphere Platform Legal Team, Lahore, Pakistan</Text>
        <View style={styles.contactItem}>
          <Ionicons name="shield-outline" size={16} color={COLORS.primary} />
          <Text style={styles.contactLink} onPress={() => onEmailPress('legal@getfood.pk')}>
            legal@getfood.pk
          </Text>
        </View>
        <View style={styles.contactItem}>
          <Ionicons name="help-buoy-outline" size={16} color={COLORS.primary} />
          <Text style={styles.contactLink} onPress={() => onEmailPress('support@getfood.pk')}>
            support@getfood.pk
          </Text>
        </View>
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// Helper Bullet Item
// -------------------------------------------------------------
function BulletItem({ bold, text }: { bold: string; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>
        <Text style={styles.boldText}>{bold}</Text> {text}
      </Text>
    </View>
  );
}

// -------------------------------------------------------------
// Stylesheet with Warm Light Theme
// -------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerTitle: {
    ...FONTS.subtitle,
    fontSize: 17,
    fontWeight: '700',
    color: '#1F1A17',
  },
  headerRightIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Card
  heroCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: SPACING.md + 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECDD3',
    marginBottom: 10,
  },
  brandBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F1A17',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  metaBold: {
    fontWeight: '600',
    color: '#1F1A17',
  },

  // Tab Bar Switcher
  tabBarContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Return Link
  returnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginTop: 12,
    marginBottom: 6,
    paddingVertical: 4,
  },
  returnLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Content Area
  contentContainer: {
    paddingHorizontal: SPACING.md,
    marginTop: 6,
    gap: 12,
  },
  clauseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  clauseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  clauseNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  clauseNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  clauseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1A17',
    flex: 1,
  },
  paragraph: {
    fontSize: 13.5,
    lineHeight: 21,
    color: '#334155',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
    color: '#1F1A17',
  },
  italicText: {
    fontStyle: 'italic',
    color: '#475569',
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Bullet List
  bulletList: {
    marginTop: 4,
    marginBottom: 6,
    gap: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginTop: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#334155',
  },

  // Callout Box
  calloutBox: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  calloutText: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#7F1D1D',
  },

  // Contact Desk Card
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
    gap: 6,
  },
  contactCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1A17',
  },
  contactCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Clean Light Footer
  footer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    gap: 6,
  },
  footerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  footerLogoEmoji: {
    fontSize: 18,
  },
  footerLogoText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1A17',
    letterSpacing: -0.3,
  },
  footerCopyright: {
    fontSize: 11.5,
    color: '#64748B',
    textAlign: 'center',
  },
  footerBrands: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  footerLocation: {
    fontSize: 10.5,
    color: '#CBD5E1',
    fontWeight: '500',
    marginTop: 2,
  },
});
