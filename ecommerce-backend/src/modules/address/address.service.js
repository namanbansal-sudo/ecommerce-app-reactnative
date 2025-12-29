import { MESSAGES } from '../../config/messages.js';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../utils/constants.js';
import {
  getCitiesByState as getCitiesByStateLookup,
  getCountryByZip,
  getStatesByCountry,
  LocationData,
  normalizeZip,
} from '../../utils/location.util.js';
import { AddressModel } from './address.model.js';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
};

async function assertUniqueAddress(userId, line1, line2, excludeId) {
  const normalizedLine1 = typeof line1 === 'string' ? line1.trim() : '';
  const normalizedLine2 = typeof line2 === 'string' ? line2.trim() : null;
  const existing = await AddressModel.findByLines(userId, normalizedLine1, normalizedLine2, excludeId);
  if (existing) {
    const error = new Error(MESSAGES.ADDRESS_ALREADY_EXISTS);
    error.name = 'ValidationError';
    error.status = 409;
    throw error;
  }
}

function buildAddressPayload(userId, payload = {}) {
  const normalizedZip = payload.zipCode ? normalizeZip(payload.zipCode) : undefined;
  const location = normalizedZip ? getCountryByZip(normalizedZip) : null;
  const line1 = typeof payload.line1 === 'string' ? payload.line1.trim() : payload.line1;
  const rawLine2 = typeof payload.line2 === 'string' ? payload.line2.trim() : payload.line2;
  const line2 = rawLine2 ? rawLine2 : null;

  return {
    userId: Number(userId),
    line1,
    line2,
    buildingName: payload.buildingName ?? null,
    city: payload.city ?? location?.city ?? '',
    state: payload.state ?? location?.stateName ?? '',
    zipCode: normalizedZip ?? payload.zipCode,
    country: location?.countryName ?? LocationData.COUNTRY.name,
    addressType: payload.addressType ?? 'home',
    isDefault: Boolean(payload.isDefault),
  };
}

export const AddressService = {
  async listAddresses(userId, pagination = {}) {
    const page = parsePositiveInt(pagination.page, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(pagination.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [total, addresses] = await Promise.all([
      AddressModel.countByUser(userId),
      AddressModel.findAllByUser(userId, { skip, take: limit }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      addresses,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  },

  async getAddressById(id, userId) {
    return AddressModel.findByIdForUser(id, userId);
  },

  async getDefaultAddress(userId) {
    return AddressModel.findDefaultByUser(userId);
  },

  async createAddress(userId, payload) {
    const data = buildAddressPayload(userId, payload);
    if (!data.city || !data.state) {
      throw new Error('City and State are required');
    }

    await assertUniqueAddress(userId, data.line1, data.line2);

    const existingCount = await AddressModel.countByUser(userId);
    if (existingCount === 0) {
      data.isDefault = true;
    } else if (data.isDefault) {
      await AddressModel.unsetDefaultForUser(userId);
    }

    return AddressModel.create(data);
  },

  async updateAddress(id, userId, payload) {
    const existing = await AddressModel.findByIdForUser(id, userId);
    if (!existing) {
      return null;
    }
    const data = buildAddressPayload(userId, { ...existing, ...payload });
    data.isDefault = payload.isDefault ?? existing.isDefault;

    await assertUniqueAddress(userId, data.line1, data.line2, id);

    if (payload.zipCode) {
      data.zipCode = normalizeZip(payload.zipCode);
    }

    if (payload.isDefault) {
      await AddressModel.unsetDefaultForUser(userId, id);
    }

    return AddressModel.update(id, data);
  },

  async deleteAddress(id, userId) {
    const existing = await AddressModel.findByIdForUser(id, userId);
    if (!existing) {
      return null;
    }
    await AddressModel.delete(id);
    if (existing.isDefault) {
      const [nextDefault] = await AddressModel.findAllByUser(userId);
      if (nextDefault) {
        await AddressModel.update(nextDefault.id, { isDefault: true });
      }
    }
    return existing;
  },

  resolveCountryFromZip(zipCode) {
    const normalized = normalizeZip(zipCode);
    return getCountryByZip(normalized);
  },

  listStates(countryCode = LocationData.COUNTRY.code) {
    return getStatesByCountry(countryCode);
  },

  listCities(stateCode) {
    return getCitiesByStateLookup(stateCode);
  },

  getStatesByZip(zipCode) {
    const normalizedZip = normalizeZip(zipCode);
    const location = getCountryByZip(normalizedZip);
    const countryCode = location?.countryCode ?? LocationData.COUNTRY.code;
    const states = getStatesByCountry(countryCode);

    return {
      country: {
        name: location?.countryName ?? LocationData.COUNTRY.name,
        code: countryCode,
        iso3: location?.countryIso3 ?? LocationData.COUNTRY.iso3,
      },
      states,
      suggestedState: location?.stateCode
        ? { code: location.stateCode, name: location.stateName }
        : null,
    };
  },

  getAddressByZip(zipCode) {
    const normalizedZip = normalizeZip(zipCode);
    const location = getCountryByZip(normalizedZip);
    const countryCode = location?.countryCode ?? LocationData.COUNTRY.code;
    const states = getStatesByCountry(countryCode);

    return {
      zipCode: normalizedZip,
      country: {
        name: location?.countryName ?? LocationData.COUNTRY.name,
        code: countryCode,
        iso3: location?.countryIso3 ?? LocationData.COUNTRY.iso3,
      },
      states,
      state: location?.stateCode ? { code: location.stateCode, name: location.stateName } : null,
      city: location?.city ?? null,
      locality: location?.locality ?? null,
    };
  },

  getCitiesByState(stateCode) {
    const normalized = (stateCode || '').trim().toUpperCase();
    const cities = getCitiesByStateLookup(normalized);
    return {
      stateCode: normalized,
      cities,
    };
  },
};
