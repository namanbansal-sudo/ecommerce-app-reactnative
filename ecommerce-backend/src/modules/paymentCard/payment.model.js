import { prisma } from '../../config/db.js';

export const PaymentModel = {
  findAll: (args = {}) => prisma.payment.findMany(args),
  findFirst: (args = {}) => prisma.payment.findFirst(args),
  findUnique: (args = {}) => prisma.payment.findUnique(args),
  create: (args = {}) => prisma.payment.create(args),
  update: (args = {}) => prisma.payment.update(args),
  delete: (args = {}) => prisma.payment.delete(args),
  count: (args = {}) => prisma.payment.count(args),
};
