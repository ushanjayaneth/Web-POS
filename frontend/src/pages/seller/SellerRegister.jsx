import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiBriefcase, FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useSellerAuthStore } from '../../store';
import api from '../../utils/api';

const SellerRegister = () => {
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    email: '',
    phone: '',
    nic_br: '',
    address: '',
    description: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch categories for product selection tags
    const fetchCats = async () => {
      try {
        const res = await api.get('/categories');
        if (res.success) {
          setCategories(res.data || []);
        }
      } catch (e) {
        // Fallback categories list
        setCategories([
          { id: 'clothing', name: 'Clothing & Fashion' },
          { id: 'electronics', name: 'Electronics & Gadgets' },
          { id: 'home', name: 'Home & Living' },
          { id: 'grocery', name: 'Grocery & Food' },
          { id: 'beauty', name: 'Beauty & Health' }
        ]);
      }
    };
    fetchCats();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCategoryToggle = (catName) => {
    if (selectedCategories.includes(catName)) {
      setSelectedCategories(selectedCategories.filter(c => c !== catName));
    } else {
      setSelectedCategories([...selectedCategories, catName]);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.business_name || !formData.nic_br) {
        return toast.error('Please fill in business details');
      }
      if (selectedCategories.length === 0) {
        return toast.error('Please select at least one category');
      }
    } else if (step === 2) {
      if (!formData.owner_name || !formData.email || !formData.phone || !formData.address) {
        return toast.error('Please fill in contact details');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        return toast.error('Please enter a valid email address');
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 8) {
      return toast.error('Password must be at least 8 characters long');
    }

    setLoading(true);
    try {
      const res = await api.post('/sellers/register', {
        business_name: formData.business_name,
        owner_name: formData.owner_name,
        email: formData.email,
        phone: formData.phone,
        nic_br: formData.nic_br,
        address: formData.address,
        description: formData.description,
        categories: selectedCategories,
        password: formData.password
      });

      if (res.success) {
        setIsSubmitted(true);
        toast.success('Application submitted successfully!');
      } else {
        toast.error(res.message || 'Failed to submit application');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="container success-state page-empty" style={{ padding: '60px 20px', maxWidth: '600px', textAlign: 'center' }}>
        <Helmet><title>Application Submitted | Seller Portal</title></Helmet>
        <FiCheckCircle size={64} style={{ color: '#16a34a', marginBottom: '24px' }} />
        <h1 style={{ color: '#16a34a' }}>Application Submitted!</h1>
        <p style={{ margin: '16px 0 24px', color: '#666', lineHeight: '1.6' }}>
          Thank you for applying to sell on <strong>ShoppingLK</strong>. Your application is now pending admin review.
        </p>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '32px' }}>
          You will receive an email confirmation at <strong>{formData.email}</strong> once your account has been reviewed.
        </p>
        <Link to="/" className="btn btn-primary">Back to Homepage</Link>
      </div>
    );
  }

  return (
    <div className="auth-page container">
      <Helmet><title>Seller Application | ShoppingLK</title></Helmet>

      <section className="auth-intro">
        <p className="eyebrow">Seller Portal Registration</p>
        <h1>Become a Partner Seller.</h1>
        <p>Register in minutes. Provide your business info, owner details, and password, and we will get back to you shortly.</p>
        <div style={{ marginTop: '24px', display: 'flex', gap: '8px' }}>
          <div style={{ padding: '4px 8px', borderRadius: '4px', background: step >= 1 ? '#16a34a' : '#ddd', color: '#fff', fontSize: '12px' }}>Step 1</div>
          <div style={{ padding: '4px 8px', borderRadius: '4px', background: step >= 2 ? '#16a34a' : '#ddd', color: '#fff', fontSize: '12px' }}>Step 2</div>
          <div style={{ padding: '4px 8px', borderRadius: '4px', background: step >= 3 ? '#16a34a' : '#ddd', color: '#fff', fontSize: '12px' }}>Step 3</div>
        </div>
      </section>

      <section className="auth-card">
        <h2>Seller Application (Step {step}/3)</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          {step === 1 && (
            <>
              <label>
                Business/Shop Name
                <span className="input-shell">
                  <FiBriefcase />
                  <input
                    type="text"
                    name="business_name"
                    required
                    value={formData.business_name}
                    onChange={handleChange}
                    placeholder="E.g., Star Electronics"
                  />
                </span>
              </label>

              <label>
                NIC or Business Reg Number
                <span className="input-shell">
                  <FiBriefcase />
                  <input
                    type="text"
                    name="nic_br"
                    required
                    value={formData.nic_br}
                    onChange={handleChange}
                    placeholder="1999XXXXXX or BRXXXXXX"
                  />
                </span>
              </label>

              <label style={{ marginBottom: '8px' }}>Select Product Categories to Sell</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  return (
                    <button
                      key={cat.id || cat.name}
                      type="button"
                      onClick={() => handleCategoryToggle(cat.name)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: isSelected ? '#16a34a' : '#ccc',
                        background: isSelected ? '#e8f5e9' : '#fff',
                        color: isSelected ? '#16a34a' : '#333',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: isSelected ? 'bold' : 'normal'
                      }}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>

              <label>
                Brief Description of Products
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe what you plan to sell on ShoppingLK..."
                  rows="3"
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '8px', fontFamily: 'inherit' }}
                />
              </label>

              <button type="button" onClick={nextStep} className="btn btn-primary auth-submit" style={{ marginTop: '12px' }}>
                Next Step
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <label>
                Owner Full Name
                <span className="input-shell">
                  <FiUser />
                  <input
                    type="text"
                    name="owner_name"
                    required
                    value={formData.owner_name}
                    onChange={handleChange}
                    placeholder="Owner's name"
                  />
                </span>
              </label>

              <label>
                Business Email Address
                <span className="input-shell">
                  <FiMail />
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@shopname.com"
                  />
                </span>
              </label>

              <label>
                Phone/WhatsApp Number
                <span className="input-shell">
                  <FiPhone />
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="07XXXXXXXX"
                  />
                </span>
              </label>

              <label>
                Business Physical Address
                <span className="input-shell">
                  <FiMapPin />
                  <input
                    type="text"
                    name="address"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Shop or home warehouse address"
                  />
                </span>
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={prevStep} className="btn btn-secondary" style={{ flex: 1 }}>
                  Back
                </button>
                <button type="button" onClick={nextStep} className="btn btn-primary" style={{ flex: 1 }}>
                  Next Step
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <label>
                Choose Password
                <span className="input-shell">
                  <FiLock />
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                  />
                </span>
              </label>

              <label>
                Confirm Password
                <span className="input-shell">
                  <FiLock />
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                  />
                </span>
              </label>

              <p style={{ fontSize: '12px', color: '#666', lineHeight: '1.4', margin: '12px 0 20px 0' }}>
                By submitting this application, you agree to ShoppingLK's seller guidelines, delivery terms, and product policies.
              </p>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" onClick={prevStep} className="btn btn-secondary" style={{ flex: 1 }}>
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="auth-switch">
          Already applied? <Link to="/seller/login">Log in here</Link>
        </p>
      </section>
    </div>
  );
};

export default SellerRegister;
