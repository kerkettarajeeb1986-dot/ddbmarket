export interface CategoryDef {
  id: string;
  name: string;
  iconName: string;
  defaultShippingEligible: boolean;
  isPerishableDefault: boolean;
  requiresRefrigerationDefault: boolean;
  aliases?: string[];
  description?: string;
}

export const ALLOWED_CATEGORIES: CategoryDef[] = [
  {
    id: 'chicken-poultry',
    name: 'Chicken & Poultry',
    iconName: 'Drumstick',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: true,
    aliases: ['chicken', 'poultry', 'chicken & poultry'],
    description: 'Fresh dressed chicken, broilers, country chicken, and poultry cuts.',
  },
  {
    id: 'meat',
    name: 'Meat',
    iconName: 'Beef',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: true,
    aliases: ['mutton', 'pork', 'goat', 'fresh meat'],
    description: 'Fresh cut mutton, pork, goat meat, and specialized butcher items.',
  },
  {
    id: 'fish-seafood',
    name: 'Fish & Seafood',
    iconName: 'Fish',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: true,
    aliases: ['fish', 'seafood', 'prawns', 'fresh fish'],
    description: 'Fresh local river fish, Rohu, Katla, Hilsa, prawns, and seafood.',
  },
  {
    id: 'restaurants',
    name: 'Restaurants',
    iconName: 'Utensils',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: false,
    aliases: ['restaurant', 'dining', 'cooked food', 'meals'],
    description: 'Prepared gourmet meals, Indian thalis, Chinese dishes, and regional cuisine.',
  },
  {
    id: 'fast-food',
    name: 'Fast Food',
    iconName: 'Pizza',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: false,
    aliases: ['snacks', 'rolls', 'momos', 'burgers', 'pizza'],
    description: 'Hot rolls, momos, chowmein, burgers, sandwiches, and fast snacks.',
  },
  {
    id: 'grocery',
    name: 'Grocery',
    iconName: 'ShoppingBag',
    defaultShippingEligible: true,
    isPerishableDefault: false,
    requiresRefrigerationDefault: false,
    aliases: ['groceries', 'kirana', 'daily essentials', 'staples'],
    description: 'Rice, dal, flour, spices, edible oils, pulses, tea, and kitchen staples.',
  },
  {
    id: 'egg',
    name: 'Egg',
    iconName: 'Egg',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: false,
    aliases: ['eggs', 'poultry egg', 'desi egg'],
    description: 'Farm white eggs, brown eggs, organic desi poultry eggs, and trays.',
  },
  {
    id: 'milk',
    name: 'Milk',
    iconName: 'Milk',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: true,
    aliases: ['dairy', 'fresh milk', 'paneer', 'curd', 'dahi'],
    description: 'Pasteurized milk, raw farm milk, paneer, butter, curd, and fresh dairy.',
  },
  {
    id: 'cold-drinks',
    name: 'Cold Drink',
    iconName: 'CupSoda',
    defaultShippingEligible: true,
    isPerishableDefault: false,
    requiresRefrigerationDefault: false,
    aliases: ['cold drinks', 'beverages', 'soft drinks', 'soda', 'juices', 'packaged water'],
    description: 'Packaged soft drinks, fruit juices, packaged drinking water, and energy drinks.',
  },
  {
    id: 'vegetable',
    name: 'Vegetable',
    iconName: 'Carrot',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: false,
    aliases: ['vegetables', 'sabji', 'fresh veggies', 'green vegetables'],
    description: 'Fresh daily greens, potatoes, onions, tomatoes, and regional farm vegetables.',
  },
  {
    id: 'fruit',
    name: 'Fruit',
    iconName: 'Apple',
    defaultShippingEligible: false,
    isPerishableDefault: true,
    requiresRefrigerationDefault: false,
    aliases: ['fruits', 'fresh fruits', 'seasonal fruits'],
    description: 'Seasonal apples, bananas, citrus fruits, mangoes, pineapples, and berries.',
  },
  {
    id: 'cosmetics',
    name: 'Cosmetic',
    iconName: 'Sparkles',
    defaultShippingEligible: true,
    isPerishableDefault: false,
    requiresRefrigerationDefault: false,
    aliases: ['cosmetics', 'makeup', 'skincare', 'haircare', 'perfumes'],
    description: 'Beauty cosmetics, makeup kits, skin lotions, haircare, and personal grooming.',
  },
  {
    id: 'beauty-health',
    name: 'Beauty & Health',
    iconName: 'HeartPulse',
    defaultShippingEligible: true,
    isPerishableDefault: false,
    requiresRefrigerationDefault: false,
    aliases: ['wellness', 'health', 'supplements', 'ayurvedic', 'sanitary'],
    description: 'Health supplements, wellness products, sanitary essentials, and herbal care.',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    iconName: 'Package',
    defaultShippingEligible: true,
    isPerishableDefault: false,
    requiresRefrigerationDefault: false,
    aliases: ['general merchandise', 'packaged goods', 'home essentials', 'retail'],
    description: 'Packaged general merchandise, home items, electronics, gifts, and retail goods.',
  },
];

