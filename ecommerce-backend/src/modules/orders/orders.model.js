import { prisma } from '../../config/db.js';

export const OrderModel = {
  findAll: (args) => prisma.order.findMany(args),
  findFirst: (args) => prisma.order.findFirst(args),
  findUnique: (args) => prisma.order.findUnique(args),
  create: (args) => prisma.order.create(args),
  update: (args) => prisma.order.update(args),
  delete: (args) => prisma.order.delete(args),
  count: (args) => prisma.order.count(args),
};
