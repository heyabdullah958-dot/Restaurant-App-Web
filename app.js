/* =============================================
   FoodSphere — App Navigation and Cart Logic
   ============================================= */

let currentSlide = 1;
const totalSlides = 3;

// ─── Menu Data for All 4 Restaurants ────────
const restaurantsData = {
  seenbanao: {
    name: "SeenBanao",
    sub: "Desi BBQ & Handi Specialists",
    emoji: "🍖🔥",
    rating: "⭐ 4.7 · 200+ reviews",
    chips: ["🕐 25-35 min", "🛵 Free Delivery", "📍 2.1 km"],
    menu: {
      "STARTER": [
        { name: "Fries", price: 250, desc: "Classic crispy golden french fries", emoji: "🍟" },
        { name: "Bucket Fries", price: 450, desc: "Family portion of crispy golden fries", emoji: "🍟" },
        { name: "BBQ Loaded Fries", price: 750, desc: "Fries loaded with cheese and BBQ chicken", emoji: "🍟" },
        { name: "BBQ Grill Tenders (4pcs)", price: 450, desc: "Flame-grilled tender chicken strips", emoji: "🍗" },
        { name: "Nablets (6pcs)", price: 520, desc: "Deep-fried breaded nuggets", emoji: "🍗" },
        { name: "Butter Nablets (6pcs)", price: 650, desc: "Creamy butter-coated chicken nuggets", emoji: "🍗" },
        { name: "Butter Kabab (4pcs)", price: 999, desc: "Rich butter-tossed seekh kababs", emoji: "🍢" },
        { name: "Butter Malai Boti (5pcs)", price: 650, desc: "Butter-basted creamy malai botis", emoji: "🍢" }
      ],
      "K ROLLS": [
        { name: "Brotien Kabab Roll Beef", price: 650, desc: "High protein beef kabab rolled in soft flatbread", emoji: "🌯" }
      ],
      "P ROLLS": [
        { name: "Chicken Paratha Roll", price: 450, desc: "Classic chicken boti roll in paratha", emoji: "🌯" },
        { name: "Malai Boti Paratha Roll", price: 520, desc: "Creamy malai boti roll in paratha", emoji: "🌯" },
        { name: "Shish Taouk Paratha Roll", price: 990, desc: "Turkish style shish taouk in paratha", emoji: "🌯" },
        { name: "Chicken Kabab Roll", price: 400, desc: "Chicken seekh kabab roll in paratha", emoji: "🌯" },
        { name: "Adana Kabab Roll", price: 990, desc: "Spiced Turkish Adana kabab roll in paratha", emoji: "🌯" }
      ],
      "P SLICES": [
        { name: "Chicken Slices", price: 590, desc: "Succulent chicken slices with special sauce", emoji: "🌮" },
        { name: "Malai Boti Slices", price: 690, desc: "Creamy malai boti slices in signature bread", emoji: "🌮" }
      ],
      "SEEN BOWLS": [
        { name: "Rice with Adana Kabab (1pc)", price: 550, desc: "Turkish rice bowl served with 1pc Adana kabab (Solo)", emoji: "🍚" },
        { name: "Rice with Shish Taouk (2pcs)", price: 600, desc: "Turkish rice bowl served with 2pcs Shish Taouk (Solo)", emoji: "🍚" },
        { name: "Rice with Adana Kabab (2pcs)", price: 900, desc: "Turkish rice bowl served with 2pcs Adana kabab (Combo)", emoji: "🍚" },
        { name: "Rice with Shish Taouk (4pcs)", price: 950, desc: "Turkish rice bowl served with 4pcs Shish Taouk (Combo)", emoji: "🍚" }
      ],
      "BBQ SPECIAL": [
        { name: "Kabab (4pcs)", price: 650, desc: "Flame-grilled chicken seekh kababs", emoji: "🍢" },
        { name: "Tikka (5pcs)", price: 490, desc: "Classic fire-grilled chicken tikka pieces", emoji: "🍗" },
        { name: "Malai Boti (5pcs)", price: 550, desc: "Creamy, melt-in-mouth chicken malai boti", emoji: "🍢" },
        { name: "Shish Taouk (5pcs)", price: 800, desc: "Turkish style grilled chicken skewers", emoji: "🍢" },
        { name: "Shish Taouk Abiad (5pcs)", price: 900, desc: "White spice marinade shish taouk", emoji: "🍢" },
        { name: "Beef Adana Kabab (4pcs)", price: 1050, desc: "Authentic grilled Turkish beef Adana kababs", emoji: "🍢" }
      ],
      "DRINKS": [
        { name: "Water", price: 80, desc: "Chilled mineral water", emoji: "🥤" },
        { name: "Soft Drinks", price: 120, desc: "Coke, Sprite or Fanta", emoji: "🥤" },
        { name: "Seen Special Flavor Drink", price: 250, desc: "SEEN signature refreshing beverage", emoji: "🥤" }
      ],
      "ADD ONS": [
        { name: "Puri Paratha", price: 150, desc: "Flaky, deep-fried puri paratha", emoji: "🫓" },
        { name: "Dips", price: 80, desc: "SEEN special garlic/mint dip", emoji: "🏺" },
        { name: "Rice", price: 200, desc: "Extra portion of aromatic Turkish rice", emoji: "🍚" },
        { name: "Cheese Slice", price: 100, desc: "Extra slice of cheddar cheese", emoji: "🧀" }
      ]
    }
  },
  sandmelts: {
    name: "SandMelts",
    sub: "Original American Cheese Steak Sandwiches",
    emoji: "🥪🧀",
    rating: "⭐ 4.6 · 150+ reviews",
    chips: ["🕐 15-25 min", "🛵 Free Delivery", "📍 3.4 km"],
    menu: {
      "STEAK SANDWICHES": [
        { name: "Chicken Black Pepper Sandwich", price: 900, desc: "Iceberg, black pepper, onions, mushrooms, Garlic Mayo, melted cheese", emoji: "🥪" },
        { name: "Beef Black Pepper Sandwich", price: 1300, desc: "Iceberg, black pepper, onions, mushrooms, Garlic Mayo, melted cheese", emoji: "🥪" },
        { name: "Chicken Fajita Cheese Steak", price: 900, desc: "Spicy Fajita Chicken, Capsicum, Onion, Tomato, Olives, Honey Mustard, melted Cheese", emoji: "🥪" },
        { name: "Beef Fajita Cheese Steak", price: 1300, desc: "Spicy Fajita Beef, Capsicum, Onion, Tomato, Olives, Honey Mustard, melted Cheese", emoji: "🥪" },
        { name: "Chicken Jalapeno Cheese Steak", price: 900, desc: "Iceberg, grilled onions, Green Pepper, jalapenos, creamy Jalapeno, melted cheese", emoji: "🥪" },
        { name: "Beef Jalapeno Cheese Steak", price: 1300, desc: "Iceberg, grilled onions, Green Pepper, jalapenos, creamy Jalapeno, melted cheese", emoji: "🥪" }
      ],
      "LOADED FRIES": [
        { name: "Saucy Fries", price: 500, desc: "All natural potatoes, homemade sauces, jalapenos and olives", emoji: "🍟" },
        { name: "Chicken Steak Fries", price: 600, desc: "Diced chicken, jalapenos, bell peppers, olives, signature sauces", emoji: "🍟" },
        { name: "Beef Steak Fries", price: 750, desc: "Beef steak chunks, olives, jalapenos, signature sauces", emoji: "🍟" }
      ],
      "NEWYORK RICE": [
        { name: "Chicken Steak Rice", price: 600, desc: "Boneless chicken steak pcs with signature sauces & steamed rice", emoji: "🍚" },
        { name: "Beef Steak Rice", price: 750, desc: "Boneless beef steak pcs with signature sauces & steamed rice", emoji: "🍚" }
      ],
      "TORTILLA GRABS": [
        { name: "Chicken Grab", price: 800, desc: "Crispy fried chicken, Fries, Iceberg, homemade zesty sauces", emoji: "🌯" },
        { name: "Beef Grab", price: 1200, desc: "Juicy beef steak chunks, fries, grilled capsicum, onion, Iceberg", emoji: "🌯" }
      ],
      "BEVERAGES": [
        { name: "Water", price: 100, desc: "Chilled mineral water", emoji: "🥤" },
        { name: "Can", price: 150, desc: "Soft drink can", emoji: "🥤" },
        { name: "Coffee", price: 350, desc: "Brewed hot coffee", emoji: "☕" }
      ],
      "ADD ONS": [
        { name: "Garlic Sauce", price: 100, desc: "Premium garlic sauce dressing", emoji: "🏺" },
        { name: "Jalapeno Sauce", price: 100, desc: "Creamy jalapeno dressing", emoji: "🏺" },
        { name: "Honey Mustard Sauce", price: 100, desc: "Sweet honey mustard dressing", emoji: "🏺" },
        { name: "Mint Sauce", price: 100, desc: "Cool mint dressing", emoji: "🏺" },
        { name: "Chipotle Sauce", price: 100, desc: "Smoky chipotle dressing", emoji: "🏺" },
        { name: "Green Atomic Sauce", price: 100, desc: "Spicy green atomic dressing", emoji: "🏺" },
        { name: "Jalapeno", price: 80, desc: "Extra jalapeno slices portion", emoji: "🌶️" },
        { name: "Black Olives", price: 80, desc: "Extra black olives portion", emoji: "🫒" }
      ]
    }
  },
  jushhpk: {
    name: "JushhPK",
    sub: "Turkish Doner & Shawarma Specialties",
    emoji: "🥙🌯",
    rating: "⭐ 4.5 · 180+ reviews",
    chips: ["🕐 20-30 min", "🛵 Rs. 50 Delivery", "📍 1.5 km"],
    menu: {
      "APPETIZER": [
        { name: "Chicken Doner Fries", price: 600, desc: "Crispy fries topped with sliced chicken doner and sauces", emoji: "🍟" },
        { name: "Beef Doner Fries", price: 750, desc: "Crispy fries topped with sliced beef doner and signature sauces", emoji: "🍟" }
      ],
      "TURKISH SPECIALS": [
        { name: "Chicken Grilled Sandwich", price: 750, desc: "Grilled chicken sandwich Turkish style", emoji: "🥪" },
        { name: "Half Dubai Shawaya", price: 1400, desc: "Traditional roasted chicken shawaya half portion", emoji: "🍗" },
        { name: "Full Dubai Shawaya", price: 2500, desc: "Traditional roasted chicken shawaya full portion", emoji: "🍗" },
        { name: "Add-on Rice", price: 300, desc: "Spiced Arabic rice serving for Shawaya", emoji: "🍚" },
        { name: "Chicken Turkish Wrap", price: 600, desc: "Spiced chicken doner wrapped in soft flatbread", emoji: "🌯" },
        { name: "Beef Turkish Wrap", price: 900, desc: "Premium beef doner wrapped in soft flatbread", emoji: "🌯" },
        { name: "Chicken Turkish Doner", price: 850, desc: "Traditional Turkish chicken doner in pita bread", emoji: "🥙" },
        { name: "Beef Turkish Doner", price: 1100, desc: "Traditional Turkish beef doner in pita bread", emoji: "🥙" }
      ],
      "SHAWARMA": [
        { name: "Chicken Pouch Shawarma", price: 450, desc: "Pocket-style chicken shawarma pocket bread", emoji: "🥟" },
        { name: "Beef Pouch Shawarma", price: 700, desc: "Pocket-style beef shawarma pocket bread", emoji: "🥟" },
        { name: "Chicken Shawarma", price: 550, desc: "Classic Lebanese chicken shawarma wrap", emoji: "🌯" },
        { name: "Beef Shawarma", price: 750, desc: "Classic Lebanese beef shawarma wrap", emoji: "🌯" },
        { name: "Chicken Shawarma Platter", price: 900, desc: "Deconstructed chicken shawarma served on a platter", emoji: "🍽️" },
        { name: "Chicken Shawarma Platter (with cheese)", price: 1000, desc: "Deconstructed chicken shawarma topped with melted cheese", emoji: "🍽️" }
      ],
      "DESSERTS": [
        { name: "Lotus Can Dessert", price: 600, desc: "Creamy Lotus Biscoff dessert served in a signature can", emoji: "🍰" },
        { name: "Red Velvet Can Dessert", price: 600, desc: "Rich red velvet cake layered in a signature can", emoji: "🍰" },
        { name: "Nutella Can Dessert", price: 600, desc: "Decadent Nutella chocolate dessert in a signature can", emoji: "🍰" }
      ],
      "ADD ONS": [
        { name: "Cheese", price: 90, desc: "Extra melted cheese portion", emoji: "🧀" },
        { name: "Dip", price: 90, desc: "Signature Jushh garlic or spicy dip", emoji: "🏺" },
        { name: "Tortilla Bread", price: 90, desc: "Extra soft tortilla flatbread", emoji: "🫓" },
        { name: "Pita Bread", price: 60, desc: "Extra Lebanese pita pocket bread", emoji: "🫓" },
        { name: "Plain Fries", price: 150, desc: "Golden salted french fries side", emoji: "🍟" }
      ],
      "BEVERAGES": [
        { name: "Water", price: 80, desc: "Mineral water bottle", emoji: "🥤" },
        { name: "Soft Drink", price: 150, desc: "Chilled regular soft drink", emoji: "🥤" },
        { name: "Blueberry Mojito", price: 290, desc: "Refreshing blueberry mocktail", emoji: "🍹" },
        { name: "Strawberry Mojito", price: 290, desc: "Refreshing strawberry mocktail", emoji: "🍹" },
        { name: "Green Apple Mojito", price: 290, desc: "Refreshing green apple mocktail", emoji: "🍹" },
        { name: "Peach Mojito", price: 290, desc: "Refreshing peach mocktail", emoji: "🍹" },
        { name: "Lemon Mojito", price: 290, desc: "Refreshing lemon mint mocktail", emoji: "🍹" }
      ]
    }
  },
  dineatblue: {
    name: "DineAtBlue",
    sub: "Seafood Specialty Restaurant",
    emoji: "🐟🦞",
    rating: "⭐ 4.8 · 120+ reviews",
    chips: ["🕐 30-40 min", "🛵 Rs. 80 Delivery", "📍 4.2 km"],
    menu: {
      "SPECIALS": [
        { name: "Mix Seafood Grill", price: 2450, desc: "Grilled fish, prawns,  calamari served with garlic butter", emoji: "🦞" },
        { name: "Fish & Chips", price: 950, desc: "Crispy battered fish fillet served with tartar sauce", emoji: "🐟" }
      ],
      "DRINKS": [
        { name: "Blue Lagoon Mocktail", price: 350, desc: "Refreshing blue curacao drink", emoji: "🥤" }
      ]
    }
  },
  tandooristoppk: {
    name: "TandooriStoppPK",
    sub: "Tandoori Specialties & Sajji",
    emoji: "🍗🔥",
    rating: "⭐ 4.6 · 90+ reviews",
    chips: ["🕐 20-30 min", "🛵 Free Delivery", "📍 1.8 km"],
    menu: {
      "TANDOORI CHICKEN": [
        { name: "Tandoori Chicken Bone (Cheese Naan Single)", price: 1150, desc: "Tandoori chicken (with bone) served with 1 cheese naan", emoji: "🍗" },
        { name: "Tandoori Chicken Boneless (Cheese Naan Single)", price: 1350, desc: "Boneless tandoori chicken served with 1 cheese naan", emoji: "🍗" },
        { name: "Tandoori Chicken Bone (Cheese Naan Double)", price: 1950, desc: "Tandoori chicken (with bone) served with 2 cheese naans", emoji: "🍗" },
        { name: "Tandoori Chicken Boneless (Cheese Naan Double)", price: 2299, desc: "Boneless tandoori chicken served with 2 cheese naans", emoji: "🍗" },
        { name: "Tandoori Chicken Bone (With Rice)", price: 780, desc: "Tandoori chicken (with bone) served with aromatic rice", emoji: "🍗" },
        { name: "Tandoori Chicken Boneless (With Rice)", price: 980, desc: "Boneless tandoori chicken served with aromatic rice", emoji: "🍗" },
        { name: "Tandoori Chicken Bone", price: 750, desc: "Traditional flame-grilled tandoori chicken (with bone)", emoji: "🍗" },
        { name: "Tandoori Chicken Boneless", price: 899, desc: "Traditional flame-grilled boneless tandoori chicken", emoji: "🍗" }
      ],
      "CHICKEN SAJJI": [
        { name: "Quarter Sajji", price: 799, desc: "Slow-roasted quarter chicken sajji", emoji: "🍗" },
        { name: "Half Sajji", price: 1400, desc: "Slow-roasted half chicken sajji", emoji: "🍗" },
        { name: "Full Sajji", price: 2500, desc: "Slow-roasted full chicken sajji", emoji: "🍗" },
        { name: "Peri Peri Quarter Sajji", price: 900, desc: "Spiced peri peri quarter chicken sajji", emoji: "🍗" },
        { name: "Peri Peri Half Sajji", price: 1600, desc: "Spiced peri peri half chicken sajji", emoji: "🍗" },
        { name: "Peri Peri Full Sajji", price: 2900, desc: "Spiced peri peri full chicken sajji", emoji: "🍗" }
      ],
      "PARATHA ROLL": [
        { name: "Full Stop Roll", price: 650, desc: "TandooriStopp signature giant roll", emoji: "🌯" },
        { name: "Tandoori Chicken Roll", price: 520, desc: "Tandoori chicken chunks wrapped in paratha", emoji: "🌯" },
        { name: "Malai Boti Roll", price: 550, desc: "Creamy malai boti wrapped in paratha", emoji: "🌯" },
        { name: "Chicken Paratha Roll", price: 499, desc: "Classic chicken paratha roll", emoji: "🌯" }
      ],
      "TAWA CHICKEN": [
        { name: "Tawa Chicken", price: 750, desc: "Spicy stir-fried tawa chicken piece", emoji: "🍳" },
        { name: "Tawa Chicken Platter (Single)", price: 800, desc: "Single serving of stir-fried tawa chicken platter", emoji: "🍳" },
        { name: "Tawa Chicken Platter (Double)", price: 1400, desc: "Double serving of stir-fried tawa chicken platter", emoji: "🍳" }
      ],
      "BBQ": [
        { name: "Malai Boti (Per Seekh)", price: 450, desc: "Single seekh of creamy grilled malai boti", emoji: "🍢" },
        { name: "Malai Boti (Per KG)", price: 2200, desc: "One KG of creamy grilled malai boti", emoji: "🍢" },
        { name: "Tikka Boti (Per Seekh)", price: 400, desc: "Single seekh of classic tikka boti", emoji: "🍢" },
        { name: "Tikka Boti (Per KG)", price: 1999, desc: "One KG of classic tikka boti", emoji: "🍢" },
        { name: "Seekh Kabab (Per Seekh)", price: 250, desc: "Single seekh of spiced chicken seekh kabab", emoji: "🍢" },
        { name: "Seekh Kabab (Per KG)", price: 1999, desc: "One KG of spiced chicken seekh kabab", emoji: "🍢" }
      ],
      "HANDI": [
        { name: "Nawabi Handi Boneless", price: 2200, desc: "Rich royal Nawabi handi boneless serving", emoji: "🍲" },
        { name: "Shahi Kabab Masala Handi Boneless", price: 1999, desc: "Spiced shahi kabab masala handi boneless", emoji: "🍲" },
        { name: "Mughlai Cheese Handi Boneless", price: 1999, desc: "Creamy Mughlai cheese handi boneless", emoji: "🍲" },
        { name: "Reshmi Handi Boneless", price: 1999, desc: "Velvety reshmi handi boneless", emoji: "🍲" },
        { name: "Sha Jahani Handi Boneless", price: 1999, desc: "Royal spice mix Sha Jahani handi boneless", emoji: "🍲" }
      ],
      "KARAHI": [
        { name: "Chicken Karahi (Half)", price: 1300, desc: "Traditional wok chicken karahi half portion", emoji: "🥘" },
        { name: "Chicken Karahi (Full)", price: 2500, desc: "Traditional wok chicken karahi full portion", emoji: "🥘" },
        { name: "Chicken White Karahi (Half)", price: 1500, desc: "Creamy white chicken karahi half portion", emoji: "🥘" },
        { name: "Chicken White Karahi (Full)", price: 2700, desc: "Creamy white chicken karahi full portion", emoji: "🥘" },
        { name: "Chicken Kabab Masala (Half)", price: 1350, desc: "Chicken kabab masala half portion", emoji: "🥘" },
        { name: "Chicken Kabab Masala (Full)", price: 2600, desc: "Chicken kabab masala full portion", emoji: "🥘" }
      ],
      "FAMILY PLATTER": [
        { name: "Family Tandoori Platter", price: 7000, desc: "Half Sajji, 1 Handi, 4 Roti, 2 Malai Boti, 2 Tikka Boti, 4 Seekh Kabab, salad, raita, 6 mojitos", emoji: "👪" }
      ],
      "ADD ONS": [
        { name: "Roghni Naan", price: 200, desc: "Fluffy sesame roghni naan", emoji: "🫓" },
        { name: "Butter Naan", price: 350, desc: "Buttery flatbread naan", emoji: "🫓" },
        { name: "Cheese Naan", price: 500, desc: "Naan stuffed with melted cheese", emoji: "🫓" },
        { name: "Rice", price: 350, desc: "Extra serving of aromatic rice", emoji: "🍚" },
        { name: "Salad", price: 350, desc: "Fresh seasonal salad", emoji: "🥗" },
        { name: "Raita", price: 70, desc: "Yogurt herb raita dip", emoji: "🏺" },
        { name: "Puri Paratha", price: 270, desc: "Flaky deep-fried puri paratha", emoji: "🫓" }
      ],
      "MOJITOS": [
        { name: "Blueberry Mojito", price: 300, desc: "Blueberry refreshing mocktail", emoji: "🍹" },
        { name: "Strawberry Mojito", price: 300, desc: "Strawberry refreshing mocktail", emoji: "🍹" },
        { name: "Peach Mojito", price: 300, desc: "Peach refreshing mocktail", emoji: "🍹" },
        { name: "Apple Mojito", price: 300, desc: "Apple refreshing mocktail", emoji: "🍹" }
      ],
      "DRINKS": [
        { name: "Water (Small)", price: 80, desc: "Chilled mineral water", emoji: "🥤" },
        { name: "Soft Drink (300ml)", price: 120, desc: "Carbonated soft drink regular", emoji: "🥤" },
        { name: "Soft Drink (Tin)", price: 150, desc: "Carbonated soft drink tin can", emoji: "🥤" },
        { name: "Fresh Lime", price: 350, desc: "Zesty fresh lime soda", emoji: "🥤" },
        { name: "Mint Margarita", price: 300, desc: "Minty blended ice margarita", emoji: "🥤" }
      ]
    }
  },
  getafomo: {
    name: "GetAFomo",
    sub: "Trendy Coffees, Frappes & Desserts",
    emoji: "☕🍰",
    rating: "⭐ 4.8 · 110+ reviews",
    chips: ["🕐 15-25 min", "🛵 Free Delivery", "📍 2.3 km"],
    menu: {
      "COLD COFFEE": [
        { name: "Iced Americano", price: 400, desc: "Espresso shots over cold water and ice", emoji: "☕" },
        { name: "Iced Latte", price: 450, desc: "Espresso combined with milk and ice", emoji: "☕" },
        { name: "Iced Spanish Latte", price: 580, desc: "Espresso with condensed milk, milk and ice", emoji: "☕" },
        { name: "Iced Vanilla Latte", price: 650, desc: "Espresso with vanilla syrup, milk and ice", emoji: "☕" },
        { name: "Iced Caramel Latte", price: 650, desc: "Espresso with caramel syrup, milk and ice", emoji: "☕" },
        { name: "Iced Hazelnut Latte", price: 650, desc: "Espresso with hazelnut syrup, milk and ice", emoji: "☕" },
        { name: "Iced Coconut Latte", price: 650, desc: "Espresso with coconut syrup, milk and ice", emoji: "☕" },
        { name: "Iced Mocha", price: 800, desc: "Espresso with chocolate sauce, milk and ice", emoji: "☕" },
        { name: "Iced Chocolate", price: 700, desc: "Rich chocolate blend with milk and ice", emoji: "🥤" },
        { name: "Cookies n Cream Frappe", price: 1000, desc: "Blended cookies and cream frappe with whipped cream", emoji: "🥤" },
        { name: "Mocha Frappe", price: 900, desc: "Blended chocolate and coffee frappe", emoji: "🥤" },
        { name: "Lotus Frappe", price: 1000, desc: "Blended Lotus Biscoff biscuit frappe", emoji: "🥤" },
        { name: "Hazelnut Frappe", price: 950, desc: "Blended hazelnut flavor coffee frappe", emoji: "🥤" },
        { name: "Caramel Frappe", price: 800, desc: "Blended sweet caramel coffee frappe", emoji: "🥤" },
        { name: "Brownie Frappe", price: 800, desc: "Blended chocolate brownie coffee frappe", emoji: "🥤" }
      ],
      "SMOOTHIES & SHAKES": [
        { name: "Strawberry Smoothie", price: 850, desc: "Thick strawberry fruit smoothie", emoji: "🥤" },
        { name: "Blueberry Smoothie", price: 900, desc: "Thick blueberry fruit smoothie", emoji: "🥤" },
        { name: "Peach Smoothie", price: 850, desc: "Thick peach fruit smoothie", emoji: "🥤" },
        { name: "Pina Colada Smoothie", price: 700, desc: "Classic pineapple and coconut blend", emoji: "🥤" },
        { name: "Lotus Cookie Butter Shake", price: 950, desc: "Premium Lotus Biscoff milkshake", emoji: "🥤" },
        { name: "Nutella Shake", price: 900, desc: "Thick Nutella chocolate milkshake", emoji: "🥤" },
        { name: "Brownie Shake", price: 800, desc: "Rich chocolate brownie milkshake", emoji: "🥤" },
        { name: "Cookies n Cream Shake", price: 850, desc: "Oreo cookies and cream milkshake", emoji: "🥤" },
        { name: "Peach Ice Tea", price: 650, desc: "Chilled peach tea infusion", emoji: "🥤" },
        { name: "Blueberry Ice Tea", price: 650, desc: "Chilled blueberry tea infusion", emoji: "🥤" },
        { name: "Passion Fruit Ice Tea", price: 500, desc: "Chilled passion fruit tea infusion", emoji: "🥤" }
      ],
      "HOT COFFEE": [
        { name: "Espresso", price: 300, desc: "Single rich shot of pure espresso", emoji: "☕" },
        { name: "Cortado", price: 400, desc: "Equal parts espresso and warm milk", emoji: "☕" },
        { name: "Hot Americano", price: 350, desc: "Espresso shots diluted with hot water", emoji: "☕" },
        { name: "Cappuccino", price: 400, desc: "Espresso with equal parts steamed milk and foam", emoji: "☕" },
        { name: "Hot Latte", price: 400, desc: "Espresso with steamed milk and a thin layer of foam", emoji: "☕" },
        { name: "Hot Spanish Latte", price: 490, desc: "Espresso with condensed milk and steamed milk", emoji: "☕" },
        { name: "Hot Vanilla Latte", price: 550, desc: "Espresso with vanilla syrup and steamed milk", emoji: "☕" },
        { name: "Hot Caramel Latte", price: 550, desc: "Espresso with caramel syrup and steamed milk", emoji: "☕" },
        { name: "Hot Hazelnut Latte", price: 550, desc: "Espresso with hazelnut syrup and steamed milk", emoji: "☕" },
        { name: "Hot Mocha", price: 700, desc: "Espresso with chocolate and steamed milk", emoji: "☕" },
        { name: "Hot Chocolate", price: 600, desc: "Rich steamed chocolate milk", emoji: "☕" }
      ],
      "SANDWICHES": [
        { name: "Herb n Chicken Sandwich (Non-spicy)", price: 900, desc: "Non-spicy herb chicken sandwich", emoji: "🥪" },
        { name: "Jalapeno Sandwich (Tangy)", price: 670, desc: "Tangy jalapeno chicken sandwich", emoji: "🥪" },
        { name: "Cravtail Sandwich (Mild)", price: 570, desc: "Mild spicy cravtail chicken sandwich", emoji: "🥪" },
        { name: "Chipotle Sandwich (Spicy)", price: 600, desc: "Spicy chipotle chicken sandwich", emoji: "🥪" },
        { name: "Fries", price: 350, desc: "Crispy salted side fries", emoji: "🍟" }
      ],
      "DESSERTS": [
        { name: "Jiggly Cake (Tall)", price: 900, desc: "Japanese tall cheesecake with chocolate sauce", emoji: "🍰" },
        { name: "Jiggly Cake (Flat)", price: 1700, desc: "Japanese flat cheesecake with chocolate sauce", emoji: "🍰" },
        { name: "San Sebastian Cheesecake Slice", price: 950, desc: "Classic basque burnt cheesecake slice", emoji: "🍰" },
        { name: "New York Cheesecake Slice", price: 950, desc: "Rich baked New York style cheesecake slice", emoji: "🍰" },
        { name: "Lotus Cheesecake Slice", price: 1000, desc: "Cheesecake slice topped with Lotus biscoff", emoji: "🍰" },
        { name: "Nutella Bento Cake", price: 950, desc: "Mini Nutella chocolate cake", emoji: "🍰" },
        { name: "Chocolate Fudge Bento Cake", price: 900, desc: "Mini rich chocolate fudge cake", emoji: "🍰" },
        { name: "Lotus Bento Cake", price: 1000, desc: "Mini Lotus Biscoff cake", emoji: "🍰" },
        { name: "Red Velvet Bento Cake", price: 1000, desc: "Mini red velvet cake with cream cheese", emoji: "🍰" },
        { name: "Nutella Sundae", price: 370, desc: "Ice cream sundae topped with Nutella", emoji: "🍨" },
        { name: "Oreo Sundae", price: 370, desc: "Ice cream sundae topped with crushed Oreos", emoji: "🍨" },
        { name: "Lotus Three Milk Sundae", price: 400, desc: "Lotus biscoff infused tres leches sundae", emoji: "🍨" },
        { name: "Salted Caramel Sundae", price: 370, desc: "Ice cream sundae with salted caramel sauce", emoji: "🍨" },
        { name: "Nutella Eclair", price: 320, desc: "Cream-filled pastry topped with Nutella", emoji: "🥖" },
        { name: "Lotus Eclair", price: 340, desc: "Cream-filled pastry topped with Lotus cream", emoji: "🥖" },
        { name: "Nutella Cookie", price: 370, desc: "Soft baked cookie stuffed with Nutella", emoji: "🍪" },
        { name: "Lotus Cookie", price: 390, desc: "Soft baked cookie stuffed with Lotus cream", emoji: "🍪" },
        { name: "Chocolate Chip Cookie", price: 420, desc: "Giant classic chocolate chip cookie", emoji: "🍪" },
        { name: "Tiramisu French Toast", price: 1000, desc: "Brioche french toast with espresso and mascarpone", emoji: "🍞" },
        { name: "Lotus French Toast", price: 1000, desc: "Brioche french toast topped with Lotus sauce", emoji: "🍞" },
        { name: "Nutella Brownie", price: 420, desc: "Fudgy brownie topped with Nutella", emoji: "🥮" },
        { name: "Double Chocolate Fudge Brownie", price: 450, desc: "Extremely rich double chocolate brownie", emoji: "🥮" }
      ],
      "MOJITOS & ADD-ONS": [
        { name: "Green Apple Mojito", price: 300, desc: "Refreshing green apple mint mocktail", emoji: "🍹" },
        { name: "Blueberry Mojito", price: 300, desc: "Refreshing blueberry mint mocktail", emoji: "🍹" },
        { name: "Lychee Mojito", price: 300, desc: "Refreshing lychee mint mocktail", emoji: "🍹" },
        { name: "Peach Mojito", price: 300, desc: "Refreshing peach mint mocktail", emoji: "🍹" },
        { name: "Sauce Add-on", price: 100, desc: "Extra sauce dressing", emoji: "🏺" },
        { name: "Syrup Add-on", price: 150, desc: "Extra coffee syrup flavoring", emoji: "🏺" },
        { name: "Espresso Shot", price: 150, desc: "Additional single shot of espresso", emoji: "☕" },
        { name: "Chocolate/Strawberry/Lotus Topping", price: 100, desc: "Additional sweet flavor drizzle", emoji: "🏺" }
      ]
    }
  }
};

