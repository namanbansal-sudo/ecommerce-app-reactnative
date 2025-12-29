import { prisma } from '../../config/db.js';

export const CartModel = {
  findAll: (args) => prisma.cart.findMany(args),
  findFirst: (args) => prisma.cart.findFirst(args),
  findUnique: (args) => prisma.cart.findUnique(args),
  create: (args) => prisma.cart.create(args),
  update: (args) => prisma.cart.update(args),
  delete: (args) => prisma.cart.delete(args),
  deleteMany: (args) => prisma.cart.deleteMany(args),
  count: (args) => prisma.cart.count(args),
};
