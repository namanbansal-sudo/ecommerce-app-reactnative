import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import addressRoutes from './modules/address/address.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import categoryRoutes from './modules/categories/categories.routes.js';
import imageRoutes from './modules/image/image.routes.js';
import subcategoryProductTypeRoutes from './modules/subcategoryProductTypes/subcategoryProductTypes.routes.js';
import subcategoryRoutes from './modules/subcategories/subcategories.routes.js';
import needHelpRoutes from './modules/need-help/need-help.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import productRoutes from './modules/products/products.routes.js';
import paymentCardRoutes from './modules/paymentCard/payment-card.routes.js';
import userRoutes from './modules/user/user.routes.js';
import wishlistRoutes from './modules/wishlist/wishlist.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import searchRoutes from './modules/search/search.routes.js';
dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/user', userRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cards', paymentCardRoutes);
app.use('/api/need-help', needHelpRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sub-categories', subcategoryRoutes);
app.use('/api/sub-category-product-types', subcategoryProductTypeRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
