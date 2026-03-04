import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  type ChatInputCommandInteraction,
} from "discord.js";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { log } from "./index";

const SALT_ROUNDS = 10;

let client: Client | null = null;
let botReady = false;
let botError: string | null = null;

export function getBotStatus() {
  if (!client && !botError) return { online: false, username: null, guilds: 0, uptime: 0, error: null };
  if (botError) return { online: false, username: null, guilds: 0, uptime: 0, error: botError };
  return {
    online: botReady && client!.ws.status === 0,
    username: client!.user?.tag || null,
    guilds: client!.guilds.cache.size,
    uptime: client!.uptime || 0,
    error: null,
  };
}

function createEmbed(title: string, description: string, color: number) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

const slashCommands = [
  new SlashCommandBuilder()
    .setName("store")
    .setDescription("Store text with a unique ID and password")
    .addStringOption(opt => opt.setName("id").setDescription("Unique identifier for the entry").setRequired(true))
    .addStringOption(opt => opt.setName("password").setDescription("Password to protect the entry").setRequired(true))
    .addStringOption(opt => opt.setName("text").setDescription("The text content to store").setRequired(true))
    .addStringOption(opt => opt.setName("userkey").setDescription("Optional user key to group your entries").setRequired(false)),
  new SlashCommandBuilder()
    .setName("get")
    .setDescription("Retrieve stored text by ID and password")
    .addStringOption(opt => opt.setName("id").setDescription("The entry ID to retrieve").setRequired(true))
    .addStringOption(opt => opt.setName("password").setDescription("Password for the entry").setRequired(true)),
  new SlashCommandBuilder()
    .setName("update")
    .setDescription("Update the text for an existing entry")
    .addStringOption(opt => opt.setName("id").setDescription("The entry ID to update").setRequired(true))
    .addStringOption(opt => opt.setName("password").setDescription("Password for the entry").setRequired(true))
    .addStringOption(opt => opt.setName("text").setDescription("The new text content").setRequired(true)),
  new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Delete a stored entry")
    .addStringOption(opt => opt.setName("id").setDescription("The entry ID to delete").setRequired(true))
    .addStringOption(opt => opt.setName("password").setDescription("Password for the entry").setRequired(true)),
  new SlashCommandBuilder()
    .setName("keys")
    .setDescription("List all entry IDs created with a specific user key")
    .addStringOption(opt => opt.setName("userkey").setDescription("Your user key").setRequired(true)),
  new SlashCommandBuilder()
    .setName("storefile")
    .setDescription("Store an attached file with a unique ID and password")
    .addStringOption(opt => opt.setName("id").setDescription("Unique identifier for the file entry").setRequired(true))
    .addStringOption(opt => opt.setName("password").setDescription("Password to protect the file").setRequired(true))
    .addAttachmentOption(opt => opt.setName("file").setDescription("The file to store").setRequired(true))
    .addStringOption(opt => opt.setName("userkey").setDescription("Optional user key to group your entries").setRequired(false)),
  new SlashCommandBuilder()
    .setName("getfile")
    .setDescription("Retrieve a stored file by ID and password")
    .addStringOption(opt => opt.setName("id").setDescription("The file entry ID to retrieve").setRequired(true))
    .addStringOption(opt => opt.setName("password").setDescription("Password for the file entry").setRequired(true)),
  new SlashCommandBuilder()
    .setName("deletefile")
    .setDescription("Delete a stored file entry")
    .addStringOption(opt => opt.setName("id").setDescription("The file entry ID to delete").setRequired(true))
    .addStringOption(opt => opt.setName("password").setDescription("Password for the file entry").setRequired(true)),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands and how to use the bot"),
];

