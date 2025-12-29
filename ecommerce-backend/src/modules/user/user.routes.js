import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { upload } from '../../middleware/multer.middleware.js';
import { UserController } from './user.controller.js';

const router = Router();
router.get('/get-profile', authenticate, UserController.getProfile);
// Routes operating on the authenticated user's profile only.
// Clients should not pass an id; the authenticated token determines the user.
router.put(
  '/update-profile',
  authenticate,
  upload.fields([{ name: 'image', maxCount: 1 }]),
  (req, res, next) => UserController.updateProfile(req, res, next),
);

router.delete('/delete-profile', authenticate, (req, res, next) => UserController.deleteProfile(req, res, next));

export default router;
