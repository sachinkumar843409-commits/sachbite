// Real food photos — pehle specific Unsplash photos try karo (jo diye gaye the),
// fallback me LoremFlickr (keyword-based, hamesha kaam karta hai)

const SPECIFIC_UNSPLASH = {
  Pizza: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80",
  Burgers: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80",
  Momos: "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=400&q=80",
  Biryani: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80",
  Chinese: "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80",
  Desserts: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80",
};

const SPECIFIC_UNSPLASH_RESTAURANTS = {
  "Pizza House": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80",
  "Momo Corner": "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=600&q=80",
  "Burger Point": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80",
};

const FOOD_IMAGE_KEYWORDS = {
  Pizza: "pizza,food",
  Burgers: "burger,food",
  Momos: "dumplings,food",
  Biryani: "biryani,rice",
  Chinese: "noodles,food",
  Desserts: "dessert,cake",
};

const RESTAURANT_IMAGE_KEYWORDS = {
  "Pizza House": "pizza,restaurant",
  "Momo Corner": "dumplings,food",
  "Burger Point": "burger,fastfood",
};

function foodImageUrl(keyword, width, height, lockSeed) {
  const w = width || 400;
  const h = height || 300;
  const lock = lockSeed ? `?lock=${lockSeed}` : "";
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keyword)}${lock}`;
}

// uploadedUrl: agar admin ne Appearance panel se apni photo upload ki hai, wahi sabse pehle use hogi.
function categoryImageUrl(categoryName, width, height, lockSeed, uploadedUrl) {
  if (uploadedUrl) return uploadedUrl;
  if (SPECIFIC_UNSPLASH[categoryName]) return SPECIFIC_UNSPLASH[categoryName];
  const keyword = FOOD_IMAGE_KEYWORDS[categoryName] || "food";
  return foodImageUrl(keyword, width, height, lockSeed);
}

function restaurantImageUrl(restaurantName, width, height, lockSeed, uploadedUrl) {
  if (uploadedUrl) return uploadedUrl;
  if (SPECIFIC_UNSPLASH_RESTAURANTS[restaurantName]) return SPECIFIC_UNSPLASH_RESTAURANTS[restaurantName];
  const keyword = RESTAURANT_IMAGE_KEYWORDS[restaurantName] || "restaurant,food";
  return foodImageUrl(keyword, width, height, lockSeed);
}
