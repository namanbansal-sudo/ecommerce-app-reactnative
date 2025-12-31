import Joi from 'joi';

export const productTypeParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const subcategoryIdParamSchema = Joi.object({
  subcategoryId: Joi.number().integer().positive().required(),
});

export const productTypeCreateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  subcategoryProductTypeUniqueKey: Joi.string().max(255).required(),
  slug: Joi.string().max(255).required(),
  description: Joi.string().max(2000).allow(null, '').optional(),
  image: Joi.string().uri().max(2000).optional(),
  filters: Joi.alternatives(Joi.object().unknown(true), Joi.string()).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  subcategoryId: Joi.number().integer().positive().required(),
});

export const productTypeUpdateSchema = Joi.object({
  subcategoryProductTypeUniqueKey: Joi.string().max(255).optional(),
  name: Joi.string().max(255).optional(),
  slug: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).allow(null, '').optional(),
  image: Joi.string().uri().max(2000).optional(),
  filters: Joi.alternatives(Joi.object().unknown(true), Joi.string()).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
  subcategoryId: Joi.number().integer().positive().optional(),
}).min(1);
