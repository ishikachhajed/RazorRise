import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { CartSidebar } from './components/CartSidebar';
import { CheckoutModal } from './components/CheckoutModal';
import { LandingPage } from './pages/LandingPage';
import { ShopPage } from './pages/ShopPage';
import { OrdersPage } from './pages/OrdersPage';
import { SuccessPage } from './pages/SuccessPage';
import { PaymentFailedPage } from './pages/PaymentFailedPage';
import { MerchantDashboardPage } from './pages/MerchantDashboardPage';
import { MerchantInsightsPage } from './pages/MerchantInsightsPage';
import { MerchantCatalogPage } from './pages/MerchantCatalogPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { ApiService, Cart } from './services/api';

export function App() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    const storedCartId = localStorage.getItem('razorflow_cart_id');
    ApiService.getCart(storedCartId || undefined).then((c) => {
      setCart(c);
      localStorage.setItem('razorflow_cart_id', c.id);
    });
  }, []);

  const handleRemoveFromCart = async (itemId: string) => {
    if (!cart) return;
    try {
      const updatedCart = await ApiService.removeFromCart(cart.id, itemId);
      setCart(updatedCart);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col justify-between">
        <Navbar
          cartItemCount={cart?.itemCount || 0}
          onOpenCart={() => setIsCartOpen(true)}
        />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/payment-failed" element={<PaymentFailedPage />} />
            <Route path="/merchant" element={<MerchantDashboardPage />} />
            <Route path="/merchant/catalog" element={<MerchantCatalogPage />} />
            <Route path="/merchant/insights" element={<MerchantInsightsPage />} />
            <Route path="/merchant/audit" element={<AuditTrailPage />} />
          </Routes>
        </main>

        <CartSidebar
          cart={cart}
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          onRemoveItem={handleRemoveFromCart}
          onProceedToCheckout={() => setIsCheckoutOpen(true)}
        />

        <CheckoutModal
          cart={cart}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onPaymentSuccess={(orderId, paymentId) => {
            setIsCheckoutOpen(false);
            window.location.href = `/success?orderId=${orderId}&paymentId=${paymentId}`;
          }}
          onPaymentFailed={(reason) => {
            setIsCheckoutOpen(false);
            window.location.href = `/payment-failed?reason=${encodeURIComponent(reason)}`;
          }}
        />
      </div>
    </Router>
  );
}

export default App;
