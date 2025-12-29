import { errorResponse, successResponse } from '../../utils/response.util.js';
import { MESSAGES } from '../../config/messages.js';
import { NeedHelpService } from './need-help.service.js';

export const NeedHelpController = {
    createNeedHelp: async (req, res) => {
        try {
            const { id: userId } = req.user;
            const request = await NeedHelpService.create(userId, req.body);
            return successResponse(res, MESSAGES.HELP_REQUEST_CREATED, request, 201);
        } catch (error) {
            return errorResponse(res, error.message, 'CreateNeedHelpError', 500);
        }
    },

    getNeedHelp: async (req, res) => {
        try {
            const { id: userId } = req.user;
            const { limit, page } = req.query;
            const requests = await NeedHelpService.findAllByUserId(userId, { limit, page });
            return successResponse(res, MESSAGES.HELP_REQUESTS_FETCHED, requests);
        } catch (error) {
            return errorResponse(res, error.message, 'GetNeedHelpError', 500);
        }
    },

    updateNeedHelp: async (req, res) => {
        try {
            // Support IDs coming from the query string or the body payload
            const requestId = req.query.id ?? req.body.id;
            if (!requestId) {
                return errorResponse(res, 'Need Help Request ID is required', 'ValidationError', 400);
            }

            const existing = await NeedHelpService.findById(requestId);
            if (!existing) {
                return errorResponse(res, 'Request not found', 'NotFoundError', 404);
            }
            if (existing.userId !== req.user.id) {
                return errorResponse(res, 'Unauthorized to update this request', 'AuthError', 403);
            }

            // Only allow the fields we expect (status for now) and ignore any ID that might come along.
            const allowedUpdateFields = ['status'];
            const updatePayload = allowedUpdateFields.reduce((acc, field) => {
                if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                    const value = req.body[field];
                    if (typeof value !== 'undefined') {
                        acc[field] = value;
                    }
                }
                return acc;
            }, {});

            if (!Object.keys(updatePayload).length) {
                return errorResponse(res, 'At least one updatable field must be provided', 'ValidationError', 422);
            }

            const updated = await NeedHelpService.update(requestId, updatePayload);
            return successResponse(res, MESSAGES.HELP_REQUEST_UPDATED, updated);
        } catch (error) {
            return errorResponse(res, error.message, 'UpdateNeedHelpError', 500);
        }
    }
};
