import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/multer.middleware.js';
import { CategoryController } from './categories.controller.js';
import {
  categoryCreateSchema,
  categoryIdParamSchema,
  categoryUpdateSchema,
} from './categories.validation.js';

const router = Router();

const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
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

const parseIdValue = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const ensureIdInParams = (req, res, next) => {
  if (!req.params.id) {
    const idFromBody = parseIdValue(req.body?.id);
    const idFromQuery = parseIdValue(req.query?.id);
    const candidate = idFromBody ?? idFromQuery;
    if (candidate !== undefined) {
      req.params.id = candidate;
      if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'id')) {
        delete req.body.id;
      }
    }
  }
  next();
};

const withIdValidation = (middlewares = []) => [
  authenticate,
  ensureIdInParams,
  ...middlewares,
  validate(categoryIdParamSchema, 'params'),
];

const categoryUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'svg', maxCount: 1 },
]);

const ensureImagePresent = (req, res, next) => {
  const hasImage = Array.isArray(req.files?.image) && req.files.image.length > 0;
  if (!hasImage) {
    const err = new Error('Image is required');
    err.name = 'ValidationError';
    err.status = 422;
    return next(err);
  }
  return next();
};

router.get('/get-categories', authenticate, CategoryController.listCategories);
router.get('/search', authenticate, CategoryController.searchCategories);
router.get(
  '/get-categories/:id',
  authenticate,
  ensureIdInParams,
  validate(categoryIdParamSchema, 'params'),
  CategoryController.getCategory,
);
router.get(
  '/:id/sub-categories',
  authenticate,
  ensureIdInParams,
  validate(categoryIdParamSchema, 'params'),
  CategoryController.listSubcategories,
);
router.post(
  '/add-category',
  authenticate,
  categoryUploadFields,
  ensureImagePresent,
  validate(categoryCreateSchema),
  CategoryController.createCategory,
);
router.put(
  '/update-category',
  ...withIdValidation([categoryUploadFields, validate(categoryUpdateSchema)]),
  CategoryController.updateCategory,
);
router.delete(
  '/delete-category',
  ...withIdValidation([]),
  CategoryController.deleteCategory,
);

export default router;
