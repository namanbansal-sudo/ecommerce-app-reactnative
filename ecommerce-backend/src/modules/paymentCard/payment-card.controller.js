import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { PaymentCardService } from './payment-card.service.js';

const parseListOptions = (req) => {
  const { page, limit } = req.query;
  return {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  };
};

export const PaymentCardController = {
  async listPaymentCards(req, res, next) {
    try {
      const options = parseListOptions(req);
      const { cards, pagination } = await PaymentCardService.list(req.user.id, options);
      return successResponse(res, MESSAGES.PAYMENT_CARDS_FETCHED, { cards, pagination });
    } catch (error) {
      return next(error);
    }
  },

  async getDefaultPaymentCard(req, res, next) {
    try {
      const card = await PaymentCardService.getDefault(req.user.id);
      return successResponse(res, MESSAGES.PAYMENT_CARD_DEFAULT_FETCHED, { card });
    } catch (error) {
      return next(error);
    }
  },

  async getPaymentCardById(req, res, next) {
    try {
      const cardId = Number(req.params.id);
      const card = await PaymentCardService.getById(req.user.id, cardId);
      return successResponse(res, MESSAGES.PAYMENT_CARD_RETRIEVED, { card });
    } catch (error) {
      return next(error);
    }
  },

  async createPaymentCard(req, res, next) {
    try {
      const card = await PaymentCardService.create(req.user.id, req.body);
      return successResponse(res, MESSAGES.PAYMENT_CARD_CREATED, { card }, 201);
    } catch (error) {
      return next(error);
    }
  },

  async updatePaymentCard(req, res, next) {
    try {
      const cardId = Number(req.params.id);
      const card = await PaymentCardService.update(req.user.id, cardId, req.body);
      return successResponse(res, MESSAGES.PAYMENT_CARD_UPDATED, { card });
    } catch (error) {
      return next(error);
    }
  },

  async deletePaymentCard(req, res, next) {
    try {
      const cardId = Number(req.params.id);
      await PaymentCardService.delete(req.user.id, cardId);
      return successResponse(res, MESSAGES.PAYMENT_CARD_DELETED, {});
    } catch (error) {
      return next(error);
    }
  },

  async makeDefaultPaymentCard(req, res, next) {
    try {
      const { id } = req.body;
      const card = await PaymentCardService.makeDefault(req.user.id, id);
      return successResponse(res, MESSAGES.PAYMENT_CARD_DEFAULT_UPDATED, { card });
    } catch (error) {
      return next(error);
    }
  },

  async listPayments(req, res, next) {
    try {
      const options = parseListOptions(req);
      const filters = {};
      if (req.query.orderId) {
        filters.orderId = Number(req.query.orderId);
      }
      const { payments, pagination } = await PaymentCardService.listPayments(req.user.id, options, filters);
      return successResponse(res, MESSAGES.PAYMENTS_FETCHED, { payments, pagination });
    } catch (error) {
      return next(error);
    }
  },

  async makePayment(req, res, next) {
    try {
      const payment = await PaymentCardService.makePayment(req.user.id, req.body);
      return successResponse(res, MESSAGES.PAYMENT_COMPLETED, { payment }, 201);
    } catch (error) {
      return next(error);
    }
  },
};
