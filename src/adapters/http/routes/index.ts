import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { catalogRoutes } from './catalog.routes.js';

import { cartRoutes } from './cart.routes.js';

export const router = Router({ caseSensitive: true, strict: true });

router.use('/', authRoutes);
router.use('/products', catalogRoutes);

router.use('/cart', cartRoutes);
