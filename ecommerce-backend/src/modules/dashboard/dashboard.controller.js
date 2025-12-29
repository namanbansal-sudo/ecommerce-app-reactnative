import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { DashboardService } from './dashboard.service.js';

export const DashboardController = {
  async getDashboard(req, res, next) {
    try {
      const userId = req.user?.id;
      const data = await DashboardService.getHomeDashboard(userId, req.query);
      return successResponse(res, MESSAGES.DASHBOARD_FETCHED, data);
    } catch (err) {
      return next(err);
    }
  },

  async createOffer(req, res, next) {
    try {
      if (!req.file) {
        const err = new Error('Image file is required for offer');
        err.name = 'ValidationError';
        err.status = 422;
        throw err;
      }
      const offer = await DashboardService.createOffer(req.body, req.file);
      return successResponse(res, MESSAGES.DASHBOARD_OFFER_CREATED, { offer }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateOffer(req, res, next) {
    try {
      const offerId = Number(req.params?.id ?? req.query?.id);
      const offer = await DashboardService.updateOffer(offerId, req.body, req.file);
      return successResponse(res, MESSAGES.DASHBOARD_OFFER_UPDATED, { offer });
    } catch (err) {
      return next(err);
    }
  },

  async deleteOffer(req, res, next) {
    try {
      const offerId = Number(req.params?.id ?? req.query?.id);
      await DashboardService.deleteOffer(offerId);
      return successResponse(res, MESSAGES.DASHBOARD_OFFER_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },

  async createBrand(req, res, next) {
    try {
      if (!req.file) {
        const err = new Error('Image file is required for brand');
        err.name = 'ValidationError';
        err.status = 422;
        throw err;
      }
      const brand = await DashboardService.createBrand(req.body, req.file);
      return successResponse(res, MESSAGES.DASHBOARD_BRAND_CREATED, { brand }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateBrand(req, res, next) {
    try {
      const brandId = Number(req.params?.id ?? req.query?.id);
      const brand = await DashboardService.updateBrand(brandId, req.body, req.file);
      return successResponse(res, MESSAGES.DASHBOARD_BRAND_UPDATED, { brand });
    } catch (err) {
      return next(err);
    }
  },

  async deleteBrand(req, res, next) {
    try {
      const brandId = Number(req.params?.id ?? req.query?.id);
      await DashboardService.deleteBrand(brandId);
      return successResponse(res, MESSAGES.DASHBOARD_BRAND_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },

};
