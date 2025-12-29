import { prisma } from '../../config/db.js';
import { MESSAGES } from '../../config/messages.js';
import { getStripeClient } from '../../config/stripe.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';
import { OrderModel } from '../orders/orders.model.js';
import { UserModel } from '../user/user.model.js';
import { PaymentCardModel } from './payment-card.model.js';
import { PaymentModel } from './payment.model.js';
const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

const DEFAULT_CURRENCY = 'INR';
const MINOR_UNIT_MULTIPLIER = 100;

const normalizePagination = ({ page, limit } = {}) => {
  const parsedLimit = parsePositiveInt(limit, DEFAULT_LIMIT);
  const boundedLimit = Math.min(parsedLimit, MAX_LIMIT);
  const parsedPage = parsePositiveInt(page, DEFAULT_PAGE);
  return {
    limit: boundedLimit,
    page: parsedPage,
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

const toIntId = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    const err = new Error(MESSAGES.INVALID_CARD_ID);
    err.name = 'ValidationError';
    err.status = 422;
    throw err;
  }
  return parsed;
};

const normalizeName = (value, fallback) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return fallback.trim();
  }
  return 'Card holder';
};

const fetchStripePaymentMethod = async (paymentMethodId) => {
  try {
    const stripe = getStripeClient();
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (!paymentMethod || paymentMethod.type !== 'card') {
      const err = new Error(MESSAGES.STRIPE_PAYMENT_METHOD_NOT_CARD);
      err.name = 'StripePaymentMethodError';
      err.status = 400;
      throw err;
    }
    if (!paymentMethod.card) {
      const err = new Error(MESSAGES.STRIPE_CARD_DETAILS_MISSING);
      err.name = 'StripePaymentMethodError';
      err.status = 400;
      throw err;
    }
    return paymentMethod;
  } catch (error) {
    if (error?.raw?.message) {
      const err = new Error(error.raw.message);
      err.name = 'StripePaymentMethodError';
      err.status = error?.statusCode || 400;
      throw err;
    }
    throw error;
  }
};

const buildCardDataFromStripe = (paymentMethod, options) => {
  const cardDetails = paymentMethod.card;
  const brand = cardDetails.brand ?? 'card';
  if (!cardDetails.last4 || !cardDetails.exp_month || !cardDetails.exp_year) {
    const err = new Error(MESSAGES.STRIPE_CARD_DETAILS_INCOMPLETE);
    err.name = 'StripePaymentMethodError';
    err.status = 400;
    throw err;
  }
  return {
    userId: options.userId,
    stripePaymentMethodId: paymentMethod.id,
    brand: brand.toUpperCase(),
    last4: cardDetails.last4,
    expMonth: cardDetails.exp_month,
    expYear: cardDetails.exp_year,
    cardholderName: normalizeName(options.cardholderName, paymentMethod.billing_details?.name),
    country: cardDetails.country ?? null,
    fingerprint: cardDetails.fingerprint ?? null,
    isDefault: Boolean(options.isDefault),
  };
};

const notFoundError = () => {
  const err = new Error('Payment card not found');
  err.name = 'NotFoundError';
  err.status = 404;
  return err;
};

const fetchUserCardOrThrow = async (userId, cardId) => {
  const card = await PaymentCardModel.findFirst({ where: { id: cardId, userId } });
  if (!card) {
    throw notFoundError();
  }
  return card;
};

const extractReceiptUrl = (paymentIntent) => paymentIntent?.charges?.data?.[0]?.receipt_url ?? null;

const setDefaultFlagWithinTx = async (tx, userId, cardId) => {
  await tx.paymentCard.updateMany({
    where: {
      userId,
      NOT: { id: cardId },
    },
    data: { isDefault: false },
  });
  return tx.paymentCard.update({
    where: { id: cardId },
    data: { isDefault: true },
  });
};

const ensureDefaultFlagForNewCard = async (tx, userId, requestedDefault) => {
  if (requestedDefault) {
    return true;
  }
  const existingDefaultCount = await tx.paymentCard.count({ where: { userId, isDefault: true } });
  return existingDefaultCount === 0;
};

const attachPaymentMethodToCustomer = async (paymentMethodId, customerId) => {
  const stripe = getStripeClient();
  try {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  } catch (error) {
    if (error?.code === 'resource_already_exists') {
      return;
    }
    throw handleStripeError(error);
  }
};

