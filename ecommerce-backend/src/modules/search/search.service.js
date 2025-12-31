import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';
import { CategoryService } from '../categories/categories.service.js';
import { ProductService } from '../products/products.service.js';
import { SubcategoryService } from '../subcategories/subcategories.service.js';

const SECTION_KEYS = ['categories', 'subcategories', 'products'];

const SECTION_OPTION_PREFIX = {
  categories: 'categories',
  subcategories: 'subcategories',
  products: 'products',
};

const PRICE_MATCH = /(₹|rs\.?\s*)?(\d+(?:\.\d+)?)(\s*[kKmM])?/g;
const PRICE_MIN_HINTS = /\b(over|above|greater than|from|at least|minimum|more than|starting at)\b/;
const PRICE_MAX_HINTS = /\b(under|below|less than|up to|upto|within|no more than|max)\b/;
const COLOR_KEYWORDS = new Set([
  'black',
  'white',
  'red',
  'blue',
  'green',
  'grey',
  'gray',
  'yellow',
  'orange',
  'purple',
  'pink',
  'brown',
  'navy',
  'maroon',
  'teal',
  'olive',
  'beige',
  'peach',
  'mint',
  'lavender',
  'coral',
  'turquoise',
  'magenta',
  'amber',
  'gold',
  'silver',
  'bronze',
  'cream',
  'ivory',
  'chocolate',
  'charcoal',
  'rose',
  'mustard',
  'eggplant',
  'emerald',
  'ruby',
  'wine',
  'lime',
  'aqua',
  'cyan',
]);
const SIZE_DIRECT_TERMS = new Set([
  'xs',
  's',
  'm',
  'l',
  'xl',
  'xxl',
  'xxxl',
  'small',
  'medium',
  'large',
  'onesize',
  'one-size',
  'os',
]);
const SIZE_INDICATOR_WORDS = new Set([
  'size',
  'shoe',
  'shoes',
  'footwear',
  'clothes',
  'apparel',
  'pant',
  'pants',
  'trouser',
  'trousers',
  'shirt',
  'shirts',
  'tshirt',
  'dress',
  'sneaker',
  'sneakers',
  'boots',
  'boot',
  'jacket',
  'jeans',
  'shorts',
  'skirt',
  'sweater',
  'sock',
  'socks',
  'sandals',
  'slipper',
  'slippers',
  'heels',
  'coat',
  'coats',
  'top',
  'tops',
  'outerwear',
  'hoodie',
]);
const NUMBER_PATTERN = /^\d+(?:\.\d+)?$/;

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

const buildSectionPayload = (items, pagination) => ({
  items,
  pagination,
  totalCount: pagination?.total ?? 0,
});

const parseSectionOptions = (query = {}, section) => {
  const prefix = SECTION_OPTION_PREFIX[section];
  return normalizePagination({
    page: query[`${prefix}Page`] ?? query.page,
    limit: query[`${prefix}Limit`] ?? query.limit,
  });
};

const parseRequestedSections = (query = {}) => {
  if (!query.sections && !query.section) {
    return SECTION_KEYS;
  }
  const raw = query.sections ?? query.section;
  if (!raw) return SECTION_KEYS;
  const normalized = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const filtered = normalized.filter((value) => SECTION_KEYS.includes(value));
  return filtered.length ? filtered : SECTION_KEYS;
};

const buildMeta = (sections) => {
  const totalItemCount = Object.values(sections).reduce((sum, section) => sum + (section?.totalCount ?? 0), 0);
  return { totalItemCount };
};

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
};

const parseIntOrUndefined = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseNumberOrUndefined = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizePriceUnit = (value) => {
  if (!value) return undefined;
  const unit = value.trim().toLowerCase();
  if (unit === 'k') return 1000;
  if (unit === 'm') return 1000000;
  return 1;
};

