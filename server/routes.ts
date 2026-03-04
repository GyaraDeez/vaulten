import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { storeTextSchema, retrieveTextSchema, listByUserKeySchema, storeFileSchema, retrieveFileSchema } from "@shared/schema";
import { getBotStatus } from "./bot";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const SALT_ROUNDS = 10;
const UPLOADS_DIR = path.resolve("uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const uniqueName = crypto.randomUUID() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: diskStorage });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/bot/status", (_req, res) => {
    const status = getBotStatus();
    res.json(status);
  });

  app.get("/api/entries/count", async (_req, res) => {
    try {
      const count = await storage.getTextEntryCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get count" });
    }
  });

  app.post("/api/entries/store", async (req, res) => {
    try {
      const parsed = storeTextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password, content, userKey } = parsed.data;

      const existing = await storage.getTextEntryByEntryId(entryId);
      if (existing) {
        return res.status(409).json({ message: "Entry with this ID already exists" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const entry = await storage.createTextEntry({
        entryId,
        passwordHash,
        content,
        userKey: userKey || null,
        createdBy: "web",
      });

      res.json({ message: "Stored successfully", entryId: entry.entryId });
    } catch (error) {
      res.status(500).json({ message: "Failed to store entry" });
    }
  });

  app.post("/api/entries/retrieve", async (req, res) => {
    try {
      const parsed = retrieveTextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password } = parsed.data;

      const entry = await storage.getTextEntryByEntryId(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      const valid = await bcrypt.compare(password, entry.passwordHash);
      if (!valid) {
        return res.status(403).json({ message: "Incorrect password" });
      }

      res.json({
        entryId: entry.entryId,
        content: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        createdBy: entry.createdBy,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve entry" });
    }
  });

  app.post("/api/entries/update", async (req, res) => {
    try {
      const schema = storeTextSchema;
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password, content } = parsed.data;

      const entry = await storage.getTextEntryByEntryId(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      const valid = await bcrypt.compare(password, entry.passwordHash);
      if (!valid) {
        return res.status(403).json({ message: "Incorrect password" });
      }

      await storage.updateTextEntry(entryId, content);
      res.json({ message: "Updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  app.post("/api/entries/delete", async (req, res) => {
    try {
      const parsed = retrieveTextSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password } = parsed.data;

      const entry = await storage.getTextEntryByEntryId(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Entry not found" });
      }

      const valid = await bcrypt.compare(password, entry.passwordHash);
      if (!valid) {
        return res.status(403).json({ message: "Incorrect password" });
      }

      await storage.deleteTextEntry(entryId);
      res.json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.post("/api/entries/keys", async (req, res) => {
    try {
      const parsed = listByUserKeySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { userKey } = parsed.data;
      const textResults = await storage.getEntriesByUserKey(userKey);
      const fileResults = await storage.getFileEntriesByUserKey(userKey);
      const entries = [
        ...textResults.map((e) => ({
          entryId: e.entryId,
          createdAt: e.createdAt,
          type: "text" as const,
        })),
        ...fileResults.map((e) => ({
          entryId: e.entryId,
          createdAt: e.createdAt,
          type: "file" as const,
          fileName: e.fileName,
        })),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      res.json({ userKey, entries });
    } catch (error) {
      res.status(500).json({ message: "Failed to list entries" });
    }
  });

  app.get("/api/entries/file-count", async (_req, res) => {
    try {
      const count = await storage.getFileEntryCount();
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to get file count" });
    }
  });

  app.post("/api/files/store", (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "File upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const parsed = storeFileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password, userKey } = parsed.data;

      const existingText = await storage.getTextEntryByEntryId(entryId);
      const existingFile = await storage.getFileEntryByEntryId(entryId);
      if (existingText || existingFile) {
        return res.status(409).json({ message: "Entry with this ID already exists" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      const entry = await storage.createFileEntry({
        entryId,
        passwordHash,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: req.file.path,
        userKey: userKey || null,
        createdBy: "web",
      });

      res.json({ message: "File stored successfully", entryId: entry.entryId, fileName: entry.fileName });
    } catch (error: any) {
      console.error("File store error:", error);
      res.status(500).json({ message: error?.message || "Failed to store file" });
    }
  });

  const activeUploads = new Map<string, { filePath: string; fileName: string; mimeType: string; totalSize: number; received: number; fd: number }>();

  app.post("/api/files/upload/init", async (req, res) => {
    try {
      const { entryId, password, fileName, mimeType, fileSize, userKey } = req.body;
      if (!entryId || !password || !fileName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existingText = await storage.getTextEntryByEntryId(entryId);
      const existingFile = await storage.getFileEntryByEntryId(entryId);
      if (existingText || existingFile) {
        return res.status(409).json({ message: "Entry with this ID already exists" });
      }

      const uploadId = crypto.randomUUID();
      const ext = path.extname(fileName);
      const filePath = path.join(UPLOADS_DIR, uploadId + ext);
      const fd = fs.openSync(filePath, "w");

      activeUploads.set(uploadId, {
        filePath,
        fileName,
        mimeType: mimeType || "application/octet-stream",
        totalSize: fileSize || 0,
        received: 0,
        fd,
      });

      res.json({ uploadId });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to initialize upload" });
    }
  });

  app.post("/api/files/upload/chunk/:uploadId", (req, res, next) => {
    upload.single("chunk")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Chunk upload failed" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const { uploadId } = req.params;
      const session = activeUploads.get(uploadId);
      if (!session) {
        return res.status(404).json({ message: "Upload session not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No chunk data" });
      }

      const chunkData = fs.readFileSync(req.file.path);
      fs.writeSync(session.fd, chunkData, 0, chunkData.length, session.received);
      session.received += chunkData.length;

      fs.unlinkSync(req.file.path);

      res.json({ received: session.received });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to process chunk" });
    }
  });

  app.post("/api/files/upload/complete/:uploadId", async (req, res) => {
    try {
      const { uploadId } = req.params;
      const { entryId, password, userKey } = req.body;

      const session = activeUploads.get(uploadId);
      if (!session) {
        return res.status(404).json({ message: "Upload session not found" });
      }

      fs.closeSync(session.fd);
      activeUploads.delete(uploadId);

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const entry = await storage.createFileEntry({
        entryId,
        passwordHash,
        fileName: session.fileName,
        mimeType: session.mimeType,
        fileSize: session.received,
        filePath: session.filePath,
        userKey: userKey || null,
        createdBy: "web",
      });

      res.json({ message: "File stored successfully", entryId: entry.entryId, fileName: entry.fileName });
    } catch (error: any) {
      console.error("File complete error:", error);
      res.status(500).json({ message: error?.message || "Failed to complete upload" });
    }
  });

  app.post("/api/files/info", async (req, res) => {
    try {
      const parsed = retrieveFileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password } = parsed.data;

      const entry = await storage.getFileEntryByEntryId(entryId);
      if (!entry) {
        return res.status(404).json({ message: "File entry not found" });
      }

      const valid = await bcrypt.compare(password, entry.passwordHash);
      if (!valid) {
        return res.status(403).json({ message: "Incorrect password" });
      }

      res.json({
        entryId: entry.entryId,
        fileName: entry.fileName,
        mimeType: entry.mimeType,
        fileSize: entry.fileSize,
        createdAt: entry.createdAt,
        createdBy: entry.createdBy,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve file info" });
    }
  });

  app.post("/api/files/download", async (req, res) => {
    try {
      const parsed = retrieveFileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password } = parsed.data;

      const entry = await storage.getFileEntryByEntryId(entryId);
      if (!entry) {
        return res.status(404).json({ message: "File entry not found" });
      }

      const valid = await bcrypt.compare(password, entry.passwordHash);
      if (!valid) {
        return res.status(403).json({ message: "Incorrect password" });
      }

      if (!fs.existsSync(entry.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      const stat = fs.statSync(entry.filePath);
      res.setHeader("Content-Type", entry.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${entry.fileName}"`);
      res.setHeader("Content-Length", stat.size.toString());
      const stream = fs.createReadStream(entry.filePath);
      stream.pipe(res);
    } catch (error) {
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.post("/api/files/delete", async (req, res) => {
    try {
      const parsed = retrieveFileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid input", errors: parsed.error.errors });
      }

      const { entryId, password } = parsed.data;

      const entry = await storage.getFileEntryByEntryId(entryId);
      if (!entry) {
        return res.status(404).json({ message: "File entry not found" });
      }

      const valid = await bcrypt.compare(password, entry.passwordHash);
      if (!valid) {
        return res.status(403).json({ message: "Incorrect password" });
      }

      if (entry.filePath && fs.existsSync(entry.filePath)) {
        fs.unlinkSync(entry.filePath);
      }
      await storage.deleteFileEntry(entryId);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  return httpServer;
}
