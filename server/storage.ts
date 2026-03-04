import { type User, type InsertUser, type TextEntry, type InsertTextEntry, textEntries, type FileEntry, type InsertFileEntry, fileEntries } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createTextEntry(entry: InsertTextEntry): Promise<TextEntry>;
  getTextEntryByEntryId(entryId: string): Promise<TextEntry | undefined>;
  updateTextEntry(entryId: string, content: string): Promise<TextEntry | undefined>;
  deleteTextEntry(entryId: string): Promise<boolean>;
  getAllTextEntries(): Promise<TextEntry[]>;
  getTextEntryCount(): Promise<number>;
  getEntriesByUserKey(userKey: string): Promise<TextEntry[]>;

  createFileEntry(entry: InsertFileEntry): Promise<FileEntry>;
  getFileEntryByEntryId(entryId: string): Promise<FileEntry | undefined>;
  deleteFileEntry(entryId: string): Promise<boolean>;
  getFileEntryCount(): Promise<number>;
  getFileEntriesByUserKey(userKey: string): Promise<FileEntry[]>;
}

export class DatabaseStorage implements IStorage {
  private users: Map<string, User>;

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createTextEntry(entry: InsertTextEntry): Promise<TextEntry> {
    const [result] = await db.insert(textEntries).values(entry).returning();
    return result;
  }

  async getTextEntryByEntryId(entryId: string): Promise<TextEntry | undefined> {
    const [result] = await db.select().from(textEntries).where(eq(textEntries.entryId, entryId));
    return result;
  }

  async updateTextEntry(entryId: string, content: string): Promise<TextEntry | undefined> {
    const [result] = await db
      .update(textEntries)
      .set({ content, updatedAt: new Date().toISOString() })
      .where(eq(textEntries.entryId, entryId))
      .returning();
    return result;
  }

  async deleteTextEntry(entryId: string): Promise<boolean> {
    const result = await db.delete(textEntries).where(eq(textEntries.entryId, entryId)).returning();
    return result.length > 0;
  }

  async getAllTextEntries(): Promise<TextEntry[]> {
    return db.select().from(textEntries).orderBy(textEntries.createdAt);
  }

  async getTextEntryCount(): Promise<number> {
    const entries = await db.select().from(textEntries);
    return entries.length;
  }

  async getEntriesByUserKey(userKey: string): Promise<TextEntry[]> {
    return db.select().from(textEntries).where(eq(textEntries.userKey, userKey)).orderBy(textEntries.createdAt);
  }

  async createFileEntry(entry: InsertFileEntry): Promise<FileEntry> {
    const [result] = await db.insert(fileEntries).values(entry).returning();
    return result;
  }

  async getFileEntryByEntryId(entryId: string): Promise<FileEntry | undefined> {
    const [result] = await db.select().from(fileEntries).where(eq(fileEntries.entryId, entryId));
    return result;
  }

  async deleteFileEntry(entryId: string): Promise<boolean> {
    const result = await db.delete(fileEntries).where(eq(fileEntries.entryId, entryId)).returning();
    return result.length > 0;
  }

  async getFileEntryCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(fileEntries);
    return Number(result[0].count);
  }

  async getFileEntriesByUserKey(userKey: string): Promise<FileEntry[]> {
    return db.select().from(fileEntries).where(eq(fileEntries.userKey, userKey)).orderBy(fileEntries.createdAt);
  }
}

export const storage = new DatabaseStorage();
