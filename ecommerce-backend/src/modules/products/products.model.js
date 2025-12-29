import { prisma } from '../../config/db.js';

export const ProductModel = {
  findAll: (args) => prisma.product.findMany(args),
  create: (args) => prisma.product.create(args),
  findUnique: (args) => prisma.product.findUnique(args),
  findFirst: (args) => prisma.product.findFirst(args),
  update: (args) => prisma.product.update(args),
  delete: (args) => prisma.product.delete(args),
  count: (args) => prisma.product.count(args),
  countVariants: (args) => prisma.productVariant.count(args),
};