// State Variables
let cart = [];
let currentRestaurant = "seenbanao";
let activeCategory = "BBQ SPECIAL";
let useLoyaltyPoints = true;
const deliveryFee = 60;
const loyaltyDiscountValue = 50;

// ─── Screen Navigation ───────────────────────
function goTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }

  // Update right-side nav buttons
  updateNavButtons(screenId);

  // Screen-specific rendering
  if (screenId === 'screen-restaurant') {
    renderMenu();
  } else if (screenId === 'screen-cart') {
    renderCart();
  } else if (screenId === 'screen-checkout') {
    renderCheckout();
  } else if (screenId === 'screen-tracking') {
    renderTrackingSummary();
  }
}

function openRestaurant(restaurantId) {
  if (!restaurantsData[restaurantId]) return;

  // Clear cart if switching restaurants to preserve multi-tenant rule
  if (currentRestaurant !== restaurantId) {
    cart = [];
  }

  currentRestaurant = restaurantId;

  // Set initial active category for that restaurant
  const categories = Object.keys(restaurantsData[restaurantId].menu);
  activeCategory = categories[0] || "";

  // Dynamically update restaurant detail header
  const rest = restaurantsData[restaurantId];
  const coverEmoji = document.getElementById('rest-cover-emoji');
  const nameEl = document.getElementById('rest-detail-name');
  const subEl = document.getElementById('rest-detail-sub');
  const ratingEl = document.getElementById('rest-detail-rating');
  const chipsEl = document.getElementById('rest-detail-chips');

  if (coverEmoji) coverEmoji.textContent = rest.emoji;
  if (nameEl) nameEl.textContent = rest.name;
  if (subEl) subEl.textContent = rest.sub;
  if (ratingEl) ratingEl.innerHTML = `${rest.rating}`;
  
  if (chipsEl) {
    chipsEl.innerHTML = rest.chips.map((chip, idx) => {
      const icons = ["🕐", "🛵", "📍"];
      return `<span class="info-chip">${icons[idx] || ""} ${chip}</span>`;
    }).join("");
  }

  goTo('screen-restaurant');
}

