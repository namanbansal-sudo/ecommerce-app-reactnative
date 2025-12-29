import { prisma } from '../../config/db.js';
import { OrderModel } from './orders.model.js';

const ORDER_INCLUDE = {
  include: {
    orderItems: true,
  },
};

const DEFAULT_LIMIT = 10;

const normalizePagination = ({ page, limit } = {}) => {
  const parsedLimit = Number(limit);
  const parsedPage = Number(page);
  return {
    limit: Number.isFinite(parsedLimit) && parsedLimit >= 1 ? parsedLimit : DEFAULT_LIMIT,
    page: Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1,
  };
};

const buildPagination = (total, page, limit) => {
  const totalPages = limit > 0 ? Math.floor((total + limit - 1) / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

const normalizeSku = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (normalized === '') return null;
  return normalized;
};

const digitizeVariantInfo = (variantInfo) => {
  if (variantInfo === undefined || variantInfo === null) return null;
  if (typeof variantInfo === 'object') {
    return normalizeSku(variantInfo.sku ?? variantInfo.variantSku);
  }
  if (typeof variantInfo !== 'string') return null;
  const trimmed = variantInfo.trim();
  if (trimmed === '') return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      return (
        normalizeSku(parsed.sku) ??
        normalizeSku(parsed.variantSku) ??
        normalizeSku(parsed.productVariant?.sku) ??
        normalizeSku(parsed.selectedVariant?.sku)
      );
    }
  } catch {
    // ignore non-JSON payloads
  }
  return normalizeSku(trimmed);
};

const resolveVariantSkuFromSnapshot = (snapshot = {}) => {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }
  return (
    normalizeSku(snapshot.variantSku) ??
    normalizeSku(snapshot.productVariantSku) ??
    normalizeSku(snapshot.sku) ??
    normalizeSku(snapshot.productVariant?.sku) ??
    normalizeSku(snapshot.selectedVariant?.sku) ??
    normalizeSku(snapshot.variant?.sku)
  );
};

const resolveVariantSku = (item = {}) => {
  return digitizeVariantInfo(item.variantInfo) ?? resolveVariantSkuFromSnapshot(item.productSnapshot);
};

const accumulateVariantQuantities = (items = []) => {
  const increments = new Map();
  for (const item of items) {
    const sku = resolveVariantSku(item);
    if (!sku) continue;
    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    increments.set(sku, (increments.get(sku) ?? 0) + quantity);
  }
  return increments;
};

const updateVariantBoughtCounts = async (tx, items) => {
  const increments = accumulateVariantQuantities(items);
  if (increments.size === 0) return;
  for (const [sku, amount] of increments) {
    if (!Number.isFinite(amount) || amount <= 0) continue;
    try {
      await tx.productVariant.update({
        where: { sku },
        data: {
          boughtCount: {
            increment: amount,
          },
        },
      });
    } catch (err) {
      if (err?.code === 'P2025') {
        continue;
      }
      throw err;
    }
  }
};

const upperValue = (value) => {
  if (value === undefined || value === null) return undefined;
  return String(value).toUpperCase();
};

const resolveOrderItems = (items = []) =>
  items.map((item) => {
    const subtotal = item.subtotal ?? Number((item.price || 0) * (item.quantity || 1));
    return {
      productId: item.productId ?? null,
      productSnapshot: item.productSnapshot || {},
      quantity: item.quantity,
      price: item.price,
      subtotal,
      variantInfo: item.variantInfo ?? null,
    };
  });

const fetchOrders = async (where = {}, options = {}) => {
  const { page, limit } = normalizePagination(options);
  const total = await OrderModel.count({ where });
  const orders = await OrderModel.findAll({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
    ...ORDER_INCLUDE,
  });
  return { orders, pagination: buildPagination(total, page, limit) };
};

export const OrderService = {
  async listOrders(options) {
    return fetchOrders({}, options);
  },

  async listOrdersByUser(userId, options) {
    return fetchOrders({ userId }, options);
  },

  async getOrderById(id) {
    return OrderModel.findUnique({
      where: { id },
      ...ORDER_INCLUDE,
    });
  },

  async createOrder(data) {
    const items = resolveOrderItems(data.items);
    const computedTotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    const totalAmount = data.totalAmount ?? computedTotal;
    const orderData = {
      userId: data.userId,
      totalAmount,
      shippingAddress: data.shippingAddress,
      promocode: data.promocode || null,
      status: upperValue(data.status) ?? undefined,
      paymentMethod: data.paymentMethod,
      paymentStatus: upperValue(data.paymentStatus) ?? undefined,
      rating: upperValue(data.rating) ?? undefined,
      orderItems: {
        create: items,
      },
    };

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: orderData,
        ...ORDER_INCLUDE,
      });
      await updateVariantBoughtCounts(tx, items);
      return order;
    });
  },

  async updateOrder(id, payload) {
    const updateData = {};
    if (payload.status !== undefined) updateData.status = upperValue(payload.status);
    if (payload.paymentStatus !== undefined) updateData.paymentStatus = upperValue(payload.paymentStatus);
    if (payload.rating !== undefined) updateData.rating = upperValue(payload.rating);

    return prisma.order.update({
      where: { id },
      data: updateData,
      ...ORDER_INCLUDE,
    });
  },

  async deleteOrder(id) {
    return OrderModel.delete({ where: { id } });
  },
};
