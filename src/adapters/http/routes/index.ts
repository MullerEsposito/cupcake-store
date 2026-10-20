import { Router } from 'express';
import { authRoutes } from './auth.routes.js';
import { catalogRoutes } from './catalog.routes.js';

export const router = Router({ caseSensitive: true, strict: true });

router.use('/', authRoutes);
router.use('/products', catalogRoutes);
