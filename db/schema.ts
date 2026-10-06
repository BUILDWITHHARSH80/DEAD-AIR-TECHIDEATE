// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const teams = sqliteTable('teams', { id: text('id').primaryKey(), code: text('code').notNull().unique(), name: text('name').notNull(), password: text('password').notNull(), state: text('state').notNull(), revision: integer('revision').notNull().default(0), createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull() });
export const sessions = sqliteTable('sessions', { id: text('id').primaryKey(), role: text('role').notNull(), teamId: text('team_id').references(() => teams.id, { onDelete: 'cascade' }), expires: integer('expires').notNull() });
export const settings = sqliteTable('settings', { id: text('id').primaryKey(), value: text('value').notNull(), revision: integer('revision').notNull().default(0) });
export const documents = sqliteTable('documents', { id: text('id').primaryKey(), data: text('data').notNull(), passkey: text('passkey').notNull() });
export const challenges = sqliteTable('challenges', { id: text('id').primaryKey(), data: text('data').notNull() });
export const media = sqliteTable('media', { id: text('id').primaryKey(), teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }), name: text('name').notNull(), mime: text('mime').notNull(), size: integer('size').notNull(), status: text('status').notNull(), note: text('note').notNull().default(''), createdAt: integer('created_at').notNull() }, t => [index('media_team').on(t.teamId)]);
export const activity = sqliteTable('activity', { id: text('id').primaryKey(), teamId: text('team_id'), actor: text('actor').notNull(), action: text('action').notNull(), detail: text('detail').notNull(), createdAt: integer('created_at').notNull() }, t => [index('activity_team_time').on(t.teamId, t.createdAt)]);
export const limits = sqliteTable('limits', { id: text('id').primaryKey(), count: integer('count').notNull(), expires: integer('expires').notNull() });