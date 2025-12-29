import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { PaymentCardController } from './payment-card.controller.js';
import {
    cardIdParamSchema,
    makeDefaultCardSchema,
    makePaymentSchema,
    paginationQuerySchema,
    paymentCardCreateSchema,
    paymentCardUpdateSchema,
    paymentListQuerySchema
} from './payment-card.validation.js';

const router = Router();

const validate = (schema, source = 'body') => (req, res, next) => {
  const payload = req[source] || {};
  const { error } = schema.validate(payload, { abortEarly: false });
  if (error) {
    const err = new Error(error.details.map((detail) => detail.message).join(', '));
    err.name = 'ValidationError';
    err.status = 422;
    return next(err);
  }
  return next();
};

router.get(
  '/get-payment-cards',
  authenticate,
  validate(paginationQuerySchema, 'query'),
  PaymentCardController.listPaymentCards,
);

router.get(
  '/get-payment-card-default',
  authenticate,
  PaymentCardController.getDefaultPaymentCard,
);

router.get(
  '/get-payment-card/:id',
  authenticate,
  validate(cardIdParamSchema, 'params'),
  PaymentCardController.getPaymentCardById,
);

router.get(
  '/get-payments',
  authenticate,
  validate(paymentListQuerySchema, 'query'),
  PaymentCardController.listPayments,
);

router.post(
  '/create-payment-card',
  authenticate,
  validate(paymentCardCreateSchema),
  PaymentCardController.createPaymentCard,
);

router.post(
  '/make-default-card',
  authenticate,
  validate(makeDefaultCardSchema),
  PaymentCardController.makeDefaultPaymentCard,
);

router.post(
  '/make-payments',
  authenticate,
  validate(makePaymentSchema),
  PaymentCardController.makePayment,
);

router.put(
  '/update-payment-card/:id',
  authenticate,
  validate(cardIdParamSchema, 'params'),
  validate(paymentCardUpdateSchema),
  PaymentCardController.updatePaymentCard,
);

router.delete(
  '/delete-payment-card/:id',
  authenticate,
  validate(cardIdParamSchema, 'params'),
  PaymentCardController.deletePaymentCard,
);

export default router;
