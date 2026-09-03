import React, { useState, useEffect, useRef } from 'react';
import { ApiService, Cart, Product, ExternalProduct, ComparisonData, ShopEverywhereContext } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { ExternalProductCard } from '../components/ExternalProductCard';
import { ComparisonView } from '../components/ComparisonView';
import { UpsellBanner } from '../components/UpsellBanner';
import { DemoScenarioSelector } from '../components/DemoScenarioSelector';
import { CartSidebar } from '../components/CartSidebar';
import { CheckoutModal } from '../components/CheckoutModal';
import { sanitizeText } from '../utils/sanitize';
import {
  Send, Bot, RefreshCw, ShoppingBag, ShieldCheck, ArrowRight,
  AlertTriangle, X, Download, CheckCircle2, Store, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ChatMode = 'my_store' | 'shop_everywhere';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  // My Store fields
  intent?: any;
  recommendations?: Product[];
  upsellSuggestion?: any;
  incentive?: { type: string; percent: number };
  decision?: string;
  decisionReason?: string;
  actionRequired?: 'none' | 'confirm_cart' | 'confirm_checkout' | 'payment_gate';
  gatedOrderData?: any;
  paymentReceipt?: { orderId: string; paymentId: string; amount: number; items: any[] };
  // Shop Everywhere fields
  externalProducts?: ExternalProduct[];
  crossSellProducts?: ExternalProduct[];
  comparison?: ComparisonData;
  timestamp: string;
}