function updateNavButtons(screenId) {
  // Update right-side nav buttons using onclick attribute matching
  document.querySelectorAll('.screen-nav-btn').forEach(btn => {
    const onclickAttr = btn.getAttribute('onclick') || '';
    btn.classList.toggle('active', onclickAttr.includes(`goTo('${screenId}')`));
  });

  // Update bottom nav active items in all screens by matching the item's onclick attribute
  document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
    const onclickAttr = item.getAttribute('onclick') || '';
    item.classList.toggle('active', onclickAttr.includes(`goTo('${screenId}')`));
  });
}

function fillSearch(val) {
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.value = val;
    searchInput.focus();
    searchInput.dispatchEvent(new Event('input'));
  }
}


// ─── Onboarding Carousel ─────────────────────
function nextSlide() {
  if (currentSlide < totalSlides) {
    document.getElementById(`slide-${currentSlide}`).classList.remove('active');
    document.getElementById(`dot-${currentSlide}`).classList.remove('active');

    currentSlide++;

    document.getElementById(`slide-${currentSlide}`).classList.add('active');
    document.getElementById(`dot-${currentSlide}`).classList.add('active');

    const btn = document.getElementById('nextBtn');
    if (currentSlide === totalSlides) {
      btn.innerHTML = 'Get Started &rarr;';
      btn.onclick = () => goTo('screen-home');
    }
  } else {
    goTo('screen-home');
  }
}

