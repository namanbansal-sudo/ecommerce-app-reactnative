import { prisma } from '../../config/db.js';
import { SubcategoryModel } from './subcategories.model.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';

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

const fetchProductTypeCountsBySubcategory = async (subcategoryIds, includeInactive = false) => {
  if (!Array.isArray(subcategoryIds) || subcategoryIds.length === 0) {
    return new Map();
  }
  const where = {
    subcategoryId: { in: subcategoryIds },
  };
  if (!includeInactive) {
    where.isActive = true;
  }
  const groups = await prisma.subcategoryProductType.groupBy({
    by: ['subcategoryId'],
    where,
    _count: { _all: true },
  });
  return new Map(groups.map((group) => [group.subcategoryId, group._count._all]));
};

const attachProductTypeCounts = async (subcategories, includeInactive = false) => {
  if (!Array.isArray(subcategories) || subcategories.length === 0) {
    return subcategories;
  }
  const counts = await fetchProductTypeCountsBySubcategory(
    subcategories.map((subcategory) => subcategory.id),
    includeInactive,
  );
  return subcategories.map((subcategory) => ({
    ...subcategory,
    productTypeCount: counts.get(subcategory.id) ?? 0,
  }));
};

const fetchSubcategories = async (where = {}, { page, limit, includeInactive = false } = {}) => {
  const { page: normalizedPage, limit: normalizedLimit } = normalizePagination({ page, limit });
  const total = await SubcategoryModel.count({ where });

  const query = {
    where,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    take: normalizedLimit,
  };

  query.skip = (normalizedPage - 1) * normalizedLimit;

  const subcategories = await SubcategoryModel.findAll(query);
  const decorated = await attachProductTypeCounts(subcategories, includeInactive);
  return { subcategories: decorated, pagination: buildPagination(total, normalizedPage, normalizedLimit) };
};

const buildSearchWhere = ({ searchTerm, categoryId } = {}) => {
  const where = {};
  if (categoryId !== undefined) {
    where.categoryId = categoryId;
  }
  if (searchTerm) {
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
    ];
  }
  return where;
};

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

export const SubcategoryService = {
  async listSubcategories(options) {
    return fetchSubcategories({}, options);
  },

  async listSubcategoriesByCategory(categoryId, options) {
    return fetchSubcategories({ categoryId }, options);
  },

  async searchSubcategories(searchTerm, options = {}) {
    const where = buildSearchWhere({ searchTerm, categoryId: options.categoryId });
    return fetchSubcategories(where, options);
  },

  async getSubcategoryById(id) {
    return SubcategoryModel.findUnique({ where: { id } });
  },

  async createSubcategory(data) {
    return SubcategoryModel.create({
      data: {
        name: data.name,
        description: data.description || null,
        image: data.image || null,
        displayOrder: toNullableInt(data.displayOrder),
        isActive: toBoolean(data.isActive) ?? true,
        categoryId: toIntValue(data.categoryId),
      },
    });
  },

  async updateSubcategory(id, payload) {
    const updateData = {};
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.image !== undefined) updateData.image = payload.image || null;
    if (payload.displayOrder !== undefined) updateData.displayOrder = toNullableInt(payload.displayOrder);
    if (payload.isActive !== undefined) updateData.isActive = toBoolean(payload.isActive);
    if (payload.categoryId !== undefined) {
      updateData.categoryId = toIntValue(payload.categoryId);
    }

    return SubcategoryModel.update({
      where: { id },
      data: updateData,
    });
  },

  async deleteSubcategory(id) {
    return SubcategoryModel.delete({
      where: { id },
    });
  },
};
