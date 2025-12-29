import { ProductModel } from './products.model.js';
import { prisma } from '../../config/db.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';

const toNullableInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

const includeVariants = {
  include: {
    productVariants: true,
  },
};

const normalizeImageKeys = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
};

const buildVariantImages = (images, imageKeys, uploadedImages = {}) => {
  const result = [];
  if (Array.isArray(images)) {
    result.push(...images);
  }
  for (const key of imageKeys) {
    const urls = uploadedImages[key];
    if (Array.isArray(urls)) {
      result.push(...urls);
    }
  }
  return result;
};

const buildVariantCreatePayload = (variant = {}, uploadedImages = {}) => {
  const imageKeys = normalizeImageKeys(variant.imageKeys);
  return {
    sku: variant.sku,
    name: resolveVariantTitle(variant),
    description: variant.description,
    price: variant.price,
    discountedPrice: variant.discountedPrice ?? null,
    stock: variant.stock,
    color: variant.color,
    size: variant.size,
    rating: variant.rating ?? null,
    reviewCount: variant.reviewCount ?? 0,
    boughtCount: variant.boughtCount ?? 0,
    images: buildVariantImages(variant.images, imageKeys, uploadedImages),
    isActive: variant.isActive ?? true,
  };
};

const buildVariantCreatePayloads = (variants = [], uploadedImages = {}) => {
  if (!Array.isArray(variants)) return [];
  return variants.map((variant) => buildVariantCreatePayload(variant, uploadedImages));
};

const buildVariantUpdatePayload = (variant = {}, uploadedImages = {}) => {
  const data = {};
  if (variant.newSku !== undefined) data.sku = variant.newSku;
  const variantTitle = resolveVariantTitle(variant);
  if (variantTitle !== undefined) data.name = variantTitle;
  if (variant.description !== undefined) data.description = variant.description;
  if (variant.price !== undefined) data.price = variant.price;
  if (variant.discountedPrice !== undefined) data.discountedPrice = variant.discountedPrice;
  if (variant.stock !== undefined) data.stock = variant.stock;
  if (variant.color !== undefined) data.color = variant.color;
  if (variant.size !== undefined) data.size = variant.size;
  if (variant.rating !== undefined) data.rating = variant.rating;
  if (variant.reviewCount !== undefined) data.reviewCount = variant.reviewCount;
  if (variant.boughtCount !== undefined) data.boughtCount = variant.boughtCount;
  if (variant.isActive !== undefined) data.isActive = variant.isActive;

  const imageKeys = normalizeImageKeys(variant.imageKeys);
  const resolvedImages = buildVariantImages(variant.images, imageKeys, uploadedImages);
  const hasImagesField = Object.prototype.hasOwnProperty.call(variant, 'images');
  const hasImageKeys = imageKeys.length > 0;
  if (hasImagesField || hasImageKeys) {
    data.images = resolvedImages;
  }

  return data;
};

const cloneVariantClause = (clause = {}) => JSON.parse(JSON.stringify(clause));

const attachVariantConstraints = (where = {}, filters = {}) => {
  const productVariants = { ...(where.productVariants ?? {}) };
  const variantClause = { ...(productVariants.some ?? {}) };

  if (filters.includeInactive !== true && variantClause.isActive === undefined) {
    variantClause.isActive = true;
  }

  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    variantClause.price = { ...(variantClause.price ?? {}) };
    if (filters.priceMin !== undefined) {
      variantClause.price.gte = filters.priceMin;
    }
    if (filters.priceMax !== undefined) {
      variantClause.price.lte = filters.priceMax;
    }
  }

  if (filters.minRating !== undefined) {
    variantClause.rating = { ...(variantClause.rating ?? {}), gte: filters.minRating };
  }

  if (filters.inStock === true) {
    variantClause.stock = { gt: 0 };
  } else if (filters.inStock === false) {
    variantClause.stock = { lte: 0 };
  }

  const nextWhere = {
    ...where,
    productVariants: {
      ...productVariants,
      some: variantClause,
    },
  };

  return { nextWhere, variantClause };
};

