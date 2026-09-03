import React, { useEffect, useState } from 'react';
import { Download, CheckCircle, XCircle, Clock, Package, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  subtotal: number;
  imageUrl?: string;
}

interface Order {
  id: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  items: OrderItem[];
  createdAt: string;
}

function formatDate(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    setError(null);
    // Fetch all carts linked to this session
    const cartIds = JSON.parse(localStorage.getItem('razorflow_cart_ids') || '[]');
    // Also include the current active cart just in case
    const currentCartId = localStorage.getItem('razorflow_cart_id');
    if (currentCartId && !cartIds.includes(currentCartId)) cartIds.push(currentCartId);

    if (cartIds.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const url = `/api/orders?cartIds=${encodeURIComponent(cartIds.join(','))}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then((data) => {
        setOrders(data.orders || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDownloadInvoice = (order: Order) => {
    const doc = new jsPDF();
    const orderId = order.id.slice(-6).toUpperCase();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 54, 24); // Darkest Forest
    doc.text('RazorRise Commerce', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(139, 139, 139); // Muted
    doc.text('Adaptive Commerce — Powered by Razorpay', 14, 30);
    
    // Meta Info
    doc.setFontSize(10);
    doc.setTextColor(40, 54, 24);
    doc.text(`Order ID: #${orderId}`, 14, 45);
    doc.text(`Razorpay Ref: ${order.razorpayOrderId}`, 14, 52);
    doc.text(`Date: ${formatDate(order.createdAt)}`, 14, 59);
    doc.text(`Status: ${order.paymentStatus.toUpperCase()}`, 14, 66);

    // Items Table
    const tableColumn = ["Product", "Qty", "Amount (INR)"];
    const tableRows = order.items.map(item => [
      item.productName,
      item.quantity.toString(),
      `Rs. ${item.subtotal.toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75,
      theme: 'grid',
      styles: { fontSize: 10, textColor: [40, 54, 24] },
      headStyles: { fillColor: [212, 212, 212], textColor: [40, 54, 24] },
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 75;
    doc.setFontSize(14);
    doc.setTextColor(40, 54, 24);
    doc.text(`Total Paid: Rs. ${order.amount.toLocaleString('en-IN')}`, 14, finalY + 15);

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(139, 139, 139);
    doc.text('This is a computer-generated receipt for a Razorpay Test Mode transaction.', 14, finalY + 35);
    doc.text('No real money was charged.', 14, finalY + 40);

    doc.save(`Invoice_RazorRise_${orderId}.pdf`);
  };

  const getStatusBadge = (order: Order) => {
    // Handle both 'captured' paymentStatus and 'paid' order status
    const isPaid = order.paymentStatus === 'captured' || order.status === 'paid';
    const isFailed = order.paymentStatus === 'failed' || order.status === 'failed';
    if (isPaid) {
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', backgroundColor:'#dcfce7', color:'#166534' }}>
          <CheckCircle size={12} /> Paid
        </span>
      );
    }
    if (isFailed) {
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', backgroundColor:'#fee2e2', color:'#D92D20' }}>
          <XCircle size={12} /> Failed
        </span>
      );
    }
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'20px', backgroundColor:'#FAF5F6', color:'#9D8189' }}>
        <Clock size={12} /> Pending
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1rem 4rem' }}>
      {/* Page Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.75rem' }}>
        <div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:800, margin:0, letterSpacing:'-0.5px' }}>My Orders</h1>
          <p style={{ margin:'4px 0 0', color:'var(--text-muted)', fontSize:'0.875rem' }}>
            View your order history and download receipts
          </p>
        </div>
        <button onClick={fetchOrders} className="btn-tertiary" style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'3rem 0', color:'var(--text-muted)', display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' }}>
          <RefreshCw size={28} style={{ animation:'spin 1s linear infinite' }} />
          <span>Loading your orders…</span>
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ padding:'1.5rem', textAlign:'center', color:'#D92D20', backgroundColor:'#FDF2F2' }}>
          <XCircle size={32} style={{ margin:'0 auto 8px' }} />
          <p style={{ margin:0 }}>Could not load orders: {error}</p>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="card" style={{ padding:'3rem', textAlign:'center' }}>
          <Package size={48} style={{ color:'var(--text-muted)', margin:'0 auto 16px', opacity:0.5 }} />
          <h3 style={{ fontWeight:700, fontSize:'1.1rem', margin:'0 0 8px' }}>No orders yet</h3>
          <p style={{ color:'var(--text-muted)', margin:0, fontSize:'0.875rem' }}>
            Once you complete a checkout, your orders will appear here.
          </p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          {orders.map((order) => (
            <div key={order.id} className="card" style={{ padding:'1.25rem' }}>
              {/* Order Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', borderBottom:'1px solid var(--border-color)', paddingBottom:'1rem', marginBottom:'1rem', gap:'1rem' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'var(--text-muted)', marginBottom:'4px', display:'flex', alignItems:'center', gap:'6px' }}>
                    <Clock size={12} /> {formatDate(order.createdAt)}
                  </div>
                  <div style={{ fontWeight:700, fontSize:'0.95rem' }}>
                    Order <span style={{ color:'var(--color-mauve)' }}>#{order.id.slice(-6).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px', fontFamily:'monospace' }}>
                    Ref: {order.razorpayOrderId}
                  </div>
                </div>

                <div style={{ textAlign:'right', display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px' }}>
                  <div style={{ fontWeight:800, fontSize:'1.15rem' }}>
                    ₹{order.amount.toLocaleString('en-IN')}
                  </div>
                  {getStatusBadge(order)}
                </div>
              </div>

              {/* Items List */}
              {order.items && order.items.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'1rem' }}>
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'0.875rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ width: '40px', height: '40px', backgroundColor: '#FAF5F6', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Package size={16} /></div>
                          )}
                        </div>
                        <span style={{ color:'var(--text-secondary)' }}>
                          <strong>{item.quantity}×</strong> {item.productName}
                        </span>
                      </div>
                      <span style={{ fontWeight:600 }}>₹{item.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:'0 0 1rem' }}>Item details not available.</p>
              )}

              {/* Actions */}
              <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:'0.75rem', borderTop:'1px solid var(--border-color)' }}>
                <button
                  onClick={() => handleDownloadInvoice(order)}
                  disabled={order.paymentStatus !== 'captured' && order.status !== 'paid'}
                  className="btn-tertiary"
                  style={{
                    display:'flex', alignItems:'center', gap:'6px', fontSize:'13px',
                    opacity: (order.paymentStatus !== 'captured' && order.status !== 'paid') ? 0.45 : 1,
                    cursor: (order.paymentStatus !== 'captured' && order.status !== 'paid') ? 'not-allowed' : 'pointer'
                  }}
                  title={(order.paymentStatus !== 'captured' && order.status !== 'paid') ? 'Receipt only available for paid orders' : 'Download receipt'}
                >
                  <Download size={14} />
                  {(order.paymentStatus === 'captured' || order.status === 'paid') ? 'Download Receipt' : 'Receipt Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
