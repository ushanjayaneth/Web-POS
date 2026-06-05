import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, ShoppingBag, BookOpen } from 'lucide-react';
import adminApi from '../utils/adminApi';

const PosTerminal = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState(0);
  const searchInputRef = useRef(null);

  const loadProducts = async () => {
    try {
      const res = await adminApi.getProducts();
      setProducts((res.data || []).filter(p => p.is_active !== 0 && p.is_active !== false));
    } catch (error) {
      alert(error.message || 'Failed to load products.');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Barcode scanner listener
  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimer = null;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && e.target === searchInputRef.current && searchQuery) {
          // If in search box and hit enter, try to find by barcode
          const matchedProduct = products.find(p => p.barcode === searchQuery);
          if (matchedProduct) {
            addToCart(matchedProduct);
            setSearchQuery('');
          }
        }
        return;
      }

      // Buffer characters
      if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }

      if (barcodeTimer) clearTimeout(barcodeTimer);
      
      barcodeTimer = setTimeout(() => {
        if (barcodeBuffer.length > 3) {
          const matchedProduct = products.find(p => p.barcode === barcodeBuffer);
          if (matchedProduct) {
            addToCart(matchedProduct);
          }
        }
        barcodeBuffer = '';
      }, 50);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.slug && p.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        alert('Cannot add more than available stock!');
        return;
      }
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (product.stock <= 0) {
        alert('Out of stock!');
        return;
      }
      setCart([...cart, { 
        ...product, 
        quantity: 1,
        cart_price: product.sale_price || product.price 
      }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        if (newQ > item.stock) {
          alert('Cannot exceed available stock!');
          return item;
        }
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.cart_price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async (paymentMethod) => {
    if (cart.length === 0) return;

    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        discount,
        payment_method: paymentMethod,
      };

      if (paymentMethod === 'loan') {
        const customerName = prompt("Enter customer name for this loan:");
        if (!customerName) return; // Cancelled
        saleData.customer_name = customerName;
      }

      await adminApi.createSale(saleData);

      // Clear cart
      setCart([]);
      setDiscount(0);
      await loadProducts();
      alert(paymentMethod === 'loan' ? 'Loan recorded successfully!' : 'Sale completed successfully!');

    } catch (err) {
      console.error(err);
      alert('Failed to complete sale. Check your internet connection.');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full w-full overflow-hidden">
      {/* Products Section */}
      <div className="w-full lg:w-[65%] p-4 md:p-6 overflow-y-auto h-full">
        <div className="mb-6 md:mb-8 relative">
          <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search items or scan barcode..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-brand-card text-white rounded-xl border border-white/10 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple outline-none transition-all placeholder-gray-500 font-medium"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-5 pb-6 lg:pb-20">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              onClick={() => addToCart(product)}
              className={`bg-brand-card p-3 rounded-2xl border ${product.stock <= 0 ? 'opacity-40 cursor-not-allowed border-red-900/50' : 'cursor-pointer border-white/5 hover:border-brand-purple hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-purple/20'} transition-all duration-300 flex flex-col group`}
            >
              <div className="h-28 md:h-36 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl mb-3 overflow-hidden relative p-2">
                {product.images && product.images[0] ? (
                  <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain drop-shadow-xl opacity-100 group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600"><ShoppingBag size={24} md:size={32} /></div>
                )}
                {product.stock <= 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="bg-red-500 text-white text-[10px] md:text-xs font-bold px-2 md:px-3 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-between px-1">
                <h3 className="font-bold text-gray-200 line-clamp-2 leading-tight text-xs md:text-sm mb-2">{product.name}</h3>
                <div className="flex justify-between items-end mt-auto flex-wrap gap-1">
                  <span className="font-black text-[#A855F7] text-sm md:text-lg tracking-tight">Rs. {(product.sale_price || product.price).toLocaleString()}</span>
                  <span className={`text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg uppercase tracking-wider ${product.stock > 5 ? 'bg-green-500/20 text-green-400' : product.stock > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                    {product.stock} left
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-[35%] bg-brand-dark lg:border-l border-t lg:border-t-0 border-white/10 flex flex-col h-full shadow-2xl overflow-hidden mt-4 lg:mt-0">
        <div className="p-4 md:p-6 border-b border-white/5 bg-brand-card flex justify-between items-center">
          <h2 className="text-lg md:text-xl font-black text-white tracking-wide">BILLING CART</h2>
          <span className="bg-brand-dark text-brand-purple font-bold text-xs px-3 py-1 rounded-full border border-brand-purple/30">{cart.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <ShoppingBag size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Cart is empty</p>
              <p className="text-sm opacity-60">Add items or scan barcode</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-brand-card/50 p-4 rounded-xl border border-white/5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-gray-200 line-clamp-2 text-sm pr-4">{item.name}</h4>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-brand-purple font-bold text-sm">Rs. {(item.cart_price).toLocaleString()}</p>
                  <div className="flex items-center space-x-1 bg-brand-dark rounded-lg border border-white/10 p-0.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1.5 text-gray-400 hover:text-white rounded-md transition-colors"><Minus size={14} /></button>
                    <span className="font-bold w-6 text-center text-white text-sm">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1.5 text-gray-400 hover:text-white rounded-md transition-colors"><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-brand-card p-6 border-t border-white/5">
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between bg-brand-dark/50 p-3 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Discount</span>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-2 font-medium">Rs.</span>
                <input 
                  type="number" 
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="w-20 px-2 py-1.5 bg-brand-dark border border-white/10 rounded-lg text-right text-white focus:border-brand-purple focus:outline-none font-bold"
                />
              </div>
            </div>
            
            <div className="flex justify-between text-gray-400 text-xs font-bold uppercase tracking-wider px-2">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-black text-white px-2">
              <span className="text-gray-400 text-sm uppercase tracking-wider mt-2">Total</span>
              <span className="text-brand-green">{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => handleCheckout('cash')}
              disabled={cart.length === 0}
              className="py-3 px-2 bg-green-700/80 hover:bg-green-600 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide text-xs flex flex-col items-center justify-center space-y-1 transition-all shadow-[0_0_20px_rgba(34,197,94,0.15)] border border-green-500/30"
            >
              <Banknote size={18} />
              <span>CASH</span>
            </button>
            <button 
              onClick={() => handleCheckout('card')}
              disabled={cart.length === 0}
              className="py-3 px-2 bg-blue-700/80 hover:bg-blue-600 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide text-xs flex flex-col items-center justify-center space-y-1 transition-all shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-blue-500/30"
            >
              <CreditCard size={18} />
              <span>CARD</span>
            </button>
            <button 
              onClick={() => handleCheckout('loan')}
              disabled={cart.length === 0}
              className="py-3 px-2 bg-purple-700/80 hover:bg-purple-600 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide text-xs flex flex-col items-center justify-center space-y-1 transition-all shadow-[0_0_20px_rgba(168,85,247,0.15)] border border-purple-500/30"
            >
              <BookOpen size={18} />
              <span>LOAN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosTerminal;
