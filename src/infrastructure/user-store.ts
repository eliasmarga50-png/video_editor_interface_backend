import crypto from 'node:crypto';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'pro' | 'admin';
  createdAt: string;
}

export interface RefreshTokenRecord {
  userId: string;
  expiresAt: number;
}

export class UserStore {
  private readonly usersById = new Map<string, UserRecord>();
  private readonly idByEmail = new Map<string, string>();
  private readonly refreshTokens = new Map<string, RefreshTokenRecord>();

  async findByEmail(email: string): Promise<UserRecord | null> {
    const id = this.idByEmail.get(email.toLowerCase().trim());
    return id ? (this.usersById.get(id) ?? null) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.usersById.get(id) ?? null;
  }

  async create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role?: 'user' | 'pro' | 'admin';
  }): Promise<UserRecord> {
    const email = data.email.toLowerCase().trim();
    const user: UserRecord = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email,
      passwordHash: data.passwordHash,
      role: data.role ?? 'user',
      createdAt: new Date().toISOString(),
    };

    this.usersById.set(user.id, user);
    this.idByEmail.set(email, user.id);
    return user;
  }

  async saveRefresh(hash: string, record: RefreshTokenRecord): Promise<void> {
    this.refreshTokens.set(hash, record);
  }

  async takeRefresh(hash: string): Promise<RefreshTokenRecord | null> {
    const record = this.refreshTokens.get(hash);
    this.refreshTokens.delete(hash);
    return record ?? null;
  }

  async deleteRefresh(hash: string): Promise<void> {
    this.refreshTokens.delete(hash);
  }
}

export const userStore = new UserStore();
