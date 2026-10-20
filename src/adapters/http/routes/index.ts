import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { catalogRoutes } from './catalog.routes.js';

import { cartRoutes } from './cart.routes.js';
import { addressesRoutes } from './addresses.routes.js';
import { ordersRoutes } from './orders.routes.js';
import { adminRoutes } from './admin.routes.js';

export const router = Router({ caseSensitive: true, strict: true });

router.use('/', authRoutes);
router.use('/products', catalogRoutes);

router.use('/cart', cartRoutes);
router.use('/addresses', addressesRoutes);
router.use('/orders', ordersRoutes);
router.use('/admin', adminRoutes);
