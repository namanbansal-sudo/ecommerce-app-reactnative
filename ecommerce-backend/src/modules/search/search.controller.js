import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { SearchService } from './search.service.js';

export const SearchController = {
  async globalSearch(req, res, next) {
    try {
      const data = await SearchService.globalSearch(req.query);
      return successResponse(res, MESSAGES.SEARCH_RESULTS_FETCHED, data);
    } catch (err) {
      return next(err);
    }
  },
};

