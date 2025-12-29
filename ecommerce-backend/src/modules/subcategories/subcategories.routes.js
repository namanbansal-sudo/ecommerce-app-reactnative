import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/multer.middleware.js';
import { SubcategoryController } from './subcategories.controller.js';
import {
  categoryIdParamSchema,
  paginationQuerySchema,
  subcategoryCreateSchema,
  subcategoryParamSchema,
  subcategoryUpdateSchema,
} from './subcategories.validation.js';

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

router.get('/get-subcategories', authenticate, validate(paginationQuerySchema, 'query'), SubcategoryController.listSubcategories);
router.get(
  '/get-subcategories-by-category/:categoryId',
  authenticate,
  validate(categoryIdParamSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  SubcategoryController.listSubcategoriesByCategory,
);
router.get(
  '/get-subcategory/:id',
  authenticate,
  validate(subcategoryParamSchema, 'params'),
  SubcategoryController.getSubcategory,
);
router.get(
  '/get-subcategory-product-types/:id',
  authenticate,
  validate(subcategoryParamSchema, 'params'),
  SubcategoryController.getSubcategoryProductTypes,
);
router.post(
  '/create-subcategory',
  authenticate,
  upload.single('image'),
  validate(subcategoryCreateSchema),
  SubcategoryController.createSubcategory,
);
router.put(
  '/update-subcategory/:id',
  authenticate,
  upload.single('image'),
  validate(subcategoryParamSchema, 'params'),
  validate(subcategoryUpdateSchema),
  SubcategoryController.updateSubcategory,
);
router.delete(
  '/delete-subcategory/:id',
  authenticate,
  validate(subcategoryParamSchema, 'params'),
  SubcategoryController.deleteSubcategory,
);

export default router;
