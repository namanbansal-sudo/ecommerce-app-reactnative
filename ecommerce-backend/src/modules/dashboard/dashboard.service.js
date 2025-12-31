import { prisma } from '../../config/db.js';
import { uploadOnCloudinary as uploadToCloudinary } from '../../utils/cloudinary.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';
import { CategoryService } from '../categories/categories.service.js';
import { ProductService } from '../products/products.service.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

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

const parseSectionOptions = (query, prefix) => {
  if (!query) {
    return normalizePagination({});
  }
  return normalizePagination({
    page: query[`${prefix}Page`] ?? query.page,
    limit: query[`${prefix}Limit`] ?? query.limit,
  });
};

const SECTION_KEYS = ['offers', 'categories', 'previousOrders', 'trackOrders', 'products', 'brands'];

const parseRequestedSections = (query = {}) => {
  if (!query.sections && !query.section) {
    return null;
  }
  const raw = query.sections ?? query.section;
  if (!raw) return null;
  const normalized = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (normalized.length === 0) return null;
  return normalized.filter((value) => SECTION_KEYS.includes(value));
};

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
};

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const buildSectionPayload = (items, pagination) => ({
  items,
  pagination,
  totalCount: pagination?.total ?? 0,
});

const formatDecimal = (value) => {
  if (value === null || value === undefined) return null;
  return Number(value);
};

const formatVariant = (variant) => ({
  sku: variant.sku,
  name: variant.name,
  description: variant.description,
  price: formatDecimal(variant.price),
  discountedPrice: formatDecimal(variant.discountedPrice),
  stock: variant.stock,
  color: variant.color,
  size: variant.size,
  rating: formatDecimal(variant.rating),
  reviewCount: variant.reviewCount,
  boughtCount: variant.boughtCount,
  images: variant.images,
});

const formatProduct = (product) => {
  if (!product) return null;
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    productVariants: Array.isArray(product.productVariants)
      ? product.productVariants.map(formatVariant)
      : [],
  };
};

const ensureExists = (value, entity) => {
  if (!value) {
    const err = new Error(`${entity} not found`);
    err.name = 'NotFoundError';
    err.status = 404;
    throw err;
  }
  return value;
};

const uploadImageIfNeeded = async (file) => {
  if (!file || !file.path) return undefined;
  const uploadedData = await uploadToCloudinary(file.path);
  return uploadedData?.url;
};

const buildPaginationArgs = ({ page, limit }) => ({
  take: limit,
  skip: (page - 1) * limit,
});

const fetchOffers = async (options) => {
  const where = { isActive: true };
  const total = await prisma.dashboardOffer.count({ where });
  const offers = await prisma.dashboardOffer.findMany({
    where,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    ...buildPaginationArgs(options),
  });
  return buildSectionPayload(offers, buildPagination(total, options.page, options.limit));
};

const fetchFeaturedCategories = async (options) => {
  const { categories, pagination } = await CategoryService.listCategories({
    page: options.page,
    limit: options.limit,
  });
  const items = categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    image: category.image,
    svg: category.svg,
    displayOrder: category.displayOrder ?? 0,
    subcategoryCount: category.subcategoryCount,
  }));
  return buildSectionPayload(items, pagination);
};

const fetchPreviousOrders = async (userId, options) => {
const where = {
  userId,
  };
  const total = await prisma.order.count({ where });
  const orders = await prisma.order.findMany({
    where,
    include: {
      orderItems: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    ...buildPaginationArgs(options),
  });
  const items = orders.map((order) => ({
    id: order.id,
    totalAmount: formatDecimal(order.totalAmount),
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    shippingAddress: order.shippingAddress,
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      productSnapshot: item.productSnapshot,
      quantity: item.quantity,
      price: formatDecimal(item.price),
      subtotal: formatDecimal(item.subtotal),
      variantInfo: item.variantInfo,
    })),
  }));
  return buildSectionPayload(items, buildPagination(total, options.page, options.limit));
};

const fetchTrackOrders = async (userId, options) => {
  const trackableStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'];
  const where = {
    userId,
    status: { in: trackableStatuses },
  };
  const total = await prisma.order.count({ where });
  const orders = await prisma.order.findMany({
    where,
    include: {
      orderItems: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
    ...buildPaginationArgs(options),
  });
  const items = orders.map((order) => ({
    id: order.id,
    totalAmount: formatDecimal(order.totalAmount),
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shippingAddress: order.shippingAddress,
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      productSnapshot: item.productSnapshot,
      quantity: item.quantity,
      price: formatDecimal(item.price),
      subtotal: formatDecimal(item.subtotal),
      variantInfo: item.variantInfo,
    })),
  }));
  return buildSectionPayload(items, buildPagination(total, options.page, options.limit));
};

const fetchProductHighlights = async (options) => {
  const { products, pagination } = await ProductService.getAllProducts(options);
  return buildSectionPayload(products, pagination);
};

const fetchBrands = async (options) => {
  const where = {};
  const total = await prisma.dashboardBrand.count({ where });
  const brands = await prisma.dashboardBrand.findMany({
    where,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    ...buildPaginationArgs(options),
  });
  const items = brands.map((brand) => ({
    id: brand.id,
    name: brand.name,
    tagline: brand.tagline,
    logoUrl: brand.logoUrl,
    isFeatured: brand.isFeatured,
    displayOrder: brand.displayOrder ?? 0,
  }));
  return buildSectionPayload(items, buildPagination(total, options.page, options.limit));
};

const SECTION_OPTION_PREFIX = {
  offers: 'offers',
  categories: 'categories',
  previousOrders: 'orders',
  trackOrders: 'tracking',
  products: 'products',
  brands: 'brands',
};

