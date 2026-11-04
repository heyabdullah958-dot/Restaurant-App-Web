/**
 * Media Asset Service for GetFood Mobile Application
 * Manages original food photography asset bindings and validates media sources across Dine At Blue, Jushh PK, Tandoori Stop, and GET A FOMO.
 * Enforces strict brand isolation to prevent cross-brand asset leakage.
 */

// 1. DINE AT BLUE ORIGINAL ASSETS (Seafood & Platters - 0 foreign assets)
export const BLUE_ORIGINAL_ASSETS: Record<string, string> = {
  'blue seafood platter': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'blue seafood platter (steamed)': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  '2 person platter': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
  'without lobster': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
  'with lobster': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  '2 person seafood & chicken platter': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
  'mix seafood grill': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'fish & chips': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'fish and chips': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'kunafa prawns (3 pcs)': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/kunafa_prawns.png',
  'kunafa prawns': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/kunafa_prawns.png',
  'dynamite prawns': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/dynamite_prawns.png',
  'seared dumplings (6 pcs)': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/seared_dumplings.png',
  'seared dumplings': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/seared_dumplings.png',
  'chicken dumplings (6 pcs)': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_dumplings.png',
  'chicken dumplings': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_dumplings.png',
  'dynamite chicken': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/dynamite_prawns.png',
  'honey wings (6 pcs)': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/honey_wings.png',
  'honey wings': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/honey_wings.png',
  '19b soup': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/soup_19b.png',
  'chicken corn soup': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_corn_soup.png',
  'bbq prawn salad': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/bbq_prawn_salad.png',
  'spicy soup': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/spicy_soup.png',
  'romesco fish': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'umami fish': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'pamphlet fish': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'fish chilli dry': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'vietnamese fish': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'thermidor lobster': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'grilled lobster': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'bbq prawns': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/bbq_prawn_salad.png',
  'prawn pasta': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/kunafa_prawns.png',
  'steamed crab': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'mud crab': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'grilled fish': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png',
  'chilli mint chicken': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
  'cashew nut chicken': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
  'korean fried chicken': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/honey_wings.png',
  'chicken chilli dry': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
  'sweet & sour chicken': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
  'house special chicken': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/chicken_platter_2person.png',
};

// 2. JUSHH PK ORIGINAL ASSETS (Turkish Shawarma, Wraps & Doner)
export const JUSHH_ORIGINAL_ASSETS: Record<string, string> = {
  'chicken doner fries': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_doner_fries.jpg',
  'beef doner fries': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/beef_doner_fries.jpg',
  'chicken grilled sandwich': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_grilled_sandwich.jpg',
  'beef grilled sandwich': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/beef_grilled_sandwich.jpg',
  'half dubai shawaya': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/half_dubai_shawaya.jpg',
  'full dubai shawaya': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/full_dubai_shawaya.jpg',
  'add-on rice': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/addon_rice.jpg',
  'chicken turkish wrap': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_turkish_wrap.jpg',
  'beef turkish wrap': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/beef_turkish_wrap.jpg',
  'chicken turkish doner': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_turkish_doner.jpg',
  'beef turkish doner': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/beef_turkish_doner.jpg',
  'chicken pouch shawarma': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_pouch_shawarma.jpg',
  'beef pouch shawarma': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/beef_pouch_shawarma.jpg',
  'chicken shawarma': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_turkish_wrap.jpg',
  'beef shawarma': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/beef_turkish_wrap.jpg',
  'charcoal shawarma chicken': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/charcoal_shawarma_chicken.jpg',
  'chicken shawarma platter': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_shawarma_platter.jpg',
  'chicken shawarma platter (with cheese)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/chicken_shawarma_platter.jpg',
  'lotus can dessert': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_logo.jpg',
  'red velvet can dessert': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_logo.jpg',
  'nutella can dessert': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_logo.jpg',
  'cheese add-on': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_logo.jpg',
  'cheese': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_logo.jpg',
  'dip': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/garlic_dip.jpg',
  'dip add-on': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/garlic_dip.jpg',
  'pita bread': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/pita_bread.jpg',
  'water': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/water_bottle.jpg',
  'soft drink': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/soft_drink.jpg',
  'blueberry mojito': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/blueberry_mojito.jpg',
  'strawberry mojito': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/strawberry_mojito.jpg',
  'green apple mojito': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/green_apple_mojito.jpg',
  'peach mojito': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/peach_mojito.jpg',
  'lemon mojito': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/lemon_mojito.jpg',
};

