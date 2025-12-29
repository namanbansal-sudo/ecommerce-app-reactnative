import { prisma } from '../../config/db.js';

export const PaymentCardModel = {
  findAll: (args = {}) => prisma.paymentCard.findMany(args),
  findFirst: (args = {}) => prisma.paymentCard.findFirst(args),
  findUnique: (args = {}) => prisma.paymentCard.findUnique(args),
  create: (args = {}) => prisma.paymentCard.create(args),
  update: (args = {}) => prisma.paymentCard.update(args),
  delete: (args = {}) => prisma.paymentCard.delete(args),
  count: (args = {}) => prisma.paymentCard.count(args),
};
