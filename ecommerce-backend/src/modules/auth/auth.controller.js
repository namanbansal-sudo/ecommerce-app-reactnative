import { MESSAGES } from '../../config/messages.js';
import { verifyToken } from '../../utils/jwt.util.js';
import { successResponse } from '../../utils/response.util.js';
import { addToBlacklist } from '../../utils/tokenBlacklist.js';
import { AuthService } from './auth.service.js';

export const AuthController = {
  async signup(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.signup(req.body);
      return successResponse(res, MESSAGES.USER_CREATED, { accessToken, refreshToken, user }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async signin(req, res, next) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.signin(req.body);
      return successResponse(res, MESSAGES.LOGIN_SUCCESS, { accessToken, refreshToken, user });
    } catch (err) {
      return next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        const err = new Error('Refresh token is required');
        err.name = 'AuthError';
        err.status = 400;
        throw err;
      }
      const result = await AuthService.refreshToken(refreshToken);
      return successResponse(res, 'Token refreshed successfully', result);
    } catch (err) {
      return next(err);
    }
  },
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      // Service will send an OTP to the user's email. In non-production it may
      // return the OTP for easier testing.
      const result = await AuthService.forgotPassword(email);
      // Do not expose user object in API responses here; only signup/signin
      // should return user data. Strip it if present.
      if (result && Object.prototype.hasOwnProperty.call(result, 'user')) {
        const { user, ...rest } = result;
        return successResponse(res, MESSAGES.PASSWORD_RESET_REQUEST_SENT, rest);
      }
      return successResponse(res, MESSAGES.PASSWORD_RESET_REQUEST_SENT, result);
    } catch (err) {
      return next(err);
    }
  },
  async resendOtp(req, res, next) {
    try {
      const { email } = req.body;
      // Reuse service logic to generate and send a fresh OTP
      const result = await AuthService.resendOtp(email);
      // Do not include user object in response
      if (result && Object.prototype.hasOwnProperty.call(result, 'user')) {
        const { user, ...rest } = result;
        return successResponse(res, MESSAGES.PASSWORD_RESET_REQUEST_SENT, rest);
      }
      return successResponse(res, MESSAGES.PASSWORD_RESET_REQUEST_SENT, result);
    } catch (err) {
      return next(err);
    }
  },
  // New flow: verify OTP using otpToken (stateless) -> client may then call reset-password with otp+otpToken
  async verifyOtp(req, res, next) {
    try {
      const { email, otp, otpToken } = req.body;
      await AuthService.verifyOtp(email, otp, otpToken);
      // Don't return user object here; indicate verification success.
      return successResponse(res, 'OTP verified', { verified: true });
    } catch (err) {
      return next(err);
    }
  },

  async validateResetToken(req, res, next) {
    // Validate an OTP token without updating password
    try {
      const { email, otpToken } = req.body;
      await AuthService.validateOtpToken(email, otpToken);
      // Do not expose user data; return a simple validation flag.
      return successResponse(res, 'OTP token valid', { valid: true });
    } catch (err) {
      return next(err);
    }
  },

  // Final password reset: consumes otp+otpToken and updates password
  async resetPassword(req, res, next) {
    try {
      // NOTE: token/OTP validation removed for this endpoint per change request.
      // This will update the password for the provided email directly.
      // Ensure you understand the security implications of allowing password
      // resets using only email + new password.
      const { email, password } = req.body;
      await AuthService.resetPassword(email, password);
      // For security and consistency only return a success message here.
      return successResponse(res, MESSAGES.PASSWORD_RESET_SUCCESS, {});
    } catch (err) {
      return next(err);
    }
  },
  async profile(req, res) {
    return successResponse(res, 'Profile fetched', { user: req.user });
  },
  async logout(req, res) {
    // Invalidate the provided token by adding it to the server-side blacklist.
    // This is an in-memory blacklist (process-local). For production use a
    // persistent store (Redis) to share across instances.
    try {
      const authHeader = req.headers.authorization || '';
      const [, token] = authHeader.split(' ');
      if (token) {
        // verify to extract exp claim (will throw if token invalid)
        const decoded = verifyToken(token);
        // decoded.exp is in seconds since epoch
        addToBlacklist(token, decoded.exp);
      }
    } catch (err) {
      // ignore any verification errors — token may already be invalid/expired
    }

    return successResponse(res, 'Logged out', {});
  },
  async updatePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      const user = await AuthService.updatePassword(userId, currentPassword, newPassword);
      return successResponse(res, MESSAGES.PASSWORD_UPDATED, { user });
    } catch (err) {
      return next(err);
    }
  },
};
