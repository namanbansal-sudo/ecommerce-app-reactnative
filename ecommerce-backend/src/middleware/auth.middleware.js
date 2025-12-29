import { prisma } from '../config/db.js';
import { MESSAGES } from '../config/messages.js';
import { verifyToken } from '../utils/jwt.util.js';
import { errorResponse } from '../utils/response.util.js';
import { isBlacklisted } from '../utils/tokenBlacklist.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return errorResponse(res, MESSAGES.UNAUTHORIZED, 'AuthError', 401);
    }

    // Reject blacklisted tokens (tokens added on logout)
    if (isBlacklisted(token)) {
      return errorResponse(res, MESSAGES.UNAUTHORIZED, 'AuthError', 401);
    }

  const decoded = verifyToken(token);
  // Ignore inactive users
  const user = await prisma.user.findFirst({ where: { id: decoded.id, isActive: true } });
    if (!user) {
      return errorResponse(res, MESSAGES.UNAUTHORIZED, 'AuthError', 401);
    }

    req.user = {
      id: user.id,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      displayName: user.displayName || null,
      phoneNumber: user.phoneNumber || null,
      email: user.email,
    };

    return next();
  } catch (err) {
    return errorResponse(res, MESSAGES.UNAUTHORIZED, 'AuthError', 401);
  }
}
