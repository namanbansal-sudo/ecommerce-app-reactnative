import { prisma } from "../../config/db.js";

export const AddressModel = {
  create: (data) => prisma.address.create({ data }),

  findByLines: (userId, line1, line2, excludeId) =>
    prisma.address.findFirst({
      where: {
        userId: Number(userId),
        line1: { equals: line1, mode: "insensitive" },
        ...(typeof line2 === "string" && line2.length
          ? { line2: { equals: line2, mode: "insensitive" } }
          : { line2: null }),
        ...(excludeId ? { NOT: { id: Number(excludeId) } } : {}),
      },
    }),
  findById: (id) => prisma.address.findUnique({ where: { id: Number(id) } }),

  countByUser: (userId) =>
    prisma.address.count({ where: { userId: Number(userId) } }),

  findByIdForUser: (id, userId) =>
    prisma.address.findFirst({
      where: { id: Number(id), userId: Number(userId) },
    }),

  findAllByUser: (userId, options = {}) =>
    prisma.address.findMany({
      where: { userId: Number(userId) },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      skip: typeof options.skip === "number" ? options.skip : undefined,
      take: typeof options.take === "number" ? options.take : undefined,
    }),

  findDefaultByUser: (userId) =>
    prisma.address.findFirst({
      where: { userId: Number(userId), isDefault: true },
    }),

  update: (id, data) =>
    prisma.address.update({ where: { id: Number(id) }, data }),

  delete: (id) => prisma.address.delete({ where: { id: Number(id) } }),

  unsetDefaultForUser: (userId, excludeId) =>
    prisma.address.updateMany({
      where: {
        userId: Number(userId),
        ...(excludeId ? { NOT: { id: Number(excludeId) } } : {}),
      },
      data: { isDefault: false },
    }),
};