/**
 * Normalizes any category identifier or display name into the authoritative stable category ID.
 */
export function normalizeCategoryId(input: string): string {
  if (!input) return '';
  const clean = input.trim().toLowerCase();

  // Direct match by ID
  const directId = ALLOWED_CATEGORIES.find((c) => c.id.toLowerCase() === clean);
  if (directId) return directId.id;

  // Direct match by name
  const directName = ALLOWED_CATEGORIES.find((c) => c.name.toLowerCase() === clean);
  if (directName) return directName.id;

  // Match by aliases
  const aliasMatch = ALLOWED_CATEGORIES.find((c) =>
    c.aliases?.some((a) => a.toLowerCase() === clean)
  );
  if (aliasMatch) return aliasMatch.id;

  // Partial matching for variants (e.g. 'cold drinks' -> 'cold-drinks', 'cosmetics' -> 'cosmetics')
  if (clean.includes('cold drink')) return 'cold-drinks';
  if (clean.includes('cosmetic')) return 'cosmetics';
  if (clean.includes('chicken') || clean.includes('poultry')) return 'chicken-poultry';
  if (clean.includes('fish') || clean.includes('seafood')) return 'fish-seafood';
  if (clean.includes('restaurant')) return 'restaurants';
  if (clean.includes('fast food')) return 'fast-food';
  if (clean.includes('grocery')) return 'grocery';
  if (clean.includes('egg')) return 'egg';
  if (clean.includes('milk')) return 'milk';
  if (clean.includes('vegetable')) return 'vegetable';
  if (clean.includes('fruit')) return 'fruit';
  if (clean.includes('beauty') || clean.includes('health')) return 'beauty-health';
  if (clean.includes('commerce')) return 'ecommerce';
  if (clean === 'meat') return 'meat';

  return clean;
}

/**
 * Gets the authoritative CategoryDef for a given category ID or name.
 */
export function getCategoryDef(idOrName: string): CategoryDef | undefined {
  const normId = normalizeCategoryId(idOrName);
  return ALLOWED_CATEGORIES.find((c) => c.id === normId);
}

/**
 * Returns the human-readable display name for a category ID or alias.
 */
export function getCategoryName(idOrName: string): string {
  const def = getCategoryDef(idOrName);
  return def?.name || idOrName;
}

/**
 * Converts an array of category IDs into display names.
 */
export function getCategoryNames(ids: string[]): string[] {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => getCategoryName(id));
}

/**
 * Robust helper to extract an array of normalized Category IDs from any partner profile.
 * Preserves 100% backward compatibility for single-category partners.
 */
export function getPartnerCategoryIds(profile?: any): string[] {
  if (!profile) return [];

  // Check multi-category array first
  if (Array.isArray(profile.businessCategories) && profile.businessCategories.length > 0) {
    const list = profile.businessCategories
      .map((id: string) => normalizeCategoryId(id))
      .filter((id: string) => ALLOWED_CATEGORIES.some((c) => c.id === id));
    if (list.length > 0) {
      return Array.from(new Set(list));
    }
  }

  // Fallback to legacy single category or comma-separated string
  const legacyCat = profile.businessCategory || profile.category;
  if (legacyCat && typeof legacyCat === 'string' && legacyCat !== 'Select Business Category') {
    const parts = legacyCat.split(',').map((s) => s.trim()).filter(Boolean);
    const list = parts
      .map((p) => normalizeCategoryId(p))
      .filter((id) => ALLOWED_CATEGORIES.some((c) => c.id === id));
    if (list.length > 0) {
      return Array.from(new Set(list));
    }
  }

  return [];
}

/**
 * Robust helper to extract an array of display Category names from any partner profile.
 */
export function getPartnerCategoryNames(profile?: any): string[] {
  const ids = getPartnerCategoryIds(profile);
  if (ids.length > 0) {
    return ids.map((id) => getCategoryName(id));
  }
  if (profile?.businessCategory && profile.businessCategory !== 'Select Business Category') {
    return [profile.businessCategory];
  }
  return [];
}
