import bcrypt from 'bcrypt';
import { uploadOnCloudinary } from '../../utils/cloudinary.js';
import { UserModel } from './user.model.js';

const SALT_ROUNDS = 10;

export const UserService = {
  // Update user fields and optionally image. `files` comes from multer.
  async getUserById(id) {
    const user = await UserModel.findById(Number(id));
    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = user;
    return safeUser;
  },
  
  async updateUser(id, fields = {}, files = {}) {
    const updateData = {};

    // Only allow these fields to be updated
    const allowed = ['firstName', 'lastName', 'displayName', 'phoneNumber', 'gender', 'email'];
    for (const k of allowed) {
      if (typeof fields[k] !== 'undefined') updateData[k] = fields[k];
    }

    // If password is provided, hash it
    if (fields.password) {
      updateData.password = await bcrypt.hash(fields.password, SALT_ROUNDS);
    }

    // Handle uploaded image (multer stores file on disk). Upload to Cloudinary.
    const imageFile = files?.image?.[0];
    if (imageFile && imageFile.path) {
      const imagedata = await uploadOnCloudinary(imageFile.path);
      if (imagedata && imagedata.url) {
        updateData.photoUrl = imagedata.url;
      }
    }

    const updated = await UserModel.update(Number(id), updateData);
    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = updated;
    return safeUser;
  },

  async deleteUser(id) {
    const deleted = await UserModel.delete(Number(id));
    const { password: _p, resetToken: _rt, resetTokenExpiry: _rte, ...safeUser } = deleted;
    return safeUser;
  },
};
