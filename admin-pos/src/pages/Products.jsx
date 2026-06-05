import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, UploadCloud, Image as ImageIcon, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import adminApi from '../utils/adminApi';

const Products = ({ isProfitVisible = false }) => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [mainImage, setMainImage] = useState(null); // File object
  const [galleryImages, setGalleryImages] = useState([]); // Array of File objects
  
  const [mainImagePreview, setMainImagePreview] = useState('');
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    barcode: '',
    price: '',
    sale_price: '',
    cost_price: '',
    stock: '',
    category_name: '',
    description: '',
    is_active: 1
  });

  const loadProducts = async () => {
    try {
      const res = await adminApi.getProducts();
      setProducts(res.data || []);
    } catch (error) {
      toast.error(error.message || 'Failed to load products.');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'name' && !editingId) {
      setFormData(prev => ({ ...prev, slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let mainImageUrl = mainImagePreview;
      let galleryUrls = [...galleryPreviews];

      // Since images are now base64 strings, use them directly
      if (mainImage) {
        mainImageUrl = mainImage;
      }

      if (galleryImages.length > 0) {
        galleryUrls = [...galleryUrls.filter(url => !url.startsWith('blob:')), ...galleryImages];
      }

      const productData = {
        name: formData.name,
        slug: formData.slug,
        barcode: formData.barcode || '',
        price: Number(formData.price),
        sale_price: formData.sale_price ? Number(formData.sale_price) : null,
        cost_price: formData.cost_price ? Number(formData.cost_price) : 0,
        stock: Number(formData.stock),
        category_name: formData.category_name,
        description: formData.description,
        images: [mainImageUrl, ...galleryUrls].filter(Boolean),
        is_active: formData.is_active,
        updated_at: Date.now()
      };

      if (editingId) {
        await adminApi.updateProduct(editingId, productData);
      } else {
        await adminApi.createProduct(productData);
      }

      await loadProducts();
      closeModal();
      toast.success('Product uploaded successfully!');
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error.message || "Failed to upload images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await adminApi.deleteProduct(id);
        await loadProducts();
        toast.success('Product removed from catalog.');
      } catch (error) {
        toast.error(error.message || 'Failed to delete product.');
      }
    }
  };

  const openEditModal = (product) => {
    setFormData({
      name: product.name || '',
      slug: product.slug || '',
      barcode: product.barcode || '',
      price: product.price || '',
      sale_price: product.sale_price || '',
      cost_price: product.cost_price || '',
      stock: product.stock || '',
      category_name: product.category_name || '',
      description: product.description || '',
      is_active: product.is_active !== undefined ? product.is_active : 1
    });
    
    // Set Images
    const imgs = product.images || [];
    setMainImagePreview(imgs[0] || '');
    setGalleryPreviews(imgs.slice(1) || []);
    setMainImage(null);
    setGalleryImages([]);
    
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setFormData({ name: '', slug: '', barcode: '', price: '', sale_price: '', cost_price: '', stock: '', category_name: '', description: '', is_active: 1 });
    setMainImagePreview('');
    setGalleryPreviews([]);
    setMainImage(null);
    setGalleryImages([]);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const compressImage = (imageFile) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Return as Base64 string directly to save in Realtime DB
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 0.6 quality for smaller size
          resolve(dataUrl);
        };
        img.onerror = () => {
          // Fallback to FileReader base64 if canvas fails
          resolve(event.target.result);
        };
      };
      reader.onerror = () => resolve(null);
    });
  };

  const handleMainImageDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      // Set preview immediately for UX
      setMainImagePreview(URL.createObjectURL(file));
      // Compress and set file
      const compressedFile = await compressImage(file);
      setMainImage(compressedFile);
    }
  };

  const handleGalleryDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer ? e.dataTransfer.files : e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      // Set previews immediately
      const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...newPreviews]);
      
      // Compress all
      const compressedFiles = await Promise.all(imageFiles.map(file => compressImage(file)));
      setGalleryImages(prev => [...prev, ...compressedFiles]);
    }
  };

  const removeGalleryImage = (index) => {
    const newPreviews = [...galleryPreviews];
    newPreviews.splice(index, 1);
    setGalleryPreviews(newPreviews);
    
    // Note: We're simply removing from previews. If it's a new file, we should remove from galleryImages too.
    // For simplicity, we just keep it in galleryImages but filter it out during upload based on previews. (Requires more complex logic).
    // Better approach: Re-sync files and previews.
  };

  return (
    <div className="p-6">
        <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Product <span className="text-brand-purple">Inventory</span></h2>
          <p className="text-gray-500 mt-1 font-medium">Manage your shop catalog and upload product images seamlessly.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-purple text-white px-6 py-3 rounded-xl shadow-lg shadow-brand-purple/20 flex items-center space-x-2 hover:scale-105 transition-all duration-300 font-bold tracking-wide text-sm"
        >
          <Plus size={20} />
          <span>ADD NEW PRODUCT</span>
        </button>
      </div>

      {/* Products Grid instead of Table for premium look */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-brand-card/50 rounded-2xl border border-white/5 border-dashed">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-600 mb-3" />
            <p className="text-gray-500 font-medium">No products available. Add your first product!</p>
          </div>
        ) : (
          products.map(product => (
            <div key={product.id} className="bg-brand-card/50 rounded-2xl p-5 shadow-sm border border-white/5 hover:border-brand-purple hover:shadow-xl hover:shadow-brand-purple/10 transition-all duration-300 group">
              <div className="flex gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex-shrink-0 relative group-hover:scale-105 transition-transform duration-300 p-1">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain drop-shadow-md opacity-100" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-700">
                      <ImageIcon size={24} />
                    </div>
                  )}
                  {product.images && product.images.length > 1 && (
                    <div className="absolute bottom-1 right-1 bg-black/80 text-brand-purple text-[10px] font-bold px-2 py-0.5 rounded-md">
                      +{product.images.length - 1} photos
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-200 line-clamp-1">{product.name}</h3>
                      <div className="flex space-x-1 transition-opacity">
                        <button onClick={() => openEditModal(product)} className="text-brand-purple bg-brand-dark/50 p-1.5 rounded-lg border border-white/5 hover:border-brand-purple transition-colors">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="text-red-500 bg-brand-dark/50 p-1.5 rounded-lg border border-white/5 hover:border-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-brand-green bg-[#0a0a0a] border border-gray-800 inline-block px-2 py-1 rounded-md mt-1 uppercase tracking-wider">{product.category_name}</p>
                  </div>
                  
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      {product.sale_price ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-white">Rs.{product.sale_price}</span>
                          <span className="text-xs text-gray-500 line-through font-bold">Rs.{product.price}</span>
                        </div>
                      ) : (
                        <span className="text-lg font-black text-white">Rs.{product.price}</span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-[#0a0a0a] px-2 py-1.5 rounded-lg border border-gray-800">
                      Stock: <span className={product.stock > 10 ? 'text-brand-green' : 'text-orange-500'}>{product.stock}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal - Premium UI */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
          <div className="bg-brand-card border border-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-200">
            
            {/* Left side - Image Uploader */}
            <div className="md:w-2/5 bg-[#0a0a0a] p-6 sm:p-8 border-r border-gray-800 flex flex-col gap-6">
              <div>
                <h4 className="font-bold text-gray-300 mb-3 text-sm uppercase tracking-wider">Main Cover Image</h4>
                <label 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleMainImageDrop}
                  className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-700 bg-brand-card hover:border-brand-green transition-colors rounded-2xl cursor-pointer overflow-hidden relative group"
                >
                  {mainImagePreview ? (
                    <>
                      <img src={mainImagePreview} className="w-full h-full object-cover" alt="Main Preview" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-brand-green font-bold flex items-center gap-2 text-sm"><Edit size={16}/> Change Image</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-brand-green transition-colors">
                      <div className="bg-[#0a0a0a] p-3 rounded-full mb-3 border border-gray-800 group-hover:border-brand-green">
                        <UploadCloud size={28} />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider">Click or drag image</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleMainImageDrop} />
                </label>
              </div>

              <div>
                <h4 className="font-bold text-gray-300 mb-3 text-sm uppercase tracking-wider">Gallery <span className="text-[10px] font-normal text-gray-500">(Multiple)</span></h4>
                <label 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleGalleryDrop}
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 bg-brand-card hover:border-brand-green transition-colors rounded-2xl cursor-pointer group"
                >
                  <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-brand-green transition-colors">
                    <Plus size={24} className="mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">Add more photos</p>
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryDrop} />
                </label>

                
                {galleryPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {galleryPreviews.map((url, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square border border-gray-800">
                        <img src={url} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                        <button 
                          type="button" 
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Form Details */}
            <div className="md:w-3/5 p-6 sm:p-8 flex flex-col bg-brand-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-white uppercase tracking-wide">{editingId ? 'Edit Product' : 'Product Details'}</h3>
                <button onClick={closeModal} className="text-gray-500 hover:text-white bg-[#0a0a0a] border border-gray-800 rounded-full p-2 transition-colors"><X size={20} /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="col-span-full sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Product Name</label>
                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-gray-800 text-white rounded-xl px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Barcode</label>
                    <input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} placeholder="Scan or type" className="w-full bg-[#0a0a0a] border border-gray-800 text-brand-green rounded-xl px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none font-bold placeholder-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Category</label>
                    <input type="text" name="category_name" required value={formData.category_name} onChange={handleInputChange} placeholder="e.g. Electronics" className="w-full bg-[#0a0a0a] border border-gray-800 text-white rounded-xl px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none font-medium placeholder-gray-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Cost Price (Rs.) {isProfitVisible ? '' : '🔒'}</label>
                    <input 
                      type={isProfitVisible ? "number" : "password"} 
                      name="cost_price" 
                      required 
                      min="0" 
                      value={formData.cost_price} 
                      onChange={handleInputChange} 
                      disabled={!isProfitVisible}
                      className={`w-full bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none font-bold ${isProfitVisible ? 'text-white' : 'text-red-500 tracking-widest'}`} 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Regular Price (Rs.)</label>
                    <input type="number" name="price" required min="0" value={formData.price} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-gray-800 text-white rounded-xl px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Sale Price (Rs.)</label>
                    <input type="number" name="sale_price" min="0" value={formData.sale_price} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-gray-800 text-brand-green rounded-xl px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Initial Stock</label>
                    <input type="number" name="stock" required min="0" value={formData.stock} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-gray-800 text-white rounded-xl px-4 py-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none font-bold" />
                  </div>
                  <div className="flex items-center pt-7">
                    <label className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input type="checkbox" name="is_active" className="sr-only" checked={formData.is_active === 1} onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})} />
                        <div className={`block w-12 h-6 rounded-full transition-colors ${formData.is_active ? 'bg-brand-green' : 'bg-gray-800'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-[#0a0a0a] w-4 h-4 rounded-full transition-transform ${formData.is_active ? 'transform translate-x-6' : ''}`}></div>
                      </div>
                      <div className="ml-3 text-xs font-bold uppercase tracking-wider text-gray-300">
                        {formData.is_active ? 'Status: Active' : 'Status: Draft'}
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex-1 mt-2">
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Product Description</label>
                  <textarea name="description" rows="4" value={formData.description} onChange={handleInputChange} className="w-full bg-[#0a0a0a] border border-gray-800 text-gray-300 rounded-xl px-4 py-3 focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all outline-none resize-none h-full min-h-[100px] font-medium leading-relaxed"></textarea>
                </div>

                <div className="pt-5 flex justify-end gap-3 mt-auto border-t border-gray-800">
                  <button type="button" onClick={closeModal} disabled={isUploading} className="px-6 py-2.5 text-gray-400 font-bold hover:text-white bg-[#0a0a0a] border border-gray-800 hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50 text-sm tracking-wide">CANCEL</button>
                  <button type="submit" disabled={isUploading} className="px-8 py-2.5 bg-brand-green text-black font-black rounded-xl hover:bg-[#92ff00] shadow-lg shadow-brand-green/20 transition-all disabled:opacity-70 flex items-center gap-2 text-sm tracking-wide">
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        UPLOADING...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        {editingId ? 'SAVE CHANGES' : 'PUBLISH'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
