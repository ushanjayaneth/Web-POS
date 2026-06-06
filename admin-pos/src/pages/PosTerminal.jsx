import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, ShoppingBag, BookOpen, AlertTriangle } from 'lucide-react';
import adminApi from '../utils/adminApi';
import { useLang } from '../utils/translations';

const PosTerminal = () => {
  const { lang, toggleLang, t } = useLang();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loanCustomers, setLoanCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState(0);

  // Viewport-based lazy rendering limit
  const getInitialLimit = () => window.innerWidth < 768 ? 12 : 18;
  const [visibleLimit, setVisibleLimit] = useState(getInitialLimit());

  useEffect(() => {
    setVisibleLimit(getInitialLimit());
  }, [searchQuery]);

  // Quick Cash State
  const [cashReceived, setCashReceived] = useState('');

  // Custom Item Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', price: '', quantity: 1, isCredit: false });

  // Loan Customer Selection Modal State
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [loanCustomerSearch, setLoanCustomerSearch] = useState('');

  const searchInputRef = useRef(null);

  // isInitial=true shows loading skeleton on first load; background polls stay silent
  const loadProducts = async (isInitial = false, showError = false) => {
    if (isInitial) setLoading(true);
    try {
      const prodRes = await adminApi.getPosProducts();
      setProducts((prodRes.data || []).filter(p => p.is_active !== 0 && p.is_active !== false));
    } catch (error) {
      if (showError) {
        alert(error.message || 'Failed to load products.');
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const loadLoanCustomers = async (showError = false) => {
    try {
      const custRes = await adminApi.getLoanCustomers();
      setLoanCustomers(custRes.data || []);
    } catch (error) {
      if (showError) {
        alert(error.message || 'Failed to load loan customers.');
      }
    }
  };

  // Keep products on the fastest path; customer data loads in the background.
  const loadData = async (isInitial = false) => {
    const productsPromise = loadProducts(isInitial, isInitial);
    loadLoanCustomers(false);
    await productsPromise;
  };

  useEffect(() => {
    loadProducts(true, true);
    loadLoanCustomers(false);

    const productRefreshTimer = window.setInterval(() => loadProducts(false), 5000);
    const loanRefreshTimer = window.setInterval(() => loadLoanCustomers(false), 60000);
    const refreshOnFocus = () => {
      loadProducts(false);
      loadLoanCustomers(false);
    };
    const refreshOnVisible = () => {
      if (!document.hidden) refreshOnFocus();
    };
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnVisible);

    return () => {
      window.clearInterval(productRefreshTimer);
      window.clearInterval(loanRefreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnVisible);
    };
  }, []);

  // Barcode scanner listener
  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimer = null;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key === 'Enter' && e.target === searchInputRef.current && searchQuery) {
          const matchedProduct = products.find(p => p.barcode === searchQuery);
          if (matchedProduct) {
            addToCart(matchedProduct);
            setSearchQuery('');
          }
        }
        return;
      }

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
  }, [products, cart, searchQuery]);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.slug && p.slug.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      const isMobile = window.innerWidth < 768;
      const chunk = isMobile ? 12 : 18;
      setVisibleLimit(prev => Math.min(prev + chunk, filteredProducts.length));
    }
  };

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

  const addCustomItemToCart = () => {
    const price = parseFloat(customForm.price) || 0;
    const qty = parseInt(customForm.quantity) || 1;
    if (!customForm.name.trim()) {
      alert('Item name is required');
      return;
    }

    const generatedId = 'CUSTOM_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const finalPrice = customForm.isCredit ? -Math.abs(price) : price;
    const finalName = customForm.isCredit ? `[CREDIT] ${customForm.name}` : customForm.name;

    const newItem = {
      id: generatedId,
      name: finalName,
      price: finalPrice,
      cart_price: finalPrice,
      quantity: qty,
      stock: 99999,
      is_custom: true
    };

    setCart([...cart, newItem]);
    setCustomForm({ name: '', price: '', quantity: 1, isCredit: false });
    setShowCustomModal(false);
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        if (!item.is_custom && newQ > item.stock) {
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

  const addQuickCash = (amt) => {
    const current = parseFloat(cashReceived) || 0;
    setCashReceived((current + amt).toString());
  };

  const handleCheckout = async (paymentMethod) => {
    if (cart.length === 0) return;

    let customer_name = '';
    let customer_id = '';

    if (paymentMethod === 'loan') {
      if (!selectedCustomer) {
        setShowLoanModal(true);
        return;
      }
      const selected = loanCustomers.find(c => c.id === selectedCustomer);
      if (selected) {
        customer_name = selected.name;
        customer_id = selected.id;
      }
    }

    try {
      const saleData = {
        items: cart.map(item => ({
          product_id: item.id,
          name: item.is_custom ? item.name : undefined,
          price: item.is_custom ? item.cart_price : undefined,
          quantity: item.quantity,
          is_custom: item.is_custom
        })),
        discount,
        payment_method: paymentMethod,
        customer_name,
        customer_id: customer_id || undefined
      };

      await adminApi.createSale(saleData);

      setCart([]);
      setDiscount(0);
      setCashReceived('');
      setSelectedCustomer('');
      setShowLoanModal(false);

      await loadData(false);
      alert(paymentMethod === 'loan' ? 'Loan sale recorded successfully!' : 'Sale completed successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to complete sale: ' + (err.message || 'Check connection.'));
    }
  };

  const calculatedChange = Math.max(0, (parseFloat(cashReceived) || 0) - total);

  const filteredCustomers = loanCustomers.filter(c =>
    c.name.toLowerCase().includes(loanCustomerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(loanCustomerSearch))
  );

  return (
    <div className="flex flex-col lg:flex-row flex-1 h-full w-full overflow-hidden bg-brand-dark">
      {/* Products Section */}
      <div className="w-full lg:w-[65%] p-4 md:p-6 overflow-y-auto h-full flex flex-col">
        {/* Header tools */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={t('scanBarcode') || 'Scan barcode or search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-brand-card text-white rounded-xl border border-white/10 focus:border-brand-purple outline-none transition-all placeholder-gray-600 font-medium"
            />
          </div>

          <button
            onClick={() => setShowCustomModal(true)}
            className="bg-[#1e1b4b] hover:bg-[#312e81] border border-brand-purple/40 text-brand-purple px-4 py-3 rounded-xl font-bold text-xs md:text-sm whitespace-nowrap transition-all"
          >
            {t('addCustomItem') || '+ Custom'}
          </button>

          <button
            onClick={toggleLang}
            className="bg-[#0a0a0a] border border-gray-800 text-gray-400 hover:text-white px-4 py-3 rounded-xl font-black text-xs md:text-sm uppercase tracking-wider transition-all"
          >
            {lang === 'si' ? 'English' : 'Sinhala'}
          </button>
        </div>

        {/* Product Grid */}
        <div onScroll={handleScroll} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 flex-1 pb-24 overflow-y-auto pr-1">
          {loading ? (
            // Loading skeleton — shows instantly while data fetches
            [...Array(8)].map((_, i) => (
              <div key={i} className="bg-brand-card p-3 rounded-2xl border border-white/5 animate-pulse">
                <div className="h-24 md:h-28 bg-white/5 rounded-xl mb-2" />
                <div className="h-3 bg-white/5 rounded mb-2 w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            ))
          ) : filteredProducts.length === 0 && searchQuery ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-600">
              <ShoppingBag size={32} className="mb-2 opacity-30" />
              <p className="text-xs font-bold">{t('search') || 'No results found'}</p>
            </div>
          ) : (
            filteredProducts.slice(0, visibleLimit).map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`bg-brand-card p-3 rounded-2xl border ${product.stock <= 0 ? 'opacity-40 cursor-not-allowed border-red-900/50' : 'cursor-pointer border-white/5 hover:border-brand-purple hover:-translate-y-0.5'} transition-all flex flex-col justify-between`}
              >
                <div className="h-24 md:h-28 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl mb-2 overflow-hidden relative p-1">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600"><ShoppingBag size={20} /></div>
                  )}
                  {product.stock <= 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Out of Stock</span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-200 line-clamp-2 leading-tight text-xs mb-1.5">{product.name}</h3>
                  <div className="flex justify-between items-end mt-auto flex-wrap gap-1">
                    <span className="font-black text-brand-purple text-xs md:text-sm">Rs. {(product.sale_price || product.price).toLocaleString()}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${product.stock > 5 ? 'bg-green-500/20 text-green-400' : product.stock > 0 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {product.stock} {t('qty')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Billing Cart Section */}
      <div className="w-full lg:w-[35%] bg-brand-dark lg:border-l border-t lg:border-t-0 border-white/10 flex flex-col h-full shadow-2xl overflow-hidden mt-4 lg:mt-0">
        <div className="p-4 border-b border-white/5 bg-brand-card flex justify-between items-center">
          <h2 className="text-sm md:text-base font-black text-white tracking-wide uppercase">{t('cart') || 'Billing Cart'}</h2>
          <span className="bg-brand-dark text-brand-purple font-bold text-xs px-3 py-1 rounded-full border border-brand-purple/20">{cart.length} items</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 py-12">
              <ShoppingBag size={40} className="mb-2 opacity-25" />
              <p className="text-xs font-bold">{t('cart') || 'Cart is empty'}</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-brand-card/30 p-3 rounded-xl border border-white/5 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-200 line-clamp-2 text-xs pr-4">{item.name}</h4>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-brand-purple font-bold text-xs">Rs. {(item.cart_price).toLocaleString()}</p>
                  <div className="flex items-center space-x-1 bg-brand-dark rounded-lg border border-white/10 p-0.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-gray-400 hover:text-white transition-colors"><Minus size={12} /></button>
                    <span className="font-bold w-6 text-center text-white text-xs">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-gray-400 hover:text-white transition-colors"><Plus size={12} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Cash Pad & Checkout Panel */}
        <div className="bg-brand-card p-5 border-t border-white/5 space-y-4">

          {/* Quick Cash calculator */}
          {cart.length > 0 && (
            <div className="bg-brand-dark/40 border border-white/5 p-3 rounded-xl">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">{t('quickCashPad') || 'Quick Cash Pad'}</span>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[100, 500, 1000, 5000].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => addQuickCash(amt)}
                    className="bg-[#151515] border border-gray-800 text-white font-bold text-xs py-1.5 rounded-lg hover:border-brand-purple transition-all"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{t('cashReceived') || 'Cash Received'}</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-gray-800 rounded-lg px-2.5 py-1 text-sm font-bold text-white outline-none focus:border-brand-purple"
                  />
                </div>
                {parseFloat(cashReceived) > 0 && (
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{t('changeDue') || 'Change Due'}</span>
                    <div className="text-brand-green font-black text-sm">Rs. {calculatedChange.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Discount and Totals */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-brand-dark/50 p-2.5 rounded-xl border border-white/5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('discount') || 'Discount'}</span>
              <div className="flex items-center">
                <span className="text-gray-500 text-xs mr-2 font-medium">Rs.</span>
                <input
                  type="number"
                  min="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                  className="w-20 px-2 py-1.5 bg-brand-dark border border-white/10 rounded-lg text-right text-white focus:border-brand-purple focus:outline-none font-bold text-xs"
                />
              </div>
            </div>

            <div className="flex justify-between text-gray-500 text-xs font-bold uppercase tracking-wider px-1">
              <span>{t('subtotal') || 'Subtotal'}</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>

            {cart.some(item => item.price < 0) && (
              <div className="flex items-center gap-1.5 text-[10px] text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded">
                <AlertTriangle size={12} /> Exchanged items applied as credit reduction.
              </div>
            )}

            <div className="flex justify-between items-center text-xl font-black text-white px-1">
              <span className="text-gray-500 text-[10px] uppercase tracking-wider">{t('total') || 'Total'}</span>
              <span className="text-brand-green">Rs. {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment action buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleCheckout('cash')}
              disabled={cart.length === 0}
              className="py-3 bg-green-700/80 hover:bg-green-600 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide text-xs flex flex-col items-center justify-center space-y-1 transition-all border border-green-500/30"
            >
              <Banknote size={16} />
              <span>{t('cash') || 'CASH'}</span>
            </button>
            <button
              onClick={() => handleCheckout('card')}
              disabled={cart.length === 0}
              className="py-3 bg-blue-700/80 hover:bg-blue-600 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide text-xs flex flex-col items-center justify-center space-y-1 transition-all border border-blue-500/30"
            >
              <CreditCard size={16} />
              <span>{t('card') || 'CARD'}</span>
            </button>
            <button
              onClick={() => handleCheckout('loan')}
              disabled={cart.length === 0}
              className="py-3 bg-purple-700/80 hover:bg-purple-600 disabled:opacity-20 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide text-xs flex flex-col items-center justify-center space-y-1 transition-all border border-purple-500/30"
            >
              <BookOpen size={16} />
              <span>{t('loan') || 'LOAN'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ CUSTOM ITEM MODAL ════════════════════════════════════════ */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white">Add Quick Custom Item</h3>
              <button onClick={() => setShowCustomModal(false)} className="text-gray-600 hover:text-white">X</button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Item Name / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Photocopy, Binding..."
                  value={customForm.name}
                  onChange={e => setCustomForm(p => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-brand-purple outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Unit Price (Rs.)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={customForm.price}
                  onChange={e => setCustomForm(p => ({ ...p, price: e.target.value }))}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-brand-purple outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCredit"
                  checked={customForm.isCredit}
                  onChange={e => setCustomForm(p => ({ ...p, isCredit: e.target.checked }))}
                  className="w-4 h-4 accent-brand-purple"
                />
                <label htmlFor="isCredit" className="text-xs text-yellow-500 font-bold cursor-pointer">
                  Return Exchange Credit (Negative Price)
                </label>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={customForm.quantity}
                  onChange={e => setCustomForm(p => ({ ...p, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="mt-1 w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-brand-purple outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 bg-[#060a0f] border border-gray-800 text-gray-400 py-2.5 rounded-xl font-bold text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={addCustomItemToCart}
                className="flex-1 bg-brand-purple hover:bg-brand-purple-hover text-white py-2.5 rounded-xl font-black text-xs"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ SELECT LOAN CUSTOMER MODAL ═══════════════════════════════ */}
      {showLoanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-gray-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-white">Select Loan Customer</h3>
              <button onClick={() => setShowLoanModal(false)} className="text-gray-600 hover:text-white">X</button>
            </div>

            <input
              type="text"
              placeholder="Search customer name or phone..."
              value={loanCustomerSearch}
              onChange={e => setLoanCustomerSearch(e.target.value)}
              className="w-full bg-[#060a0f] border border-gray-800 text-white rounded-xl px-3 py-2 text-xs focus:border-brand-purple outline-none mb-3"
            />

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-800 mb-4 pr-1">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No customers found.
                </div>
              ) : (
                filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedCustomer(c.id); }}
                    className={`p-2.5 cursor-pointer text-xs flex justify-between items-center rounded-lg transition-colors ${selectedCustomer === c.id ? 'bg-brand-purple/20 text-white font-bold' : 'text-gray-300 hover:bg-white/[0.03]'}`}
                  >
                    <div>
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-gray-500">{c.phone || 'No phone'}</div>
                    </div>
                    {selectedCustomer === c.id && <span className="text-brand-purple font-black text-sm">Selected</span>}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowLoanModal(false); setSelectedCustomer(''); }}
                className="flex-1 bg-[#060a0f] border border-gray-800 text-gray-400 py-2.5 rounded-xl font-bold text-xs hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCheckout('loan')}
                disabled={!selectedCustomer}
                className="flex-1 bg-brand-purple hover:bg-brand-purple-hover text-white py-2.5 rounded-xl font-black text-xs disabled:opacity-40"
              >
                Confirm Loan Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PosTerminal;
