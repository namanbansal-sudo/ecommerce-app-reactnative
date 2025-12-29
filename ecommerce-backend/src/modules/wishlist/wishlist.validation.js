import Joi from 'joi';

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).prefs({ convert: true });

export const wishlistIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const createWishlistSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  is_default: Joi.boolean().default(false),
});

export const updateWishlistSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  is_default: Joi.boolean().optional(),
});

export const createWishlistItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
});

export const wishlistItemParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
  itemId: Joi.number().integer().positive().required(),
});
