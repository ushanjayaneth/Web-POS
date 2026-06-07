import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiPlus, FiTrash2, FiEdit2, FiArrowLeft, FiImage, FiPlusCircle, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const SellerProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category_name: '',
    price: '',
    sale_price: '',
    stock: '',
    description: '',
    images: [''], // Starts with one empty field
    wholesale_tiers: [],
  });

  // Wholesale tier inputs
  const [tierQty, setTierQty] = useState('');
  const [tierPrice, setTierPrice] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sellers/products');
      if (res.success) {
        setProducts(res.data || []);
      }
    } catch (e) {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    
    // Fetch categories
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        if (res.success) {
          setCategories(res.data || []);
        }
      } catch (err) {}
    };
    fetchCats();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (index, value) => {
    const updated = [...formData.images];
    updated[index] = value;
    setFormData({ ...formData, images: updated });
  };

  const addImageField = () => {
    if (formData.images.length < 4) {
      setFormData({ ...formData, images: [...formData.images, ''] });
    } else {
      toast.error('Maximum 4 images allowed.');
    }
  };

  const removeImageField = (index) => {
    const updated = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: updated.length === 0 ? [''] : updated });
  };

  // Base64 file picker
  const handleFileChange = (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      return toast.error('Image is too large. Max size is 1.5MB.');
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleImageChange(index, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const addWholesaleTier = () => {
    if (!tierQty || !tierPrice) {
      return toast.error('Please enter both quantity and price.');
    }
    const newTier = {
      quantity: Number(tierQty),
      price: Number(tierPrice)
    };
    setFormData({
      ...formData,
      wholesale_tiers: [...formData.wholesale_tiers, newTier].sort((a,b) => a.quantity - b.quantity)
    });
    setTierQty('');
    setTierPrice('');
  };

  const removeWholesaleTier = (idx) => {
    setFormData({
      ...formData,
      wholesale_tiers: formData.wholesale_tiers.filter((_, i) => i !== idx)
    });
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name || '',
      category_name: product.category_name || '',
      price: product.price || '',
      sale_price: product.sale_price || '',
      stock: product.stock || '',
      description: product.description || '',
      images: Array.isArray(product.images) && product.images.length > 0 ? product.images : [''],
      wholesale_tiers: product.wholesale_tiers || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await api.delete(`/sellers/products/${id}`);
      if (res.success) {
        toast.success('Product deleted.');
        fetchProducts();
      }
    } catch (err) {
      toast.error('Failed to delete product.');
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category_name: categories[0]?.name || 'Clothing',
      price: '',
      sale_price: '',
      stock: '',
      description: '',
      images: [''],
      wholesale_tiers: [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.stock) {
      return toast.error('Please fill in required fields.');
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        sale_price: formData.sale_price ? Number(formData.sale_price) : null,
        stock: Number(formData.stock),
        images: formData.images.filter(img => img.trim() !== '')
      };

      let res;
      if (editingId) {
        res = await api.put(`/sellers/products/${editingId}`, payload);
      } else {
        res = await api.post('/sellers/products', payload);
      }

      if (res.success) {
        toast.success(editingId ? 'Product updated! Review pending.' : 'Product submitted! Review pending.');
        setShowForm(false);
        fetchProducts();
      } else {
        toast.error(res.message || 'Action failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Request failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <span className="badge badge-success">Approved</span>;
      case 'rejected': return <span className="badge badge-danger">Rejected</span>;
      default: return <span className="badge badge-warning">Pending Review</span>;
    }
  };

  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px' }}>
      <Helmet><title>My Products | Seller Portal</title></Helmet>

      {/* Navigation Headers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
        <Link to="/seller/dashboard" style={{ display: 'flex', alignItems: 'center', color: '#666', textDecoration: 'none' }}>
          <FiArrowLeft size={20} style={{ marginRight: '6px' }} /> Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1>My Inventory</h1>
          <p style={{ color: '#666', marginTop: '4px' }}>Add new items or edit active listings. All additions require admin approval.</p>
        </div>
        {!showForm && (
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiPlus /> Add New Product
          </button>
        )}
      </div>

      {showForm ? (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '32px', marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '24px' }}>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <label>
                Product Name *
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product title"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '6px' }}
                />
              </label>

              <label>
                Category *
                <select
                  name="category_name"
                  value={formData.category_name}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '6px' }}
                >
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <label>
                Regular Price (Rs.) *
                <input
                  type="number"
                  name="price"
                  required
                  min="0"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="E.g., 1200"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '6px' }}
                />
              </label>

              <label>
                Sale Price (Rs., Optional)
                <input
                  type="number"
                  name="sale_price"
                  min="0"
                  value={formData.sale_price}
                  onChange={handleInputChange}
                  placeholder="Discounted price"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '6px' }}
                />
              </label>

              <label>
                Available Stock Qty *
                <input
                  type="number"
                  name="stock"
                  required
                  min="0"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="Items count"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '6px' }}
                />
              </label>
            </div>

            <label>
              Product Description
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Details about material, specs, sizes..."
                rows="4"
                style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '6px', fontFamily: 'inherit' }}
              />
            </label>

            {/* Wholesale Tiers */}
            <div style={{ background: '#fcfcfc', border: '1px solid #eee', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Wholesale Price Tiers (Optional)</h3>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
                <label style={{ fontSize: '12px' }}>
                  Min Quantity
                  <input
                    type="number"
                    value={tierQty}
                    onChange={(e) => setTierQty(e.target.value)}
                    placeholder="10"
                    style={{ width: '100px', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', marginTop: '4px' }}
                  />
                </label>
                <label style={{ fontSize: '12px' }}>
                  Unit Price (Rs.)
                  <input
                    type="number"
                    value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)}
                    placeholder="950"
                    style={{ width: '150px', padding: '8px', border: '1px solid #ccc', borderRadius: '6px', marginTop: '4px' }}
                  />
                </label>
                <button type="button" onClick={addWholesaleTier} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                  Add Tier
                </button>
              </div>

              {/* Tiers List */}
              {formData.wholesale_tiers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.wholesale_tiers.map((t, idx) => (
                    <div key={idx} style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Qty ≥ {t.quantity} = Rs. {t.price}</span>
                      <FiXCircle style={{ cursor: 'pointer' }} onClick={() => removeWholesaleTier(idx)} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Images */}
            <div style={{ background: '#fcfcfc', border: '1px solid #eee', borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>Product Images (Max 4)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formData.images.map((img, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '50px', height: '50px', border: '1px solid #ddd', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {img ? (
                        <img src={img} alt="Product preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FiImage size={24} style={{ color: '#aaa' }} />
                      )}
                    </div>
                    <input
                      type="text"
                      value={img}
                      onChange={(e) => handleImageChange(idx, e.target.value)}
                      placeholder="Paste image URL OR upload file on the right"
                      style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '8px' }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, idx)}
                      style={{ display: 'none' }}
                      id={`file-picker-${idx}`}
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById(`file-picker-${idx}`).click()}
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '12px' }}
                    >
                      Browse
                    </button>
                    {formData.images.length > 1 && (
                      <button type="button" onClick={() => removeImageField(idx)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                
                {formData.images.length < 4 && (
                  <button type="button" onClick={addImageField} className="btn btn-secondary" style={{ display: 'inline-flex', width: 'fit-content', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px' }}>
                    <FiPlusCircle /> Add Image Field
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
                {submitting ? 'Submitting...' : 'Submit Product'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Inventory Table */
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#888' }}>
              Your inventory is empty. Click <strong>Add New Product</strong> to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #eee', color: '#666' }}>
                    <th style={{ padding: '12px 8px' }}>Image</th>
                    <th style={{ padding: '12px 8px' }}>Name</th>
                    <th style={{ padding: '12px 8px' }}>Category</th>
                    <th style={{ padding: '12px 8px' }}>Price</th>
                    <th style={{ padding: '12px 8px' }}>Stock</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ width: '40px', height: '40px', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                          <img 
                            src={p.images?.[0] || 'https://via.placeholder.com/40'} 
                            alt={p.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{p.name}</td>
                      <td style={{ padding: '12px 8px' }}>{p.category_name}</td>
                      <td style={{ padding: '12px 8px' }}>
                        {p.sale_price ? (
                          <>
                            <span style={{ textDecoration: 'line-through', color: '#888', marginRight: '6px', fontSize: '12px' }}>Rs. {p.price}</span>
                            <span style={{ fontWeight: 'bold', color: '#16a34a' }}>Rs. {p.sale_price}</span>
                          </>
                        ) : (
                          <span>Rs. {p.price}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 8px' }}>{p.stock} units</td>
                      <td style={{ padding: '12px 8px' }}>{getStatusBadge(p.approval_status)}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleEdit(p)} 
                          style={{ color: '#2563eb', border: 'none', background: 'none', marginRight: '16px', cursor: 'pointer' }}
                          title="Edit Product"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}
                          title="Delete Product"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SellerProducts;