const parseHumanPrice = (raw) => {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.replace(/,/g, '').trim();
  const match = cleaned.match(/^(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)([kKmM])?$/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  const multiplier = normalizePriceUnit(match[2]);
  return value * (multiplier ?? 1);
};

const extractPriceRangeFromQuery = (text = '') => {
  if (typeof text !== 'string' || !text.trim()) {
    return { sanitized: text, min: undefined, max: undefined };
  }
  const matches = [...text.matchAll(PRICE_MATCH)].map((match) => parseHumanPrice(match[0]));
  const normalizedText = text.toLowerCase();
  const hasMaxHint = PRICE_MAX_HINTS.test(normalizedText);
  const hasMinHint = PRICE_MIN_HINTS.test(normalizedText);

  const values = matches.filter((value) => Number.isFinite(value));
  let min;
  let max;
  if (values.length >= 2) {
    min = Math.min(values[0], values[1]);
    max = Math.max(values[0], values[1]);
  } else if (values.length === 1) {
    if (hasMaxHint && !hasMinHint) {
      max = values[0];
    } else {
      min = values[0];
    }
  }

  let sanitized = text;
  if (matches.length > 0) {
    sanitized = text.replace(PRICE_MATCH, '').replace(/\s+/g, ' ').trim();
  }
  return { sanitized, min, max };
};

const extractAttributeFilters = (raw = '') => {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { colorTerms: [], sizeTerms: [] };
  }
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const hasSizeIndicator = tokens.some((token) => SIZE_INDICATOR_WORDS.has(token));
  const colors = new Set();
  const sizes = new Set();
  for (const token of tokens) {
    if (COLOR_KEYWORDS.has(token)) {
      colors.add(token);
    }
    if (SIZE_DIRECT_TERMS.has(token)) {
      sizes.add(token);
    }
    if (NUMBER_PATTERN.test(token) && hasSizeIndicator) {
      sizes.add(token);
    }
  }
  return {
    colorTerms: Array.from(colors),
    sizeTerms: Array.from(sizes),
  };
};

const extractSearchTerm = (query = {}) => {
  const raw = query.q ?? query.query ?? query.term ?? query.search ?? query.searchTerm;
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim();
  return normalized.length ? normalized : undefined;
};

const SECTION_FETCHERS = {
  categories: async (searchTerm, options) => {
    const { categories, pagination } = await CategoryService.searchCategories(searchTerm, options);
    return buildSectionPayload(categories, pagination);
  },
  subcategories: async (searchTerm, options) => {
    const { subcategories, pagination } = await SubcategoryService.searchSubcategories(searchTerm, options);
    return buildSectionPayload(subcategories, pagination);
  },
  products: async (searchTerm, filters, options) => {
    const { products, pagination } = await ProductService.searchProducts(searchTerm, filters, options);
    return buildSectionPayload(products, pagination);
  },
};

export const SearchService = {
  async globalSearch(query = {}) {
    const searchTerm = extractSearchTerm(query);
    if (!searchTerm) {
      const err = new Error('Search term is required');
      err.name = 'ValidationError';
      err.status = 422;
      throw err;
    }

    const attributeFilters = extractAttributeFilters(searchTerm);

    const includeInactive = parseBoolean(query.includeInactive) ?? false;
    const categoryId = parseIntOrUndefined(query.categoryId);
    const subcategoryId = parseIntOrUndefined(query.subcategoryId);
    const productTypeId = parseIntOrUndefined(query.productTypeId);
    const priceMin = parseNumberOrUndefined(query.priceMin ?? query.minPrice);
    const priceMax = parseNumberOrUndefined(query.priceMax ?? query.maxPrice);
    const minRating = parseNumberOrUndefined(query.minRating);
    const inStock = parseBoolean(query.inStock);

    const { sanitized, min: inferredMin, max: inferredMax } = extractPriceRangeFromQuery(searchTerm);
    const effectiveSearchTerm = sanitized || searchTerm;
    const resolvedMinPrice = priceMin ?? inferredMin;
    const resolvedMaxPrice = priceMax ?? inferredMax;

    const sectionOptions = Object.fromEntries(
      SECTION_KEYS.map((section) => [section, parseSectionOptions(query, section)]),
    );
    const requestedSections = parseRequestedSections(query);

    const results = await Promise.all(
      requestedSections.map((section) => {
        const pagination = sectionOptions[section];
        if (section === 'products') {
          return SECTION_FETCHERS.products(
            effectiveSearchTerm,
            {
              categoryId,
              subcategoryId,
              subcategoryProductTypeId: productTypeId,
              priceMin: resolvedMinPrice,
              priceMax: resolvedMaxPrice,
              minRating,
              inStock,
              colorTerms: attributeFilters.colorTerms,
              sizeTerms: attributeFilters.sizeTerms,
            },
            pagination,
          );
        }
        if (section === 'subcategories') {
          return SECTION_FETCHERS.subcategories(effectiveSearchTerm, {
            ...pagination,
            includeInactive,
            categoryId,
          });
        }
        return SECTION_FETCHERS.categories(effectiveSearchTerm, {
          ...pagination,
          includeInactive,
        });
      }),
    );

    const sections = results.reduce((acc, value, index) => {
      acc[requestedSections[index]] = value;
      return acc;
    }, {});

    return {
      sections,
      meta: buildMeta(sections),
    };
  },
};
