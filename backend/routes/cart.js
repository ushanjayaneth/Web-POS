const express = require('express');
const db = require('../database/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();

// GET cart
router.get('/', protect, async (req, res) => {
  try {
    const cartSnapshot = await db.ref(`cart/${req.user.id}`).once('value');
    const cartData = cartSnapshot.val() || {};
    
    const items = [];
    let subtotal = 0;
    
    // Fetch product details for each cart item
    for (const key of Object.keys(cartData)) {
      const cartItem = cartData[key];
      const productSnapshot = await db.ref(`products/${cartItem.product_id}`).once('value');
      const product = productSnapshot.val();
      
      if (product && product.is_active !== 0 && product.is_active !== false) {
        const price = product.sale_price || product.price;
        subtotal += price * cartItem.quantity;
        
        items.push({
          id: key,
          product_id: cartItem.product_id,
          quantity: cartItem.quantity,
          variant: cartItem.variant,
          name: product.name,
          slug: product.slug,
          price: product.price,
          sale_price: product.sale_price,
          stock: product.stock,
          images: product.images || [],
          seller_id: product.seller_id || null,
          seller_name: 'ShopLK' // Simplified
        });
      } else {
        // Product no longer exists or is inactive, remove from cart
        await db.ref(`cart/${req.user.id}/${key}`).remove();
      }
    }

    res.json({ 
      success: true, 
      data: { 
        items, 
        subtotal, 
        item_count: items.reduce((acc, item) => acc + item.quantity, 0) 
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch cart.' });
  }
});

// ADD to cart
router.post('/', protect, async (req, res) => {
  const { product_id, quantity = 1, variant } = req.body;
  if (!product_id) return res.status(400).json({ success: false, message: 'Product ID required' });

  try {
    const productSnapshot = await db.ref(`products/${product_id}`).once('value');
    const product = productSnapshot.val();
    if (!product || product.is_active === 0) return res.status(404).json({ success: false, message: 'Product not available.' });

    const cartRef = db.ref(`cart/${req.user.id}`);
    const cartSnapshot = await cartRef.once('value');
    const cartData = cartSnapshot.val() || {};
    
    let existingKey = null;
    let newQuantity = quantity;

    // Check if product (+variant) already exists in cart
    for (const key of Object.keys(cartData)) {
      if (cartData[key].product_id === product_id && cartData[key].variant === variant) {
        existingKey = key;
        newQuantity += cartData[key].quantity;
        break;
      }
    }

    if (newQuantity > product.stock) {
      return res.status(400).json({ success: false, message: 'Not enough stock available.' });
    }

    if (existingKey) {
      await db.ref(`cart/${req.user.id}/${existingKey}`).update({ quantity: newQuantity, added_at: Date.now() });
    } else {
      await cartRef.push({
        product_id,
        quantity,
        variant: variant || null,
        added_at: Date.now()
      });
    }

    res.json({ success: true, message: 'Added to cart.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add to cart.' });
  }
});

// UPDATE quantity
router.put('/:id', protect, async (req, res) => {
  const { quantity } = req.body;
  if (quantity < 1) return res.status(400).json({ success: false, message: 'Invalid quantity.' });

  try {
    const cartItemRef = db.ref(`cart/${req.user.id}/${req.params.id}`);
    const cartItemSnapshot = await cartItemRef.once('value');
    const cartItem = cartItemSnapshot.val();

    if (!cartItem) return res.status(404).json({ success: false, message: 'Item not found in cart.' });

    const productSnapshot = await db.ref(`products/${cartItem.product_id}`).once('value');
    const product = productSnapshot.val();

    if (quantity > (product?.stock || 0)) {
      return res.status(400).json({ success: false, message: 'Not enough stock.' });
    }

    await cartItemRef.update({ quantity });
    res.json({ success: true, message: 'Quantity updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update cart.' });
  }
});

// REMOVE from cart
router.delete('/:id', protect, async (req, res) => {
  try {
    await db.ref(`cart/${req.user.id}/${req.params.id}`).remove();
    res.json({ success: true, message: 'Item removed from cart.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove item.' });
  }
});

// CLEAR cart
router.delete('/', protect, async (req, res) => {
  try {
    await db.ref(`cart/${req.user.id}`).remove();
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear cart.' });
  }
});

module.exports = router;
