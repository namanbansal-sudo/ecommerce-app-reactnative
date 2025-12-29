import Joi from 'joi';

export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1),
});

export const paymentCardCreateSchema = Joi.object({
  stripePaymentMethodId: Joi.string().trim().required(),
  cardholderName: Joi.string().trim().min(2).max(255).required(),
  setAsDefault: Joi.boolean().optional(),
});

export const cardIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const paymentCardUpdateSchema = Joi.object({
  cardholderName: Joi.string().trim().min(2).max(255).required(),
});

export const makeDefaultCardSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const paymentListQuerySchema = paginationQuerySchema.append({
  orderId: Joi.number().integer().positive().optional(),
});

export const makePaymentSchema = Joi.object({
  orderId: Joi.number().integer().positive().required(),
  paymentCardId: Joi.number().integer().positive().optional(),
  stripePaymentMethodId: Joi.string().trim().optional(),
  cardholderName: Joi.string().trim().min(2).max(255).optional(),
  saveCard: Joi.boolean().optional(),
  setAsDefault: Joi.boolean().optional(),
  currency: Joi.string().trim().length(3).optional(),
}).or('paymentCardId', 'stripePaymentMethodId');