// ─── Category Chips ──────────────────────────
function initCategoryChips() {
  document.querySelectorAll('.cat-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });
}

// ─── Render Restaurant Menu dynamically ──────────
function renderMenu() {
  const tabsContainer = document.querySelector('.menu-tabs');
  const listContainer = document.querySelector('.menu-list');
  const sectionTitle = document.querySelector('.menu-section-title');

  if (!tabsContainer || !listContainer) return;

  const currentRestData = restaurantsData[currentRestaurant];
  if (!currentRestData) return;

  // Render Category Tabs
  tabsContainer.innerHTML = "";
  Object.keys(currentRestData.menu).forEach(cat => {
    const tab = document.createElement('div');
    tab.className = `menu-tab ${cat === activeCategory ? 'active' : ''}`;
    tab.textContent = cat;
    tab.onclick = () => {
      activeCategory = cat;
      renderMenu();
    };
    tabsContainer.appendChild(tab);
  });

  // Render Title
  if (sectionTitle) {
    sectionTitle.textContent = `${activeCategory} Items`;
  }

  // Render Items
  listContainer.innerHTML = "";
  const items = currentRestData.menu[activeCategory] || [];
  items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = "menu-item";
    itemEl.onclick = () => addToCart(item.name);

    itemEl.innerHTML = `
      <div class="menu-item-info">
        <h5>${item.name}</h5>
        <p>${item.desc}</p>
        <span class="menu-price">Rs. ${item.price}</span>
      </div>
      <div class="menu-item-right">
        <div class="menu-img">${item.emoji}</div>
        <button class="add-btn" onclick="event.stopPropagation(); addToCart('${item.name}')">+</button>
      </div>
    `;
    listContainer.appendChild(itemEl);
  });

  updateStickyCartBar();
}

