import React, { useState, useEffect } from 'react';
import { Cart, ApiService } from '../services/api';
import { ShieldCheck, AlertCircle, Lock, ArrowRight, X, RefreshCw } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutModalProps {
  cart: Cart | null;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (orderId: string, paymentId: string) => void;
  onPaymentFailed: (reason: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart, userId, isOpen, onClose, onPaymentSuccess, onPaymentFailed
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requiresApproval, setRequiresApproval] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setError(null);
      setRequiresApproval(false);
    }
  }, [isOpen]);

  if (!isOpen || !cart) return null;

  const handleConfirmAndPay = async (isApproved = false) => {
    setLoading(true);
    setError(null);

    try {
      const rzpOrder = await ApiService.createRazorpayOrder(cart.id, isApproved, userId);

      // We strictly use the authentic Razorpay Test Widget.
      if (window.Razorpay && rzpOrder.keyId) {
        const options = {
          key: rzpOrder.keyId,
          amount: rzpOrder.amountInPaise,
          currency: rzpOrder.currency,
          name: 'RazorRise Commerce',
          description: 'AI Generated Order (Test Mode)',
          order_id: rzpOrder.razorpayOrderId,
          handler: async (response: any) => {
            try {
              // Wait for backend to verify the Razorpay signature
              await ApiService.verifyPayment(
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature
              );
              // Deterministic Success State
              onPaymentSuccess(rzpOrder.orderId, response.razorpay_payment_id);
            } catch (err: any) {
              // Signature mismatch or backend failure
              onPaymentFailed(err.message || 'Payment verification failed');
            }
          },
          prefill: {
            name: 'Hackathon Evaluator',
            email: 'judge@buildathon.ai',
            contact: '9999999999'
          },
          theme: { color: '#8b5cf6' }, // Matches Razorpay purple
          modal: { ondismiss: () => {
            setLoading(false);
            // Explicitly handle failure if user closes the modal without paying
            onPaymentFailed('Payment cancelled by user. Cart preserved.');
          } }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          onPaymentFailed(response.error?.description || 'Test payment declined');
        });
        rzp.open();
      } else {
        throw new Error("Razorpay SDK not loaded or Key ID missing.");
      }
    } catch (err: any) {
      if (err.requireApproval) {
        setRequiresApproval(true);
      } else {
        setError(err.message || 'Failed to initiate order creation');
      }
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div className="border-b flex justify-between items-center pb-4">
          <div className="flex items-center gap-3">
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--color-rose)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 className="m-0 text-sm uppercase tracking-wider font-bold">Secure Checkout</h3>
              <p className="m-0 text-xs text-muted">Gated Financial Confirmation</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-tertiary" style={{ padding: '6px', border: 'none' }}>
            <X size={20} />
          </button>
        </div>

        <div className="badge badge-success flex items-start gap-2 p-3 text-left" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
          <ShieldCheck size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong className="block mb-1">Razorpay Test Mode Active</strong>
            No real financial transaction will occur. This step securely gates the creation of the backend Razorpay Order.
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs flex items-center gap-2 rounded-md" style={{ backgroundColor: '#FDF2F2', color: '#D92D20', border: '1px solid #F9D0C4' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div>
          <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">Order Summary</span>
          <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className="card p-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div style={{ width: '40px', height: '40px', backgroundColor: '#FAF5F6', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted"><RefreshCw size={16} /></div>
                    )}
                  </div>
                  <span className="font-medium truncate" style={{ flex: 1 }}>{item.quantity}× {item.productName}</span>
                </div>
                <span className="font-bold shrink-0 ml-3">₹{item.subtotal.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 flex flex-col gap-2 text-sm bg-card">
          <div className="flex justify-between text-muted">
            <span>Cart Items</span>
            <span className="font-semibold text-primary">{cart.itemCount} items</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Payment Gateway</span>
            <span className="font-semibold" style={{ color: 'var(--color-mauve)' }}>Razorpay Test Mode</span>
          </div>
          <div className="flex justify-between pt-2 border-t mt-1 font-bold text-lg text-primary">
            <span>Total Payable</span>
            <span>₹{cart.subtotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Payment Visual Section */}
        <div className="mt-2 text-center">
          <p className="text-sm font-bold m-0 mb-2">How would you like to pay?</p>
          <div style={{ width: '100%', height: '60px', backgroundColor: '#F8F9FA', borderRadius: '8px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '8px' }}>
             <img src="/payment-options.png" alt="UPI, Card, Net Banking" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-muted">UPI | Card | Net Banking</span>'; }} />
          </div>
        </div>

        <div className="text-center text-xs text-muted italic font-medium">
          "You're in control. The AI cannot authorize or alter this payment."
        </div>

        {requiresApproval && (
          <div className="p-3 text-sm flex-col gap-2 rounded-md" style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', marginTop: '10px' }}>
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertCircle size={16} />
              <span>Agent Spending Approval Required</span>
            </div>
            <p className="m-0 mb-2">This transaction amount exceeds the agent's auto-approve threshold. Explicit approval is required to proceed with this payment.</p>
          </div>
        )}

        <div className="flex gap-2" style={{ marginTop: '10px' }}>
          <button onClick={onClose} disabled={loading} className="btn-tertiary" style={{ flex: 1, padding: '12px' }}>
            Cancel
          </button>
          <button onClick={() => handleConfirmAndPay(requiresApproval)} disabled={loading} className="btn-primary flex items-center justify-center gap-2" style={{ flex: 2, padding: '12px', backgroundColor: requiresApproval ? '#D97706' : '#8b5cf6', color: '#ffffff' }}>
            {loading ? (
              <>
                <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Processing...
              </>
            ) : requiresApproval ? (
              <>
                <ShieldCheck size={16} />
                Approve & Pay <ArrowRight size={16} />
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Continue to Pay <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
