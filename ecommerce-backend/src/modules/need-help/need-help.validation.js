import Joi from 'joi';

export const createNeedHelpSchema = Joi.object({
    description: Joi.string().required(),
    type: Joi.string().valid('order', 'payment', 'other', 'delivery', 'returns', 'cancellation', 'account').required(),
});

export const updateNeedHelpSchema = Joi.object({
    status: Joi.string().valid('sent', 'resolve', 'cancel', 'in_progress').required(),
});
