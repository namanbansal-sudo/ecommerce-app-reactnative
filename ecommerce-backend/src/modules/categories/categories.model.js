import { prisma } from '../../config/db.js';

export const CategoryModel = {
  findAll: (args) => prisma.category.findMany(args),
  findUnique: (args) => prisma.category.findUnique(args),
  create: (args) => prisma.category.create(args),
  update: (args) => prisma.category.update(args),
  delete: (args) => prisma.category.delete(args),
  count: (args) => prisma.category.count(args),
};
