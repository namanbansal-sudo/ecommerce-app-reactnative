import Joi from 'joi';

const zipPattern = /^[0-9]{6}$/;
const addressTypes = ['home', 'work'];

export const addressIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const createAddressSchema = Joi.object({
  line1: Joi.string().max(255).required(),
  line2: Joi.string().max(255).allow('', null),
  buildingName: Joi.string().max(255).allow('', null),
  city: Joi.string().max(120).required(),
  state: Joi.string().max(120).required(),
  zipCode: Joi.string().pattern(zipPattern).required(),
  addressType: Joi.string().valid(...addressTypes).default('home'),
  isDefault: Joi.boolean().default(false),
});

export const updateAddressSchema = Joi.object({
  line1: Joi.string().max(255),
  line2: Joi.string().max(255).allow('', null),
  buildingName: Joi.string().max(255).allow('', null),
  city: Joi.string().max(120),
  state: Joi.string().max(120),
  zipCode: Joi.string().pattern(zipPattern),
  addressType: Joi.string().valid(...addressTypes),
  isDefault: Joi.boolean(),
}).min(1);

export const zipQuerySchema = Joi.object({
  zipCode: Joi.string().pattern(zipPattern).required(),
});

export const stateQuerySchema = Joi.object({
  stateCode: Joi.string()
    .pattern(/^[A-Z_]{2,60}$/)
    .required(),
});
