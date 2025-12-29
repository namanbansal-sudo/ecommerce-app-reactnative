import Joi from 'joi';

const ORDER_STATUS_VALUES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAYMENT_STATUS_VALUES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];
const RATING_VALUES = ['VERY_BAD', 'BAD', 'GOOD', 'VERY_GOOD'];

const orderItemSchema = Joi.object({
  productId: Joi.number().integer().positive().optional(),
  price: Joi.number().positive().precision(2).required(),
  quantity: Joi.number().integer().min(1).required(),
  subtotal: Joi.number().positive().precision(2).optional(),
  variantInfo: Joi.string().max(1000).optional().allow(null, ''),
  productSnapshot: Joi.object().required(),
});

export const orderIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const userIdParamSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
});

export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1),
});

export const orderCreateSchema = Joi.object({
  userId: Joi.number().integer().positive().required(),
  totalAmount: Joi.number().positive().precision(2).optional(),
  shippingAddress: Joi.object().required(),
  promocode: Joi.string().max(255).optional().allow(null, ''),
  status: Joi.string().uppercase().valid(...ORDER_STATUS_VALUES).optional(),
  paymentMethod: Joi.string().max(255).required(),
  paymentStatus: Joi.string().uppercase().valid(...PAYMENT_STATUS_VALUES).optional(),
  rating: Joi.string().uppercase().valid(...RATING_VALUES).optional(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
});

export const orderUpdateSchema = Joi.object({
  status: Joi.string().uppercase().valid(...ORDER_STATUS_VALUES).optional(),
  paymentStatus: Joi.string().uppercase().valid(...PAYMENT_STATUS_VALUES).optional(),
  rating: Joi.string().uppercase().valid(...RATING_VALUES).optional(),
}).min(1);
