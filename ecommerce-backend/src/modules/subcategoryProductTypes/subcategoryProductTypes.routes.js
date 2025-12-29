import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/multer.middleware.js';
import { SubcategoryProductTypeController } from './subcategoryProductTypes.controller.js';
import {
  productTypeCreateSchema,
  productTypeParamSchema,
  productTypeUpdateSchema,
  subcategoryIdParamSchema,
} from './subcategoryProductTypes.validation.js';

const router = Router();

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const target = req[source];
    const { error } = schema.validate(target, { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    return next();
  };
}

router.get('/get-subcategory-product-types', authenticate, SubcategoryProductTypeController.listProductTypes);
router.get(
  '/get-subcategory-product-types-by-subcategory/:subcategoryId',
  authenticate,
  validate(subcategoryIdParamSchema, 'params'),
  SubcategoryProductTypeController.listBySubcategory,
);
router.get(
  '/get-subcategory-product-type/:id',
  authenticate,
  validate(productTypeParamSchema, 'params'),
  SubcategoryProductTypeController.getProductType,
);
router.post(
  '/create-subcategory-product-type',
  authenticate,
  upload.single('image'),
  validate(productTypeCreateSchema),
  SubcategoryProductTypeController.createProductType,
);
router.put(
  '/update-subcategory-product-type/:id',
  authenticate,
  upload.single('image'),
  validate(productTypeParamSchema, 'params'),
  validate(productTypeUpdateSchema),
  SubcategoryProductTypeController.updateProductType,
);
router.delete(
  '/delete-subcategory-product-type/:id',
  authenticate,
  validate(productTypeParamSchema, 'params'),
  SubcategoryProductTypeController.deleteProductType,
);

export default router;
