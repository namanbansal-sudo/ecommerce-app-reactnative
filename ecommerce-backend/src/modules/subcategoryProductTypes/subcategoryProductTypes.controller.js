import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { uploadOnCloudinary } from '../../utils/cloudinary.js';
import { SubcategoryProductTypeService } from './subcategoryProductTypes.service.js';

export const SubcategoryProductTypeController = {
  async listProductTypes(req, res, next) {
    try {
      const options = parseListOptions(req);
      const { productTypes, pagination } = await SubcategoryProductTypeService.listAll(options);
      return successResponse(res, MESSAGES.SUBCATEGORY_PRODUCT_TYPES_FETCHED, { productTypes, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async listBySubcategory(req, res, next) {
    try {
      const subcategoryId = Number(req.params.subcategoryId);
      const options = parseListOptions(req);
      const { productTypes, pagination } = await SubcategoryProductTypeService.listBySubcategory(subcategoryId, options);
      return successResponse(res, MESSAGES.SUBCATEGORY_PRODUCT_TYPES_FETCHED, { productTypes, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async getProductType(req, res, next) {
    try {
      const id = Number(req.params.id);
      const productType = await SubcategoryProductTypeService.getById(id);
      if (!productType) {
        const err = new Error('Product type not found');
        err.name = 'NotFoundError';
        err.status = 404;
        throw err;
      }
      return successResponse(res, MESSAGES.SUBCATEGORY_PRODUCT_TYPE_RETRIEVED, { productType });
    } catch (err) {
      return next(err);
    }
  },

  async createProductType(req, res, next) {
    try {
      const payload = { ...req.body };
      const imageUrl = await uploadSingleImage(req.file);
      if (imageUrl) payload.image = imageUrl;
      const productType = await SubcategoryProductTypeService.createProductType(payload);
      return successResponse(res, MESSAGES.SUBCATEGORY_PRODUCT_TYPE_CREATED, { productType }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateProductType(req, res, next) {
    try {
      const id = Number(req.params.id);
      const payload = { ...req.body };
      const imageUrl = await uploadSingleImage(req.file);
      if (imageUrl) payload.image = imageUrl;
      const productType = await SubcategoryProductTypeService.updateProductType(id, payload);
      return successResponse(res, MESSAGES.SUBCATEGORY_PRODUCT_TYPE_UPDATED, { productType });
    } catch (err) {
      return next(err);
    }
  },

  async deleteProductType(req, res, next) {
    try {
      const id = Number(req.params.id);
      await SubcategoryProductTypeService.deleteProductType(id);
      return successResponse(res, MESSAGES.SUBCATEGORY_PRODUCT_TYPE_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },
};

async function uploadSingleImage(file) {
  if (!file?.path) return null;
  const imageData = await uploadOnCloudinary(file.path);
  return imageData?.url ?? null;
}

function parseListOptions(req) {
  const { page, limit } = req.query;
  return {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  };
}
