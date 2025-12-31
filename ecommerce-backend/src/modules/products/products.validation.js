import Joi from 'joi';

const variantImageKeySchema = Joi.alternatives(
  Joi.string().max(255),
  Joi.array().items(Joi.string().max(255)),
);
const variantTitleSchema = Joi.string().max(255);

const variantPayloadSchema = Joi.object({
  sku: Joi.string().max(255).required(),
  title: variantTitleSchema.optional(),
  name: variantTitleSchema.optional(),
  description: Joi.string().max(2000).required(),
  price: Joi.number().positive().precision(2).required(),
  discountedPrice: Joi.number().positive().precision(2).optional().allow(null),
  stock: Joi.number().integer().min(0).required(),
  colorCode: Joi.string().max(100).required(),
  colorName: Joi.string().max(100).required(),
  size: Joi.string().max(100).required(),
  rating: Joi.number().min(0).max(5).precision(2).optional().allow(null),
  reviewCount: Joi.number().integer().min(0).optional().default(0),
  boughtCount: Joi.number().integer().min(0).optional().default(0),
  images: Joi.array().items(Joi.string().uri()).optional().default([]),
  imageKeys: variantImageKeySchema.optional(),
  isActive: Joi.boolean().optional().default(true),
}).or('title', 'name');

export const categoryIdParamSchema = Joi.object({
  categoryId: Joi.number().integer().positive().required(),
});

export const productCreateSchema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().max(2000).required(),
  categoryId: Joi.number().integer().positive().required(),
  subcategoryId: Joi.number().integer().positive().required(),
  subcategoryProductTypeId: Joi.number().integer().positive().required(),
  variants: Joi.array()
    .items(
      variantPayloadSchema,
    )
    .min(1)
    .required(),
});

export const productVariantCreateSchema = Joi.object({
  variants: Joi.array().items(variantPayloadSchema).min(1).required(),
}).required();

export const subcategoryIdParamSchema = Joi.object({
  subcategoryId: Joi.number().integer().positive().required(),
});

export const productTypeIdParamSchema = Joi.object({
  productTypeId: Joi.number().integer().positive().required(),
});

export const productIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const productVariantIdParamSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
});

const variantUpdateBodySchema = Joi.object({
  newSku: Joi.string().max(255).optional(),
  title: variantTitleSchema.optional(),
  name: variantTitleSchema.optional(),
  description: Joi.string().max(2000).allow(null, '').optional(),
  price: Joi.number().positive().precision(2).optional(),
  discountedPrice: Joi.number().positive().precision(2).optional().allow(null),
  stock: Joi.number().integer().min(0).optional(),
  colorCode: Joi.string().max(100).optional(),
  colorName: Joi.string().max(100).optional(),
  size: Joi.string().max(100).optional(),
  rating: Joi.number().min(0).max(5).precision(2).optional().allow(null),
  reviewCount: Joi.number().integer().min(0).optional(),
  boughtCount: Joi.number().integer().min(0).optional(),
  images: Joi.array().items(Joi.string().uri()).optional(),
  imageKeys: variantImageKeySchema.optional(),
  isActive: Joi.boolean().optional(),
}).or(
  'newSku',
  'title',
  'name',
  'description',
  'price',
  'discountedPrice',
  'stock',
  'colorCode',
  'colorName',
  'size',
  'images',
  'rating',
  'reviewCount',
  'boughtCount',
  'isActive',
);

const variantUpdateSchema = variantUpdateBodySchema.keys({
  sku: Joi.string().max(255).required(),
});

export const productUpdateSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).allow(null, '').optional(),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  subcategoryId: Joi.number().integer().positive().optional().allow(null),
  subcategoryProductTypeId: Joi.number().integer().positive().optional().allow(null),
  variants: Joi.array().items(variantUpdateSchema).min(1).optional(),
}).min(1);

export const productVariantUpdateSchema = Joi.alternatives().try(
  variantUpdateBodySchema,
  Joi.object({
    variants: Joi.array().items(variantUpdateBodySchema).min(1).required(),
  }),
);

export const productVariantSkuParamSchema = Joi.object({
  sku: Joi.string().max(255).required(),
});
