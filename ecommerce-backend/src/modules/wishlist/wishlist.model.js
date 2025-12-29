import { prisma } from '../../config/db.js';

export const WishlistModel = {
  create: (data, client = prisma) => client.wishlist.create({ data }),
  findById: (id, client = prisma) => client.wishlist.findUnique({ where: { id } }),
  findByUserId: (userId, options = {}, client = prisma) =>
    client.wishlist.findMany({ where: { user_id: userId }, ...options }),
  findOwnedById: (id, userId, options = {}, client = prisma) =>
    client.wishlist.findFirst({ where: { id, user_id: userId }, ...options }),
  update: (id, data, client = prisma) => client.wishlist.update({ where: { id }, data }),
  delete: (id, client = prisma) => client.wishlist.delete({ where: { id } }),
};
