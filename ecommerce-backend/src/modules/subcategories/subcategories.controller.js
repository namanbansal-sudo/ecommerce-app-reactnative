import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { uploadOnCloudinary } from '../../utils/cloudinary.js';
import { SubcategoryService } from './subcategories.service.js';
import { SubcategoryProductTypeService } from '../subcategoryProductTypes/subcategoryProductTypes.service.js';

export const SubcategoryController = {
  async listSubcategories(req, res, next) {
    try {
      const options = parseListOptions(req);
      const { subcategories, pagination } = await SubcategoryService.listSubcategories(options);
      return successResponse(res, MESSAGES.SUBCATEGORIES_FETCHED, { subcategories, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async listSubcategoriesByCategory(req, res, next) {
    try {
      const categoryId = Number(req.params.categoryId);
      const options = parseListOptions(req);
      const { subcategories, pagination } = await SubcategoryService.listSubcategoriesByCategory(categoryId, options);
      return successResponse(res, MESSAGES.SUBCATEGORIES_FETCHED, { subcategories, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async getSubcategory(req, res, next) {
    try {
      const subcategoryId = Number(req.params.id);
      const subcategory = await SubcategoryService.getSubcategoryById(subcategoryId);
      if (!subcategory) {
        const err = new Error('Sub-category not found');
        err.name = 'NotFoundError';
        err.status = 404;
        throw err;
      }
      return successResponse(res, MESSAGES.SUBCATEGORY_RETRIEVED, { subcategory });
    } catch (err) {
      return next(err);
    }
  },

  async getSubcategoryProductTypes(req, res, next) {
    try {
      const subcategoryId = Number(req.params.id);
      const options = parseListOptions(req);
      const { productTypes, pagination } = await SubcategoryProductTypeService.listBySubcategory(subcategoryId, options);
      return successResponse(res, MESSAGES.SUBCATEGORY_PRODUCT_TYPES_FETCHED, { productTypes, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async createSubcategory(req, res, next) {
    try {
      const payload = { ...req.body };
      const imageUrl = await uploadSingleImage(req.file);
      if (imageUrl) payload.image = imageUrl;
      const subcategory = await SubcategoryService.createSubcategory(payload);
      return successResponse(res, MESSAGES.SUBCATEGORY_CREATED, { subcategory }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateSubcategory(req, res, next) {
    try {
      const subcategoryId = Number(req.params.id);
      const payload = { ...req.body };
      const imageUrl = await uploadSingleImage(req.file);
      if (imageUrl) payload.image = imageUrl;
      const subcategory = await SubcategoryService.updateSubcategory(subcategoryId, payload);
      return successResponse(res, MESSAGES.SUBCATEGORY_UPDATED, { subcategory });
    } catch (err) {
      return next(err);
    }
  },

  async deleteSubcategory(req, res, next) {
    try {
      const subcategoryId = Number(req.params.id);
      await SubcategoryService.deleteSubcategory(subcategoryId);
      return successResponse(res, MESSAGES.SUBCATEGORY_DELETED, {});
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

async function uploadSingleImage(file) {
  if (!file?.path) return null;
  const imageData = await uploadOnCloudinary(file.path);
  return imageData?.url ?? null;
}
