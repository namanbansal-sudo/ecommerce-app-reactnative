import Joi from 'joi';

const positiveInt = Joi.number().integer().min(1);

export const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(255).required(),
  section: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z,]+$/)
    .optional(),
  sections: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z,]+$/)
    .optional(),
  page: positiveInt.optional(),
  limit: positiveInt.optional(),
  categoriesPage: positiveInt.optional(),
  categoriesLimit: positiveInt.optional(),
  subcategoriesPage: positiveInt.optional(),
  subcategoriesLimit: positiveInt.optional(),
  productsPage: positiveInt.optional(),
  productsLimit: positiveInt.optional(),
  categoryId: Joi.number().integer().min(1).optional(),
  subcategoryId: Joi.number().integer().min(1).optional(),
  productTypeId: Joi.number().integer().min(1).optional(),
  includeInactive: Joi.boolean().optional(),
  priceMin: Joi.number().min(0).optional(),
  priceMax: Joi.number().min(0).optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  minRating: Joi.number().min(0).max(5).optional(),
  inStock: Joi.boolean().optional(),
});

export const ensureSearchTermPresent = (req, res, next) => {
  if (!req.query?.q) {
    const err = new Error('Search term (q) is required');
    err.name = 'ValidationError';
    err.status = 422;
    return next(err);
  }
  return next();
};

