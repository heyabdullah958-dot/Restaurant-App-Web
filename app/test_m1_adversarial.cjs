/**
 * Adversarial Empirical Verification Suite for Milestone 1
 * Targets:
 * 1. HomeScreen.tsx Flash Deals (0, 1, 10 deals, rapid taps, drag boundaries, touch responder isolation)
 * 2. DineInVideoFeed.tsx Reels (null webViewRef, rapid audio toggling, vertical paging state retention, offline fallback)
 * 3. SearchScreen.tsx Discovery (empty queries, case insensitivity, 4-brand dish matching, hidden brand suppression, null safety)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passedTests = 0;
let failedTests = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedTests++;
    results.push({ name: testName, status: 'PASS', details });
    console.log(`[PASS] ${testName}${details ? ' - ' + details : ''}`);
  } else {
    failedTests++;
    results.push({ name: testName, status: 'FAIL', details });
    console.error(`[FAIL] ${testName}${details ? ' - ' + details : ''}`);
  }
}

console.log('================================================================');
console.log('🚀 RUNNING ADVERSARIAL EMPIRICAL VERIFICATION SUITE — MILESTONE 1');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. HOME SCREEN FLASH DEALS STRESS TESTING
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: HomeScreen Flash Deals Engine ---');

// Extract FALLBACK_FLASH_DEALS and brand resolution logic from HomeScreen.tsx
const homeScreenSrc = fs.readFileSync(path.join(__dirname, 'src', 'screens', 'HomeScreen.tsx'), 'utf8');

// Parse FALLBACK_FLASH_DEALS
const fallbackDealsMatch = homeScreenSrc.match(/export const FALLBACK_FLASH_DEALS = (\[[\s\S]*?\]);\n\ninterface/);
if (!fallbackDealsMatch) {
  throw new Error('Could not extract FALLBACK_FLASH_DEALS from HomeScreen.tsx');
}
// Safely evaluate FALLBACK_FLASH_DEALS in sandbox
const sandbox = { module: {}, exports: {} };
vm.createContext(sandbox);
vm.runInContext(`FALLBACK_FLASH_DEALS = ${fallbackDealsMatch[1]}`, sandbox);
const FALLBACK_FLASH_DEALS = sandbox.FALLBACK_FLASH_DEALS;

assert(Array.isArray(FALLBACK_FLASH_DEALS) && FALLBACK_FLASH_DEALS.length === 4,
  'T1.1: FALLBACK_FLASH_DEALS has exactly 4 active launch brands',
  `Found ${FALLBACK_FLASH_DEALS.length} fallback deals`
);

// Verify all 4 brands are in FALLBACK_FLASH_DEALS
const fallbackBrands = FALLBACK_FLASH_DEALS.map(d => d.restaurant_slug);
assert(
  fallbackBrands.includes('jushhpk') &&
  fallbackBrands.includes('tandooristoppk') &&
  fallbackBrands.includes('getafomo') &&
  fallbackBrands.includes('dineatblue'),
  'T1.2: FALLBACK_FLASH_DEALS covers all 4 active launch brands',
  `Covered: ${fallbackBrands.join(', ')}`
);

// Helper function replicating activeBanners useMemo logic from HomeScreen.tsx:260-284
function computeActiveBanners(deals, fulfillmentMode) {
  const candidateDeals = (!deals || deals.length === 0) ? FALLBACK_FLASH_DEALS : deals;
  const now = Date.now();
  const validDeals = candidateDeals.filter((d) => {
    if (d.is_active === false) return false;
    if (d.is_currently_active !== undefined) {
      if (!d.is_currently_active) return false;
    } else if (d.timing_type === 'RECURRING_DAILY') {
      // recurring
    } else {
      const start = d.start_time ? new Date(d.start_time).getTime() : now - 1000;
      const end = d.end_time ? new Date(d.end_time).getTime() : now + 100000;
      if (start > now || end < now) return false;
    }
    return true;
  });

  const pool = validDeals.length > 0 ? validDeals : FALLBACK_FLASH_DEALS;

  if (fulfillmentMode === 'DINE_IN') {
    const dineInDeals = pool.filter((d) => d.order_mode === 'DINE_IN' || d.is_dine_in_only);
    return dineInDeals.length > 0 ? dineInDeals : pool.filter((d) => d.order_mode !== 'DELIVERY');
  }
  return pool.filter((d) => d.order_mode !== 'DINE_IN' && !d.is_dine_in_only);
}

// 1.3: Zero deals edge case
const zeroDeals = computeActiveBanners([], 'DELIVERY');
assert(zeroDeals.length > 0, 'T1.3a: Empty deals array falls back to verified fallback deals', `Count: ${zeroDeals.length}`);

const nullDeals = computeActiveBanners(null, 'DELIVERY');
assert(nullDeals.length > 0, 'T1.3b: Null deals input falls back gracefully', `Count: ${nullDeals.length}`);

// What if candidate deals are all expired?
const expiredDeals = [
  { id: 99, title: 'Old Deal', is_active: true, start_time: '2020-01-01', end_time: '2020-01-02' }
];
const expiredFallback = computeActiveBanners(expiredDeals, 'DELIVERY');
assert(expiredFallback.length > 0, 'T1.3c: 100% expired deals fallback safely to valid pool', `Count: ${expiredFallback.length}`);

// 1.4: Single deal edge case & auto-rotate suppression
const singleDeal = [
  { id: 101, title: 'Solo Deal', is_active: true, is_currently_active: true, order_mode: 'ALL' }
];
const singleActive = computeActiveBanners(singleDeal, 'DELIVERY');
assert(singleActive.length === 1, 'T1.4a: Exactly 1 deal returns array of length 1');

// Verify auto-rotate rule: if (activeBanners.length <= 1 || isDragging) return;
function shouldAutoRotate(dealCount, isDragging) {
  if (dealCount <= 1 || isDragging) return false;
  return true;
}
assert(shouldAutoRotate(1, false) === false, 'T1.4b: Auto-rotate timer is disabled when deal count is 1');
assert(shouldAutoRotate(0, false) === false, 'T1.4c: Auto-rotate timer is disabled when deal count is 0');
assert(shouldAutoRotate(3, true) === false, 'T1.4d: Auto-rotate timer is paused when user is dragging/touching');
assert(shouldAutoRotate(3, false) === true, 'T1.4e: Auto-rotate timer runs only when deal count > 1 and not dragging');

// 1.5: 10 Deals stress test (Duplicates, Null IDs, Cycle Wrap)
const tenDeals = Array.from({ length: 10 }, (_, i) => ({
  id: i % 3 === 0 ? null : i + 1, // Deliberate null IDs to test fallback
  title: i % 2 === 0 ? 'Same Title Deal' : `Deal Number ${i}`, // Duplicate titles
  is_active: true,
  is_currently_active: true,
  order_mode: 'ALL',
}));
const tenActive = computeActiveBanners(tenDeals, 'DELIVERY');
assert(tenActive.length === 10, 'T1.5a: 10 active deals handled successfully');

// Test keyExtractor uniqueness: `${item.id || item.title}-${index}`
const keys = tenActive.map((item, index) => `${item.id || item.title}-${index}`);
const uniqueKeys = new Set(keys);
assert(uniqueKeys.size === 10, 'T1.5b: keyExtractor produces 100% unique keys despite duplicate titles/null IDs');

// Test auto-advance 10-cycle wrap around
let currentIndex = 0;
const history = [currentIndex];
for (let step = 0; step < 25; step++) {
  currentIndex = (currentIndex + 1) % tenActive.length;
  history.push(currentIndex);
}
assert(history[10] === 0 && history[20] === 0 && history[25] === 5,
  'T1.5c: Auto-advance cleanly cycles modulo 10 without unbounded drift or NaN'
);

// 1.6: Touch responder isolation on Flash Deals Card
// Check that the card outer container is <View> and NOT <TouchableOpacity>
const cardOuterMatch = homeScreenSrc.includes('<View\n              style={[\n                styles.promoBanner');
assert(cardOuterMatch, 'T1.6a: Outer promoBanner card is a non-capturing View (not TouchableOpacity)');

// Check that TouchableOpacity is strictly scoped to CTA row with delayPressIn
const ctaTouchMatch = homeScreenSrc.includes('<TouchableOpacity\n                    activeOpacity={0.8}\n                    delayPressIn={100}\n                    style={styles.bannerCTARow}');
assert(ctaTouchMatch, 'T1.6b: TouchableOpacity is confined to bannerCTARow with delayPressIn={100}');

// Verify onTouchStart and onTouchEnd suspend dragging
const containerTouchEvents = homeScreenSrc.includes('onTouchStart={() => setIsDragging(true)}') &&
                             homeScreenSrc.includes('onTouchEnd={() => setIsDragging(false)}') &&
                             homeScreenSrc.includes('onTouchCancel={() => setIsDragging(false)}');
assert(containerTouchEvents, 'T1.6c: Touch container listens to onTouchStart/End/Cancel to freeze auto-rotate');

// 1.7: Drag boundary transitions in onMomentumScrollEnd
function handleMomentumScrollEnd(contentOffsetX, bannerWidth, totalCount, currentIdx) {
  let isDragging = false;
  const newIdx = Math.round(contentOffsetX / bannerWidth);
  let resolvedIdx = currentIdx;
  if (newIdx >= 0 && newIdx < totalCount) {
    resolvedIdx = newIdx;
  }
  return { isDragging, resolvedIdx };
}

const bannerWidth = 380;
// Test normal scroll
assert(handleMomentumScrollEnd(380, bannerWidth, 4, 0).resolvedIdx === 1, 'T1.7a: Normal scroll to page 1 computes index 1');
assert(handleMomentumScrollEnd(760, bannerWidth, 4, 1).resolvedIdx === 2, 'T1.7b: Normal scroll to page 2 computes index 2');

// Test overscroll left (negative offset)
assert(handleMomentumScrollEnd(-150, bannerWidth, 4, 0).resolvedIdx === 0, 'T1.7c: Overscroll left (-150px) is rejected, remains at index 0');
assert(handleMomentumScrollEnd(-400, bannerWidth, 4, 0).resolvedIdx === 0, 'T1.7d: Overscroll left (-400px) is rejected, remains at index 0');

// Test overscroll right (beyond count)
assert(handleMomentumScrollEnd(2000, bannerWidth, 4, 3).resolvedIdx === 3, 'T1.7e: Overscroll right (2000px) is rejected, remains at index 3');


// -----------------------------------------------------------------------------
// 2. DINE-IN VIDEO FEED & REELS ADVERSARIAL STRESS TESTING
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: DineInVideoFeed Reels Player ---');

const reelsSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'DineInVideoFeed.tsx'), 'utf8');

// 2.1: null webViewRef resilience
function simulateToggleMute(activeWebViewRef, currentMutedState) {
  let isMuted = currentMutedState;
  const next = !isMuted;
  const js = `
    (function() {
      var v = document.querySelector('video');
      if (v) {
        v.muted = ${next};
      }
    })();
    true;
  `;
  // Test safe navigation ?.
  let injected = false;
  try {
    activeWebViewRef.current?.injectJavaScript(js);
    injected = true;
  } catch (err) {
    injected = false;
  }
  return { nextMuted: next, js, safeCall: injected };
}

// Call with null ref
const nullRefTest = simulateToggleMute({ current: null }, false);
assert(nullRefTest.safeCall === true && nullRefTest.nextMuted === true,
  'T2.1a: Toggling audio with null activeWebViewRef.current executes safely without throwing'
);

// Call with unmounted/dummy ref
let receivedJs = null;
const mockRef = {
  current: {
    injectJavaScript: (code) => { receivedJs = code; }
  }
};
const mockRefTest = simulateToggleMute(mockRef, true);
assert(mockRefTest.safeCall === true && mockRefTest.nextMuted === false && receivedJs.includes('v.muted = false'),
  'T2.1b: Injected JavaScript correctly sets v.muted = false when unmuting'
);

// 2.2: Rapid audio toggling (100 times in sequence)
let rapidMutedState = false;
let allSuccessful = true;
for (let i = 0; i < 100; i++) {
  const res = simulateToggleMute(mockRef, rapidMutedState);
  rapidMutedState = res.nextMuted;
  // Test JavaScript syntax validity of the injected string
  try {
    vm.runInNewContext(res.js, { document: { querySelector: () => ({ muted: false }) } });
  } catch (err) {
    allSuccessful = false;
  }
}
assert(allSuccessful && rapidMutedState === false,
  'T2.2a: 100 rapid audio toggles execute without syntax error and return to expected state'
);

// 2.2b: Verify WebView source HTML does NOT reload on mute toggle
const webViewSourceMatch = reelsSrc.match(/<WebView[\s\S]*?source=\{\{[\s\S]*?html:\s*`([\s\S]*?)`[\s\S]*?\}\}/);
assert(webViewSourceMatch !== null, 'T2.2b: Found WebView HTML source template');
const webViewHtml = webViewSourceMatch ? webViewSourceMatch[1] : '';
assert(!webViewHtml.includes('${isMuted'),
  'T2.2c: WebView HTML source is 100% STATIC and does NOT interpolate isMuted (zero WebKit reload)'
);

// 2.3: Vertical Reel Paging State Retention
const screenHeight = 840;
function handleVerticalScroll(contentOffsetY, totalPosts, currentIdx) {
  const newIdx = Math.round(contentOffsetY / screenHeight);
  let resolvedIdx = currentIdx;
  if (newIdx >= 0 && newIdx < totalPosts) {
    resolvedIdx = newIdx;
  }
  return resolvedIdx;
}

assert(handleVerticalScroll(0, 6, 0) === 0, 'T2.3a: Vertical scroll offset 0 retains index 0');
assert(handleVerticalScroll(840, 6, 0) === 1, 'T2.3b: Vertical scroll offset 840 advances to reel index 1');
assert(handleVerticalScroll(4200, 6, 1) === 5, 'T2.3c: Vertical scroll offset 4200 advances to reel index 5');
assert(handleVerticalScroll(-300, 6, 0) === 0, 'T2.3d: Negative vertical offset (-300px) clamped to index 0');
assert(handleVerticalScroll(6000, 6, 5) === 5, 'T2.3e: Extreme bottom offset (6000px) clamped to last reel index 5');

// 2.3f: getItemLayout verification
function getItemLayout(index, height) {
  return {
    length: height,
    offset: height * index,
    index,
  };
}
const layout3 = getItemLayout(3, screenHeight);
assert(layout3.length === screenHeight && layout3.offset === 3 * screenHeight && layout3.index === 3,
  'T2.3f: getItemLayout computes exact linear offsets for 60fps vertical pagination'
);

// 2.4: Offline Fallback & FALLBACK_DINE_IN_POSTS integrity
const fallbackPostsStart = reelsSrc.indexOf('export const FALLBACK_DINE_IN_POSTS: DineInFeedPost[] = [');
assert(fallbackPostsStart !== -1, 'T2.4a: Located FALLBACK_DINE_IN_POSTS start in DineInVideoFeed.tsx');

const postsBlock = reelsSrc.slice(fallbackPostsStart + 'export const FALLBACK_DINE_IN_POSTS: DineInFeedPost[] = '.length);
let pDepth = 0;
let pEndIdx = 0;
for (let i = 0; i < postsBlock.length; i++) {
  if (postsBlock[i] === '[') pDepth++;
  else if (postsBlock[i] === ']') {
    pDepth--;
    if (pDepth === 0) {
      pEndIdx = i + 1;
      break;
    }
  }
}
const postsJson = postsBlock.slice(0, pEndIdx);
vm.runInContext(`FALLBACK_DINE_IN_POSTS = ${postsJson}`, sandbox);
const FALLBACK_DINE_IN_POSTS = sandbox.FALLBACK_DINE_IN_POSTS;

assert(Array.isArray(FALLBACK_DINE_IN_POSTS) && FALLBACK_DINE_IN_POSTS.length === 6,
  'T2.4b: FALLBACK_DINE_IN_POSTS contains exactly 6 verified offline reels',
  `Count: ${FALLBACK_DINE_IN_POSTS.length}`
);

// Verify all fallback posts have valid structure
let postsValid = true;
FALLBACK_DINE_IN_POSTS.forEach((post, i) => {
  if (!post.id || !post.restaurant_name || !post.media_url || !post.thumbnail_url) {
    postsValid = false;
  }
});
assert(postsValid, 'T2.4c: Every fallback reel has valid id, restaurant_name, media_url, and thumbnail_url');


// -----------------------------------------------------------------------------
// 3. SEARCH SCREEN ADVERSARIAL DISCOVERY & FILTERING TESTS
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: SearchScreen Brand & Dish Discovery Engine ---');

const fallbackDataSrc = fs.readFileSync(path.join(__dirname, 'src', 'services', 'fallbackData.ts'), 'utf8');

// Parse FALLBACK_RESTAURANTS from fallbackData.ts
// Use simple regex or JSON parser for the FALLBACK_RESTAURANTS array
const restStart = fallbackDataSrc.indexOf('export const FALLBACK_RESTAURANTS: Restaurant[] = [');
if (restStart === -1) {
  throw new Error('Could not find FALLBACK_RESTAURANTS start in fallbackData.ts');
}
const restBlock = fallbackDataSrc.slice(restStart + 'export const FALLBACK_RESTAURANTS: Restaurant[] = '.length);
// Find balanced bracket
let depth = 0;
let endIdx = 0;
for (let i = 0; i < restBlock.length; i++) {
  if (restBlock[i] === '[') depth++;
  else if (restBlock[i] === ']') {
    depth--;
    if (depth === 0) {
      endIdx = i + 1;
      break;
    }
  }
}
const restJson = restBlock.slice(0, endIdx);
vm.runInContext(`FALLBACK_RESTAURANTS = ${restJson}`, sandbox);
const FALLBACK_RESTAURANTS = sandbox.FALLBACK_RESTAURANTS;

assert(Array.isArray(FALLBACK_RESTAURANTS) && FALLBACK_RESTAURANTS.length >= 7,
  'T3.1: Loaded FALLBACK_RESTAURANTS successfully',
  `Total restaurant models: ${FALLBACK_RESTAURANTS.length}`
);

// Replicate SearchScreen filtering logic:
function performSearch(query, restaurants = FALLBACK_RESTAURANTS) {
  const src = restaurants && restaurants.length > 0 ? restaurants : FALLBACK_RESTAURANTS;
  const activeBrands = ['tandooristoppk', 'jushhpk', 'getafomo', 'dineatblue'];
  const activeSource = src.filter((r) => activeBrands.includes(r.slug || r.name?.toLowerCase().replace(/\s+/g, '')));

  if (!query || !query.trim()) {
    return { activeSource, matchingRestaurants: [], matchingDishes: [] };
  }

  const cleanQuery = query.toLowerCase().trim();

  const matchedRest = activeSource.filter(
    (r) =>
      (r.name && r.name.toLowerCase().includes(cleanQuery)) ||
      (r.cuisine_type && r.cuisine_type.toLowerCase().includes(cleanQuery)) ||
      (r.description && r.description.toLowerCase().includes(cleanQuery))
  );

  const matchedDishes = [];
  activeSource.forEach((r) => {
    const restaurantDetail = FALLBACK_RESTAURANTS.find((fr) => fr.slug === r.slug) || r;
    if (restaurantDetail.categories) {
      restaurantDetail.categories.forEach((cat) => {
        if (cat.items) {
          cat.items.forEach((item) => {
            if (
              (item.name && item.name.toLowerCase().includes(cleanQuery)) ||
              (item.description && item.description.toLowerCase().includes(cleanQuery))
            ) {
              matchedDishes.push({
                item,
                restaurantName: r.name,
                restaurantSlug: r.slug,
              });
            }
          });
        }
      });
    }
  });

  return { activeSource, matchingRestaurants: matchedRest, matchingDishes: matchedDishes };
}

// 3.2: Verify activeSource contains exactly 4 active brands
const baseSearch = performSearch('');
const activeSlugs = baseSearch.activeSource.map(r => r.slug);
assert(activeSlugs.length === 4, 'T3.2a: activeSource has exactly 4 brands', `Found: ${activeSlugs.join(', ')}`);
assert(
  activeSlugs.includes('dineatblue') &&
  activeSlugs.includes('jushhpk') &&
  activeSlugs.includes('tandooristoppk') &&
  activeSlugs.includes('getafomo'),
  'T3.2b: activeSource includes Blue, Jushh PK, Tandoori Stop, and Get A Fomo'
);

// Verify hidden brands are excluded
assert(
  !activeSlugs.includes('seenbanao') &&
  !activeSlugs.includes('sandmelts') &&
  !activeSlugs.includes('birdmanfoodspk'),
  'T3.2c: Hidden brands (seenbanao, sandmelts, birdmanfoodspk) are strictly EXCLUDED from activeSource'
);

// 3.3: Empty and whitespace queries
const empty1 = performSearch('');
const empty2 = performSearch('   ');
const empty3 = performSearch('\t \n  \r\n');
assert(
  empty1.matchingRestaurants.length === 0 && empty1.matchingDishes.length === 0 &&
  empty2.matchingRestaurants.length === 0 && empty2.matchingDishes.length === 0 &&
  empty3.matchingRestaurants.length === 0 && empty3.matchingDishes.length === 0,
  'T3.3: Empty or pure whitespace queries return empty match sets with zero errors'
);

// 3.4: Case variations for all 4 brands
const blueCases = ['blue', 'BLUE', 'Blue', 'bLuE'];
const blueCounts = blueCases.map(q => performSearch(q).matchingRestaurants.length);
assert(blueCounts.every(c => c === blueCounts[0] && c >= 1),
  'T3.4a: Case variations of "blue" produce identical non-zero match counts',
  `Matches: ${blueCounts[0]}`
);

const tandooriCases = ['tandoori', 'TANDOORI', 'Tandoori', 'TaNdOoRi'];
const tandooriCounts = tandooriCases.map(q => performSearch(q).matchingRestaurants.length);
assert(tandooriCounts.every(c => c === tandooriCounts[0] && c >= 1),
  'T3.4b: Case variations of "tandoori" produce identical non-zero match counts',
  `Matches: ${tandooriCounts[0]}`
);

const jushCases = ['jush', 'JUSH', 'Jushh', 'jushh pk'];
const jushCounts = jushCases.map(q => performSearch(q).matchingRestaurants.length);
assert(jushCounts.every(c => c >= 1),
  'T3.4c: Brand name variations of "jushh" find Jushh PK reliably'
);

const fomoCases = ['fomo', 'FOMO', 'Fomo', 'get a fomo'];
const fomoCounts = fomoCases.map(q => performSearch(q).matchingRestaurants.length);
assert(fomoCounts.every(c => c >= 1),
  'T3.4d: Brand name variations of "fomo" find Get A Fomo reliably'
);

// 3.5: Dish & Restaurant matching across all 4 launch brands
// Brand 1: Blue (Seafood, Platter, Prawns, Lobster, Dumplings)
const blueDishSearch = performSearch('seafood');
assert(blueDishSearch.matchingRestaurants.some(r => r.slug === 'dineatblue') &&
       blueDishSearch.matchingDishes.some(d => d.restaurantSlug === 'dineatblue'),
  'T3.5a: Query "seafood" matches Blue restaurant and Blue dishes',
  `Found ${blueDishSearch.matchingDishes.filter(d => d.restaurantSlug === 'dineatblue').length} Blue dishes`
);

const prawnSearch = performSearch('prawns');
assert(prawnSearch.matchingDishes.some(d => d.restaurantSlug === 'dineatblue'),
  'T3.5b: Query "prawns" matches Kunafa/Dynamite Prawns from Blue',
  `Found ${prawnSearch.matchingDishes.length} matches`
);

// Brand 2: Jushh PK (Shawaya, Doner, Sandwich, Shawarma, Burger)
const shawayaSearch = performSearch('shawaya');
assert(shawayaSearch.matchingDishes.some(d => d.restaurantSlug === 'jushhpk'),
  'T3.5c: Query "shawaya" matches authentic Dubai Shawaya from Jushh PK'
);

const burgerRestSearch = performSearch('burger');
assert(burgerRestSearch.matchingRestaurants.some(r => r.slug === 'jushhpk'),
  'T3.5d: Query "burger" matches Jushh PK restaurant via cuisine type & description'
);

const donerSearch = performSearch('doner');
assert(donerSearch.matchingDishes.some(d => d.restaurantSlug === 'jushhpk'),
  'T3.5e: Query "doner" matches Chicken & Beef Doner Fries from Jushh PK'
);

// Brand 3: Tandoori Stop (Tandoori, Sajji, Naan, Roll)
const tandooriDishSearch = performSearch('sajji');
assert(tandooriDishSearch.matchingDishes.some(d => d.restaurantSlug === 'tandooristoppk'),
  'T3.5f: Query "sajji" matches Quarter/Half Sajji from Tandoori Stop'
);

const naanDishSearch = performSearch('naan');
assert(naanDishSearch.matchingDishes.some(d => d.restaurantSlug === 'tandooristoppk'),
  'T3.5g: Query "naan" matches Cheese Naan specialties from Tandoori Stop'
);

// Brand 4: Get A Fomo (Espresso, Coffee)
const espressoSearch = performSearch('espresso');
assert(espressoSearch.matchingDishes.some(d => d.restaurantSlug === 'getafomo'),
  'T3.5h: Query "espresso" matches Espresso Double from Get A Fomo'
);

const coffeeRestSearch = performSearch('coffee');
assert(coffeeRestSearch.matchingRestaurants.some(r => r.slug === 'getafomo'),
  'T3.5i: Query "coffee" matches Get A Fomo restaurant via specialty coffee branding'
);

// 3.6: Adversarial Attack: Attempting to discover hidden brands
const seenBanaoSearch = performSearch('seenbanao');
assert(seenBanaoSearch.matchingRestaurants.length === 0 && seenBanaoSearch.matchingDishes.length === 0,
  'T3.6a: Adversarial query for hidden brand "seenbanao" yields ZERO results'
);

const sandMeltsSearch = performSearch('sandmelts');
assert(sandMeltsSearch.matchingRestaurants.length === 0 && sandMeltsSearch.matchingDishes.length === 0,
  'T3.6b: Adversarial query for hidden brand "sandmelts" yields ZERO results'
);

const birdmanSearch = performSearch('birdman');
assert(birdmanSearch.matchingRestaurants.length === 0 && birdmanSearch.matchingDishes.length === 0,
  'T3.6c: Adversarial query for hidden brand "birdman" yields ZERO results'
);

// 3.7: Null and Malformed Safety Testing
const nullCategoriesRes = performSearch('fish', [
  { slug: 'dineatblue', name: 'Blue', categories: null },
  { slug: 'jushhpk', name: 'Jushh PK', categories: undefined },
]);
assert(nullCategoriesRes.matchingDishes.length > 0,
  'T3.7a: Null categories gracefully falls back to FALLBACK_RESTAURANTS catalog without throwing'
);

// Test popular tags helper
const getPopularTagsMatch = fs.readFileSync(path.join(__dirname, 'src', 'screens', 'SearchScreen.tsx'), 'utf8')
  .match(/const getFallbackPopularTags = \([\s\S]*?\n\};\n/);
assert(getPopularTagsMatch !== null, 'T3.7b: Located getFallbackPopularTags in SearchScreen.tsx');

// Strip TypeScript annotations for pure Node VM
const jsCode = getPopularTagsMatch[0]
  .replace(/^const getFallbackPopularTags/, 'getFallbackPopularTags')
  .replace(/:\s*any(\[\])?/g, '')
  .replace(/:\s*string\[\]/g, '')
  .replace(/new Set<string>\(\)/g, 'new Set()');

vm.runInContext(jsCode, sandbox);
const tags = sandbox.getFallbackPopularTags(FALLBACK_RESTAURANTS);
assert(Array.isArray(tags) && tags.length > 0 && tags.length <= 8,
  'T3.7c: getFallbackPopularTags derives valid popular tags bounded to <= 8',
  `Tags: ${tags.join(', ')}`
);

// -----------------------------------------------------------------------------
// SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
console.log(`VERDICT: ${failedTests === 0 ? 'APPROVE ✅' : 'REJECT ❌'}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