const SECTION_FETCHERS = {
  offers: (userId, options) => fetchOffers(options),
  categories: (userId, options) => fetchFeaturedCategories(options),
  previousOrders: (userId, options) => fetchPreviousOrders(userId, options),
  trackOrders: (userId, options) => fetchTrackOrders(userId, options),
  products: (userId, options) => fetchProductHighlights(options),
  brands: (userId, options) => fetchBrands(options),
};

const buildDashboardMeta = (sections) => {
  const totalItemCount = Object.values(sections).reduce(
    (sum, section) => sum + (section?.totalCount ?? 0),
    0,
  );
  return { totalItemCount };
};

const createOfferPayload = (payload, imageUrl = null) => ({
  title: payload.title,
  subtitle: payload.subtitle?.trim() || null,
  description: payload.description?.trim() || null,
  discountLabel: payload.discountLabel?.trim() || null,
  actionLabel: payload.actionLabel?.trim() || null,
  targetUrl: payload.targetUrl?.trim() || null,
  displayOrder: toNullableInt(payload.displayOrder) ?? 0,
  isActive: parseBoolean(payload.isActive) ?? true,
  imageUrl,
});

const updateOfferPayload = (payload, imageUrl) => {
  const data = {};
  if (payload.title !== undefined) data.title = payload.title;
  if (payload.subtitle !== undefined) data.subtitle = payload.subtitle?.trim() || null;
  if (payload.description !== undefined) data.description = payload.description?.trim() || null;
  if (payload.discountLabel !== undefined) data.discountLabel = payload.discountLabel?.trim() || null;
  if (payload.actionLabel !== undefined) data.actionLabel = payload.actionLabel?.trim() || null;
  if (payload.targetUrl !== undefined) data.targetUrl = payload.targetUrl?.trim() || null;
  if (payload.displayOrder !== undefined) data.displayOrder = toNullableInt(payload.displayOrder);
  if (payload.isActive !== undefined) data.isActive = parseBoolean(payload.isActive);
  if (imageUrl !== undefined && imageUrl !== null) {
    data.imageUrl = imageUrl;
  }
  return data;
};

const createBrandPayload = (payload, logoUrl = null) => ({
  name: payload.name,
  tagline: payload.tagline?.trim() || null,
  displayOrder: toNullableInt(payload.displayOrder) ?? 0,
  isFeatured: parseBoolean(payload.isFeatured) ?? false,
  logoUrl,
});

const updateBrandPayload = (payload, logoUrl) => {
  const data = {};
  if (payload.name !== undefined) data.name = payload.name;
  if (payload.tagline !== undefined) data.tagline = payload.tagline?.trim() || null;
  if (payload.displayOrder !== undefined) data.displayOrder = toNullableInt(payload.displayOrder);
  if (payload.isFeatured !== undefined) data.isFeatured = parseBoolean(payload.isFeatured);
  if (logoUrl !== undefined && logoUrl !== null) {
    data.logoUrl = logoUrl;
  }
  return data;
};

export const DashboardService = {
  async getHomeDashboard(userId, query) {
    const sectionOptions = Object.fromEntries(
      SECTION_KEYS.map((section) => [section, parseSectionOptions(query, SECTION_OPTION_PREFIX[section])]),
    );
    const requestedSections = parseRequestedSections(query) ?? SECTION_KEYS;
    const fetchedSections = await Promise.all(
      requestedSections.map((section) =>
        SECTION_FETCHERS[section](userId, sectionOptions[section]),
      ),
    );

    const sections = fetchedSections.reduce((acc, value, index) => {
      const sectionKey = requestedSections[index];
      if (sectionKey) {
        acc[sectionKey] = value;
      }
      return acc;
    }, {});

    return {
      sections,
      meta: buildDashboardMeta(sections),
    };
  },

  async createOffer(payload, file) {
    const imageUrl = await uploadImageIfNeeded(file);
    const data = createOfferPayload(payload, imageUrl);
    const offer = await prisma.dashboardOffer.create({ data });
    return offer;
  },

  async updateOffer(id, payload, file) {
    const existing = await prisma.dashboardOffer.findUnique({ where: { id } });
    ensureExists(existing, 'Dashboard offer');
    const imageUrl = await uploadImageIfNeeded(file);
    const data = updateOfferPayload(payload, imageUrl);
    if (Object.keys(data).length === 0) return existing;
    const updated = await prisma.dashboardOffer.update({ where: { id }, data });
    return updated;
  },

  async deleteOffer(id) {
    ensureExists(await prisma.dashboardOffer.findUnique({ where: { id } }), 'Dashboard offer');
    return prisma.dashboardOffer.delete({ where: { id } });
  },

  async createBrand(payload, file) {
    const logoUrl = await uploadImageIfNeeded(file);
    const data = createBrandPayload(payload, logoUrl);
    const brand = await prisma.dashboardBrand.create({ data });
    return brand;
  },

  async updateBrand(id, payload, file) {
    const existing = await prisma.dashboardBrand.findUnique({ where: { id } });
    ensureExists(existing, 'Dashboard brand');
    const logoUrl = await uploadImageIfNeeded(file);
    const data = updateBrandPayload(payload, logoUrl);
    if (Object.keys(data).length === 0) return existing;
    const updated = await prisma.dashboardBrand.update({ where: { id }, data });
    return updated;
  },

  async deleteBrand(id) {
    ensureExists(await prisma.dashboardBrand.findUnique({ where: { id } }), 'Dashboard brand');
    return prisma.dashboardBrand.delete({ where: { id } });
  },
};