// ─── Cart Functions ──────────────────────────
function addToCart(itemName) {
  const currentRestData = restaurantsData[currentRestaurant];
  if (!currentRestData) return;

  // Find item in active restaurant's menu
  let item = null;
  for (const cat in currentRestData.menu) {
    const found = currentRestData.menu[cat].find(i => i.name === itemName);
    if (found) {
      item = found;
      break;
    }
  }
  if (!item) return;

  const existing = cart.find(i => i.name === item.name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...item, qty: 1 });
  }

  updateStickyCartBar();
  animateAddButton(itemName);
}

function animateAddButton(itemName) {
  const items = document.querySelectorAll('.menu-item');
  items.forEach(itemEl => {
    const title = itemEl.querySelector('h5');
    if (title && title.textContent === itemName) {
      const btn = itemEl.querySelector('.add-btn');
      if (btn) {
        btn.textContent = '✓';
        btn.style.background = '#4CAF50';
        setTimeout(() => {
          btn.textContent = '+';
          btn.style.background = '';
        }, 800);
      }
    }
  });
}

function updateStickyCartBar() {
  const stickyCart = document.querySelector('.sticky-cart');
  const countEl = document.querySelector('.cart-count');
  const totalEl = document.querySelector('.cart-total');

  let totalCount = 0;
  let totalPrice = 0;
  cart.forEach(i => {
    totalCount += i.qty;
    totalPrice += i.qty * i.price;
  });

  if (totalCount > 0) {
    if (stickyCart) stickyCart.style.display = 'flex';
    if (countEl) countEl.textContent = totalCount;
    if (totalEl) totalEl.textContent = `Rs. ${totalPrice.toLocaleString()}`;
  } else {
    if (stickyCart) stickyCart.style.display = 'none';
  }
}