// 3. TANDOORI STOP ORIGINAL ASSETS (Desi BBQ, Sajji, Naans & Mojitos)
export const TANDOORI_ORIGINAL_ASSETS: Record<string, string> = {
  'tandoori chicken bone (cheese naan single)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1288_IMG_7585.JPG_xhiffo',
  'tandoori chicken boneless (cheese naan single)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1289_IMG_7585.JPG_cxjp6v',
  'tandoori chicken bone (cheese naan double)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1290_IMG_7589.JPG_ylld2e',
  'tandoori chicken boneless (cheese naan double)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1291_IMG_7589.JPG_of3jsh',
  'tandoori chicken bone (with rice)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1292_IMG_7586.JPG_vjhc9h',
  'tandoori chicken boneless (with rice)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1293_IMG_7586.JPG_jazoj8',
  'tandoori chicken bone (plain)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1294_IMG_7590.JPG_ree9bg',
  'tandoori chicken boneless (plain)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1295_IMG_7590.JPG_edtoye',
  'quarter sajji': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1296_IMG_7587.JPG_cbsi5z',
  'half sajji': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1297_IMG_7587.JPG_s9a0wa',
  'full sajji': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1298_IMG_7587.JPG_ozqr4i',
  'peri peri quarter sajji': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1299_IMG_7587.JPG_ia9lxc',
  'peri peri half sajji': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1300_IMG_7587.JPG_iyvbn9',
  'peri peri full sajji': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1301_IMG_7587.JPG_irp4qj',
  'chicken paratha roll': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1305_IMG_7588.JPG_h1xhsz',
  'full stop roll': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1302_IMG_7591.JPG_veizgo',
  'tandoori chicken roll': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1303_IMG_7591.JPG_kooigy',
  'malai boti roll': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1304_IMG_7592.JPG_fupdwk',
  'seekh kabab (per seekh)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1313_IMG_7578.JPG_cilvdf',
  'tikka boti (per seekh)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1311_IMG_7583.JPG_khkxj9',
  'malai boti (per seekh)': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1309_IMG_7584.JPG_sxoyyb',
  'roghni naan': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1327_IMG_7582.JPG_xohvv8',
  'butter naan': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1328_IMG_7582.JPG_ds5jeq',
  'plain roti': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1331_IMG_7582.JPG_f1ie9j',
  'cheese naan': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1329_IMG_7581.JPG_p8inf5',
  'puri paratha': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1334_IMG_7580.JPG_cr8hod',
  'rice': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1330_IMG_7579.JPG_nsb0dw',
  'apple mojito': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1338_IMG_7576.JPG_b0buvx',
  'mint margaritas': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/ts_1346_IMG_7577.JPG_faehdg',
};

// 4. GET A FOMO ORIGINAL ASSETS (Specialty Cafe & Bakery)
export const FOMO_ORIGINAL_ASSETS: Record<string, string> = {};

// Combined Dictionary for legacy lookups
export const BRAND_ORIGINAL_ASSETS: Record<string, string> = {
  ...JUSHH_ORIGINAL_ASSETS,
  ...TANDOORI_ORIGINAL_ASSETS,
  ...BLUE_ORIGINAL_ASSETS,
};

/**
 * Validates if an image path/url represents a real original food photo asset.
 * Rejects null, empty strings, and generic Unsplash stock photo URLs.
 */
export const isValidOriginalImage = (path?: string | null): boolean => {
  if (!path) return false;
  if (typeof path !== 'string') return false;
  const clean = path.trim();
  if (clean === '') return false;
  if (clean.includes('unsplash.com')) return false;
  return true;
};

