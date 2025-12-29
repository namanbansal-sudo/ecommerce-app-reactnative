import { prisma } from '../../config/db.js';

export const NeedHelpModel = {
    create: (data) => {
        return prisma.needHelpRequest.create({ data });
    },

    findAllByUserId: (userId, pagination = {}) => {
        const { limit = 20, page = 1 } = pagination;
        const take = limit;
        const skip = (page - 1) * take;

        return prisma.needHelpRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
        });
    },

    update: (id, data) => {
        return prisma.needHelpRequest.update({
            where: { id: parseInt(id) },
            data,
        });
    },

    findById: (id) => {
        return prisma.needHelpRequest.findUnique({
            where: { id: parseInt(id) },
        });
    },
};
