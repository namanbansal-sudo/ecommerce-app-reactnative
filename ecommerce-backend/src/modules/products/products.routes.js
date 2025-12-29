import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { ProductController } from './products.controller.js';
import { upload } from '../../middleware/multer.middleware.js';
import {
  categoryIdParamSchema,
  productCreateSchema,
  productIdParamSchema,
  productTypeIdParamSchema,
  productUpdateSchema,
  productVariantCreateSchema,
  productVariantIdParamSchema,
  productVariantSkuParamSchema,
  productVariantUpdateSchema,
  subcategoryIdParamSchema,
} from './products.validation.js';

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

function parseJsonFields(fields = []) {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (typeof value === 'string' && value.trim() !== '') {
        try {
          req.body[field] = JSON.parse(value);
        } catch (err) {
          const parseError = new Error(`Invalid JSON for field "${field}"`);
          parseError.name = 'ValidationError';
          parseError.status = 422;
          return next(parseError);
        }
      }
    }
    return next();
  };
}

router.get('/get-products', authenticate, ProductController.listProducts);
router.post(
  '/create-product',
  authenticate,
  upload.any(),
  parseJsonFields(['variants']),
  validate(productCreateSchema),
  ProductController.createProduct,
);
router.post(
  '/create-product-variant/:productId',
  authenticate,
  upload.any(),
  parseJsonFields(['variants']),
  validate(productVariantIdParamSchema, 'params'),
  validate(productVariantCreateSchema),
  ProductController.createProductVariant,
);
router.put(
  '/update-product-variant/:sku',
  authenticate,
  upload.any(),
  parseJsonFields(['variants']),
  validate(productVariantSkuParamSchema, 'params'),
  validate(productVariantUpdateSchema),
  ProductController.updateProductVariant,
);
router.delete(
  '/delete-product-variant/:sku',
  authenticate,
  validate(productVariantSkuParamSchema, 'params'),
  ProductController.deleteProductVariant,
);
router.get(
  '/get-products-by-category/:categoryId',
  authenticate,
  validate(categoryIdParamSchema, 'params'),
  ProductController.listProductsByCategory,
);
router.get(
  '/get-products-by-subcategory/:subcategoryId',
  authenticate,
  validate(subcategoryIdParamSchema, 'params'),
  ProductController.listProductsBySubcategory,
);
router.get(
  '/get-products-by-product-type/:productTypeId',
  authenticate,
  validate(productTypeIdParamSchema, 'params'),
  ProductController.listProductsByProductType,
);
router.get(
  '/get-product/:id',
  authenticate,
  validate(productIdParamSchema, 'params'),
  ProductController.getProduct,
);
router.put(
  '/update-product/:id',
  authenticate,
  upload.any(),
  parseJsonFields(['variants']),
  validate(productIdParamSchema, 'params'),
  validate(productUpdateSchema),
  ProductController.updateProduct,
);
router.delete(
  '/delete-product/:id',
  authenticate,
  validate(productIdParamSchema, 'params'),
  ProductController.deleteProduct,
);

export default router;
