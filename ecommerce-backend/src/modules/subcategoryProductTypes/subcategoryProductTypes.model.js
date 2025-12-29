import { prisma } from '../../config/db.js';

export const SubcategoryProductTypeModel = {
  findAll: (args) => prisma.subcategoryProductType.findMany(args),
  findUnique: (args) => prisma.subcategoryProductType.findUnique(args),
  create: (args) => prisma.subcategoryProductType.create(args),
  update: (args) => prisma.subcategoryProductType.update(args),
  delete: (args) => prisma.subcategoryProductType.delete(args),
  count: (args) => prisma.subcategoryProductType.count(args),
};
