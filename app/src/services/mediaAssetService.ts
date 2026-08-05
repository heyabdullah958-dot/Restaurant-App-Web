/**
 * Media Asset Service for GetFood Mobile Application
 * Manages original food photography asset bindings and validates media sources across JushhPK, TandooriStop, and GET A FOMO.
 */

export const BRAND_ORIGINAL_ASSETS: Record<string, string> = {
  // JushhPK Original Photos
  'chicken doner fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg',
  'beef doner fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg',
  'chicken grilled sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg',
  'beef grilled sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_grilled_sandwich.jpg',
  'half dubai shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg',
  'full dubai shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/full_dubai_shawaya.jpg',
  'add-on rice': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/addon_rice.jpg',
  'chicken turkish wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
  'beef turkish wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
  'chicken turkish doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_doner.jpg',
  'beef turkish doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_doner.jpg',
  'chicken pouch shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_pouch_shawarma.jpg',
  'beef pouch shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_pouch_shawarma.jpg',
  'chicken shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
  'beef shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
  'charcoal shawarma chicken': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/charcoal_shawarma_chicken.jpg',
  'chicken shawarma platter': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
  'chicken shawarma platter (with cheese)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
  'lotus can dessert': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  'red velvet can dessert': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  'nutella can dessert': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  'cheese add-on': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  'cheese': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  'dip': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/garlic_dip.jpg',
  'dip add-on': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/garlic_dip.jpg',
  'pita bread': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/pita_bread.jpg',
  'water': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/water_bottle.jpg',
  'soft drink': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/soft_drink.jpg',
  'blueberry mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/blueberry_mojito.jpg',
  'strawberry mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/strawberry_mojito.jpg',
  'green apple mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/green_apple_mojito.jpg',
  'peach mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/peach_mojito.jpg',
  'lemon mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/lemon_mojito.jpg',

  // TandooriStop Original Photos
  'tandoori chicken bone (cheese naan single)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1288_IMG_7585.JPG_xhiffo',
  'tandoori chicken boneless (cheese naan single)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1289_IMG_7585.JPG_cxjp6v',
  'tandoori chicken bone (cheese naan double)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1290_IMG_7589.JPG_ylld2e',
  'tandoori chicken boneless (cheese naan double)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1291_IMG_7589.JPG_of3jsh',
  'tandoori chicken bone (with rice)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1292_IMG_7586.JPG_vjhc9h',
  'tandoori chicken boneless (with rice)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1293_IMG_7586.JPG_jazoj8',
  'tandoori chicken bone (plain)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1294_IMG_7590.JPG_ree9bg',
  'tandoori chicken boneless (plain)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1295_IMG_7590.JPG_edtoye',
  'quarter sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1296_IMG_7587.JPG_cbsi5z',
  'half sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1297_IMG_7587.JPG_s9a0wa',
  'full sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1298_IMG_7587.JPG_ozqr4i',
  'peri peri quarter sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1299_IMG_7587.JPG_ia9lxc',
  'peri peri half sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1300_IMG_7587.JPG_iyvbn9',
  'peri peri full sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1301_IMG_7587.JPG_irp4qj',
  'chicken paratha roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1305_IMG_7588.JPG_h1xhsz',
  'full stop roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1302_IMG_7591.JPG_veizgo',
  'tandoori chicken roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1303_IMG_7591.JPG_kooigy',
  'malai boti roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1304_IMG_7592.JPG_fupdwk',
  'seekh kabab (per seekh)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1313_IMG_7578.JPG_cilvdf',
  'tikka boti (per seekh)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1311_IMG_7583.JPG_khkxj9',
  'malai boti (per seekh)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1309_IMG_7584.JPG_sxoyyb',
  'roghni naan': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1327_IMG_7582.JPG_xohvv8',
  'butter naan': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1328_IMG_7582.JPG_ds5jeq',
  'plain roti': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1331_IMG_7582.JPG_f1ie9j',
  'cheese naan': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1329_IMG_7581.JPG_p8inf5',
  'puri paratha': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1334_IMG_7580.JPG_cr8hod',
  'rice': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1330_IMG_7579.JPG_nsb0dw',
  'apple mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1338_IMG_7576.JPG_b0buvx',
  'mint margaritas': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1346_IMG_7577.JPG_faehdg',
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
 * Resolves the valid original food photo URL for a menu item.
 * Cross-references item.image_url, item.image, and BRAND_ORIGINAL_ASSETS dictionary.
 * Returns null if no original photo exists.
 */
export const resolveItemImage = (item?: any): string | null => {
  if (!item) return null;

  const rawUrl = item.image_url || item.image;
  if (isValidOriginalImage(rawUrl)) {
    return rawUrl;
  }

  // Cross-reference against item name in BRAND_ORIGINAL_ASSETS
  if (item.name && typeof item.name === 'string') {
    const key = item.name.toLowerCase().trim();
    if (BRAND_ORIGINAL_ASSETS[key]) {
      return BRAND_ORIGINAL_ASSETS[key];
    }
  }

  return null;
};

export const BRAND_LOGOS: Record<string, string> = {
  '1': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/seenbanao_logo.png',
  '2': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/dineatblue_logo.png',
  '3': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  '4': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/tandoori_stop_logo.png',
  '5': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/sandmelts_logo.png',
  '6': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/birdman_logo.png',
  '7': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/getafomo_logo.jpg',
  'seenbanao': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/seenbanao_logo.png',
  'dineatblue': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/dineatblue_logo.png',
  'jushhpk': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  'jushh': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg',
  'tandooristoppk': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/tandoori_stop_logo.png',
  'tandooristop': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/tandoori_stop_logo.png',
  'sandmelts': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/sandmelts_logo.png',
  'birdmanfoodspk': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/birdman_logo.png',
  'getafomo': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/getafomo_logo.jpg'
};

export const getBrandLogo = (restaurantIdOrSlug?: string | number): string => {
  if (!restaurantIdOrSlug) return BRAND_LOGOS['jushhpk'];
  const key = String(restaurantIdOrSlug).toLowerCase().trim();
  return BRAND_LOGOS[key] || BRAND_LOGOS['jushhpk'];
};

export const resolveItemImageWithLogoFallback = (item?: any, restaurantIdOrSlug?: string | number): { uri: string; isLogoFallback: boolean } => {
  const photo = resolveItemImage(item);
  if (photo) {
    return { uri: photo, isLogoFallback: false };
  }
  const brandKey = restaurantIdOrSlug || item?.restaurant_id || item?.restaurant;
  return { uri: getBrandLogo(brandKey), isLogoFallback: true };
};

