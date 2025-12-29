import { MESSAGES } from '../../config/messages.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '../../utils/constants.js';
import { successResponse } from '../../utils/response.util.js';
import WishlistService from './wishlist.service.js';

export const WishlistController = {
  // GET /api/wishlist - Fetch all wishlists for a user (with pagination)
  async getWishlists(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
      const pageNum = Number(page) || DEFAULT_PAGE;
      const limitNum = Number(limit) || DEFAULT_LIMIT;
      const { data, pagination } = await WishlistService.getWishlists(userId, pageNum, limitNum);

      const wishlists = data.map(({ _count, ...wishlist }) => ({
        ...wishlist,
        wishlist_items: Array.isArray(wishlist.wishlist_items) ? wishlist.wishlist_items : [],
        itemCount: _count?.wishlist_items ?? wishlist.wishlist_items?.length ?? 0,
      }));

      const message = wishlists.length === 0 ? MESSAGES.NO_WISHLISTS_FOUND : MESSAGES.FETCHED;
      return successResponse(res, message, { total: pagination.total, wishlists, pagination });
    } catch (err) {
      return next(err);
    }
  },

  // POST /api/wishlist - Create a new wishlist
  async createWishlist(req, res, next) {
    try {
      const { name, is_default } = req.body;
      const userId = req.user.id;

      const wishlist = await WishlistService.createWishlist(userId, name, is_default);
      return successResponse(res, MESSAGES.WISHLIST_CREATED, { wishlist }, 201);
    } catch (err) {
      return next(err);
    }
  },

  // PUT /api/wishlist/:id - Update a wishlist's name
  async updateWishlist(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { name, is_default } = req.body;

      const wishlist = await WishlistService.updateWishlist(id, userId, { name, is_default });
      return successResponse(res, MESSAGES.WISHLIST_UPDATED, { wishlist });
    } catch (err) {
      return next(err);
    }
  },

  // DELETE /api/wishlist/:id - Delete a wishlist by id
  async deleteWishlist(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await WishlistService.deleteWishlist(id, userId);
      return successResponse(res, MESSAGES.WISHLIST_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },

  async addWishlistItem(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const item = await WishlistService.addWishlistItem(id, userId, req.body);
      return successResponse(res, MESSAGES.WISHLIST_ITEM_ADDED, { item }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async removeWishlistItem(req, res, next) {
    try {
      const { id, itemId } = req.params;
      const userId = req.user.id;
      await WishlistService.removeWishlistItem(id, itemId, userId);
      return successResponse(res, MESSAGES.WISHLIST_ITEM_REMOVED, {});
    } catch (err) {
      return next(err);
    }
  },

  async getWishlistItems(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
      const pageNum = Number(page) || DEFAULT_PAGE;
      const limitNum = Number(limit) || DEFAULT_LIMIT;
      const { data, pagination } = await WishlistService.getWishlistItems(id, userId, pageNum, limitNum);
      return successResponse(res, MESSAGES.FETCHED, {
        total: pagination.total,
        items: data,
        pagination,
      });
    } catch (err) {
      return next(err);
    }
  },
};
