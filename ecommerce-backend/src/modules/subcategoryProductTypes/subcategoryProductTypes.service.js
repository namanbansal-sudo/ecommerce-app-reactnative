import { prisma } from '../../config/db.js';
import { SubcategoryProductTypeModel } from './subcategoryProductTypes.model.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';

const toIntValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toNullableInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.toLowerCase());
  }
  return Boolean(value);
};

const parseFilters = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      return undefined;
    }
  }
  if (typeof value === 'object') {
    return value;
  }
  return undefined;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
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

const fetchProductCountsByProductType = async (productTypeIds) => {
  if (!Array.isArray(productTypeIds) || productTypeIds.length === 0) {
    return new Map();
  }
  const groups = await prisma.product.groupBy({
    by: ['subcategoryProductTypeId'],
    where: {
      subcategoryProductTypeId: { in: productTypeIds },
    },
    _count: {
      _all: true,
    },
  });
  return new Map(groups.map((group) => [group.subcategoryProductTypeId, group._count._all]));
};

const attachProductCounts = async (productTypes) => {
  if (!Array.isArray(productTypes) || productTypes.length === 0) {
    return productTypes;
  }
  const counts = await fetchProductCountsByProductType(productTypes.map((type) => type.id));
  return productTypes.map((type) => ({
    ...type,
    productCount: counts.get(type.id) ?? 0,
  }));
};

const fetchProductTypes = async (where = {}, options = {}) => {
  const { page: normalizedPage, limit: normalizedLimit } = normalizePagination(options);
  const total = await SubcategoryProductTypeModel.count({ where });

  const productTypes = await SubcategoryProductTypeModel.findAll({
    where,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    take: normalizedLimit,
    skip: (normalizedPage - 1) * normalizedLimit,
  });

  const decorated = await attachProductCounts(productTypes);
  return {
    productTypes: decorated,
    pagination: buildPagination(total, normalizedPage, normalizedLimit),
  };
};

export const SubcategoryProductTypeService = {
  async listAll(options) {
    return fetchProductTypes({}, options);
  },

  async listBySubcategory(subcategoryId, options) {
    return fetchProductTypes({ subcategoryId }, options);
  },

  async getById(id) {
    return SubcategoryProductTypeModel.findUnique({ where: { id } });
  },

  async createProductType(data) {
    return SubcategoryProductTypeModel.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image: data.image || null,
        filters: parseFilters(data.filters) ?? null,
        displayOrder: toNullableInt(data.displayOrder),
        isActive: toBoolean(data.isActive) ?? true,
        subcategoryId: toIntValue(data.subcategoryId),
      },
    });
  },

  async updateProductType(id, payload) {
    const updateData = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.slug !== undefined) updateData.slug = payload.slug;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.image !== undefined) updateData.image = payload.image || null;
    if (payload.filters !== undefined) updateData.filters = parseFilters(payload.filters) ?? null;
    if (payload.displayOrder !== undefined) updateData.displayOrder = toNullableInt(payload.displayOrder);
    if (payload.isActive !== undefined) updateData.isActive = toBoolean(payload.isActive);
    if (payload.subcategoryId !== undefined) {
      updateData.subcategoryId = toIntValue(payload.subcategoryId);
    }

    return SubcategoryProductTypeModel.update({
      where: { id },
      data: updateData,
    });
  },

  async deleteProductType(id) {
    return SubcategoryProductTypeModel.delete({
      where: { id },
    });
  },
};
