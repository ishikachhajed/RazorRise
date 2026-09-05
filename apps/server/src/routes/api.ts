import { Router } from 'express';
import { CommerceController } from '../controllers/index.js';

const router = Router();

// AI Chat (My Store + Shop Everywhere routing via mode field)
router.post('/ai/chat', CommerceController.handleChat);

// Shop Everywhere — External product search (SerpApi proxy, key never exposed to frontend)
router.post('/shopping/search', CommerceController.handleShopEverywhereSearch);


// Catalog - Agent Readable
router.get('/products', CommerceController.getProducts);
router.get('/products/:id', CommerceController.getProductById);
router.get('/catalog/manifest', CommerceController.getCatalogManifest);
router.post('/agent/commerce', CommerceController.handleAgentCommerce);
router.post('/agent/commerce/checkout-intent', CommerceController.handleAgentCheckoutIntent);

// Cart
router.get('/cart', CommerceController.getCart);
router.post('/cart/items', CommerceController.addItemToCart);
router.post('/cart/items/remove', CommerceController.removeItemFromCart);
router.post('/cart/clear', CommerceController.clearCart);

// Abandoned Cart Recovery
router.post('/cart/recover', CommerceController.recoverAbandonedCart);

// Razorpay Payments
router.post('/razorpay/order', CommerceController.createRazorpayOrder);
router.post('/razorpay/verify', CommerceController.verifyRazorpayPayment);
router.post('/razorpay/fail', CommerceController.logRazorpayFailure);
router.post('/webhooks/razorpay', CommerceController.handleRazorpayWebhook);

// User Orders
router.get('/orders', CommerceController.getUserOrders);

// Merchant Dashboard
router.get('/merchant/dashboard', CommerceController.getMerchantDashboard);
router.get('/merchant/insights', CommerceController.getMerchantInsights);
router.get('/merchant/audit', CommerceController.getMerchantAuditTrail);

// Agent Config
router.get('/agent/config', CommerceController.getAgentConfig);
router.post('/agent/config', CommerceController.updateAgentConfig);

export default router;
