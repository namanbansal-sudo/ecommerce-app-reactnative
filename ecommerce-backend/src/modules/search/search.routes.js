import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { SearchController } from './search.controller.js';
import { searchQuerySchema } from './search.validation.js';

const router = Router();

const validate = (schema, source = 'body') => (req, res, next) => {
  const { error } = schema.validate(req[source], { abortEarly: false });
  if (error) {
    const err = new Error(error.details.map((detail) => detail.message).join(', '));
    err.name = 'ValidationError';
    err.status = 422;
    return next(err);
  }
  return next();
};

router.get('/', authenticate, validate(searchQuerySchema, 'query'), SearchController.globalSearch);

export default router;

