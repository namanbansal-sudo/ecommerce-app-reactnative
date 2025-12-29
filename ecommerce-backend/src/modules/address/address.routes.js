import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { AddressController } from "./address.controller.js";
import {
  addressIdParamSchema,
  createAddressSchema,
  stateQuerySchema,
  updateAddressSchema,
  zipQuerySchema,
} from "./address.validation.js";

const router = Router();

const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const { error } = schema.validate(req[source], { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(", "));
      err.name = "ValidationError";
      err.status = 422;
      return next(err);
    }
    return next();
  };

router.use(authenticate);

router.get("/get-addresses", AddressController.listAddresses);
router.get("/get-address-default", AddressController.getDefaultAddress);
router.get(
  "/get-address/:id",
  validate(addressIdParamSchema, "params"),
  AddressController.getAddressById
);
router.post(
  "/add-address",
  validate(createAddressSchema),
  AddressController.createAddress
);
router.put(
  "/update-address/:id",
  validate(addressIdParamSchema, "params"),
  validate(updateAddressSchema),
  AddressController.updateAddress
);
router.delete(
  "/delete-address/:id",
  validate(addressIdParamSchema, "params"),
  AddressController.deleteAddress
);
router.get(
  "/get-states-by-zip",
  validate(zipQuerySchema, "query"),
  AddressController.getStatesByZip
);
router.get(
  "/get-address-by-zip",
  validate(zipQuerySchema, "query"),
  AddressController.getAddressByZip
);
router.get(
  "/get-cities-by-state",
  validate(stateQuerySchema, "query"),
  AddressController.getCitiesByState
);

export default router;
