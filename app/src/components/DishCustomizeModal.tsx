import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import { getImageUrl } from '../services/fallbackData';
import { resolveItemImageWithLogoFallback } from '../services/mediaAssetService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DishOptionItem {
  name: string;
  price_modifier: number;
  description?: string;
  [key: string]: any;
}

export interface DishVariantItem {
  id: string | number;
  name: string;
  price: number;
  specifications?: Record<string, string>;
}

export interface DishCustomizeModalProps {
  visible: boolean;
  item: any | null;
  restaurantSlug?: string | number;
  onClose: () => void;
  onAddToCart: (customizedPayload: {
    item: any;
    quantity: number;
    selectedOptions: DishOptionItem[];
    selectedVariant?: DishVariantItem | null;
    specialNotes: string;
    unitPrice: number;
    totalPrice: number;
  }) => void;
}

export default function DishCustomizeModal({
  visible,
  item,
  restaurantSlug,
  onClose,
  onAddToCart,
}: DishCustomizeModalProps) {
  if (!item) return null;

  // Extract base item price (factoring active flash deal if present)
  const basePrice = useMemo(() => {
    if (item.active_flash_deal && item.active_flash_deal.discounted_price !== undefined) {
      return Number(item.active_flash_deal.discounted_price);
    }
    return Number(item.price || 0);
  }, [item]);

  // Extract available options / add-ons
  const availableOptions: DishOptionItem[] = useMemo(() => {
    if (!item.options) return [];
    if (Array.isArray(item.options)) {
      return item.options;
    }
    if (typeof item.options === 'object') {
      return item.options.addons || item.options.options || [];
    }
    return [];
  }, [item]);

  // Extract variants if present
  const availableVariants: DishVariantItem[] = useMemo(() => {
    if (item.options?.has_variants && Array.isArray(item.options.variants)) {
      return item.options.variants;
    }
    return [];
  }, [item]);

  // Component state
  const [selectedVariant, setSelectedVariant] = useState<DishVariantItem | null>(() => {
    return availableVariants.length > 0 ? availableVariants[0] : null;
  });
  const [selectedOptions, setSelectedOptions] = useState<DishOptionItem[]>([]);
  const [kitchenNotes, setKitchenNotes] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Reset state whenever modal opens with a new item
  useEffect(() => {
    if (visible && item) {
      setSelectedVariant(availableVariants.length > 0 ? availableVariants[0] : null);
      setSelectedOptions([]);
      setKitchenNotes('');
      setQuantity(1);
    }
  }, [visible, item, availableVariants]);

  // Toggle add-on checkbox
  const toggleOption = (opt: DishOptionItem) => {
    const isSelected = selectedOptions.some((o) => o.name === opt.name);
    if (isSelected) {
      setSelectedOptions((prev) => prev.filter((o) => o.name !== opt.name));
    } else {
      setSelectedOptions((prev) => [...prev, opt]);
    }
  };

  // Live Unit and Total Calculation
  const unitPrice = useMemo(() => {
    let p = basePrice;
    if (selectedVariant) {
      p = Number(selectedVariant.price);
      if (item.active_flash_deal && item.active_flash_deal.discounted_price !== undefined) {
        const disc = Math.max(0, Number(item.price) - Number(item.active_flash_deal.discounted_price));
        p = Math.max(0, p - disc);
      }
    }
    const modifiersSum = selectedOptions.reduce(
      (acc, opt) => acc + Math.max(0, Number(opt.price_modifier || 0)),
      0
    );
    return p + modifiersSum;
  }, [basePrice, selectedVariant, selectedOptions, item]);

  const totalPrice = useMemo(() => {
    return unitPrice * quantity;
  }, [unitPrice, quantity]);

  const handleConfirm = () => {
    onAddToCart({
      item,
      quantity,
      selectedOptions,
      selectedVariant,
      specialNotes: kitchenNotes.trim(),
      unitPrice,
      totalPrice,
    });
    onClose();
  };

  const { uri, isLogoFallback } = resolveItemImageWithLogoFallback(item, restaurantSlug);
  const imageSource = getImageUrl(uri);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouch} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContainer}>
          {/* Header Dragger / Close Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Dish Summary Row */}
            <View style={styles.dishSummaryCard}>
              <View style={styles.dishTextWrap}>
                <Text style={styles.dishTitle}>{item.name}</Text>
                {item.categoryName ? (
                  <Text style={styles.dishCategory}>{item.categoryName}</Text>
                ) : null}
                <Text style={styles.dishDescription} numberOfLines={3}>
                  {item.description || 'Crafted fresh upon order with our finest ingredients.'}
                </Text>
                <View style={styles.dishBasePriceRow}>
                  <Text style={styles.dishBasePrice}>Rs. {basePrice.toFixed(0)}</Text>
                  {item.active_flash_deal && (
                    <View style={styles.flashBadge}>
                      <Text style={styles.flashBadgeText}>
                        {item.active_flash_deal.badge || '⚡ FLASH DEAL'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {imageSource && (
                <View style={styles.dishImageWrap}>
                  <Image
                    source={imageSource}
                    style={[styles.dishImage, isLogoFallback && styles.dishImageFallback]}
                    resizeMode={isLogoFallback ? 'contain' : 'cover'}
                  />
                </View>
              )}
            </View>

            {/* Section 1: Variant Selection (If Available) */}
            {availableVariants.length > 0 && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Select Size / Variant</Text>
                  <Text style={styles.requiredTag}>Required</Text>
                </View>

                {availableVariants.map((v) => {
                  const isChecked = selectedVariant?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.optionRowCard, isChecked && styles.optionRowCardActive]}
                      onPress={() => setSelectedVariant(v)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.radioOuter}>
                        {isChecked && <View style={styles.radioInner} />}
                      </View>
                      <View style={styles.optionInfoCol}>
                        <Text style={[styles.optionTitle, isChecked && styles.optionTitleActive]}>
                          {v.name}
                        </Text>
                        {v.specifications && Object.keys(v.specifications).length > 0 && (
                          <Text style={styles.optionSubSpecs}>
                            {Object.entries(v.specifications)
                              .map(([k, val]) => `${k.replace('_', ' ')}: ${val}`)
                              .join(' · ')}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.optionPrice, isChecked && styles.optionPriceActive]}>
                        Rs. {Number(v.price).toFixed(0)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Section 2: Add-On Modifiers (Multi-Select) */}
            {availableOptions.length > 0 && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Customize Add-Ons</Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Elevate your dish with gourmet toppings, extra patties & sauces:
                </Text>

                {availableOptions.map((opt, idx) => {
                  const isChecked = selectedOptions.some((o) => o.name === opt.name);
                  const modVal = Number(opt.price_modifier || 0);
                  return (
                    <TouchableOpacity
                      key={opt.name || idx}
                      style={[styles.optionRowCard, isChecked && styles.optionRowCardActive]}
                      onPress={() => toggleOption(opt)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkboxOuter, isChecked && styles.checkboxOuterActive]}>
                        {isChecked && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}
                      </View>
                      <View style={styles.optionInfoCol}>
                        <Text style={[styles.optionTitle, isChecked && styles.optionTitleActive]}>
                          {opt.name}
                        </Text>
                        {opt.description ? (
                          <Text style={styles.optionSubSpecs}>{opt.description}</Text>
                        ) : null}
                      </View>
                      <Text style={[styles.optionPrice, isChecked && styles.optionPriceActive]}>
                        {modVal > 0 ? `+Rs. ${modVal.toFixed(0)}` : 'FREE'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Section 3: Special Kitchen Notes */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Special Kitchen Notes</Text>
                <Text style={styles.charCounter}>{kitchenNotes.length}/160</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Leave specific chef instructions (e.g. Less spicy, no onions, extra cutlery)
              </Text>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g. Extra spicy, dressing on the side, well done..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                maxLength={160}
                value={kitchenNotes}
                onChangeText={setKitchenNotes}
              />
            </View>
          </ScrollView>

          {/* Sticky Bottom Footer: Quantity Stepper & Add Button */}
          <View style={styles.sheetFooter}>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepperBtn, quantity <= 1 && styles.stepperBtnDisabled]}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="remove"
                  size={16}
                  color={quantity <= 1 ? '#CBD5E1' : COLORS.dark}
                />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setQuantity((q) => Math.min(99, q + 1))}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={handleConfirm}
              activeOpacity={0.88}
            >
              <Text style={styles.addToCartBtnText}>
                Add to Basket · Rs. {totalPrice.toFixed(0)}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    maxHeight: SCREEN_HEIGHT * 0.88,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    position: 'relative',
  },
  dragPill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  closeBtn: {
    position: 'absolute',
    right: 18,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    maxHeight: SCREEN_HEIGHT * 0.68,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  dishSummaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dishTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  dishTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  dishCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  dishDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 6,
  },
  dishBasePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  dishBasePrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  flashBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    borderColor: '#E11D48',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flashBadgeText: {
    color: '#E11D48',
    fontSize: 10,
    fontWeight: '800',
  },
  dishImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  dishImage: {
    width: '100%',
    height: '100%',
  },
  dishImageFallback: {
    resizeMode: 'contain',
    padding: 4,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  requiredTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  charCounter: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  optionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  optionRowCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF7ED',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxOuterActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionInfoCol: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  optionTitleActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  optionSubSpecs: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  optionPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  optionPriceActive: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 64,
  },
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    height: 48,
  },
  stepperBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  stepperBtnDisabled: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  stepperValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  addToCartBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    ...SHADOWS.medium,
  },
  addToCartBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
