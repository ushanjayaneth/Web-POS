import React, { useEffect, useState } from 'react';
import { CheckCircle, Clock, PackageCheck, Truck, XCircle } from 'lucide-react';
import adminApi from '../utils/adminApi';

const statusStyles = {
  pending: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  confirmed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  shipped: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  delivered: 'bg-green-500/15 text-green-300 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-300 border-red-500/30',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      const res = await adminApi.getOrders();
      setOrders(res.data || []);
    } catch (error) {
      alert(error.message || 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    if (!window.confirm(`Mark this order as ${newStatus}?`)) return;

    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      await loadOrders();
    } catch (error) {
      alert(error.message || 'Failed to update order status.');
    }
  };

  const getStatusBadge = (status) => (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyles[status] || 'bg-gray-500/15 text-gray-300 border-gray-500/30'}`}>
      {status || 'unknown'}
    </span>
  );

  return (
    <div className="p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Online <span className="text-brand-green">Orders</span></h2>
          <p className="text-gray-500 mt-1 font-medium">Confirm, ship, and manage website orders securely.</p>
        </div>
      </div>

      <div className="bg-brand-card rounded-2xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4">Order</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No orders yet.</td></tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-[#0a0a0a]/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{order.order_number || order.id}</div>
                      <div className="text-xs text-gray-500">{order.created_at ? new Date(order.created_at).toLocaleString() : '-'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-gray-200">{order.customer_name || 'Customer'}</div>
                      <div className="text-sm text-gray-500">{order.shipping_address?.phone || order.customer_email || '-'}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {order.items?.map((item, index) => (
                        <div key={`${item.product_id}-${index}`}>{item.quantity}x {item.name}</div>
                      ))}
                    </td>
                    <td className="p-4 font-black text-white">
                      Rs. {Number(order.total || 0).toLocaleString()}
                      <div className="text-xs text-gray-500 font-normal">{order.payment_method || 'COD'}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(order.status)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {order.status === 'pending' && (
                          <button onClick={() => handleStatusChange(order.id, 'confirmed')} className="p-2 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 rounded-lg" title="Confirm Order">
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button onClick={() => handleStatusChange(order.id, 'shipped')} className="p-2 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 rounded-lg" title="Mark as Shipped">
                            <Truck size={18} />
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button onClick={() => handleStatusChange(order.id, 'delivered')} className="p-2 bg-green-500/15 text-green-300 hover:bg-green-500/25 rounded-lg" title="Mark as Delivered">
                            <PackageCheck size={18} />
                          </button>
                        )}
                        {['pending', 'confirmed'].includes(order.status) && (
                          <button onClick={() => handleStatusChange(order.id, 'cancelled')} className="p-2 bg-red-500/15 text-red-300 hover:bg-red-500/25 rounded-lg" title="Cancel Order">
                            <XCircle size={18} />
                          </button>
                        )}
                        {!['pending', 'confirmed', 'shipped'].includes(order.status) && (
                          <Clock size={18} className="text-gray-600 mt-2" />
                        )}
                      </div>
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