// ─── Render Cart Screen dynamically ─────────────
function renderCart() {
  const cartItemsContainer = document.getElementById('cart-items-container');
  const cartSubheader = document.getElementById('cart-restaurant-name');
  const addMoreLink = document.getElementById('cart-add-more-link');

  if (cartSubheader) cartSubheader.textContent = restaurantsData[currentRestaurant].name;
  if (addMoreLink) {
    addMoreLink.textContent = `← Add more from ${restaurantsData[currentRestaurant].name}`;
    addMoreLink.onclick = () => openRestaurant(currentRestaurant);
  }

  if (!cartItemsContainer) return;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<div class="empty-cart-msg" style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 15px;">Your cart is empty 🛍️</div>`;
    updateSummaryPrices(0);
    return;
  }

  cartItemsContainer.innerHTML = "";
  cart.forEach((item, index) => {
    const itemEl = document.createElement('div');
    itemEl.className = "cart-item";
    itemEl.innerHTML = `
      <div class="cart-item-img">${item.emoji}</div>
      <div class="cart-item-info">
        <h5>${item.name}</h5>
        <span class="cart-price">Rs. ${item.price}</span>
      </div>
      <div class="qty-ctrl">
        <button class="qty-btn" onclick="updateQty(${index}, -1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn qty-plus" onclick="updateQty(${index}, 1)">+</button>
      </div>
    `;
    cartItemsContainer.appendChild(itemEl);
  });

  let subtotal = 0;
  cart.forEach(i => subtotal += i.qty * i.price);
  updateSummaryPrices(subtotal);
}

