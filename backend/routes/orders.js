const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/firebase');
const { protect } = require('../middleware/auth');
const router = express.Router();

const generateOrderNumber = () => `SLK${Date.now()}${Math.floor(Math.random() * 1000)}`;

// PLACE order (Cash on Delivery)
router.post('/', protect, async (req, res) => {
  try {
    const { items, shipping_address, payment_method, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty.' });
    }
    if (!shipping_address || !shipping_address.phone) {
      return res.status(400).json({ success: false, message: 'Shipping address and phone required.' });
    }

    // Since this is COD, payment method is assumed to be COD if not specified
    const method = payment_method || 'COD';

    let subtotal = 0;
    const orderItems = [];
    // Verify products from Firebase and calculate total
    for (const item of items) {
      const pSnapshot = await db.ref(`products/${item.product_id}`).once('value');
      const product = pSnapshot.val();
      
      if (!product) continue;

      const price = product.sale_price || product.price;
      subtotal += price * item.quantity;

      orderItems.push({
        product_id: item.product_id,
        name: product.name,
        price: price,
        quantity: item.quantity,
        variant: item.variant || null,
        total: price * item.quantity
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid products in order.' });
    }

    const shipping_fee = subtotal > 5000 ? 0 : 350; // Example shipping fee logic
    const total = subtotal + shipping_fee;
    const orderNumber = generateOrderNumber();
    const orderId = uuidv4();
    const now = Date.now();

    const orderData = {
      id: orderId,
      order_number: orderNumber,
      user_id: req.user.id,
      customer_name: `${req.user.first_name} ${req.user.last_name}`,
      customer_email: req.user.email,
      status: 'pending',
      payment_status: 'pending',
      payment_method: method,
      subtotal,
      shipping_fee,
      total,
      shipping_address,
      items: orderItems,
      notes: notes || '',
      created_at: now,
      updated_at: now
    };

    // Save order to Firebase (POS will automatically see this because it's Firebase)
    await db.ref(`orders/${orderId}`).set(orderData);

    // Generate WhatsApp Message
    const shopWhatsAppNumber = "947XXXXXXXX"; // TODO: Replace with actual shop number (e.g., 94712345678)
    
    let waMessage = `*New Order: ${orderNumber}*\n`;
    waMessage += `Name: ${shipping_address.name || orderData.customer_name}\n`;
    waMessage += `Phone: ${shipping_address.phone}\n`;
    waMessage += `Address: ${shipping_address.address || shipping_address.line1}\n\n`;
    waMessage += `*Items:*\n`;
    
    orderItems.forEach(i => {
      waMessage += `- ${i.name} (${i.quantity}x) = Rs. ${i.total}\n`;
    });
    
    waMessage += `\nSubtotal: Rs. ${subtotal}\n`;
    waMessage += `Shipping: Rs. ${shipping_fee}\n`;
    waMessage += `*Total: Rs. ${total}*\n`;
    waMessage += `Payment: ${method}\n`;
    
    const whatsapp_url = `https://wa.me/${shopWhatsAppNumber}?text=${encodeURIComponent(waMessage)}`;

    // Optional: Empty user's cart in Firebase if you were storing it there
    await db.ref(`cart/${req.user.id}`).remove();

    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully!', 
      data: orderData,
      whatsapp_url 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to place order.' });
  }
});

// GET user orders
router.get('/', protect, async (req, res) => {
  try {
    const ordersSnapshot = await db.ref('orders').orderByChild('user_id').equalTo(req.user.id).once('value');
    let orders = [];
    ordersSnapshot.forEach(child => {
      orders.push(child.val());
    });
    
    orders.sort((a, b) => b.created_at - a.created_at);

    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
});

module.exports = router;
