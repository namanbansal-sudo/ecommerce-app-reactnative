import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { NeedHelpController } from './need-help.controller.js';
import { createNeedHelpSchema, updateNeedHelpSchema } from './need-help.validation.js';

const router = Router();

function validate(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, { abortEarly: false });
        if (error) {
            const err = new Error(error.details.map((d) => d.message).join(', '));
            err.name = 'ValidationError';
            err.status = 422;
            return next(err);
        }
        return next();
    };
}

// User specified endpoints:
// GET /api/need-help/get-need-help
// POST /api/need-help/create-need-help
// PUT /api/need-help/update-need-help

router.post('/create-need-help', authenticate, validate(createNeedHelpSchema), NeedHelpController.createNeedHelp);
router.get('/get-need-help', authenticate, NeedHelpController.getNeedHelp);
router.put('/update-need-help', authenticate, validate(updateNeedHelpSchema), NeedHelpController.updateNeedHelp);

export default router;