function updateQty(index, change) {
  cart[index].qty += change;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
  updateStickyCartBar();
}

function updateSummaryPrices(subtotal) {
  const subtotalEl = document.querySelector('.summary-row:nth-child(1) span:last-child');
  const discountRow = document.querySelector('.summary-row.discount');
  const discountEl = document.querySelector('.summary-row.discount span:last-child');
  const totalEl = document.querySelector('.summary-row.total span:last-child');
  const placeOrderBtnText = document.querySelector('.place-order-btn span:last-child');

  let discount = useLoyaltyPoints && subtotal > 0 ? loyaltyDiscountValue : 0;
  let total = subtotal > 0 ? (subtotal + deliveryFee - discount) : 0;

  if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString()}`;
  if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
  if (discountEl) discountEl.textContent = `− Rs. ${discount}`;
  if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;
  if (placeOrderBtnText) placeOrderBtnText.textContent = `Rs. ${total.toLocaleString()}`;
}

function initLoyaltyToggle() {
  const toggle = document.querySelector('.loyalty-banner .toggle-switch');
  if (toggle) {
    toggle.classList.toggle('active', useLoyaltyPoints);
    toggle.onclick = () => {
      toggle.classList.toggle('active');
      useLoyaltyPoints = toggle.classList.contains('active');
      let subtotal = 0;
      cart.forEach(i => subtotal += i.qty * i.price);
      updateSummaryPrices(subtotal);
    };
  }
}

// ─── Render Order Tracking Screen Summary ────────
function renderTrackingSummary() {
  const trackingSummary = document.querySelector('.order-summary-mini');
  if (!trackingSummary) return;

  let totalCount = 0;
  let totalPrice = 0;
  cart.forEach(i => {
    totalCount += i.qty;
    totalPrice += i.qty * i.price;
  });
  let discount = useLoyaltyPoints ? loyaltyDiscountValue : 0;
  let finalTotal = totalPrice + deliveryFee - discount;

  trackingSummary.innerHTML = `
    <span>${restaurantsData[currentRestaurant].name} · ${totalCount} items · Rs. ${finalTotal.toLocaleString()}</span>
    <span>&blacktriangledown;</span>
  `;
}

// ─── Heart / Favorite Toggle ─────────────────
function initHearts() {
  document.querySelectorAll('.rest-heart').forEach(heart => {
    heart.addEventListener('click', (e) => {
      e.stopPropagation();
      heart.textContent = heart.textContent === '♡' ? '❤️' : '♡';
    });
  });
}

// ─── Splash Auto-advance ─────────────────────
function initSplash() {
  setTimeout(() => {
    goTo('screen-onboarding');
  }, 2800);
}

// ─── Ripple Effect on Buttons ─────────────────
function addRipple(e) {
  const btn = e.currentTarget;
  const circle = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius = diameter / 2;

  circle.style.cssText = `
    position: absolute;
    width: ${diameter}px;
    height: ${diameter}px;
    left: ${e.clientX - btn.getBoundingClientRect().left - radius}px;
    top: ${e.clientY - btn.getBoundingClientRect().top - radius}px;
    background: rgba(255,255,255,0.3);
    border-radius: 50%;
    transform: scale(0);
    animation: ripple 0.5s linear;
    pointer-events: none;
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes ripple { to { transform: scale(4); opacity: 0; } }`;
  document.head.appendChild(style);

  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 600);
}

function initRipples() {
  document.querySelectorAll('.next-btn, .place-order-btn, .track-btn, .add-btn').forEach(btn => {
    btn.addEventListener('click', addRipple);
  });
}

// ─── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSplash();
  initCategoryChips();
  initLoyaltyToggle();
  initHearts();
  initRipples();

  // Set up search filtering
  const searchInput = document.querySelector('.search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.search-popular-item').forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(query)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  updateNavButtons('screen-splash');
});

let expressFee = 0;

// Checkout — Delivery Time Selection
function selectDeliveryTime(el) {
  document.querySelectorAll('.checkout-time-card').forEach(c => {
    c.classList.remove('selected');
    c.querySelector('.checkout-radio').classList.remove('active');
  });
  el.classList.add('selected');
  el.querySelector('.checkout-radio').classList.add('active');

  // Update fee dynamically
  const isExpress = el.querySelector('.checkout-time-name').textContent.trim() === 'Express';
  expressFee = isExpress ? 50 : 0;
  updateCheckoutPrices();
}

// Checkout — Payment Method Selection
function selectPayment(el) {
  document.querySelectorAll('.checkout-pay-card').forEach(c => {
    c.classList.remove('selected');
    c.querySelector('.checkout-radio').classList.remove('active');
  });
  el.classList.add('selected');
  el.querySelector('.checkout-radio').classList.add('active');
}

function updateCheckoutPrices() {
  let subtotal = 0;
  cart.forEach(i => subtotal += i.qty * i.price);
  
  let discount = useLoyaltyPoints && subtotal > 0 ? loyaltyDiscountValue : 0;
  let finalDeliveryFee = subtotal > 0 ? (deliveryFee + expressFee) : 0;
  let total = subtotal > 0 ? (subtotal + finalDeliveryFee - discount) : 0;

  const subtotalEl = document.getElementById('checkout-subtotal');
  const deliveryEl = document.getElementById('checkout-delivery');
  const discountRow = document.getElementById('checkout-discount-row');
  const discountEl = document.getElementById('checkout-discount');
  const totalEl = document.getElementById('checkout-total');
  const placeBtnPrice = document.getElementById('checkout-place-btn-price');

  if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toLocaleString()}`;
  if (deliveryEl) deliveryEl.textContent = `Rs. ${finalDeliveryFee.toLocaleString()}`;
  if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
  if (discountEl) discountEl.textContent = `− Rs. ${discount}`;
  if (totalEl) totalEl.textContent = `Rs. ${total.toLocaleString()}`;
  if (placeBtnPrice) placeBtnPrice.textContent = `Rs. ${total.toLocaleString()}`;
}

