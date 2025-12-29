import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { CartService } from './cart.service.js';

export const CartController = {
  async listCarts(req, res, next) {
    try {
      const options = parseListOptions(req);
      const { carts, pagination } = await CartService.listCartItems(req.user.id, options);
      return successResponse(res, MESSAGES.CART_ITEMS_FETCHED, {
        carts,
        pagination,
        totalItems: pagination.total,
      });
    } catch (err) {
      return next(err);
    }
  },

  async addCart(req, res, next) {
    try {
      const payload = {
        productId: parseNumber(req.body.productId),
        productVariantSku: req.body.productVariantSku ?? null,
        quantity: parseNumber(req.body.quantity),
        price: parseNumber(req.body.price),
      };
      const cart = await CartService.addCartItem(req.user.id, payload);
      return successResponse(res, MESSAGES.CART_ITEM_ADDED, { cart }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateCart(req, res, next) {
    try {
      const cartId = Number(req.params.id);
      const payload = buildUpdatePayload(req.body);
      const cart = await CartService.updateCartItem(cartId, req.user.id, payload);
      return successResponse(res, MESSAGES.CART_ITEM_UPDATED, { cart });
    } catch (err) {
      return next(err);
    }
  },

  async deleteCart(req, res, next) {
    try {
      const cartId = Number(req.params.id);
      await CartService.deleteCartItem(cartId, req.user.id);
      return successResponse(res, MESSAGES.CART_ITEM_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },

  async clearCart(req, res, next) {
    try {
      await CartService.clearCart(req.user.id);
      return successResponse(res, MESSAGES.CART_CLEARED, {});
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

function parseNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return undefined;
  return parsed;
}

function buildUpdatePayload(body) {
  const payload = {};
  if (Object.prototype.hasOwnProperty.call(body, 'quantity')) {
    payload.quantity = parseNumber(body.quantity);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'price')) {
    payload.price = parseNumber(body.price);
  }
  if (Object.prototype.hasOwnProperty.call(body, 'productVariantSku')) {
    payload.productVariantSku = body.productVariantSku ?? null;
  }
  return payload;
}