const normalizeString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  // Strip surrounding quotes to match names copied from responses.
  const unquoted = trimmed.replace(/^["']+|["']+$/g, '').trim();
  return unquoted === '' ? null : unquoted;
};

const buildProductMatchCriteria = (data = {}) => {
  const criteria = {};
  const normalizedName = normalizeString(data.name);
  if (normalizedName) {
    criteria.name = { equals: normalizedName, mode: 'insensitive' };
  }
  if (data.categoryId !== undefined) {
    const categoryId = toNullableInt(data.categoryId);
    if (categoryId !== null) {
      criteria.categoryId = categoryId;
    }
  }
  if (data.subcategoryId !== undefined) {
    const subcategoryId = toNullableInt(data.subcategoryId);
    if (subcategoryId !== null) {
      criteria.subcategoryId = subcategoryId;
    }
  }
  if (data.subcategoryProductTypeId !== undefined) {
    const subcategoryProductTypeId = toNullableInt(data.subcategoryProductTypeId);
    if (subcategoryProductTypeId !== null) {
      criteria.subcategoryProductTypeId = subcategoryProductTypeId;
    }
  }
  return { criteria, normalizedName };
};

const appendVariantsToProduct = async (productId, variantPayloads) => {
  const updatedProduct = await prisma.$transaction(async (tx) => {
    for (const variant of variantPayloads) {
      await tx.productVariant.create({
        data: {
          ...variant,
          productId,
        },
      });
    }
    return tx.product.findUnique({
      where: { id: productId },
      ...includeVariants,
    });
  });
  return formatProductForResponse(updatedProduct);
};

const applyVariantFilter = (where = {}) => {
  if (where.productVariants?.some) {
    return where;
  }
  return {
    ...where,
    productVariants: {
      ...(where.productVariants ?? {}),
      some: {
        ...(where.productVariants?.some ?? {}),
        isActive: true,
      },
    },
  };
};

const normalizePagination = ({ page, limit } = {}) => {
  const parsedLimit = parsePositiveInt(limit, DEFAULT_LIMIT);
  const boundedLimit = Math.min(parsedLimit, MAX_LIMIT);
  const parsedPage = parsePositiveInt(page, DEFAULT_PAGE);
  return {
    limit: boundedLimit,
    page: parsedPage,
  };
};

const buildPagination = (total, page, limit) => {
  const totalPages = limit > 0 ? Math.floor((total + limit - 1) / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

const buildSearchWhere = (
  { searchTerm, categoryId, subcategoryId, subcategoryProductTypeId } = {},
  variantFilters = {},
) => {
  let where = {};
  if (categoryId !== undefined) {
    where.categoryId = categoryId;
  }
  if (subcategoryId !== undefined) {
    where.subcategoryId = subcategoryId;
  }
  if (subcategoryProductTypeId !== undefined) {
    where.subcategoryProductTypeId = subcategoryProductTypeId;
  }

  const { nextWhere, variantClause } = attachVariantConstraints(where, variantFilters);
  where = nextWhere;

  if (searchTerm) {
    const variantClauseForSearch = cloneVariantClause(variantClause);
    variantClauseForSearch.OR = [
      {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
    ];

    where.OR = [
      {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        description: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      {
        productVariants: {
          some: variantClauseForSearch,
        },
      },
    ];
  }
  return where;
};

const resolveVariantTitle = (variant = {}) => variant.title ?? variant.name;

const formatBoughtCountLabel = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '0+';
  }
  const base = Math.floor(numeric / 100) * 100;
  const remainder = numeric - base;
  if (remainder >= 50) {
    return `${base + 50}+`;
  }
  return `${base}+`;
};

const formatVariantForResponse = (variant) => {
  if (!variant) return variant;
  const { name, ...rest } = variant;
  return {
    ...rest,
    title: name,
    boughtCountLabel: formatBoughtCountLabel(rest.boughtCount),
  };
};

const formatProductForResponse = (product) => {
  if (!product) return product;
  const { productVariants = [], ...rest } = product;
  return {
    ...rest,
    productVariants: productVariants.map(formatVariantForResponse),
  };
};

const fetchProducts = async (where = {}, options = {}) => {
  const { page, limit } = normalizePagination(options);
  const pagedWhere = applyVariantFilter(where);
  const [total, totalVariants] = await Promise.all([
    ProductModel.count({ where: pagedWhere }),
    ProductModel.countVariants({ where: { isActive: true } }),
  ]);

  const query = {
    where: pagedWhere,
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...includeVariants,
  };

  query.skip = (page - 1) * limit;

  const products = await ProductModel.findAll(query);
  const formattedProducts = products.map(formatProductForResponse);
  return {
    products: formattedProducts,
    pagination: buildPagination(total, page, limit),
    counts: {
      products: total,
      productVariants: totalVariants,
    },
  };
};

export const ProductService = {
  async getAllProducts(options) {
    return fetchProducts({}, options);
  },

  async getProductsByCategory(categoryId, options) {
    return fetchProducts({ categoryId }, options);
  },

  async getProductsBySubcategory(subcategoryId, options) {
    return fetchProducts({ subcategoryId }, options);
  },

  async getProductsByProductType(productTypeId, options) {
    return fetchProducts({ subcategoryProductTypeId: productTypeId }, options);
  },

  async getProductById(id) {
    const product = await ProductModel.findUnique({
      where: { id },
      ...includeVariants,
    });
    return formatProductForResponse(product);
  },

  async searchProducts(searchTerm, filters = {}, options = {}) {
    const where = buildSearchWhere(
      {
        searchTerm,
        categoryId: filters.categoryId,
        subcategoryId: filters.subcategoryId,
        subcategoryProductTypeId: filters.subcategoryProductTypeId,
      },
      {
        includeInactive: filters.includeInactive,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        minRating: filters.minRating,
        inStock: filters.inStock,
      },
    );
    return fetchProducts(where, options);
  },

  async createProduct(data, uploadedImages = {}) {
    const variantPayloads = buildVariantCreatePayloads(data.variants, uploadedImages);
    const { criteria: matchCriteria, normalizedName } = buildProductMatchCriteria(data);
    if (Object.keys(matchCriteria).length > 0) {
      let existingProduct = await ProductModel.findFirst({
        where: matchCriteria,
        ...includeVariants,
      });
      if (!existingProduct && normalizedName) {
        const fallbackCriteria = { ...matchCriteria };
        delete fallbackCriteria.name;
        fallbackCriteria.name = { contains: normalizedName, mode: 'insensitive' };
        existingProduct = await ProductModel.findFirst({
          where: fallbackCriteria,
          ...includeVariants,
        });
      }
      if (existingProduct) {
        const product = await appendVariantsToProduct(existingProduct.id, variantPayloads);
        return { product, variantOnly: true };
      }
    }

    const createData = {
      name: normalizedName ?? data.name,
      description: data.description || null,
      categoryId: toNullableInt(data.categoryId),
      subcategoryId: toNullableInt(data.subcategoryId),
      subcategoryProductTypeId: toNullableInt(data.subcategoryProductTypeId),
      productVariants: {
        create: variantPayloads,
      },
    };

    const product = await ProductModel.create({
      data: createData,
      ...includeVariants,
    });
    return { product: formatProductForResponse(product), variantOnly: false };
  },

  async updateProduct(id, payload, uploadedImages = {}) {
    const updateData = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.categoryId !== undefined) {
      updateData.categoryId = toNullableInt(payload.categoryId);
    }
    if (payload.subcategoryId !== undefined) {
      updateData.subcategoryId = toNullableInt(payload.subcategoryId);
    }
    if (payload.subcategoryProductTypeId !== undefined) {
      updateData.subcategoryProductTypeId = toNullableInt(payload.subcategoryProductTypeId);
    }

    const variantUpdates = (payload.variants || [])
      .map((variant) => {
        const data = buildVariantUpdatePayload(variant, uploadedImages);
        if (Object.keys(data).length === 0) return null;
        return { sku: variant.sku, data };
      })
      .filter((update) => update !== null);

    const hasProductUpdates = Object.keys(updateData).length > 0;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      for (const variantUpdate of variantUpdates) {
        const existingVariant = await tx.productVariant.findUnique({
          where: { sku: variantUpdate.sku },
        });
        if (!existingVariant || existingVariant.productId !== id) {
          const err = new Error('Variant not found for this product');
          err.name = 'NotFoundError';
          err.status = 404;
          throw err;
        }

        await tx.productVariant.update({
          where: { sku: variantUpdate.sku },
          data: variantUpdate.data,
        });
      }

      if (hasProductUpdates) {
        return tx.product.update({
          where: { id },
          data: updateData,
          ...includeVariants,
        });
      }

      return tx.product.findUnique({
        where: { id },
        ...includeVariants,
      });
    });

    return formatProductForResponse(updatedProduct);
  },

  async deleteProduct(id) {
    const [, deletedProduct] = await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
    return deletedProduct;
  },
  async createProductVariant(productId, variantData, uploadedImages = {}) {
    const existingProduct = await ProductModel.findUnique({
      where: { id: productId },
      ...includeVariants,
    });
    if (!existingProduct) {
      const err = new Error('Product not found');
      err.name = 'NotFoundError';
      err.status = 404;
      throw err;
    }
    const variants = Array.isArray(variantData.variants)
      ? variantData.variants
      : [variantData];
    const variantPayloads = buildVariantCreatePayloads(variants, uploadedImages);
    return appendVariantsToProduct(productId, variantPayloads);
  },
  async updateVariant(sku, payload, uploadedImages = {}) {
    const variantPayload = Array.isArray(payload?.variants) ? payload.variants[0] : payload;
    const data = buildVariantUpdatePayload(variantPayload, uploadedImages);
    if (Object.keys(data).length === 0) {
      const err = new Error('No variant update fields provided');
      err.name = 'ValidationError';
      err.status = 422;
      throw err;
    }

    const updatedVariant = await prisma.productVariant.update({
      where: { sku },
      data,
    });
    return formatVariantForResponse(updatedVariant);
  },
  async deleteVariant(sku) {
    await prisma.productVariant.delete({ where: { sku } });
  },
};