function renderCheckout() {
  const rest = restaurantsData[currentRestaurant];
  const restEmojiEl = document.getElementById('checkout-rest-emoji');
  const restNameEl = document.getElementById('checkout-rest-name');
  
  if (restEmojiEl) restEmojiEl.textContent = rest.emoji.substring(0, 2); // get first emoji
  if (restNameEl) restNameEl.textContent = rest.name;

  const checkoutItemsContainer = document.getElementById('checkout-items-container');
  if (checkoutItemsContainer) {
    if (cart.length === 0) {
      checkoutItemsContainer.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">Your cart is empty 🛍️</div>`;
    } else {
      checkoutItemsContainer.innerHTML = "";
      cart.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = "checkout-item";
        itemEl.innerHTML = `
          <div class="checkout-item-qty">${item.qty}×</div>
          <div class="checkout-item-name">${item.name}</div>
          <div class="checkout-item-price">Rs. ${(item.price * item.qty).toLocaleString()}</div>
        `;
        checkoutItemsContainer.appendChild(itemEl);
      });
    }
  }
  
  // Reset Express Selection to Standard on load
  const standardTimeCard = document.querySelector('.checkout-time-card:first-child');
  if (standardTimeCard) {
    selectDeliveryTime(standardTimeCard);
  } else {
    expressFee = 0;
    updateCheckoutPrices();
  }
}
