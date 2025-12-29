import { promises as fs } from 'fs';
import sharp from 'sharp';
import { MESSAGES } from '../../config/messages.js';
import { uploadOnCloudinary } from '../../utils/cloudinary.js';
import { successResponse } from '../../utils/response.util.js';
import { normalizeCategoryName, normalizeText } from '../../utils/text.util.js';
import { CategoryService } from './categories.service.js';

export const CategoryController = {
  async listCategories(req, res, next) {
    try {
      const options = {
        ...parseListOptions(req),
        includeInactive: parseBoolean(req.query.includeInactive, false),
      };
      const { categories, pagination } = await CategoryService.listCategories(options);
      return successResponse(res, MESSAGES.CATEGORIES_FETCHED, {
        categories,
        pagination,
        totalItems: pagination.total,
      });
    } catch (err) {
      return next(err);
    }
  },

  async searchCategories(req, res, next) {
    try {
      const options = {
        ...parseListOptions(req),
        includeInactive: parseBoolean(req.query.includeInactive, false),
      };
      const searchTerm = parseSearchTerm(req);
      const { categories, pagination } = await CategoryService.searchCategories(searchTerm, options);
      return successResponse(res, MESSAGES.CATEGORIES_FETCHED, {
        categories,
        pagination,
        totalItems: pagination.total,
      });
    } catch (err) {
      return next(err);
    }
  },

  async getCategory(req, res, next) {
    try {
      const id = Number(req.params.id);
      const category = await CategoryService.getCategoryById(id);
      if (!category) {
        const err = new Error('Category not found');
        err.name = 'NotFoundError';
        err.status = 404;
        throw err;
      }
      return successResponse(res, MESSAGES.CATEGORY_RETRIEVED, { category });
    } catch (err) {
      return next(err);
    }
  },

  async listSubcategories(req, res, next) {
    try {
      const parentId = Number(req.params.id);
      const options = {
        ...parseListOptions(req),
        includeInactive: parseBoolean(req.query.includeInactive, false),
      };
      const { subcategories, pagination } = await CategoryService.listSubcategories(parentId, options);
      return successResponse(res, MESSAGES.CATEGORIES_FETCHED, {
        subcategories,
        pagination,
        totalItems: pagination.total,
      });
    } catch (err) {
      return next(err);
    }
  },

  async createCategory(req, res, next) {
    try {
      const payload = buildCategoryPayload(req.body);
      const files = req.files ?? {};
      const imageFile = files.image?.[0];
      const svgFile = files.svg?.[0];
      const imageUrl = await uploadCategoryImage(imageFile);
      if (imageUrl) {
        payload.image = imageUrl;
      }
      const svgImageUrl = await uploadSvgAsImage(svgFile);
      if (svgImageUrl) {
        payload.svg = svgImageUrl;
      }
      const category = await CategoryService.createCategory(payload);
      return successResponse(res, MESSAGES.CATEGORY_CREATED, { category }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateCategory(req, res, next) {
    try {
      const id = Number(req.params.id);
      const payload = buildCategoryPayload(req.body, { partial: true });
      const files = req.files ?? {};
      const imageFile = files.image?.[0];
      const svgFile = files.svg?.[0];
      const imageUrl = await uploadCategoryImage(imageFile);
      if (imageUrl) {
        payload.image = imageUrl;
      }
      const svgImageUrl = await uploadSvgAsImage(svgFile);
      if (svgImageUrl) {
        payload.svg = svgImageUrl;
      }
      const category = await CategoryService.updateCategory(id, payload);
      return successResponse(res, MESSAGES.CATEGORY_UPDATED, { category });
    } catch (err) {
      return next(err);
    }
  },

  async deleteCategory(req, res, next) {
    try {
      const id = Number(req.params.id);
      await CategoryService.deleteCategory(id);
      return successResponse(res, MESSAGES.CATEGORY_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },
};

function parseListOptions(req) {
  const { page, limit } = req.query;
  return {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  };
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
}

function parseInteger(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function parseNullableParent(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const normalized = String(value).trim();
  if (normalized === '') return null;
  if (normalized.toLowerCase() === 'null') return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildCategoryPayload(body, { partial = false } = {}) {
  const data = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  if (!partial || has('name')) {
    const name = normalizeCategoryName(body.name);
    if (name !== undefined && name !== null) {
      data.name = name;
    }
  }
  if (!partial || has('description')) {
    const description = normalizeText(body.description);
    if (description !== undefined) {
      data.description = description;
    }
  }
  if (!partial || has('svg')) {
    const svg = normalizeText(body.svg);
    if (svg !== undefined) {
      data.svg = svg;
    }
  }
  if (!partial || has('displayOrder')) {
    const displayOrder = parseInteger(body.displayOrder);
    if (displayOrder !== undefined) {
      data.displayOrder = displayOrder;
    }
  }
  if (!partial || has('isFeatured')) {
    const isFeatured = parseBoolean(body.isFeatured, undefined);
    if (isFeatured !== undefined) {
      data.isFeatured = isFeatured;
    }
  }
  if (!partial || has('isActive')) {
    const isActive = parseBoolean(body.isActive, undefined);
    if (isActive !== undefined) {
      data.isActive = isActive;
    }
  }
  if (!partial || has('parentCategoryId')) {
    const parentCategoryId = parseNullableParent(body.parentCategoryId);
    if (parentCategoryId !== undefined) {
      data.parentCategoryId = parentCategoryId;
    }
  }
  if (!partial || has('categoryUniqueKey')) {
    const uniqueKey = normalizeText(body.categoryUniqueKey);
    if (uniqueKey !== undefined) {
      data.categoryUniqueKey = uniqueKey;
    }
  }
  return data;
}

function parseSearchTerm(req) {
  const value =
    req.query.q ?? req.query.search ?? req.query.term ?? req.query.searchTerm;
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }
  return normalized;
}

async function uploadCategoryImage(file) {
  if (!file || !file.path) return null;
  const image = await uploadOnCloudinary(file.path);
  return image?.url ?? null;
}

async function uploadSvgAsImage(file) {
  if (!file || !file.path) return null;
  const pngPath = `${file.path}.png`;
  try {
    await sharp(file.path).png().toFile(pngPath);
    const uploadResult = await uploadOnCloudinary(pngPath);
    return uploadResult?.url ?? null;
  } catch (error) {
    await safeUnlink(pngPath);
    throw error;
  } finally {
    await safeUnlink(file.path);
  }
}

async function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Failed to remove temp file', filePath, err);
    }
  }
}
