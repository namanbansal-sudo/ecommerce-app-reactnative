import { prisma } from '../../config/db.js';

export const SubcategoryModel = {
  findAll: (args) => prisma.subcategory.findMany(args),
  findUnique: (args) => prisma.subcategory.findUnique(args),
  create: (args) => prisma.subcategory.create(args),
  update: (args) => prisma.subcategory.update(args),
  delete: (args) => prisma.subcategory.delete(args),
  count: (args) => prisma.subcategory.count(args),
};