const createPaymentCardWithTx = async (tx, userId, payload, stripeCustomerId) => {
  const stripePaymentMethod = await fetchStripePaymentMethod(payload.stripePaymentMethodId);
  await attachPaymentMethodToCustomer(stripePaymentMethod.id, stripeCustomerId);
  const shouldSetDefault = await ensureDefaultFlagForNewCard(tx, userId, payload.setAsDefault);
  const data = buildCardDataFromStripe(stripePaymentMethod, {
    userId,
    cardholderName: payload.cardholderName,
    isDefault: shouldSetDefault,
  });
  const created = await tx.paymentCard.create({ data });
  if (shouldSetDefault) {
    await tx.paymentCard.updateMany({
      where: {
        userId,
        NOT: { id: created.id },
      },
      data: { isDefault: false },
    });
  }
  return created;
};

const toMinorUnitAmount = (amount) => {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    const err = new Error('Invalid payment amount');
    err.name = 'ValidationError';
    err.status = 422;
    throw err;
  }
  return Math.round(numeric * MINOR_UNIT_MULTIPLIER);
};

const normalizeCurrency = (value) => {
  if (!value || typeof value !== 'string') {
    return DEFAULT_CURRENCY;
  }
  return value.trim().toUpperCase();
};

const fetchOrderForPayment = async (orderId, userId) => {
  return OrderModel.findFirst({ where: { id: orderId, userId } });
};

const orderNotFoundError = () => {
  const err = new Error(MESSAGES.ORDER_NOT_FOUND);
  err.name = 'NotFoundError';
  err.status = 404;
  return err;
};

const userNotFoundError = () => {
  const err = new Error('User not found');
  err.name = 'NotFoundError';
  err.status = 404;
  return err;
};

const handleStripeError = (error) => {
  if (error?.raw?.message) {
    const err = new Error(error.raw.message);
    err.name = 'StripePaymentError';
    err.status = error?.statusCode || 400;
    return err;
  }
  return error;
};

const ensureStripeCustomer = async (userId) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw userNotFoundError();
  }
  if (user.stripeCustomerId) {
    return { customerId: user.stripeCustomerId, user };
  }
  const stripe = getStripeClient();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name:
      user.displayName ||
      [user.firstName, user.lastName]
        .filter((part) => Boolean(part && part.trim()))
        .join(' ')
        .trim() ||
      undefined,
    metadata: {
      appUserId: String(user.id),
    },
  });
  await UserModel.update(user.id, { stripeCustomerId: customer.id });
  return { customerId: customer.id, user: { ...user, stripeCustomerId: customer.id } };
};

