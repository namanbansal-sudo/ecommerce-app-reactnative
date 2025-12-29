import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/multer.middleware.js';
import { DashboardController } from './dashboard.controller.js';
import {
  brandCreateSchema,
  brandIdParamSchema,
  brandUpdateSchema,
  dashboardQuerySchema,
  offerCreateSchema,
  offerIdParamSchema,
  offerUpdateSchema,
} from './dashboard.validation.js';

const router = Router();

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const target = req[source];
    const { error } = schema.validate(target, { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((detail) => detail.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    return next();
  };
}

router.get('/get-dashboard', authenticate, validate(dashboardQuerySchema, 'query'), DashboardController.getDashboard);
router.post('/offers/add-offer', authenticate, upload.single('image'), validate(offerCreateSchema), DashboardController.createOffer);
router.put(
  '/offers/update-offer',
  authenticate,
  upload.single('image'),
  validate(offerIdParamSchema, 'query'),
  validate(offerUpdateSchema),
  DashboardController.updateOffer,
);
router.delete('/offers/delete-offer', authenticate, validate(offerIdParamSchema, 'query'), DashboardController.deleteOffer);
router.post('/brands/add-brand', authenticate, upload.single('image'), validate(brandCreateSchema), DashboardController.createBrand);
router.put(
  '/brands/update-brand',
  authenticate,
  upload.single('image'),
  validate(brandIdParamSchema, 'query'),
  validate(brandUpdateSchema),
  DashboardController.updateBrand,
);
router.delete('/brands/delete-brand', authenticate, validate(brandIdParamSchema, 'query'), DashboardController.deleteBrand);

export default router;
