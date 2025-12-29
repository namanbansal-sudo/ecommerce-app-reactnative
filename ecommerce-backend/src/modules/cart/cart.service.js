import { CartModel } from './cart.model.js';
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

const normalizeSku = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (normalized === '') return null;
  return normalized;
};

const includeRelations = {
  include: {
    product: true,
    productVariant: true,
  },
};

const getPricePerUnit = (cart) => {
  if (cart.productVariant?.price !== undefined && cart.productVariant?.price !== null) {
    return Number(cart.productVariant.price);
  }
  if (cart.quantity && cart.price !== undefined && cart.price !== null) {
    const totalPrice = Number(cart.price);
    if (Number.isFinite(totalPrice)) {
      return cart.quantity > 0 ? totalPrice / cart.quantity : null;
    }
  }
  return null;
};

const calculateCartTotalPrice = (cart, quantity) => {
  const unitPrice = getPricePerUnit(cart);
  if (unitPrice === null) {
    return null;
  }
  const total = unitPrice * quantity;
  if (!Number.isFinite(total)) {
    return null;
  }
  return Number(total.toFixed(2));
};

const ensureCartBelongsToUser = async (cartId, userId) => {
  const cart = await CartModel.findFirst({
    where: { id: cartId, userId },
    ...includeRelations,
  });
  if (!cart) {
    const err = new Error('Cart item not found');
    err.name = 'NotFoundError';
    err.status = 404;
    throw err;
  }
  return cart;
};

export const CartService = {
  async listCartItems(userId, { page, limit } = {}) {
    const { page: normalizedPage, limit: normalizedLimit } = normalizePagination({ page, limit });
    const total = await CartModel.count({ where: { userId } });
    const carts = await CartModel.findAll({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: normalizedLimit,
      skip: (normalizedPage - 1) * normalizedLimit,
      ...includeRelations,
    });
    return {
      carts,
      pagination: buildPagination(total, normalizedPage, normalizedLimit),
    };
  },

  async addCartItem(userId, payload) {
    const variantSku = normalizeSku(payload.productVariantSku);
    const existing = await CartModel.findFirst({
      where: {
        userId,
        productId: payload.productId,
        productVariantSku: variantSku,
      },
      ...includeRelations,
    });

    if (existing) {
      const updatedQuantity = existing.quantity + payload.quantity;
      const recalculatedPrice = calculateCartTotalPrice(existing, updatedQuantity);
      return CartModel.update({
        where: { id: existing.id },
        data: {
          quantity: updatedQuantity,
          price: recalculatedPrice ?? payload.price,
        },
        ...includeRelations,
      });
    }

    const data = {
      userId,
      productId: payload.productId,
      quantity: payload.quantity,
      price: payload.price,
    };
    if (variantSku !== null) {
      data.productVariantSku = variantSku;
    }

    return CartModel.create({
      data,
      ...includeRelations,
    });
  },

  async updateCartItem(cartId, userId, payload) {
    const cart = await ensureCartBelongsToUser(cartId, userId);
    const updatePayload = {};
    if (payload.quantity !== undefined) {
      updatePayload.quantity = payload.quantity;
    }
    if (payload.price !== undefined) {
      updatePayload.price = payload.price;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'productVariantSku')) {
      updatePayload.productVariantSku = normalizeSku(payload.productVariantSku);
    }

    const quantityIncreased = payload.quantity !== undefined && payload.quantity > cart.quantity;
    if (quantityIncreased) {
      const recalculatedPrice = calculateCartTotalPrice(cart, payload.quantity);
      if (recalculatedPrice !== null) {
        updatePayload.price = recalculatedPrice;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      return cart;
    }

    return CartModel.update({
      where: { id: cart.id },
      data: updatePayload,
      ...includeRelations,
    });
  },

  async deleteCartItem(cartId, userId) {
    const cart = await ensureCartBelongsToUser(cartId, userId);
    return CartModel.delete({ where: { id: cart.id } });
  },

  async clearCart(userId) {
    return CartModel.deleteMany({ where: { userId } });
  },
};