async function handleSlashStore(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const entryId = interaction.options.getString("id", true);
  const password = interaction.options.getString("password", true);
  const content = interaction.options.getString("text", true);
  const userKey = interaction.options.getString("userkey") || null;

  const existing = await storage.getTextEntryByEntryId(entryId);
  if (existing) {
    const embed = createEmbed(
      "Already Exists",
      `An entry with ID \`${entryId}\` already exists. Use \`/update\` to modify it.`,
      0xED4245
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  await storage.createTextEntry({
    entryId,
    passwordHash,
    content,
    userKey,
    createdBy: interaction.user.tag,
  });

  let desc = `Text stored with ID \`${entryId}\`. Use \`/get\` to retrieve it.`;
  if (userKey) {
    desc += `\nUser key: \`${userKey}\` — use \`/keys\` to list all your entries.`;
  }

  const embed = createEmbed("Stored", desc, 0x57F287);
  await interaction.editReply({ embeds: [embed] });
}

async function handleSlashGet(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const entryId = interaction.options.getString("id", true);
  const password = interaction.options.getString("password", true);

  const entry = await storage.getTextEntryByEntryId(entryId);
  if (!entry) {
    const embed = createEmbed("Not Found", `No entry found with ID \`${entryId}\`.`, 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const valid = await bcrypt.compare(password, entry.passwordHash);
  if (!valid) {
    const embed = createEmbed("Access Denied", "Incorrect password.", 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const embed = createEmbed(`Entry: ${entryId}`, entry.content, 0x5865F2);
  embed.addFields(
    { name: "Created", value: new Date(entry.createdAt).toLocaleString(), inline: true },
    { name: "Updated", value: new Date(entry.updatedAt).toLocaleString(), inline: true }
  );
  if (entry.createdBy) {
    embed.addFields({ name: "Created By", value: entry.createdBy, inline: true });
  }
  await interaction.editReply({ embeds: [embed] });
}

async function handleSlashUpdate(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const entryId = interaction.options.getString("id", true);
  const password = interaction.options.getString("password", true);
  const newContent = interaction.options.getString("text", true);

  const entry = await storage.getTextEntryByEntryId(entryId);
  if (!entry) {
    const embed = createEmbed("Not Found", `No entry found with ID \`${entryId}\`.`, 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const valid = await bcrypt.compare(password, entry.passwordHash);
  if (!valid) {
    const embed = createEmbed("Access Denied", "Incorrect password.", 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  await storage.updateTextEntry(entryId, newContent);
  const embed = createEmbed("Updated", `Entry \`${entryId}\` has been updated.`, 0x57F287);
  await interaction.editReply({ embeds: [embed] });
}

async function handleSlashDelete(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const entryId = interaction.options.getString("id", true);
  const password = interaction.options.getString("password", true);

  const entry = await storage.getTextEntryByEntryId(entryId);
  if (!entry) {
    const embed = createEmbed("Not Found", `No entry found with ID \`${entryId}\`.`, 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const valid = await bcrypt.compare(password, entry.passwordHash);
  if (!valid) {
    const embed = createEmbed("Access Denied", "Incorrect password.", 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  await storage.deleteTextEntry(entryId);
  const embed = createEmbed("Deleted", `Entry \`${entryId}\` has been deleted.`, 0x57F287);
  await interaction.editReply({ embeds: [embed] });
}

async function handleSlashKeys(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const userKey = interaction.options.getString("userkey", true);

  const textResults = await storage.getEntriesByUserKey(userKey);
  const fileResults = await storage.getFileEntriesByUserKey(userKey);

  if (textResults.length === 0 && fileResults.length === 0) {
    const embed = createEmbed(
      "No Entries",
      `No entries found for user key \`${userKey}\`.`,
      0xFEE75C
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const total = textResults.length + fileResults.length;
  let keyList = "";
  if (textResults.length > 0) {
    keyList += "**Text:**\n" + textResults.map((e) => `📝 \`${e.entryId}\``).join("\n") + "\n";
  }
  if (fileResults.length > 0) {
    keyList += "**Files:**\n" + fileResults.map((e) => `📁 \`${e.entryId}\` (${e.fileName})`).join("\n");
  }

  const embed = createEmbed(
    `Entries for user key: ${userKey}`,
    `Found **${total}** entry/entries:\n\n${keyList}`,
    0x5865F2
  );
  await interaction.editReply({ embeds: [embed] });
}

async function handleSlashStoreFile(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const entryId = interaction.options.getString("id", true);
  const password = interaction.options.getString("password", true);
  const attachment = interaction.options.getAttachment("file", true);
  const userKey = interaction.options.getString("userkey") || null;

  const existingText = await storage.getTextEntryByEntryId(entryId);
  const existingFile = await storage.getFileEntryByEntryId(entryId);
  if (existingText || existingFile) {
    const embed = createEmbed(
      "Already Exists",
      `An entry with ID \`${entryId}\` already exists.`,
      0xED4245
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  try {
    const fs = await import("fs");
    const path = await import("path");
    const crypto = await import("crypto");

    const uploadsDir = path.default.resolve("uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.default.extname(attachment.name || "");
    const uniqueName = crypto.randomUUID() + ext;
    const filePath = path.default.join(uploadsDir, uniqueName);

    const response = await fetch(attachment.url);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await storage.createFileEntry({
      entryId,
      passwordHash,
      fileName: attachment.name || "unknown",
      mimeType: attachment.contentType || "application/octet-stream",
      fileSize: attachment.size,
      filePath,
      userKey,
      createdBy: interaction.user.tag,
    });

    let desc = `File \`${attachment.name}\` stored with ID \`${entryId}\`. Use \`/getfile\` to retrieve it.`;
    if (userKey) {
      desc += `\nUser key: \`${userKey}\``;
    }

    const embed = createEmbed("File Stored", desc, 0x57F287);
    embed.addFields(
      { name: "File Size", value: formatFileSize(attachment.size), inline: true },
      { name: "Type", value: attachment.contentType || "unknown", inline: true }
    );
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    const embed = createEmbed("Error", "Failed to download and store the file.", 0xED4245);
    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleSlashGetFile(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const entryId = interaction.options.getString("id", true);
  const password = interaction.options.getString("password", true);

  const entry = await storage.getFileEntryByEntryId(entryId);
  if (!entry) {
    const embed = createEmbed("Not Found", `No file entry found with ID \`${entryId}\`.`, 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const valid = await bcrypt.compare(password, entry.passwordHash);
  if (!valid) {
    const embed = createEmbed("Access Denied", "Incorrect password.", 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const fs = await import("fs");
  if (!fs.existsSync(entry.filePath)) {
    const embed = createEmbed("Error", "File not found on disk.", 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const fileBuffer = fs.readFileSync(entry.filePath);
  const { AttachmentBuilder } = await import("discord.js");
  const file = new AttachmentBuilder(fileBuffer, { name: entry.fileName });

  const embed = createEmbed(`File: ${entryId}`, `File: \`${entry.fileName}\``, 0x5865F2);
  embed.addFields(
    { name: "Size", value: formatFileSize(entry.fileSize), inline: true },
    { name: "Type", value: entry.mimeType, inline: true },
    { name: "Created", value: new Date(entry.createdAt).toLocaleString(), inline: true }
  );
  if (entry.createdBy) {
    embed.addFields({ name: "Created By", value: entry.createdBy, inline: true });
  }

  await interaction.editReply({ embeds: [embed], files: [file] });
}

async function handleSlashDeleteFile(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const entryId = interaction.options.getString("id", true);
  const password = interaction.options.getString("password", true);

  const entry = await storage.getFileEntryByEntryId(entryId);
  if (!entry) {
    const embed = createEmbed("Not Found", `No file entry found with ID \`${entryId}\`.`, 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const valid = await bcrypt.compare(password, entry.passwordHash);
  if (!valid) {
    const embed = createEmbed("Access Denied", "Incorrect password.", 0xED4245);
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  const fs = await import("fs");
  if (entry.filePath && fs.existsSync(entry.filePath)) {
    fs.unlinkSync(entry.filePath);
  }
  await storage.deleteFileEntry(entryId);
  const embed = createEmbed("File Deleted", `File entry \`${entryId}\` (\`${entry.fileName}\`) has been deleted.`, 0x57F287);
  await interaction.editReply({ embeds: [embed] });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleSlashHelp(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle("Text Storage Bot - Commands")
    .setDescription("Store and retrieve text and files using unique IDs and passwords. All responses are ephemeral (only visible to you).")
    .setColor(0x5865F2)
    .addFields(
      { name: "📝 Text Commands", value: "Store and manage text entries" },
      { name: "`/store id password text [userkey]`", value: "Store text with a unique ID, password, and optional user key" },
      { name: "`/get id password`", value: "Retrieve stored text by ID" },
      { name: "`/update id password text`", value: "Update existing text" },
      { name: "`/delete id password`", value: "Delete a stored text entry" },
      { name: "📁 File Commands", value: "Store and manage file entries" },
      { name: "`/storefile id password file [userkey]`", value: "Store an attached file with password protection" },
      { name: "`/getfile id password`", value: "Retrieve a stored file" },
      { name: "`/deletefile id password`", value: "Delete a stored file" },
      { name: "🔑 Other", value: "Utility commands" },
      { name: "`/keys userkey`", value: "List all entry IDs (text & files) for a user key" },
      { name: "`/help`", value: "Show this help message" }
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function registerSlashCommands(token: string, clientId: string) {
  const rest = new REST({ version: "10" }).setToken(token);
  try {
    log("Registering slash commands globally...", "discord");
    await rest.put(Routes.applicationCommands(clientId), {
      body: slashCommands.map(cmd => cmd.toJSON()),
    });
    log("Slash commands registered successfully", "discord");
  } catch (error) {
    log(`Failed to register slash commands: ${error}`, "discord");
  }
}

export async function startBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    log("DISCORD_BOT_TOKEN not set, bot will not start", "discord");
    return;
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
    ],
  });

  client.on("ready", async () => {
    botReady = true;
    log(`Bot logged in as ${client!.user?.tag}`, "discord");
    await registerSlashCommands(token, client!.user!.id);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
      switch (interaction.commandName) {
        case "store":
          await handleSlashStore(interaction);
          break;
        case "get":
          await handleSlashGet(interaction);
          break;
        case "update":
          await handleSlashUpdate(interaction);
          break;
        case "delete":
          await handleSlashDelete(interaction);
          break;
        case "keys":
          await handleSlashKeys(interaction);
          break;
        case "storefile":
          await handleSlashStoreFile(interaction);
          break;
        case "getfile":
          await handleSlashGetFile(interaction);
          break;
        case "deletefile":
          await handleSlashDeleteFile(interaction);
          break;
        case "help":
          await handleSlashHelp(interaction);
          break;
      }
    } catch (error) {
      log(`Error handling slash command ${interaction.commandName}: ${error}`, "discord");
      const embed = createEmbed("Error", "An error occurred while processing your command.", 0xED4245);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  });

  try {
    await client.login(token);
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes("disallowed intents")) {
      botError = "Privileged intents not enabled. Go to Discord Developer Portal > Your App > Bot > Enable 'Message Content Intent'.";
    } else {
      botError = errorMsg;
    }
    log(`Failed to login: ${errorMsg}`, "discord");
  }
}
