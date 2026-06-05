import React, { useState, useEffect } from 'react';
import { ref, onValue, update, get } from 'firebase/database';
import { db } from '../firebase';
import { ShoppingBag, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';

const Orders = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort by created_at descending (newest first)
        setOrders(orderList.sort((a, b) => b.created_at - a.created_at));
      } else {
        setOrders([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    if (window.confirm(`Are you sure you want to mark this order as ${newStatus}?`)) {
      const order = orders.find(o => o.id === orderId);
      
      // If confirming the order, reduce stock
      if (newStatus === 'confirmed' && order && order.status === 'pending') {
        try {
          const updates = {};
          for (const item of order.items || []) {
            const pSnapshot = await get(ref(db, `products/${item.product_id}`));
            const product = pSnapshot.val();
            if (product && typeof product.stock !== 'undefined') {
              updates[`products/${item.product_id}/stock`] = Math.max(0, product.stock - item.quantity);
            }
          }
          
          if (Object.keys(updates).length > 0) {
            await update(ref(db), updates);
          }
        } catch (error) {
          console.error("Failed to update stock:", error);
          alert("Warning: Failed to update product stock.");
        }
      }

      await update(ref(db, `orders/${orderId}`), {
        status: newStatus,
        updated_at: Date.now()
      });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Online Orders</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                <th className="p-4 font-medium">Order ID / Date</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Items</th>
                <th className="p-4 font-medium">Total</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan="6" className="p-4 text-center text-gray-500">No orders yet.</td></tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{order.order_number}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{order.customer_name}</div>
                      <div className="text-sm text-gray-500">{order.shipping_address?.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-gray-600">
                        {order.items?.map((item, i) => (
                          <div key={i}>{item.quantity}x {item.name}</div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-800">
                      Rs. {order.total}
                      <div className="text-xs text-gray-500 font-normal">{order.payment_method}</div>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {order.status === 'pending' && (
                        <button onClick={() => handleStatusChange(order.id, 'confirmed')} className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg" title="Confirm Order">
                          <CheckCircle size={18} />
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button onClick={() => handleStatusChange(order.id, 'shipped')} className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-lg" title="Mark as Shipped">
                          <Truck size={18} />
                        </button>
                      )}
                      {['pending', 'confirmed'].includes(order.status) && (
                        <button onClick={() => handleStatusChange(order.id, 'cancelled')} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg" title="Cancel Order">
                          <XCircle size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Orders;
