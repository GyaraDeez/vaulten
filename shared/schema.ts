import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const textEntries = sqliteTable("text_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: text("entry_id").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  content: text("content").notNull(),
  userKey: text("user_key"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: text("created_by"),
});

export const insertTextEntrySchema = createInsertSchema(textEntries).pick({
  entryId: true,
  passwordHash: true,
  content: true,
  userKey: true,
  createdBy: true,
});

export const storeTextSchema = z.object({
  entryId: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
  content: z.string().min(1),
  userKey: z.string().max(100).optional(),
});

export const retrieveTextSchema = z.object({
  entryId: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const listByUserKeySchema = z.object({
  userKey: z.string().min(1).max(100),
});

export type InsertTextEntry = z.infer<typeof insertTextEntrySchema>;
export type TextEntry = typeof textEntries.$inferSelect;

export const fileEntries = sqliteTable("file_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: text("entry_id").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  userKey: text("user_key"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  createdBy: text("created_by"),
});

export const insertFileEntrySchema = createInsertSchema(fileEntries).pick({
  entryId: true,
  passwordHash: true,
  fileName: true,
  mimeType: true,
  fileSize: true,
  filePath: true,
  userKey: true,
  createdBy: true,
});

export const storeFileSchema = z.object({
  entryId: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
  userKey: z.string().max(100).optional(),
});

export const retrieveFileSchema = z.object({
  entryId: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export type InsertFileEntry = z.infer<typeof insertFileEntrySchema>;
export type FileEntry = typeof fileEntries.$inferSelect;
