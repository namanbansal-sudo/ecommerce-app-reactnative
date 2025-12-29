import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { uploadOnCloudinary } from '../../utils/cloudinary.js';
import { ProductService } from './products.service.js';

export const ProductController = {
  async listProducts(req, res, next) {
    try {
      const options = parseListOptions(req);
      const { products, pagination, counts } = await ProductService.getAllProducts(options);
      return successResponse(res, MESSAGES.PRODUCTS_FETCHED, { products, pagination, counts });
    } catch (err) {
      return next(err);
    }
  },

  async listProductsByCategory(req, res, next) {
    try {
      const categoryId = Number(req.params.categoryId);
      const options = parseListOptions(req);
      const { products, pagination } = await ProductService.getProductsByCategory(categoryId, options);
      return successResponse(res, MESSAGES.PRODUCTS_FETCHED, { products, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async listProductsBySubcategory(req, res, next) {
    try {
      const subcategoryId = Number(req.params.subcategoryId);
      const options = parseListOptions(req);
      const { products, pagination } = await ProductService.getProductsBySubcategory(subcategoryId, options);
      return successResponse(res, MESSAGES.PRODUCTS_FETCHED, { products, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async listProductsByProductType(req, res, next) {
    try {
      const productTypeId = Number(req.params.productTypeId);
      const options = parseListOptions(req);
      const { products, pagination } = await ProductService.getProductsByProductType(productTypeId, options);
      return successResponse(res, MESSAGES.PRODUCTS_FETCHED, { products, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async getProduct(req, res, next) {
    try {
      const productId = Number(req.params.id);
      const product = await ProductService.getProductById(productId);
      if (!product) {
        const err = new Error('Product not found');
        err.name = 'NotFoundError';
        err.status = 404;
        throw err;
      }
      return successResponse(res, MESSAGES.PRODUCT_RETRIEVED, { product });
    } catch (err) {
      return next(err);
    }
  },

  async updateProduct(req, res, next) {
    try {
      const productId = Number(req.params.id);
      const uploadedImages = await uploadProductImages(req.files);
      const product = await ProductService.updateProduct(productId, req.body, uploadedImages);
      return successResponse(res, MESSAGES.PRODUCT_UPDATED, { product });
    } catch (err) {
      return next(err);
    }
  },

  async deleteProduct(req, res, next) {
    try {
      const productId = Number(req.params.id);
      await ProductService.deleteProduct(productId);
      return successResponse(res, MESSAGES.PRODUCT_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },
  async createProduct(req, res, next) {
    try {
      const uploadedImages = await uploadProductImages(req.files);
      const { product, variantOnly } = await ProductService.createProduct(req.body, uploadedImages);
      const message = variantOnly ? MESSAGES.PRODUCT_VARIANT_CREATED : MESSAGES.PRODUCT_CREATED;
      const statusCode = variantOnly ? 200 : 201;
      return successResponse(res, message, { product }, statusCode);
    } catch (err) {
      return next(err);
    }
  },
  async createProductVariant(req, res, next) {
    try {
      const productId = Number(req.params.productId);
      const uploadedImages = await uploadProductImages(req.files);
      const product = await ProductService.createProductVariant(productId, req.body, uploadedImages);
      return successResponse(res, MESSAGES.PRODUCT_VARIANT_CREATED, { product });
    } catch (err) {
      return next(err);
    }
  },
  async updateProductVariant(req, res, next) {
    try {
      const { sku } = req.params;
      const uploadedImages = await uploadProductImages(req.files);
      const payload = Array.isArray(req.body.variants) ? req.body.variants[0] : req.body;
      const variant = await ProductService.updateVariant(sku, payload, uploadedImages);
      return successResponse(res, MESSAGES.PRODUCT_VARIANT_UPDATED, { variant });
    } catch (err) {
      return next(err);
    }
  },
  async deleteProductVariant(req, res, next) {
    try {
      const { sku } = req.params;
      await ProductService.deleteVariant(sku);
      return successResponse(res, MESSAGES.PRODUCT_VARIANT_DELETED, {});
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

async function uploadProductImages(files = []) {
  if (!files || files.length === 0) return {};

  const uploadedImages = {};
  for (const file of files) {
    const imageData = await uploadOnCloudinary(file.path);
    if (imageData?.url) {
      if (!uploadedImages[file.fieldname]) {
        uploadedImages[file.fieldname] = [];
      }
      uploadedImages[file.fieldname].push(imageData.url);
    }
  }
  return uploadedImages;
}