export const ShopPage: React.FC = () => {
  const navigate = useNavigate();

  // ── Mode ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ChatMode>('my_store');

  // ── My Store state ────────────────────────────────────────────────────────
  const [cart, setCart] = useState<Cart | null>(null);
  const [accumulatedIntent, setAccumulatedIntent] = useState<any>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [abandonedBanner, setAbandonedBanner] = useState<string | null>(null);

  // ── Shop Everywhere state ─────────────────────────────────────────────────
  const [shopEverywhereContext, setShopEverywhereContext] = useState<ShopEverywhereContext>({});

  // ── Shared state ──────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedCartId = localStorage.getItem('razorflow_cart_id');
    ApiService.getCart(storedCartId || undefined).then((c) => {
      setCart(c);
      localStorage.setItem('razorflow_cart_id', c.id);

      const existingCartIds = JSON.parse(localStorage.getItem('razorflow_cart_ids') || '[]');
      if (!existingCartIds.includes(c.id)) {
        existingCartIds.push(c.id);
        localStorage.setItem('razorflow_cart_ids', JSON.stringify(existingCartIds));
      }

      if (c.items && c.items.length > 0) {
        ApiService.recoverAbandonedCart(c.id).then((recovery) => {
          if (recovery?.recovered && recovery.recoveryMessage) {
            setAbandonedBanner(recovery.recoveryMessage);
          }
        }).catch(() => {});
      }
    });

    setMessages([
      {
        id: 'msg_welcome',
        sender: 'ai',
        text: "Hi! I'm Riya, your AI shopping assistant. How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Mode switch ───────────────────────────────────────────────────────────
  const handleModeSwitch = (newMode: ChatMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    // Reset context for the new mode so old memory doesn't bleed across
    if (newMode === 'shop_everywhere') {
      setShopEverywhereContext({});
    } else {
      setAccumulatedIntent(null);
    }
  };

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage.trim();
    if (!text || loading) return;

    const userMsgId = `usr_${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: sanitizeText(text),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!textToSend) setInputMessage('');
    setLoading(true);

    try {
      const response = await ApiService.sendChatMessage(
        text,
        cart?.id,
        accumulatedIntent,
        mode,
        mode === 'shop_everywhere' ? shopEverywhereContext : undefined
      );

      // Update persistent context
      if (mode === 'my_store') {
        if (response.cart) setCart(response.cart);
        if (response.intent) setAccumulatedIntent(response.intent);
      } else {
        if (response.updatedContext) setShopEverywhereContext(response.updatedContext);
      }

      const aiMsgId = `ai_${Date.now()}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: 'ai',
        text: sanitizeText(response.message),
        // My Store fields
        intent: response.intent,
        recommendations: response.recommendations,
        upsellSuggestion: response.upsellSuggestion,
        incentive: response.incentive,
        decision: response.decision,
        decisionReason: response.decisionReason,
        actionRequired: response.actionRequired,
        gatedOrderData: response.gatedOrderData,
        // Shop Everywhere fields
        externalProducts: response.externalProducts,
        crossSellProducts: response.crossSellProducts,
        comparison: response.comparison,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'ai',
          text: `Sorry, I encountered an issue: ${sanitizeText(err.message)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Cart handlers (My Store only) ─────────────────────────────────────────
  const handleAddToCart = async (productId: string) => {
    if (!cart) return;
    try {
      const updatedCart = await ApiService.addToCart(cart.id, productId, 1);
      setCart(updatedCart);
      setIsCartOpen(true);
    } catch (err: any) {
      alert(`Could not add to cart: ${err.message}`);
    }
  };

  const handleRemoveFromCart = async (itemId: string) => {
    if (!cart) return;
    try {
      const updatedCart = await ApiService.removeFromCart(cart.id, itemId);
      setCart(updatedCart);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleClearCart = async () => {
    if (!cart) return;
    try {
      const updatedCart = await ApiService.clearCart(cart.id);
      setCart(updatedCart);
      setAbandonedBanner(null);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handlePaymentSuccess = (orderId: string, paymentId: string) => {
    setIsCheckoutOpen(false);
    const receiptItems = cart?.items || [];
    const receiptAmount = cart?.subtotal || 0;
    setCart(null);

    const receiptData = { orderId, paymentId, amount: receiptAmount, items: receiptItems };

    setMessages((prev) => [
      ...prev,
      {
        id: `payment_success_${Date.now()}`,
        sender: 'ai',
        text: `✅ Payment confirmed! Your order **#${orderId.slice(-6).toUpperCase()}** has been placed successfully.\n\nYour invoice is ready to download. Is there anything else I can help you with today?`,
        paymentReceipt: receiptData,
        actionRequired: 'none',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleDownloadReceiptPDF = (receipt: { orderId: string; paymentId: string; amount: number; items: any[] }) => {
    const doc = new jsPDF();
    const orderId = receipt.orderId.slice(-6).toUpperCase();
    const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    doc.setFontSize(22);
    doc.setTextColor(40, 54, 24);
    doc.text('RazorRise Commerce', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(139, 139, 139);
    doc.text('Adaptive Commerce — Powered by Razorpay (Test Mode)', 14, 30);

    doc.setFontSize(10);
    doc.setTextColor(40, 54, 24);
    doc.text(`Order ID: #${orderId}`, 14, 45);
    doc.text(`Payment ID: ${receipt.paymentId}`, 14, 52);
    doc.text(`Date: ${now}`, 14, 59);
    doc.text(`Status: PAID`, 14, 66);

    const tableRows = receipt.items.map((item: any) => [
      item.productName || item.name,
      (item.quantity || 1).toString(),
      `Rs. ${(item.subtotal || item.price || 0).toLocaleString('en-IN')}`
    ]);

    autoTable(doc, {
      head: [['Product', 'Qty', 'Amount (INR)']],
      body: tableRows,
      startY: 75,
      theme: 'grid',
      styles: { fontSize: 10, textColor: [40, 54, 24] },
      headStyles: { fillColor: [212, 212, 212], textColor: [40, 54, 24] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 90;
    doc.setFontSize(14);
    doc.setTextColor(40, 54, 24);
    doc.text(`Total Paid: Rs. ${receipt.amount.toLocaleString('en-IN')}`, 14, finalY + 15);

    doc.setFontSize(9);
    doc.setTextColor(139, 139, 139);
    doc.text('This is a computer-generated receipt for a Razorpay Test Mode transaction. No real money was charged.', 14, finalY + 30);

    doc.save(`Invoice_RazorRise_${orderId}.pdf`);
  };

  const handlePaymentFailed = (reason: string) => {
    setIsCheckoutOpen(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `ai_retry_${Date.now()}`,
        sender: 'ai',
        text: `Your payment didn't go through, but your cart is safe. You can retry.\n\n(Declined Reason: ${reason})`,
        actionRequired: 'confirm_checkout',
        gatedOrderData: { subtotal: cart?.subtotal || 0, itemCount: cart?.itemCount || 0 },
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const getDecisionColor = (decision?: string) => {
    if (decision === 'NO_UPSELL') return { backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8' };
    if (decision === 'EXPAND_BASKET') return { backgroundColor: 'var(--color-sage)', border: '1px solid #b5c5bb' };
    if (decision === 'OFFER_INCENTIVE') return { backgroundColor: 'var(--color-peach)', border: '1px solid #e8c8b8' };
    return { backgroundColor: '#FAF5F6', border: '1px solid var(--border-color)' };
  };

  // ── Placeholder text ──────────────────────────────────────────────────────
  const inputPlaceholder = mode === 'my_store'
    ? "Ask about orders, customers, sales, or products..."
    : "Search products across Amazon, Flipkart, Myntra...";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container" style={{ minHeight: 'calc(100vh - 4rem)' }}>

      {/* Abandoned Cart Recovery Banner */}
      {abandonedBanner && mode === 'my_store' && (
        <div className="mb-4 p-4 rounded-md flex items-start justify-between gap-3" style={{ backgroundColor: 'var(--color-peach)', border: '1px solid #e8c8b8' }}>
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle size={18} style={{ color: 'var(--color-mauve)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <span className="font-bold block mb-1 text-sm">Your cart has saved items!</span>
              <p className="text-sm m-0">{abandonedBanner}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsCheckoutOpen(true)} className="btn-primary text-xs flex items-center gap-1" style={{ padding: '6px 12px' }}>
              Checkout Now <ArrowRight size={14} />
            </button>
            <button onClick={() => setAbandonedBanner(null)} className="btn-tertiary" style={{ padding: '6px', border: 'none' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="card h-full flex flex-col justify-between p-0" style={{ minHeight: '750px', overflow: 'hidden' }}>

        {/* Header */}
        <div className="border-b p-4" style={{ backgroundColor: '#F0EFEB' }}>
          <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'wrap', gap: '10px' }}>

            {/* Assistant identity */}
            <div className="flex items-center gap-3">
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#283618', color: '#F0EFEB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={20} />
              </div>
              <div>
                <h2 className="font-bold m-0 flex items-center gap-2 text-sm">
                  Riya — AI Assistant
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>Online</span>
                </h2>
                <p className="text-muted m-0 text-xs">
                  {mode === 'my_store' ? 'Managing your store' : 'Shopping across the web'}
                </p>
              </div>
            </div>

            {/* Right side: Mode toggle + Cart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

              {/* ── Mode Toggle ── */}
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '10px',
                  padding: '3px',
                  gap: '2px'
                }}
              >
                <button
                  id="mode-my-store"
                  onClick={() => handleModeSwitch('my_store')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: mode === 'my_store' ? '#283618' : 'transparent',
                    color: mode === 'my_store' ? '#F0EFEB' : '#6B7280',
                    transition: 'all 0.2s'
                  }}
                >
                  <Store size={13} />
                  My Store
                </button>
                <button
                  id="mode-shop-everywhere"
                  onClick={() => handleModeSwitch('shop_everywhere')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: mode === 'shop_everywhere' ? '#283618' : 'transparent',
                    color: mode === 'shop_everywhere' ? '#F0EFEB' : '#6B7280',
                    transition: 'all 0.2s'
                  }}
                >
                  <Globe size={13} />
                  Shop Everywhere
                </button>
              </div>

              {/* Cart button (My Store only) */}
              {mode === 'my_store' && (
                <button onClick={() => setIsCartOpen(true)} className="btn-tertiary flex items-center gap-2" style={{ backgroundColor: 'white' }}>
                  <ShoppingBag size={16} />
                  {cart && cart.itemCount > 0 ? (
                    <span>Cart ({cart.itemCount}) — ₹{cart.subtotal.toLocaleString('en-IN')}</span>
                  ) : (
                    <span>Cart Empty</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Demo scenario selector only in My Store mode */}
          {mode === 'my_store' && (
            <DemoScenarioSelector onSelectScenario={(prompt) => handleSendMessage(prompt)} />
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              {msg.sender === 'user' ? (
                <div className="chat-bubble-user">
                  <p className="m-0" style={{ color: 'inherit' }}>{msg.text}</p>
                  <span className="text-xs" style={{ opacity: 0.7, marginTop: '4px', display: 'block' }}>{msg.timestamp}</span>
                </div>
              ) : (
                <div className="chat-bubble-ai" style={{ width: '100%' }}>
                  <div className="m-0 font-medium" style={{ lineHeight: '1.5' }}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {/* ── MY STORE RENDERS ── */}

                  {/* Incentive Banner */}
                  {msg.incentive && (
                    <div className="mt-3 p-3 rounded-md flex items-center gap-2 text-sm font-bold" style={{ backgroundColor: 'var(--color-sage)', border: '1px solid #b5c5bb' }}>
                      🎁 Special offer: <strong>{msg.incentive.percent}% discount</strong> applied to your cart!
                    </div>
                  )}

                  {/* My Store Product Recommendations */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {msg.recommendations.map((prod) => (
                        <ProductCard key={prod.id} product={prod} onAddToCart={(pid) => handleAddToCart(pid)} />
                      ))}
                    </div>
                  )}

                  {/* Upsell */}
                  {msg.upsellSuggestion && (
                    <div className="mt-3">
                      {msg.upsellSuggestion.isNoUpsell ? (
                        <div className="p-3 rounded-md border" style={{ backgroundColor: '#FAF5F6', borderColor: 'var(--border-color)', color: 'var(--color-mauve)', fontSize: '0.85rem' }}>
                          <div className="flex items-center gap-2 font-bold mb-1"><CheckCircle2 size={14} /> AI Context</div>
                          {msg.upsellSuggestion.text}
                        </div>
                      ) : (
                        <UpsellBanner upsellData={msg.upsellSuggestion} onAddUpsell={(pid) => handleAddToCart(pid)} />
                      )}
                    </div>
                  )}

                  {/* Gated Checkout Confirmation */}
                  {msg.actionRequired === 'confirm_checkout' && (
                    <div className="mt-3 p-4 rounded-md border" style={{ backgroundColor: 'var(--color-sage)', borderColor: '#b5c5bb' }}>
                      <div className="flex items-center gap-2 font-bold mb-2">
                        <ShieldCheck size={18} />
                        Gated Money Operation — Requires Your Confirmation
                      </div>
                      <p className="text-sm m-0 mb-3">
                        Cart Subtotal: <strong>₹{msg.gatedOrderData?.subtotal?.toLocaleString('en-IN')}</strong> ({msg.gatedOrderData?.itemCount} items).
                        <br />
                        <span className="text-xs text-muted">Amount is server-calculated. The AI cannot alter this value.</span>
                      </p>
                      <button onClick={() => setIsCheckoutOpen(true)} className="btn-primary w-full flex items-center justify-center gap-2">
                        Open Secure Payment Gate <ArrowRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* Payment Receipt */}
                  {msg.paymentReceipt && (
                    <div className="mt-3 p-4 rounded-md" style={{ backgroundColor: '#F0EFEB', border: '1px solid #D4D4D4' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck size={16} style={{ color: '#283618' }} />
                        <span className="font-bold text-sm">Order Receipt</span>
                        <span className="text-xs text-muted font-mono">#{msg.paymentReceipt.orderId.slice(-6).toUpperCase()}</span>
                      </div>
                      <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                        {msg.paymentReceipt.items.slice(0, 4).map((item: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{item.quantity}× {item.productName || item.name}</span>
                            <span style={{ fontWeight: 600 }}>₹{(item.subtotal || item.price || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #D4D4D4', paddingTop: '6px', marginTop: '4px', fontWeight: 700 }}>
                          <span>Total Paid</span>
                          <span>₹{msg.paymentReceipt.amount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadReceiptPDF(msg.paymentReceipt!)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                        style={{ fontSize: '13px', padding: '8px 16px' }}
                      >
                        <Download size={14} /> Download Invoice PDF
                      </button>
                    </div>
                  )}

                  {/* ── SHOP EVERYWHERE RENDERS ── */}

                  {/* Comparison View (when comparison data is present) */}
                  {msg.comparison && msg.externalProducts && msg.externalProducts.length >= 2 && (
                    <ComparisonView products={msg.externalProducts} comparison={msg.comparison} />
                  )}

                  {/* External Products grid (non-comparison) */}
                  {msg.externalProducts && msg.externalProducts.length > 0 && !msg.comparison && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {msg.externalProducts.map((prod, i) => (
                        <ExternalProductCard key={`ext-${i}`} product={prod} />
                      ))}
                    </div>
                  )}

                  {/* Cross-sell products */}
                  {msg.crossSellProducts && msg.crossSellProducts.length > 0 && (
                    <div className="mt-4">
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#283618',
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          backgroundColor: '#F0FFF4',
                          borderRadius: '8px',
                          border: '1px solid #BBF7D0'
                        }}
                      >
                        🎯 Also Consider — Recommended Accessories
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {msg.crossSellProducts.map((prod, i) => (
                          <ExternalProductCard key={`cs-${i}`} product={prod} />
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="text-xs text-muted mt-2 block">{msg.timestamp}</span>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-muted text-sm">
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              {mode === 'shop_everywhere' ? 'Searching across stores...' : 'Thinking...'}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ backgroundColor: '#F0EFEB' }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="chat-input"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={inputPlaceholder}
                style={{ paddingRight: '3.5rem', paddingLeft: '1rem' }}
              />
              <button
                id="chat-send-btn"
                type="submit"
                disabled={loading || !inputMessage.trim()}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: loading || !inputMessage.trim() ? 'var(--border-color)' : '#283618',
                  border: 'none',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: loading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Send size={16} />
              </button>
            </div>
          </form>
          {/* Mode indicator */}
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {mode === 'my_store'
              ? <><Store size={14} /> <strong>My Store:</strong> Explore your store, orders, customers and sales</>
              : <><Globe size={14} /> <strong>Shop Everywhere:</strong> Search products across multiple marketplaces</>
            }
          </div>
        </div>

      </div>

      {/* My Store modals */}
      <CartSidebar
        cart={cart}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
        onClearCart={handleClearCart}
      />
      <CheckoutModal
        cart={cart}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailed={handlePaymentFailed}
      />
    </div>
  );
};
