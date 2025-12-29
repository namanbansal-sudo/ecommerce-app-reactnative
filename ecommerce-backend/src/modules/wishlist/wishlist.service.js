import { prisma } from '../../config/db.js';
import { MESSAGES } from '../../config/messages.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';
import { ProductModel } from '../products/products.model.js';
import { WishlistModel } from './wishlist.model.js';

const createError = (message, name = 'Error', status = 400) => {
  const err = new Error(message);
  err.name = name;
  err.status = status;
  return err;
};

const WishlistService = {
  async getWishlists(userId, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
    const { wishlists, total } = await prisma.$transaction(async (tx) => {
      const wishlistsResult = await WishlistModel.findByUserId(
        userId,
        {
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { created_at: 'desc' },
          include: {
            wishlist_items: {
              orderBy: { added_at: 'desc' },
              include: { product: true },
            },
            _count: { select: { wishlist_items: true } },
          },
        },
        tx,
      );

      const totalCount = await tx.wishlist.count({ where: { user_id: userId } });

      return { wishlists: wishlistsResult, total: totalCount };
    });

    return {
      data: wishlists,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  },

  async createWishlist(userId, name, isDefault = false) {
    return prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.wishlist.updateMany({
          where: { user_id: userId, is_default: true },
          data: { is_default: false },
        });
      }

      return WishlistModel.create(
        {
          user_id: userId,
          name,
          is_default: isDefault,
        },
        tx,
      );
    });
  },

  async updateWishlist(id, userId, { name, is_default }) {
    const wishlistId = Number(id);

    const existing = await WishlistModel.findOwnedById(wishlistId, userId);

    if (!existing) {
      throw createError(MESSAGES.WISHLIST_NOT_FOUND, 'WishlistError', 404);
    }

    return prisma.$transaction(async (tx) => {
      if (is_default === true) {
        await tx.wishlist.updateMany({
          where: { user_id: userId, is_default: true },
          data: { is_default: false },
        });
      }

      const updated = await WishlistModel.update(
        wishlistId,
        {
          name,
          ...(typeof is_default === 'boolean' ? { is_default } : {}),
        },
        tx,
      );

      return updated;
    });
  },

  async deleteWishlist(id, userId) {
    const wishlistId = Number(id);

    const existing = await WishlistModel.findOwnedById(wishlistId, userId);

    if (!existing) {
      throw createError(MESSAGES.WISHLIST_NOT_FOUND, 'WishlistError', 404);
    }

    await WishlistModel.delete(wishlistId);

    return true;
  },

  async addWishlistItem(wishlistId, userId, payload) {
    const wishlist = await WishlistModel.findOwnedById(Number(wishlistId), userId);

    if (!wishlist) {
      throw createError(MESSAGES.WISHLIST_NOT_FOUND, 'WishlistError', 404);
    }

    const product = await ProductModel.findUnique({ where: { id: payload.product_id } });

    if (!product) {
      throw createError('Product not found', 'ProductError', 404);
    }

    try {
      const item = await prisma.wishlistItem.create({
        data: {
          wishlist_id: wishlist.id,
          product_id: payload.product_id,
        },
        include: { product: true },
      });

      return item;
    } catch (err) {
      if (err.code === 'P2002') {
        throw createError('Item already exists in wishlist', 'WishlistError', 409);
      }
      throw err;
    }
  },

  async removeWishlistItem(wishlistId, itemId, userId) {
    const wishlist = await WishlistModel.findOwnedById(Number(wishlistId), userId);

    if (!wishlist) {
      throw createError(MESSAGES.WISHLIST_NOT_FOUND, 'WishlistError', 404);
    }

    const existingItem = await prisma.wishlistItem.findFirst({
      where: { id: Number(itemId), wishlist_id: wishlist.id },
      include: { product: true },
    });

    if (!existingItem) {
      throw createError(MESSAGES.WISHLIST_ITEM_NOT_FOUND, 'WishlistItemError', 404);
    }

    await prisma.wishlistItem.delete({ where: { id: existingItem.id } });

    return true;
  },

  async getWishlistItems(wishlistId, userId, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
    const wishlist = await WishlistModel.findOwnedById(Number(wishlistId), userId);

    if (!wishlist) {
      throw createError(MESSAGES.WISHLIST_NOT_FOUND, 'WishlistError', 404);
    }
    const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const safePage = Math.max(Number(page) || DEFAULT_PAGE, 1);

    const { items, total } = await prisma.$transaction(async (tx) => {
      const [listItems, count] = await Promise.all([
        tx.wishlistItem.findMany({
          where: { wishlist_id: wishlist.id },
          orderBy: { added_at: 'desc' },
          skip: (safePage - 1) * safeLimit,
          take: safeLimit,
          include: { product: true },
        }),
        tx.wishlistItem.count({ where: { wishlist_id: wishlist.id } }),
      ]);

      return { items: listItems, total: count };
    });

    return {
      data: items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / safeLimit),
        hasNextPage: safePage * safeLimit < total,
        hasPrevPage: safePage > 1,
      },
    };
  },
};

export default WishlistService;
