import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';
import { NeedHelpModel } from './need-help.model.js';

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
};

export const NeedHelpService = {
    create: async (userId, data) => {
        return NeedHelpModel.create({
            userId,
            ...data,
        });
    },

    findAllByUserId: async (userId, pagination = {}) => {
        const limit = Math.min(parsePositiveInt(pagination.limit, DEFAULT_LIMIT), MAX_LIMIT);
        const page = parsePositiveInt(pagination.page, DEFAULT_PAGE);
        return NeedHelpModel.findAllByUserId(userId, { limit, page });
    },

    // Added ability to find any request by ID (useful for updates if user owns it, or admin)
    // For this user-centric app, we'll probably check ownership in controller or service
    update: async (id, data) => {
        // Business logic can go here (e.g. validation, notifications)
        return NeedHelpModel.update(id, data);
    },

    findById: async (id) => {
        return NeedHelpModel.findById(id);
    },
};
