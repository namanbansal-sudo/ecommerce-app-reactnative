import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { OrderService } from './orders.service.js';

export const OrderController = {
  async listOrders(req, res, next) {
    try {
      const options = parseListOptions(req);
      const { orders, pagination } = await OrderService.listOrders(options);
      return successResponse(res, MESSAGES.ORDERS_FETCHED, { orders, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async listOrdersByUser(req, res, next) {
    try {
      const userId = Number(req.params.userId);
      const options = parseListOptions(req);
      const { orders, pagination } = await OrderService.listOrdersByUser(userId, options);
      return successResponse(res, MESSAGES.ORDERS_FETCHED, { orders, pagination });
    } catch (err) {
      return next(err);
    }
  },

  async getOrder(req, res, next) {
    try {
      const orderId = Number(req.params.id);
      const order = await OrderService.getOrderById(orderId);
      if (!order) {
        const err = new Error('Order not found');
        err.name = 'NotFoundError';
        err.status = 404;
        throw err;
      }
      return successResponse(res, MESSAGES.ORDER_RETRIEVED, { order });
    } catch (err) {
      return next(err);
    }
  },

  async createOrder(req, res, next) {
    try {
      const order = await OrderService.createOrder(req.body);
      return successResponse(res, MESSAGES.ORDER_CREATED, { order }, 201);
    } catch (err) {
      return next(err);
    }
  },

  async updateOrder(req, res, next) {
    try {
      const orderId = Number(req.params.id);
      const order = await OrderService.updateOrder(orderId, req.body);
      return successResponse(res, MESSAGES.ORDER_UPDATED, { order });
    } catch (err) {
      return next(err);
    }
  },

  async deleteOrder(req, res, next) {
    try {
      const orderId = Number(req.params.id);
      await OrderService.deleteOrder(orderId);
      return successResponse(res, MESSAGES.ORDER_DELETED, {});
    } catch (err) {
      return next(err);
    }
  },
};

function parseListOptions(req) {
  const { page, limit } = req.query;
  return {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  };
}
