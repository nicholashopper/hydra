import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import type { Profile, FingerprintConfig, ProxyConfig } from '../shared/types';
import {
  encrypt,
  decrypt,
  encryptForExport,
  decryptForImport,
  generateProfileId,
  generateFingerPrintSeed
} from './crypto';
import {
  USER_AGENTS,
  WEBGL_VENDORS,
  WEBGL_RENDERERS,
  BROWSER_VIEWPORT_WIDTH,
  BROWSER_VIEWPORT_HEIGHT,
  DEFAULT_TIMEZONE,
  DEFAULT_LOCALE
} from '../shared/constants';

export class ProfileManager {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'hydra.db');
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        cookies TEXT,
        local_storage TEXT,
        fingerprint TEXT NOT NULL,
        proxy_config TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  }

  private generateFingerprint(seed: string): FingerprintConfig {
    const seedNum = parseInt(seed.substring(0, 8), 16);
    const idx = seedNum % USER_AGENTS.length;
    const vendorIdx = seedNum % WEBGL_VENDORS.length;
    const rendererIdx = (seedNum + 1) % WEBGL_RENDERERS.length;

    return {
      seed,
      userAgent: USER_AGENTS[idx],
      platform: 'iPhone',
      languages: [DEFAULT_LOCALE, 'en'],
      timezone: DEFAULT_TIMEZONE,
      screen: { width: BROWSER_VIEWPORT_WIDTH, height: BROWSER_VIEWPORT_HEIGHT },
      webgl: {
        vendor: WEBGL_VENDORS[vendorIdx],
        renderer: WEBGL_RENDERERS[rendererIdx]
      },
      canvas: { noise: (seedNum % 100) / 10000 },
      audio: { noise: (seedNum % 50) / 100000 }
    };
  }

  list(): Profile[] {
    const stmt = this.db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC');
    const rows = stmt.all() as Array<{
      id: string;
      name: string;
      created_at: number;
      updated_at: number;
      cookies: string | null;
      local_storage: string | null;
      fingerprint: string;
      proxy_config: string | null;
      notes: string | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cookies: row.cookies ? decrypt(row.cookies) : undefined,
      local_storage: row.local_storage ? decrypt(row.local_storage) : undefined,
      fingerprint: JSON.parse(row.fingerprint),
      proxy_config: row.proxy_config ? JSON.parse(decrypt(row.proxy_config)) : undefined,
      notes: row.notes || undefined
    }));
  }

  get(id: string): Profile | null {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE id = ?');
    const row = stmt.get(id) as {
      id: string;
      name: string;
      created_at: number;
      updated_at: number;
      cookies: string | null;
      local_storage: string | null;
      fingerprint: string;
      proxy_config: string | null;
      notes: string | null;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cookies: row.cookies ? decrypt(row.cookies) : undefined,
      local_storage: row.local_storage ? decrypt(row.local_storage) : undefined,
      fingerprint: JSON.parse(row.fingerprint),
      proxy_config: row.proxy_config ? JSON.parse(decrypt(row.proxy_config)) : undefined,
      notes: row.notes || undefined
    };
  }

  create(name: string): Profile {
    const id = generateProfileId();
    const seed = generateFingerPrintSeed();
    const now = Date.now();
    const fingerprint = this.generateFingerprint(seed);

    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, name, created_at, updated_at, fingerprint)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, name, now, now, JSON.stringify(fingerprint));

    return {
      id,
      name,
      created_at: now,
      updated_at: now,
      fingerprint
    };
  }

  update(profile: Partial<Profile> & { id: string }): void {
    const existing = this.get(profile.id);
    if (!existing) throw new Error('Profile not found');

    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [Date.now()];

    if (profile.name !== undefined) {
      updates.push('name = ?');
      values.push(profile.name);
    }

    if (profile.cookies !== undefined) {
      updates.push('cookies = ?');
      values.push(profile.cookies ? encrypt(profile.cookies) : null);
    }

    if (profile.local_storage !== undefined) {
      updates.push('local_storage = ?');
      values.push(profile.local_storage ? encrypt(profile.local_storage) : null);
    }

    if (profile.fingerprint !== undefined) {
      updates.push('fingerprint = ?');
      values.push(JSON.stringify(profile.fingerprint));
    }

    if (profile.proxy_config !== undefined) {
      updates.push('proxy_config = ?');
      values.push(profile.proxy_config ? encrypt(JSON.stringify(profile.proxy_config)) : null);
    }

    if (profile.notes !== undefined) {
      updates.push('notes = ?');
      values.push(profile.notes);
    }

    values.push(profile.id);

    const stmt = this.db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM profiles WHERE id = ?');
    stmt.run(id);
  }

  export(id: string, filePath: string): void {
    const profile = this.get(id);
    if (!profile) throw new Error('Profile not found');

    const exportData = {
      version: 1,
      profile: {
        ...profile,
        id: undefined, // Don't export ID, generate new on import
        created_at: undefined,
        updated_at: undefined
      }
    };

    const encrypted = encryptForExport(
      JSON.stringify(exportData),
      process.env.HYDRA_ENCRYPTION_KEY || 'default-export-key'
    );

    fs.writeFileSync(filePath, JSON.stringify({ encrypted }, null, 2));
  }

  import(filePath: string): Profile {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { encrypted } = JSON.parse(fileContent);

    const decrypted = decryptForImport(
      encrypted,
      process.env.HYDRA_ENCRYPTION_KEY || 'default-export-key'
    );

    const { profile: importedProfile } = JSON.parse(decrypted);

    // Check for name conflict
    const existing = this.db.prepare('SELECT id FROM profiles WHERE name = ?').get(importedProfile.name);
    if (existing) {
      importedProfile.name = `${importedProfile.name} (imported)`;
    }

    const id = generateProfileId();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, name, created_at, updated_at, cookies, local_storage, fingerprint, proxy_config, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      importedProfile.name,
      now,
      now,
      importedProfile.cookies ? encrypt(importedProfile.cookies) : null,
      importedProfile.local_storage ? encrypt(importedProfile.local_storage) : null,
      JSON.stringify(importedProfile.fingerprint),
      importedProfile.proxy_config ? encrypt(JSON.stringify(importedProfile.proxy_config)) : null,
      importedProfile.notes || null
    );

    return this.get(id)!;
  }

  updateProxyConfig(id: string, browserIndex: number, config: ProxyConfig | null): void {
    const profile = this.get(id);
    if (!profile) throw new Error('Profile not found');

    // Store proxy config with browser index
    const key = `proxy_${browserIndex}`;
    const proxyConfigs = profile.proxy_config ? { ...profile.proxy_config } : {};
    if (config) {
      (proxyConfigs as Record<string, ProxyConfig>)[key] = config;
    } else {
      delete (proxyConfigs as Record<string, ProxyConfig>)[key];
    }

    this.update({
      id,
      proxy_config: Object.keys(proxyConfigs).length > 0 ? proxyConfigs as unknown as ProxyConfig : undefined
    });
  }

  // Settings
  getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `);
    stmt.run(key, value);
  }

  close(): void {
    this.db.close();
  }
}
