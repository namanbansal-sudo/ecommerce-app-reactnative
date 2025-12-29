import Joi from 'joi';

export const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  phoneNumber: Joi.string().optional(),
  displayName: Joi.string().optional(),
});

export const signinSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

// Schemas for OTP/reset flows
export const resendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().pattern(/^[0-9]{4}$/).required(),
  otpToken: Joi.string().required(),
});

// Validate a reset token (no password) -- used by POST /reset-otp
export const validateResetTokenSchema = Joi.object({
  email: Joi.string().email().required(),
  otpToken: Joi.string().required(),
});

// Final password reset (consumes resetToken and updates password)
export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  // OTP and otpToken removed: only email and new password are required here
});

export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(8).max(128).required(),
  newPassword: Joi.string().min(8).max(128).required(),
});
