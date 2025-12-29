import { prisma } from '../../config/db.js';

export const UserModel = {
  create: (data) => prisma.user.create({ data }),
  // Only return active users by default
  findByEmail: (email) => prisma.user.findFirst({ where: { email, isActive: true } }),
  findById: (id) => prisma.user.findFirst({ where: { id, isActive: true } }),
  update: (id, data) => prisma.user.update({ where: { id }, data }),
  // Soft delete: mark user as inactive instead of removing the row
  delete: (id) => prisma.user.update({ where: { id }, data: { isActive: false } }),
};
