const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const db = require('../database/firebase');
const router = express.Router();

const toPublicProduct = (product, id) => ({
  id,
  name: product.name,
  slug: product.slug || id,
  price: Number(product.price || 0),
  sale_price: product.sale_price ?? null,
  stock: Number(product.stock || 0),
  category_name: product.category_name || '',
  category_slug: product.category_slug || product.category_id || '',
  description: product.description || '',
  images: Array.isArray(product.images) ? product.images : [],
  is_featured: product.is_featured || 0,
  rating_avg: product.rating_avg || 0,
  rating_count: product.rating_count || 0,
  created_at: product.created_at || null,
  updated_at: product.updated_at || null,
});

// GET all products (Read from Firebase)
// Since you are using an external app to add products, this only reads data.
router.get('/', optionalAuth, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    const {
      page = 1, limit = 20, category, search, min_price, max_price, brand, condition, featured
    } = req.query;

    const productsSnapshot = await db.ref('products').once('value');
    const productsData = productsSnapshot.val() || {};

    let products = [];
    for (let key in productsData) {
      const product = productsData[key];
      if (!product.deleted_at && product.is_active !== 0 && product.is_active !== false) {
        products.push(toPublicProduct(product, key));
      }
    }

    // Apply filters in memory (Firebase RTDB doesn't support complex querying)
    if (category) {
      products = products.filter(p => p.category_slug === category || p.category_id === category);
    }
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(s)) || 
        (p.description && p.description.toLowerCase().includes(s)) ||
        (p.brand && p.brand.toLowerCase().includes(s))
      );
    }
    if (min_price) {
      products = products.filter(p => (p.sale_price || p.price) >= parseFloat(min_price));
    }
    if (max_price) {
      products = products.filter(p => (p.sale_price || p.price) <= parseFloat(max_price));
    }
    if (brand) {
      products = products.filter(p => p.brand === brand);
    }
    if (condition) {
      products = products.filter(p => p.condition === condition);
    }
    if (featured) {
      products = products.filter(p => p.is_featured === 1 || p.is_featured === true);
    }

    // Sort
    products.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    // Pagination
    const total = products.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedProducts = products.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: { 
        total, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        pages: Math.ceil(total / parseInt(limit)) 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch products.' });
  }
});

// GET single product
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const slug = req.params.slug;
    
    // In Firebase, we might need to search by slug if the key is not the slug
    const productsSnapshot = await db.ref('products').orderByChild('slug').equalTo(slug).once('value');
    let product = null;
    let productId = null;

    if (productsSnapshot.exists()) {
      productsSnapshot.forEach(child => {
        productId = child.key;
        product = child.val();
      });
    } else {
      // Try by ID (if slug was actually an ID)
      const directSnapshot = await db.ref(`products/${slug}`).once('value');
      if (directSnapshot.exists()) {
        productId = slug;
        product = directSnapshot.val();
      }
    }

    if (!product || product.deleted_at || product.is_active === 0 || product.is_active === false) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const publicProduct = toPublicProduct(product, productId);

    // Increment views (optional, might want to do this asynchronously without waiting)
    db.ref(`products/${productId}/views`).set((product.views || 0) + 1);

    // Fetch related products (same category)
    const relatedSnapshot = await db.ref('products')
      .orderByChild(product.category_id ? 'category_id' : 'category_slug')
      .equalTo(product.category_id || product.category_slug || '')
      .limitToFirst(9)
      .once('value');
    
    let related = [];
    relatedSnapshot.forEach(child => {
      const relatedProduct = child.val();
      if (
        child.key !== productId
        && !relatedProduct.deleted_at
        && relatedProduct.is_active !== 0
        && relatedProduct.is_active !== false
      ) {
        related.push(toPublicProduct(relatedProduct, child.key));
      }
    });

    // Check wishlist
    let inWishlist = false;
    if (req.user) {
      const wishlistSnapshot = await db.ref(`wishlist/${req.user.id}/${productId}`).once('value');
      inWishlist = wishlistSnapshot.exists();
    }

    // Fetch reviews
    const reviewsSnapshot = await db.ref(`reviews`).orderByChild('product_id').equalTo(productId).once('value');
    let reviews = [];
    reviewsSnapshot.forEach(child => {
      if (child.val().is_approved) {
        reviews.push({ id: child.key, ...child.val() });
      }
    });

    res.json({
      success: true,
      data: {
        ...publicProduct,
        reviews,
        related,
        in_wishlist: inWishlist
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch product.' });
  }
});

module.exports = router;
