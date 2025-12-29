import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';
import { normalizeNameForComparison, normalizeText } from '../../utils/text.util.js';
import { prisma } from '../../config/db.js';
import { CategoryModel } from './categories.model.js';

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

const sortCategories = (a, b) => {
  const orderA = a.displayOrder ?? 0;
  const orderB = b.displayOrder ?? 0;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return a.name.localeCompare(b.name);
};

const buildTree = (items, parentId = null) =>
  items
    .filter((item) => item.parentCategoryId === parentId)
    .sort(sortCategories)
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id),
    }));

const toNullableInt = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && value.trim().toLowerCase() === 'null') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const buildWhere = ({ includeInactive, parentCategoryId, searchTerm } = {}) => {
  const where = {};
  if (!includeInactive) {
    where.isActive = true;
  }
  if (parentCategoryId !== undefined) {
    where.parentCategoryId = parentCategoryId;
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

const ensureUniqueName = async (name, { excludeId } = {}) => {
  const normalizedName = normalizeNameForComparison(name);
  if (!normalizedName) return;
  const categories = await CategoryModel.findAll({
    select: {
      id: true,
      name: true,
    },
  });
  const conflict = categories.find((category) => {
    if (excludeId && category.id === excludeId) {
      return false;
    }
    const existingName = normalizeNameForComparison(category.name);
    return existingName === normalizedName;
  });
  if (conflict) {
    const err = new Error('Category name already exists');
    err.name = 'ConflictError';
    err.status = 409;
    throw err;
  }
};

const normalizeCategoryKeyForComparison = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = normalizeText(value);
  if (!normalized) return undefined;
  return normalized.toLowerCase();
};

const ensureUniqueCategoryKey = async (categoryUniqueKey, { excludeId } = {}) => {
  const normalizedKey = normalizeCategoryKeyForComparison(categoryUniqueKey);
  if (!normalizedKey) return;
  const categories = await CategoryModel.findAll({
    select: {
      id: true,
      categoryUniqueKey: true,
    },
  });
  const conflict = categories.find((category) => {
    if (excludeId && category.id === excludeId) {
      return false;
    }
    const otherKey = normalizeCategoryKeyForComparison(category.categoryUniqueKey);
    return otherKey === normalizedKey;
  });
  if (conflict) {
    const err = new Error('Category key already exists');
    err.name = 'ConflictError';
    err.status = 409;
    throw err;
  }
};

const ensureParentExists = async (parentId) => {
  if (parentId === null || parentId === undefined) return;
  const parent = await CategoryModel.findUnique({ where: { id: parentId } });
  if (!parent) {
    const err = new Error('Parent category not found');
    err.name = 'NotFoundError';
    err.status = 404;
    throw err;
  }
};

const ensureCategoryExists = async (categoryId) => {
  const category = await CategoryModel.findUnique({ where: { id: categoryId } });
  if (!category) {
    const err = new Error('Category not found');
    err.name = 'NotFoundError';
    err.status = 404;
    throw err;
  }
  return category;
};

const groupSubcategoryCountsByCategory = async (categoryIds, includeInactive = false) => {
  if (!categoryIds.length) {
    return new Map();
  }
  const where = {
    categoryId: { in: categoryIds },
  };
  if (!includeInactive) {
    where.isActive = true;
  }
  const groups = await prisma.subcategory.groupBy({
    by: ['categoryId'],
    where,
    _count: {
      _all: true,
    },
  });
  return new Map(groups.map((group) => [group.categoryId, group._count._all]));
};

const attachSubcategoryCounts = async (categories, includeInactive = false) => {
  if (!Array.isArray(categories) || categories.length === 0) {
    return categories;
  }
  const counts = await groupSubcategoryCountsByCategory(
    categories.map((category) => category.id),
    includeInactive,
  );
  return categories.map((category) => ({
    ...category,
    subcategoryCount: counts.get(category.id) ?? 0,
  }));
};

export const CategoryService = {
  async listCategories({ page, limit, includeInactive = false, parentCategoryId = null } = {}) {
    const { page: normalizedPage, limit: normalizedLimit } = normalizePagination({ page, limit });
    const where = buildWhere({ includeInactive, parentCategoryId });
    const total = await CategoryModel.count({ where });
    const categories = await CategoryModel.findAll({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
      take: normalizedLimit,
      skip: (normalizedPage - 1) * normalizedLimit,
    });
    const categoriesWithCounts = await attachSubcategoryCounts(categories, includeInactive);
    return {
      categories: categoriesWithCounts,
      pagination: buildPagination(total, normalizedPage, normalizedLimit),
    };
  },

  async listSubcategories(parentCategoryId, { page, limit, includeInactive = false } = {}) {
    await ensureCategoryExists(parentCategoryId);
    const { page: normalizedPage, limit: normalizedLimit } = normalizePagination({ page, limit });
    const where = buildWhere({ includeInactive, parentCategoryId });
    const total = await CategoryModel.count({ where });
    const subcategories = await CategoryModel.findAll({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
      take: normalizedLimit,
      skip: (normalizedPage - 1) * normalizedLimit,
    });
    return {
      subcategories,
      pagination: buildPagination(total, normalizedPage, normalizedLimit),
    };
  },

  async searchCategories(searchTerm, { page, limit, includeInactive = false } = {}) {
    const { page: normalizedPage, limit: normalizedLimit } = normalizePagination({ page, limit });
    const where = buildWhere({ includeInactive, searchTerm });
    const total = await CategoryModel.count({ where });
    const categories = await CategoryModel.findAll({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
      take: normalizedLimit,
      skip: (normalizedPage - 1) * normalizedLimit,
    });
    const categoriesWithCounts = await attachSubcategoryCounts(categories, includeInactive);
    return {
      categories: categoriesWithCounts,
      pagination: buildPagination(total, normalizedPage, normalizedLimit),
    };
  },

  async getCategoryById(id) {
    return CategoryModel.findUnique({
      where: { id },
      include: {
        children: {
          orderBy: [
            { displayOrder: 'asc' },
            { name: 'asc' },
          ],
        },
      },
    });
  },

  async createCategory(data) {
    await ensureUniqueName(data.name);
    await ensureUniqueCategoryKey(data.categoryUniqueKey);
    const parentId = toNullableInt(data.parentCategoryId);
    await ensureParentExists(parentId);
    return CategoryModel.create({ data: { ...data, parentCategoryId: parentId } });
  },

  async updateCategory(id, data) {
    if (data.name !== undefined) {
      await ensureUniqueName(data.name, { excludeId: id });
    }
    if (data.categoryUniqueKey !== undefined) {
      await ensureUniqueCategoryKey(data.categoryUniqueKey, { excludeId: id });
    }
    await ensureCategoryExists(id);
    if (data.parentCategoryId !== undefined) {
      data.parentCategoryId = toNullableInt(data.parentCategoryId);
      if (data.parentCategoryId === id) {
        const err = new Error('Parent category cannot be the same as the category');
        err.name = 'ValidationError';
        err.status = 422;
        throw err;
      }
      await ensureParentExists(data.parentCategoryId);
    }
    return CategoryModel.update({ where: { id }, data });
  },

  async deleteCategory(id) {
    await ensureCategoryExists(id);
    return CategoryModel.delete({ where: { id } });
  },
};
