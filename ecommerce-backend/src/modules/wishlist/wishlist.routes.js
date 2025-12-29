import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { WishlistController } from './wishlist.controller.js';
import {
  createWishlistItemSchema,
  createWishlistSchema,
  paginationSchema,
  updateWishlistSchema,
  wishlistIdParamSchema,
  wishlistItemParamsSchema,
} from './wishlist.validation.js';

const router = Router();

function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    if (property === 'query') {
      Object.keys(req.query).forEach((key) => delete req.query[key]);
      Object.assign(req.query, value);
    } else {
      req[property] = value;
    }
    return next();
  };
}

// Get all wishlists for a user (with pagination)
router.get(
  '/get-wishlist',
  authenticate,
  validate(paginationSchema, 'query'),
  WishlistController.getWishlists,
);

// Create a new wishlist
router.post('/create-wishlist', authenticate, validate(createWishlistSchema), WishlistController.createWishlist);

// Update a wishlist by id
router.put(
  '/update-wishlist/:id',
  authenticate,
  validate(wishlistIdParamSchema, 'params'),
  validate(updateWishlistSchema),
  WishlistController.updateWishlist,
);

// Delete a wishlist by id
router.delete(
  '/delete-wishlist/:id',
  authenticate,
  validate(wishlistIdParamSchema, 'params'),
  WishlistController.deleteWishlist,
);

// Add wishlist item
router.post(
  '/:id/create-item',
  authenticate,
  validate(wishlistIdParamSchema, 'params'),
  validate(createWishlistItemSchema),
  WishlistController.addWishlistItem,
);

// Get wishlist items
router.get(
  '/:id/get-items',
  authenticate,
  validate(wishlistIdParamSchema, 'params'),
  WishlistController.getWishlistItems,
);

// Remove wishlist item
router.delete(
  '/:id/delete-item/:itemId',
  authenticate,
  validate(wishlistItemParamsSchema, 'params'),
  WishlistController.removeWishlistItem,
);

export default router;
