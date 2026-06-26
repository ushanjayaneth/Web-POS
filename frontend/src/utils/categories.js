const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const DEFAULT_CATEGORIES = [
  { id: 'clothing-fashion', name: 'Clothing & Fashion', slug: 'clothing-fashion' },
  { id: 'electronics-gadgets', name: 'Electronics & Gadgets', slug: 'electronics-gadgets' },
  { id: 'home-living', name: 'Home & Living', slug: 'home-living' },
  { id: 'grocery-food', name: 'Grocery & Food', slug: 'grocery-food' },
  { id: 'beauty-health', name: 'Beauty & Health', slug: 'beauty-health' },
  { id: 'sports-outdoor', name: 'Sports & Outdoor', slug: 'sports-outdoor' },
  { id: 'toys-baby', name: 'Toys & Baby', slug: 'toys-baby' },
  { id: 'books-stationery', name: 'Books & Stationery', slug: 'books-stationery' },
  { id: 'automotive', name: 'Automotive', slug: 'automotive' },
  { id: 'pet-supplies', name: 'Pet Supplies', slug: 'pet-supplies' },
];

export const normalizeCategories = (categories, { useFallback = true } = {}) => {
  const normalized = (Array.isArray(categories) ? categories : [])
    .filter((category) => category?.is_active !== 0 && category?.is_active !== false)
    .map((category, index) => {
      const name = String(category.name || category.category_name || category.title || '').trim();
      if (!name) return null;

      const slug = slugify(category.slug || category.category_slug || category.id || name);
      return {
        ...category,
        id: category.id || category.uuid || slug || `category-${index}`,
        name,
        slug: slug || `category-${index}`,
      };
    })
    .filter(Boolean);

  return normalized.length > 0 || !useFallback ? normalized : DEFAULT_CATEGORIES;
};
