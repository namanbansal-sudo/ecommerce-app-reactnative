import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { AuthController } from './auth.controller.js';
import {
  forgotPasswordSchema,
  resendOtpSchema,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
  updatePasswordSchema,
  validateResetTokenSchema,
  verifyOtpSchema,
} from './auth.validation.js';

const router = Router();

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    return next();
  };
}

router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/signin', validate(signinSchema), AuthController.signin);
router.post('/refresh-token', AuthController.refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), AuthController.forgotPassword);
// Resend OTP endpoint (reuses same validation as forgot-password)
router.post('/resend-otp', validate(resendOtpSchema), AuthController.resendOtp);
// New endpoints:
// - POST /verify-otp     -> verify the numeric OTP using otpToken (stateless)
// - POST /reset-otp      -> validate otpToken (no password change)
router.post('/verify-otp', validate(verifyOtpSchema), AuthController.verifyOtp);
router.post('/reset-otp', validate(validateResetTokenSchema), AuthController.validateResetToken);

// Keep /reset-password route but it now expects a reset token instead of raw otp.
router.post('/reset-password', validate(resetPasswordSchema), AuthController.resetPassword);
router.post('/logout', authenticate, AuthController.logout);
router.post(
  '/update-password',
  authenticate,
  validate(updatePasswordSchema),
  AuthController.updatePassword,
);

router.get('/profile', authenticate, AuthController.profile);

export default router;