/**
 * Checks whether an image URL is appropriate for the active brand.
 * Strictly prevents cross-brand leakage (e.g. Jushh PK drink cans in Blue menu).
 */
export const isImageAppropriateForBrand = (url: string, brandKey?: string | number): boolean => {
  if (!url) return false;
  if (!brandKey) return true;
  const key = String(brandKey).toLowerCase().replace(/\s+/g, '');
  const cleanUrl = url.toLowerCase();

  // If viewing Dine At Blue
  if (key.includes('blue') || key === '2') {
    if (cleanUrl.includes('jushh') || cleanUrl.includes('tandoori') || cleanUrl.includes('fomo') || cleanUrl.includes('seenbanao')) {
      return false;
    }
    // Strictly reject Jushh PK branded drink cans, bottled water & fries
    if (
      cleanUrl.includes('green_apple_mojito') ||
      cleanUrl.includes('blueberry_mojito') ||
      cleanUrl.includes('strawberry_mojito') ||
      cleanUrl.includes('peach_mojito') ||
      cleanUrl.includes('lemon_mojito') ||
      cleanUrl.includes('soft_drink') ||
      cleanUrl.includes('water_bottle') ||
      cleanUrl.includes('chicken_doner_fries')
    ) {
      return false;
    }
    return true;
  }

  // If viewing Jushh PK
  if (key.includes('jush') || key === '3') {
    if (cleanUrl.includes('dineatblue') || cleanUrl.includes('tandooristop') || cleanUrl.includes('ts_') || cleanUrl.includes('getafomo')) {
      return false;
    }
    return true;
  }

  // If viewing Tandoori Stop
  if (key.includes('tandoori') || key === '4') {
    if (cleanUrl.includes('dineatblue') || cleanUrl.includes('jushh') || cleanUrl.includes('getafomo')) {
      return false;
    }
    return true;
  }

  // If viewing Get A Fomo
  if (key.includes('fomo') || key === '7') {
    if (cleanUrl.includes('dineatblue') || cleanUrl.includes('jushh') || cleanUrl.includes('tandoori') || cleanUrl.includes('ts_')) {
      return false;
    }
    return true;
  }

  return true;
};

/**
 * Resolves the valid original food photo URL for a menu item with strict brand scoping.
 * Cross-references item.image_url, item.image, and brand-specific asset dictionaries.
 * Returns null if no original photo exists or if the photo belongs to another brand.
 */
export const resolveItemImage = (item?: any, restaurantIdOrSlug?: string | number): string | null => {
  if (!item) return null;

  const brandKey = restaurantIdOrSlug || item?.restaurant_slug || item?.restaurant_id || item?.restaurant;
  const rawUrl = item.image_url || item.image;

  if (isValidOriginalImage(rawUrl)) {
    if (!brandKey || isImageAppropriateForBrand(rawUrl, brandKey)) {
      return rawUrl;
    }
  }

  // Brand-scoped lookup
  if (item.name && typeof item.name === 'string') {
    const itemName = item.name.toLowerCase().trim();
    const key = brandKey ? String(brandKey).toLowerCase().replace(/\s+/g, '') : '';

    if (key.includes('blue') || key === '2') {
      return BLUE_ORIGINAL_ASSETS[itemName] || null;
    }
    if (key.includes('jush') || key === '3') {
      return JUSHH_ORIGINAL_ASSETS[itemName] || null;
    }
    if (key.includes('tandoori') || key === '4') {
      return TANDOORI_ORIGINAL_ASSETS[itemName] || null;
    }
    if (key.includes('fomo') || key === '7') {
      return FOMO_ORIGINAL_ASSETS[itemName] || null;
    }

    return BRAND_ORIGINAL_ASSETS[itemName] || null;
  }

  return null;
};

