import { MESSAGES } from '../../config/messages.js';
import { errorResponse, successResponse } from '../../utils/response.util.js';
import { UserService } from './user.service.js';

export const UserController = {
  // Update the authenticated user's profile (uses req.user.id)
  async updateProfile(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return errorResponse(res, 'Unauthorized', 'AuthError', 401);
      }
      const id = req.user.id;
      const fields = req.body;
      const files = req.files || {};
      const user = await UserService.updateUser(id, fields, files);
      // Return sanitized user object like signup/signin responses
      return successResponse(res, MESSAGES.USER_UPDATED, { user });
    } catch (err) {
      return next(err);
    }
  },

  // Get the authenticated user's profile
  async getProfile(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return errorResponse(res, 'Unauthorized', 'AuthError', 401);
      }
      const id = req.user.id;
      const user = await UserService.getUserById(id);
      return successResponse(res, MESSAGES.GET_USER_SUCCESS, { user });
    } catch (err) {
      return next(err);
    }
  },

  // Delete the authenticated user's profile
  async deleteProfile(req, res, next) {
    try {
      if (!req.user || !req.user.id) {
        return errorResponse(res, 'Unauthorized', 'AuthError', 401);
      }
      const id = req.user.id;
      await UserService.deleteUser(id);
      return successResponse(res, MESSAGES.USER_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },
};
