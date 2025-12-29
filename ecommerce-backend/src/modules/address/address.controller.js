import { MESSAGES } from '../../config/messages.js';
import { successResponse } from '../../utils/response.util.js';
import { AddressService } from './address.service.js';

const notFoundError = () => {
  const err = new Error(MESSAGES.ADDRESS_NOT_FOUND);
  err.name = 'NotFoundError';
  err.status = 404;
  return err;
};

export const AddressController = {
  async listAddresses(req, res, next) {
    try {
      const result = await AddressService.listAddresses(req.user.id, req.query);
      return successResponse(res, MESSAGES.ADDRESSES_FETCHED, result);
    } catch (error) {
      return next(error);
    }
  },

  async getDefaultAddress(req, res, next) {
    try {
      const address = await AddressService.getDefaultAddress(req.user.id);
      return successResponse(res, MESSAGES.DEFAULT_ADDRESS_FETCHED, { address });
    } catch (error) {
      return next(error);
    }
  },

  async getAddressById(req, res, next) {
    try {
      const address = await AddressService.getAddressById(req.params.id, req.user.id);
      if (!address) {
        throw notFoundError();
      }
      return successResponse(res, MESSAGES.ADDRESS_FETCHED, { address });
    } catch (error) {
      return next(error);
    }
  },

  async createAddress(req, res, next) {
    try {
      const address = await AddressService.createAddress(req.user.id, req.body);
      return successResponse(res, MESSAGES.ADDRESS_CREATED, { address }, 201);
    } catch (error) {
      return next(error);
    }
  },

  async updateAddress(req, res, next) {
    try {
      const address = await AddressService.updateAddress(req.params.id, req.user.id, req.body);
      if (!address) {
        throw notFoundError();
      }
      return successResponse(res, MESSAGES.ADDRESS_UPDATED, { address });
    } catch (error) {
      return next(error);
    }
  },

  async deleteAddress(req, res, next) {
    try {
      const address = await AddressService.deleteAddress(req.params.id, req.user.id);
      if (!address) {
        throw notFoundError();
      }
      return successResponse(res, MESSAGES.ADDRESS_DELETED, { address });
    } catch (error) {
      return next(error);
    }
  },

  async getStatesByZip(req, res, next) {
    try {
      const data = AddressService.getStatesByZip(req.query.zipCode);
      return successResponse(res, MESSAGES.STATES_FETCHED, data);
    } catch (error) {
      return next(error);
    }
  },

  async getAddressByZip(req, res, next) {
    try {
      const data = AddressService.getAddressByZip(req.query.zipCode);
      return successResponse(res,MESSAGES.ADDRESS_LOOKUP_SUCCESSFUL, data);
    } catch (error) {
      return next(error);
    }
  },

  async getCitiesByState(req, res, next) {
    try {
      const data = AddressService.getCitiesByState(req.query.stateCode);
      return successResponse(res, MESSAGES.CITIES_FETCHED, data);
    } catch (error) {
      return next(error);
    }
  },
};
