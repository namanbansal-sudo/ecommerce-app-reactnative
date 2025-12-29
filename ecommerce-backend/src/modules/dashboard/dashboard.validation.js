import Joi from 'joi';

const positiveInt = Joi.number().integer().min(1);
const optionalBool = Joi.boolean().optional();
const optionalString = (max = 1024) => Joi.string().max(max).optional().allow('', null);

export const dashboardQuerySchema = Joi.object({
  page: positiveInt.optional(),
  limit: positiveInt.optional(),
  offersPage: positiveInt.optional(),
  offersLimit: positiveInt.optional(),
  categoriesPage: positiveInt.optional(),
  categoriesLimit: positiveInt.optional(),
  ordersPage: positiveInt.optional(),
  ordersLimit: positiveInt.optional(),
  trackingPage: positiveInt.optional(),
  trackingLimit: positiveInt.optional(),
  productsPage: positiveInt.optional(),
  productsLimit: positiveInt.optional(),
  brandsPage: positiveInt.optional(),
  brandsLimit: positiveInt.optional(),
  section: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z,]+$/)
    .optional(),
  sections: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z,]+$/)
    .optional(),
});

export const offerIdParamSchema = Joi.object({
  id: positiveInt.required(),
});

export const offerCreateSchema = Joi.object({
  title: Joi.string().max(255).required(),
  subtitle: optionalString(255),
  description: optionalString(2000),
  discountLabel: Joi.string().max(255).required(),
  actionLabel: optionalString(255),
  targetUrl: optionalString(1024),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: optionalBool,
});

export const offerUpdateSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  subtitle: optionalString(255),
  description: optionalString(2000),
  discountLabel: optionalString(255),
  actionLabel: optionalString(255),
  targetUrl: optionalString(1024),
  displayOrder: Joi.number().integer().min(0).optional(),
  isActive: optionalBool,
}).min(1);

export const brandIdParamSchema = Joi.object({
  id: positiveInt.required(),
});

export const brandCreateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  tagline: optionalString(255),
  displayOrder: Joi.number().integer().min(0).optional(),
  isFeatured: optionalBool,
  isActive: optionalBool,
});

export const brandUpdateSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  tagline: optionalString(255),
  displayOrder: Joi.number().integer().min(0).optional(),
  isFeatured: optionalBool,
  isActive: optionalBool,
}).min(1);