export const PaymentCardService = {
  async list(userId, pagination = {}) {
    const { page, limit } = normalizePagination(pagination);
    const where = { userId };
    const total = await PaymentCardModel.count({ where });
    const cards = await PaymentCardModel.findAll({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: (page - 1) * limit,
    });
    return {
      cards,
      pagination: buildPagination(total, page, limit),
    };
  },

  async listPayments(userId, pagination = {}, filters = {}) {
    const { page, limit } = normalizePagination(pagination);
    const where = {
      userId,
      ...(filters.orderId ? { orderId: filters.orderId } : {}),
    };
    const total = await PaymentModel.count({ where });
    const payments = await PaymentModel.findAll({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        order: true,
        paymentCard: true,
      },
    });
    return {
      payments,
      pagination: buildPagination(total, page, limit),
    };
  },

  async getDefault(userId) {
    return PaymentCardModel.findFirst({
      where: { userId, isDefault: true },
      orderBy: { updatedAt: 'desc' },
    });
  },

  async getById(userId, cardId) {
    const id = toIntId(cardId);
    return fetchUserCardOrThrow(userId, id);
  },

  async create(userId, payload) {
    const { customerId } = await ensureStripeCustomer(userId);
    return prisma.$transaction((tx) =>
      createPaymentCardWithTx(
        tx,
        userId,
        {
          stripePaymentMethodId: payload.stripePaymentMethodId,
          cardholderName: payload.cardholderName,
          setAsDefault: payload.setAsDefault,
        },
        customerId,
      ),
    );
  },

  async update(userId, cardId, payload) {
    const id = toIntId(cardId);
    await fetchUserCardOrThrow(userId, id);
    const updateData = {};
    if (payload.cardholderName !== undefined) {
      updateData.cardholderName = normalizeName(payload.cardholderName);
    }
    if (Object.keys(updateData).length === 0) {
      const err = new Error('Nothing to update');
      err.name = 'ValidationError';
      err.status = 422;
      throw err;
    }
    return PaymentCardModel.update({
      where: { id },
      data: updateData,
    });
  },

  async makeDefault(userId, cardId) {
    const id = toIntId(cardId);
    const card = await fetchUserCardOrThrow(userId, id);
    if (card.isDefault) {
      return card;
    }
    return prisma.$transaction((tx) => setDefaultFlagWithinTx(tx, userId, id));
  },

  async delete(userId, cardId) {
    const id = toIntId(cardId);
    return prisma.$transaction(async (tx) => {
      const card = await tx.paymentCard.findFirst({ where: { id, userId } });
      if (!card) {
        throw notFoundError();
      }
      await tx.paymentCard.delete({ where: { id: card.id } });
      if (card.isDefault) {
        const nextCard = await tx.paymentCard.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        if (nextCard) {
          await tx.paymentCard.update({ where: { id: nextCard.id }, data: { isDefault: true } });
        }
      }
      return card;
    });
  },

  async listPaymentsHistory(userId, params = {}) {
    return this.listPayments(userId, params, { orderId: params.orderId });
  },

  async makePayment(userId, payload) {
    const order = await fetchOrderForPayment(payload.orderId, userId);
    if (!order) {
      throw orderNotFoundError();
    }
    if (order.paymentStatus === 'PAID') {
      const err = new Error('Order already paid');
      err.name = 'ValidationError';
      err.status = 400;
      throw err;
    }

    const { customerId: stripeCustomerId } = await ensureStripeCustomer(userId);

    return prisma.$transaction(async (tx) => {
      let card = null;
      let stripePaymentMethodId = null;

      if (payload.paymentCardId) {
        card = await tx.paymentCard.findFirst({ where: { id: payload.paymentCardId, userId } });
        if (!card) {
          throw notFoundError();
        }
        stripePaymentMethodId = card.stripePaymentMethodId;
        await attachPaymentMethodToCustomer(stripePaymentMethodId, stripeCustomerId);
      } else if (payload.stripePaymentMethodId) {
        stripePaymentMethodId = payload.stripePaymentMethodId;
        if (payload.saveCard) {
          card = await createPaymentCardWithTx(
            tx,
            userId,
            {
              stripePaymentMethodId: payload.stripePaymentMethodId,
              cardholderName: payload.cardholderName,
              setAsDefault: payload.setAsDefault,
            },
            stripeCustomerId,
          );
        } else {
          await attachPaymentMethodToCustomer(stripePaymentMethodId, stripeCustomerId);
        }
      } else {
        const err = new Error('Payment method is required');
        err.name = 'ValidationError';
        err.status = 422;
        throw err;
      }

      const stripe = getStripeClient();
      const amountValue = Number(order.totalAmount ?? 0);
      const amountMinor = toMinorUnitAmount(amountValue);
      const currency = normalizeCurrency(payload.currency ?? DEFAULT_CURRENCY);

      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.create({
          amount: amountMinor,
          currency,
          payment_method: stripePaymentMethodId,
          customer: stripeCustomerId,
          confirm: true,
          automatic_payment_methods: { enabled: false },
          payment_method_types: ['card'],
        });
      } catch (error) {
        throw handleStripeError(error);
      }

      const paymentRecord = await tx.payment.create({
        data: {
          userId,
          orderId: order.id,
          paymentCardId: card?.id ?? null,
          stripePaymentIntentId: paymentIntent.id,
          stripePaymentMethodId,
          amount: order.totalAmount,
          currency,
          status: paymentIntent.status?.toUpperCase() ?? 'SUCCEEDED',
          receiptUrl: extractReceiptUrl(paymentIntent),
        },
        include: {
          order: true,
          paymentCard: true,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: 'CARD',
        },
      });

      return {
        ...paymentRecord,
        order: updatedOrder,
      };
    });
  },
};
