import Joi from 'joi';

export const categoryIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const categoryCreateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  categoryUniqueKey: Joi.string().max(255).required(),
  description: Joi.string().max(2000).allow(null, ''),
  svg: Joi.string().max(5000).allow(null, '').optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isFeatured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  parentCategoryId: Joi.number().integer().positive().optional().allow(null),
});

export const categoryUpdateSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  categoryUniqueKey: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).allow(null, ''),
  svg: Joi.string().max(5000).allow(null, '').optional(),
  displayOrder: Joi.number().integer().min(0).optional(),
  isFeatured: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
  parentCategoryId: Joi.number().integer().positive().optional().allow(null),
}).min(1);
