import Joi from 'joi';

export const subcategoryParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const categoryIdParamSchema = Joi.object({
  categoryId: Joi.number().integer().positive().required(),
});

export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1),
  afterId: Joi.number().integer().min(1),
});

export const subcategoryCreateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(2000).allow(null, '').optional(),
  categoryId: Joi.number().integer().positive().required(),
  image: Joi.string().uri().max(2000).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
});

export const subcategoryUpdateSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).allow(null, '').optional(),
  categoryId: Joi.number().integer().positive().optional(),
  image: Joi.string().uri().max(2000).optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);
