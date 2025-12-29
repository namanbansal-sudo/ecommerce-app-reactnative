import bcrypt from 'bcrypt';
import { prisma } from '../../config/db.js';
import { sendResetPasswordEmail } from '../../utils/email.js';
import { generateAccessToken, generateRefreshToken, generateToken, verifyToken } from '../../utils/jwt.util.js';
import { UserModel } from '../user/user.model.js';

const SALT_ROUNDS = 10;

export const AuthService = {
  async signup({ firstName, lastName, displayName, phoneNumber, email, password }) {
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      const err = new Error('User already exists');
      err.name = 'ConflictError';
      err.status = 409;
      throw err;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const createData = {
      email,
      password: hashed,
      firstName: firstName || null,
      lastName: lastName || null,
      displayName: displayName || (firstName ? `${firstName} ${lastName || ''}`.trim() : null),
      phoneNumber: phoneNumber || null,
    };

    const user = await UserModel.create(createData);
    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });
    const { password: _p, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
  },

  async signin({ email, password }) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid email or password');
      err.name = 'AuthError';
      err.status = 401;
      throw err;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const err = new Error('Invalid email or password');
      err.name = 'AuthError';
      err.status = 401;
      throw err;
    }
    const { password: _p, ...safeUser } = user;

    // Generate Tokens
    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Store Refresh Token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { user: safeUser, accessToken, refreshToken };
  },

  async refreshToken(token) {
    // 1. Verify signature
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      const e = new Error('Invalid or expired refresh token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    // 2. Check DB
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { User: true },
    });

    if (!storedToken || storedToken.revoked) {
      // Setup for Reuse Detection: if we found a revoked token, we might want to panic.
      // For now, just deny.
      const e = new Error('Invalid refresh token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    // 3. Revoke used token (Rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // 4. Generate new pair
    const accessToken = generateAccessToken({ id: storedToken.userId });
    const newRefreshToken = generateRefreshToken({ id: storedToken.userId });

    // 5. Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  },
  async forgotPassword(email) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('User not found');
      err.name = 'NotFoundError';
      err.status = 404;
      throw err;
    }
    // Generate numeric OTP (4 digits)
    // range: 1000 - 9999
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create a signed OTP token (stateless) that carries the OTP. It expires in 15 minutes.
    const otpToken = generateToken({ sub: user.id, otp, purpose: 'otp-verify' }, { expiresIn: '15m' });

    // Send reset OTP email with the otpToken embedded in a link. We do not persist OTP or token in the DB.
    await sendResetPasswordEmail(email, otp, otpToken);

    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
    // In non-production include otp & otpToken in response to ease development/testing
    if (process.env.NODE_ENV !== 'production') {
      return { user: safeUser, otp, otpToken };
    }
    return { user: safeUser };
  },
  // Resend the OTP - reuse forgotPassword implementation to generate a new OTP and send email
  async resendOtp(email) {
    // This intentionally delegates to forgotPassword so behaviour remains consistent
    return AuthService.forgotPassword(email);
  },
  // verify the OTP by validating the otpToken (stateless). Expects (email, otp, otpToken).
  async verifyOtp(email, otp, otpToken) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('User not found');
      err.name = 'NotFoundError';
      err.status = 404;
      throw err;
    }

    let decoded;
    try {
      decoded = verifyToken(otpToken);
    } catch (err) {
      const e = new Error('Invalid or expired OTP token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    if (decoded.purpose !== 'otp-verify' || decoded.sub !== user.id) {
      const e = new Error('Invalid OTP token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    if (decoded.otp !== otp) {
      const e = new Error('Invalid OTP');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
    // success — return sanitized user. No separate resetToken is used.
    return { user: safeUser };
  },

  // Validate an OTP token (no password change). Expects (email, otpToken).
  async validateOtpToken(email, otpToken) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('User not found');
      err.name = 'NotFoundError';
      err.status = 404;
      throw err;
    }

    let decoded;
    try {
      decoded = verifyToken(otpToken);
    } catch (err) {
      const e = new Error('Invalid or expired OTP token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    if (decoded.purpose !== 'otp-verify' || decoded.sub !== user.id) {
      const e = new Error('Invalid OTP token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
    return { user: safeUser };
  },

  // Reset password using otp + otpToken (stateless) — no resetToken key used.
  async resetWithOtp(email, password, otp, otpToken) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('User not found');
      err.name = 'NotFoundError';
      err.status = 404;
      throw err;
    }

    let decoded;
    try {
      decoded = verifyToken(otpToken);
    } catch (err) {
      const e = new Error('Invalid or expired OTP token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    if (decoded.purpose !== 'otp-verify' || decoded.sub !== user.id) {
      const e = new Error('Invalid OTP token');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    if (decoded.otp !== otp) {
      const e = new Error('Invalid OTP');
      e.name = 'AuthError';
      e.status = 401;
      throw e;
    }

    // Token and OTP are valid. Hash new password and update user.
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const updated = await UserModel.update(user.id, {
      password: hashed,
    });

    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = updated;
    return safeUser;
  },
  // Reset password using only email + new password. WARNING: this bypasses
  // OTP/token verification; ensure you only expose this endpoint in safe
  // contexts or protect it via other mechanisms (e.g., authenticated user,
  // signed link, internal admin action).
  async resetPassword(email, password) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      const err = new Error('User not found');
      err.name = 'NotFoundError';
      err.status = 404;
      throw err;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const updated = await UserModel.update(user.id, {
      password: hashed,
      // revoke any outstanding reset OTPs if present
      resetToken: null,
      resetTokenExpiry: null,
    });

    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = updated;
    return safeUser;
  },
  async updatePassword(userId, currentPassword, newPassword) {
    const user = await UserModel.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.name = 'NotFoundError';
      err.status = 404;
      throw err;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      const err = new Error('Current password is incorrect');
      err.name = 'AuthError';
      err.status = 401;
      throw err;
    }

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const updated = await UserModel.update(user.id, {
      password: hashed,
      // revoke any outstanding reset OTPs
      resetToken: null,
      resetTokenExpiry: null,
    });

    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = updated;
    return safeUser;
  },
};