export const BRAND_LOGOS: Record<string, string> = {
  '1': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/seenbanao_logo.png',
  '2': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/logo.png',
  '3': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/jushhpk/logo.jpg',
  '4': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/tandooristop/logo.png',
  '5': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/sandmelts_logo.png',
  '6': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/birdman_logo.png',
  '7': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/getafomo/logo.png',
  'seenbanao': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/seenbanao_logo.png',
  'dineatblue': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/logo.png',
  'blue': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/logo.png',
  'jushhpk': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/jushhpk/logo.jpg',
  'jushh': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/jushhpk/logo.jpg',
  'tandooristoppk': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/tandooristop/logo.png',
  'tandooristop': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/tandooristop/logo.png',
  'sandmelts': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/sandmelts_logo.png',
  'birdmanfoodspk': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/birdman_logo.png',
  'getafomo': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/getafomo/logo.png'
};

export const getBrandLogo = (restaurantIdOrSlug?: string | number): string => {
  if (!restaurantIdOrSlug) return BRAND_LOGOS['jushhpk'];
  const key = String(restaurantIdOrSlug).toLowerCase().trim();
  return BRAND_LOGOS[key] || BRAND_LOGOS['jushhpk'];
};

export const resolveItemImageWithLogoFallback = (item?: any, restaurantIdOrSlug?: string | number): { uri: string; isLogoFallback: boolean } => {
  const photo = resolveItemImage(item, restaurantIdOrSlug);
  if (photo) {
    return { uri: photo, isLogoFallback: false };
  }
  const brandKey = restaurantIdOrSlug || item?.restaurant_slug || item?.restaurant_id || item?.restaurant || 'dineatblue';
  return { uri: getBrandLogo(brandKey), isLogoFallback: true };
};

export const BRAND_COVERS: Record<string, string> = {
  '1': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
  '2': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  '3': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_banner_collage.jpg',
  '4': 'https://res.cloudinary.com/qodsfm34/image/upload/v1/restaurants/covers/tandoori_stop_cover_jnfd2d',
  '5': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
  '6': 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&auto=format&fit=crop&q=80',
  '7': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/getafomo/cover.png',
  'seenbanao': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
  'dineatblue': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'blue': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
  'jushhpk': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_banner_collage.jpg',
  'jushh': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_banner_collage.jpg',
  'tandooristoppk': 'https://res.cloudinary.com/qodsfm34/image/upload/v1/restaurants/covers/tandoori_stop_cover_jnfd2d',
  'tandooristop': 'https://res.cloudinary.com/qodsfm34/image/upload/v1/restaurants/covers/tandoori_stop_cover_jnfd2d',
  'sandmelts': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
  'birdmanfoodspk': 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&auto=format&fit=crop&q=80',
  'getafomo': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/getafomo/cover.png',
};

export const getBrandCover = (restaurantIdOrSlug?: string | number): string => {
  if (!restaurantIdOrSlug) return BRAND_COVERS['getafomo'];
  const key = String(restaurantIdOrSlug).toLowerCase().trim();
  return BRAND_COVERS[key] || BRAND_COVERS['getafomo'];
};

export const resolveBrandCover = (brand?: any): string => {
  if (!brand) return BRAND_COVERS['getafomo'];
  const slug = (brand.slug || brand.name || '').toLowerCase().replace(/\s+/g, '');
  if (slug.includes('fomo') || brand.id === 7 || brand.id === '7') {
    return 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/getafomo/cover.png';
  }
  const raw = brand.banner_image || brand.cover_image;
  if (raw && typeof raw === 'string' && raw.trim() !== '' && !raw.includes('unsplash.com')) {
    return raw;
  }
  return BRAND_COVERS[slug] || BRAND_COVERS[String(brand.id)] || raw || '';
};

export const formatBrandDisplayName = (brand: any): string => {
  if (!brand) return 'Restaurant';
  const slug = (brand.slug || brand.name || '').toLowerCase().replace(/\s+/g, '');
  if (slug.includes('tandoori')) return 'Tandoori Stop';
  if (slug.includes('jush')) return 'Jushh PK';
  if (slug.includes('fomo')) return 'Get A Fomo';
  if (slug.includes('blue')) return 'Blue';
  return brand.name || 'Restaurant';
};
