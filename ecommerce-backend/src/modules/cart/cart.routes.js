import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { CartController } from './cart.controller.js';
import { cartCreateSchema, cartIdParamSchema, cartUpdateSchema } from './cart.validation.js';

const router = Router();

const validate = (schema, source = 'body') => (req, res, next) => {
  const target = req[source] || {};
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
  return next();
};

const withIdValidation = (middlewares = []) => [
  authenticate,
  ensureIdInParams,
  ...middlewares,
  validate(cartIdParamSchema, 'params'),
];

router.get('/get-carts', authenticate, CartController.listCarts);
router.post('/add-cart', authenticate, validate(cartCreateSchema), CartController.addCart);
router.put('/update-cart', ...withIdValidation([validate(cartUpdateSchema)]), CartController.updateCart);
router.delete('/delete-cart', ...withIdValidation([]), CartController.deleteCart);
router.delete('/clear', authenticate, CartController.clearCart);

export default router;
