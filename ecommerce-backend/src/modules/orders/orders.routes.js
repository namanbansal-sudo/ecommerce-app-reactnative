import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { OrderController } from './orders.controller.js';
import {
  orderCreateSchema,
  orderIdParamSchema,
  orderUpdateSchema,
  paginationQuerySchema,
  userIdParamSchema,
} from './orders.validation.js';

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

router.get('/get-orders', authenticate, validate(paginationQuerySchema, 'query'), OrderController.listOrders);
router.get(
  '/get-orders-by-user/:userId',
  authenticate,
  validate(userIdParamSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  OrderController.listOrdersByUser,
);
router.get(
  '/get-order/:id',
  authenticate,
  validate(orderIdParamSchema, 'params'),
  OrderController.getOrder,
);
router.post('/create-order', authenticate, validate(orderCreateSchema), OrderController.createOrder);
router.put(
  '/update-order/:id',
  authenticate,
  validate(orderIdParamSchema, 'params'),
  validate(orderUpdateSchema),
  OrderController.updateOrder,
);
router.delete(
  '/delete-order/:id',
  authenticate,
  validate(orderIdParamSchema, 'params'),
  OrderController.deleteOrder,
);

export default router;
