const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'shop.db'));

// Add some sample products
const seller = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
const category = db.prepare('SELECT id FROM categories WHERE slug = ?').get('electronics');

if (seller && category) {
  const insertProd = db.prepare(`
    INSERT INTO products (uuid, seller_id, category_id, name, slug, description, short_description, price, sale_price, stock, is_featured, is_active, images, rating_avg, rating_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProd.run(
    uuidv4(), seller.id, category.id,
    'iPhone 15 Pro Max - 256GB Natural Titanium', 'iphone-15-pro-max',
    'The ultimate iPhone featuring aerospace-grade titanium design, A17 Pro chip, and a more advanced 48MP Main camera system.',
    'Aerospace-grade titanium design, A17 Pro chip, 48MP camera',
    450000, 425000, 15, 1, 1,
    JSON.stringify(['https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1470&auto=format&fit=crop']),
    4.9, 128
  );

  insertProd.run(
    uuidv4(), seller.id, category.id,
    'Sony WH-1000XM5 Wireless Noise Cancelling Headphones', 'sony-wh-1000xm5',
    'Industry-leading noise cancellation. Two processors control 8 microphones for unprecedented noise cancellation.',
    'Industry-leading noise cancellation, 30 hours battery life.',
    125000, null, 25, 1, 1,
    JSON.stringify(['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=1374&auto=format&fit=crop']),
    4.8, 350
  );

  insertProd.run(
    uuidv4(), seller.id, category.id,
    'MacBook Air M2 2023 - 15 inch', 'macbook-air-m2-15',
    'Supercharged by M2. The 15-inch MacBook Air makes room for more of what you love with a spacious Liquid Retina display.',
    '15-inch Liquid Retina display, M2 chip, 18 hours battery life.',
    420000, 395000, 8, 1, 1,
    JSON.stringify(['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1452&auto=format&fit=crop']),
    4.9, 210
  );

  insertProd.run(
    uuidv4(), seller.id, category.id,
    'Samsung Galaxy S24 Ultra', 'samsung-s24-ultra',
    'Galaxy AI is here. Welcome to the era of mobile AI. With Galaxy S24 Ultra in your hands, you can unleash whole new levels of creativity, productivity and possibility.',
    'Galaxy AI, Titanium Exterior, 200MP Camera.',
    380000, 360000, 12, 1, 1,
    JSON.stringify(['https://images.unsplash.com/photo-1707018861642-f81d850259eb?q=80&w=1470&auto=format&fit=crop']),
    4.7, 85
  );

  console.log('Products seeded!');
}
