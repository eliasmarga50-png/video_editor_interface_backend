// In-memory store so the reference runs out of the box.
// Replace the bodies with your real database (keep the async signatures).
const crypto = require('crypto');

const usersById = new Map();
const idByEmail = new Map();
const refreshTokens = new Map(); // sha256(token) -> { userId, expiresAt }

module.exports = {
  async findByEmail(email) {
    const id = idByEmail.get(email);
    return id ? usersById.get(id) : null;
  },

  async findById(id) {
    return usersById.get(id) || null;
  },

  async create({ name, email, passwordHash, role = 'user' }) {
    const user = { id: crypto.randomUUID(), name, email, passwordHash, role };
    usersById.set(user.id, user);
    idByEmail.set(email, user.id);
    return user;
  },

  async saveRefresh(hash, record) {
    refreshTokens.set(hash, record);
  },

  // Returns and removes the record (refresh tokens are single use).
  async takeRefresh(hash) {
    const record = refreshTokens.get(hash);
    refreshTokens.delete(hash);
    return record || null;
  },

  async deleteRefresh(hash) {
    refreshTokens.delete(hash);
  },
};