import Joi from 'joi';

const positiveDecimal = Joi.number().positive().precision(2);

const nullableSku = Joi.string().max(255).allow(null, '');

export const cartCreateSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  productVariantSku: nullableSku.optional(),
  quantity: Joi.number().integer().min(1).required(),
  price: positiveDecimal.required(),
});

export const cartUpdateSchema = Joi.object({
  quantity: Joi.number().integer().min(1).optional(),
  price: positiveDecimal.optional(),
  productVariantSku: nullableSku.optional(),
}).or('quantity', 'price', 'productVariantSku');

export const cartIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});
