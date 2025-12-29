import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

export function generateToken(payload, options = {}) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.sign(payload, secret, { expiresIn: '7d', ...options });
}

export function generateAccessToken(payload) {
  return generateToken(payload, { expiresIn: '7d' });
}

export function generateRefreshToken(payload) {
  return generateToken(payload, { expiresIn: '30d' });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return jwt.verify(token, secret);
}
