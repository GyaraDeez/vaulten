import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Bot,
  Database,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Copy,
  Clock,
  User,
  Server,
  Pencil,
  KeyRound,
  FileText,
  CircleDot,
  Terminal,
  Hash,
  Upload,
  Download,
  File,
  Paperclip,
} from "lucide-react";
import { SiDiscord } from "react-icons/si";

type BotStatus = {
  online: boolean;
  username: string | null;
  guilds: number;
  uptime: number;
  error: string | null;
};

type RetrievedEntry = {
  entryId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

function formatUptime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function BotStatusCard() {
  const { data: status, isLoading } = useQuery<BotStatus>({
    queryKey: ["/api/bot/status"],
    refetchInterval: 5000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <SiDiscord className="w-5 h-5" />
          Bot Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Checking status...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CircleDot
                className={`w-4 h-4 ${status?.online ? "text-green-500" : "text-red-500"}`}
              />
              <Badge variant={status?.online ? "default" : "destructive"} data-testid="badge-bot-status">
                {status?.online ? "Online" : "Offline"}
              </Badge>
            </div>
            {status?.username && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="w-4 h-4" />
                <span data-testid="text-bot-username">{status.username}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="w-4 h-4" />
              <span data-testid="text-guild-count">{status?.guilds || 0} servers</span>
            </div>
            {status?.online && status.uptime > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span data-testid="text-uptime">Uptime: {formatUptime(status.uptime)}</span>
              </div>
            )}
            {status?.error && (
              <p className="text-xs text-destructive mt-1" data-testid="text-bot-error">
                {status.error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsCard() {
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/entries/count"],
    refetchInterval: 10000,
  });
  const { data: fileCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/entries/file-count"],
    refetchInterval: 10000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="w-5 h-5" />
          Storage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold" data-testid="text-entry-count">
              {countData?.count ?? 0}
            </span>
            <span className="text-sm text-muted-foreground">text entries</span>
          </div>
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-muted-foreground" />
            <span className="text-2xl font-bold" data-testid="text-file-count">
              {fileCountData?.count ?? 0}
            </span>
            <span className="text-sm text-muted-foreground">file entries</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Password-protected storage for text and files.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function CommandsCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="w-5 h-5" />
          Bot Commands
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[
            { cmd: "/store", desc: "Store text" },
            { cmd: "/get", desc: "Retrieve text" },
            { cmd: "/update", desc: "Update text" },
            { cmd: "/delete", desc: "Delete text" },
            { cmd: "/storefile", desc: "Store file" },
            { cmd: "/getfile", desc: "Get file" },
            { cmd: "/deletefile", desc: "Delete file" },
            { cmd: "/keys", desc: "List entries" },
          ].map((item) => (
            <div key={item.cmd} className="flex items-start gap-2 text-sm">
              <code className="bg-muted px-2 py-0.5 rounded-md text-xs font-mono shrink-0" data-testid={`text-cmd-${item.desc.toLowerCase().replace(/\s/g, '-')}`}>
                {item.cmd}
              </code>
              <span className="text-muted-foreground">{item.desc}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StoreForm() {
  const { toast } = useToast();
  const [entryId, setEntryId] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");
  const [userKey, setUserKey] = useState("");

  const storeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/entries/store", {
        entryId,
        password,
        content,
        ...(userKey ? { userKey } : {}),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Stored", description: `Entry "${entryId}" saved successfully.` });
      setEntryId("");
      setPassword("");
      setContent("");
      setUserKey("");
      queryClient.invalidateQueries({ queryKey: ["/api/entries/count"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Entry ID
          </label>
          <Input
            data-testid="input-store-id"
            placeholder="my-note"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </label>
          <Input
            data-testid="input-store-password"
            type="password"
            placeholder="secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          User Key <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          data-testid="input-store-userkey"
          placeholder="my-user-key"
          value={userKey}
          onChange={(e) => setUserKey(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Content
        </label>
        <Textarea
          data-testid="input-store-content"
          placeholder="Enter the text you want to store..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] resize-y"
        />
      </div>
      <Button
        data-testid="button-store"
        onClick={() => storeMutation.mutate()}
        disabled={!entryId || !password || !content || storeMutation.isPending}
        className="w-full"
      >
        {storeMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Plus className="w-4 h-4 mr-2" />
        )}
        Store Entry
      </Button>
    </div>
  );
}

function RetrieveForm() {
  const { toast } = useToast();
  const [entryId, setEntryId] = useState("");
  const [password, setPassword] = useState("");
  const [retrieved, setRetrieved] = useState<RetrievedEntry | null>(null);

  const retrieveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/entries/retrieve", {
        entryId,
        password,
      });
      return res.json();
    },
    onSuccess: (data: RetrievedEntry) => {
      setRetrieved(data);
    },
    onError: (error: Error) => {
      setRetrieved(null);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyContent = () => {
    if (retrieved?.content) {
      navigator.clipboard.writeText(retrieved.content);
      toast({ title: "Copied", description: "Content copied to clipboard." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Entry ID
          </label>
          <Input
            data-testid="input-retrieve-id"
            placeholder="my-note"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </label>
          <Input
            data-testid="input-retrieve-password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <Button
        data-testid="button-retrieve"
        onClick={() => retrieveMutation.mutate()}
        disabled={!entryId || !password || retrieveMutation.isPending}
        className="w-full"
        variant="secondary"
      >
        {retrieveMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Search className="w-4 h-4 mr-2" />
        )}
        Retrieve Entry
      </Button>

      {retrieved && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid="badge-retrieved-id">
                  {retrieved.entryId}
                </Badge>
                {retrieved.createdBy && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {retrieved.createdBy}
                  </span>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={copyContent} data-testid="button-copy">
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copy
              </Button>
            </div>
            <div
              className="bg-background rounded-md p-3 text-sm whitespace-pre-wrap font-mono border"
              data-testid="text-retrieved-content"
            >
              {retrieved.content}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Created: {new Date(retrieved.createdAt).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Updated: {new Date(retrieved.updatedAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UpdateForm() {
  const { toast } = useToast();
  const [entryId, setEntryId] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/entries/update", {
        entryId,
        password,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Updated", description: `Entry "${entryId}" updated.` });
      setEntryId("");
      setPassword("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Entry ID
          </label>
          <Input
            data-testid="input-update-id"
            placeholder="my-note"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </label>
          <Input
            data-testid="input-update-password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          New Content
        </label>
        <Textarea
          data-testid="input-update-content"
          placeholder="Enter updated text..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[120px] resize-y"
        />
      </div>
      <Button
        data-testid="button-update"
        onClick={() => updateMutation.mutate()}
        disabled={!entryId || !password || !content || updateMutation.isPending}
        className="w-full"
        variant="secondary"
      >
        {updateMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Pencil className="w-4 h-4 mr-2" />
        )}
        Update Entry
      </Button>
    </div>
  );
}

function DeleteForm() {
  const { toast } = useToast();
  const [entryId, setEntryId] = useState("");
  const [password, setPassword] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/entries/delete", {
        entryId,
        password,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: `Entry "${entryId}" removed.` });
      setEntryId("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries/count"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Entry ID
          </label>
          <Input
            data-testid="input-delete-id"
            placeholder="my-note"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </label>
          <Input
            data-testid="input-delete-password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <Button
        data-testid="button-delete"
        onClick={() => deleteMutation.mutate()}
        disabled={!entryId || !password || deleteMutation.isPending}
        className="w-full"
        variant="destructive"
      >
        {deleteMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4 mr-2" />
        )}
        Delete Entry
      </Button>
    </div>
  );
}

const CHUNK_SIZE = 5 * 1024 * 1024;

async function chunkedUpload(
  file: globalThis.File,
  entryId: string,
  password: string,
  userKey: string,
  onProgress?: (pct: number) => void,
) {
  const initRes = await fetch("/api/files/upload/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId, password, fileName: file.name, mimeType: file.type, fileSize: file.size, userKey: userKey || undefined }),
  });
  if (!initRes.ok) {
    const err = await initRes.json().catch(() => ({ message: "Failed to start upload" }));
    throw new Error(err.message);
  }
  const { uploadId } = await initRes.json();

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("chunk", chunk, "chunk");

    const chunkRes = await fetch(`/api/files/upload/chunk/${uploadId}`, {
      method: "POST",
      body: formData,
    });
    if (!chunkRes.ok) {
      const err = await chunkRes.json().catch(() => ({ message: "Chunk upload failed" }));
      throw new Error(err.message);
    }
    if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
  }

  const completeRes = await fetch(`/api/files/upload/complete/${uploadId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId, password, userKey: userKey || undefined }),
  });
  if (!completeRes.ok) {
    const err = await completeRes.json().catch(() => ({ message: "Failed to finalize upload" }));
    throw new Error(err.message);
  }
  return completeRes.json();
}

function StoreFileForm() {
  const { toast } = useToast();
  const [entryId, setEntryId] = useState("");
  const [password, setPassword] = useState("");
  const [userKey, setUserKey] = useState("");
  const [file, setFile] = useState<globalThis.File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const storeMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      setUploadProgress(0);
      return chunkedUpload(file, entryId, password, userKey, setUploadProgress);
    },
    onSuccess: () => {
      toast({ title: "File Stored", description: `File stored with ID "${entryId}".` });
      setEntryId("");
      setPassword("");
      setUserKey("");
      setFile(null);
      setUploadProgress(null);
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      queryClient.invalidateQueries({ queryKey: ["/api/entries/file-count"] });
    },
    onError: (error: Error) => {
      setUploadProgress(null);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Entry ID
          </label>
          <Input
            data-testid="input-storefile-id"
            placeholder="my-file"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </label>
          <Input
            data-testid="input-storefile-password"
            type="password"
            placeholder="secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          User Key <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          data-testid="input-storefile-userkey"
          placeholder="my-user-key"
          value={userKey}
          onChange={(e) => setUserKey(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          File
        </label>
        <Input
          id="file-upload"
          data-testid="input-storefile-file"
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="cursor-pointer"
        />
        {file && (
          <p className="text-xs text-muted-foreground">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>
      {uploadProgress !== null && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
      <Button
        data-testid="button-storefile"
        onClick={() => storeMutation.mutate()}
        disabled={!entryId || !password || !file || storeMutation.isPending}
        className="w-full"
      >
        {storeMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {storeMutation.isPending ? `Uploading${uploadProgress !== null ? ` (${uploadProgress}%)` : "..."}` : "Upload File"}
      </Button>
    </div>
  );
}

function GetFileForm() {
  const { toast } = useToast();
  const [entryId, setEntryId] = useState("");
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [fileInfo, setFileInfo] = useState<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
    createdBy: string | null;
  } | null>(null);

  const getMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/files/info", { entryId, password });
      return res.json();
    },
    onSuccess: (data) => {
      setFileInfo(data);
    },
    onError: (error: Error) => {
      setFileInfo(null);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDownload = async () => {
    if (!fileInfo) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Entry ID
          </label>
          <Input
            data-testid="input-getfile-id"
            placeholder="my-file"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </label>
          <Input
            data-testid="input-getfile-password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <Button
        data-testid="button-getfile"
        onClick={() => getMutation.mutate()}
        disabled={!entryId || !password || getMutation.isPending}
        className="w-full"
      >
        {getMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Search className="w-4 h-4 mr-2" />
        )}
        Retrieve File
      </Button>

      {fileInfo && (
        <div className="space-y-3 p-3 rounded-md border bg-muted/50">
          <div className="flex items-center gap-2">
            <File className="w-5 h-5 text-primary" />
            <span className="font-mono text-sm font-medium" data-testid="text-file-name">{fileInfo.fileName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Size: {(fileInfo.fileSize / 1024).toFixed(1)} KB</div>
            <div>Type: {fileInfo.mimeType}</div>
            <div>Created: {new Date(fileInfo.createdAt).toLocaleString()}</div>
            {fileInfo.createdBy && <div>By: {fileInfo.createdBy}</div>}
          </div>
          <Button
            data-testid="button-download-file"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full"
            variant="secondary"
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {downloading ? "Downloading..." : "Download File"}
          </Button>
        </div>
      )}
    </div>
  );
}

function DeleteFileForm() {
  const { toast } = useToast();
  const [entryId, setEntryId] = useState("");
  const [password, setPassword] = useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/files/delete", { entryId, password });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "File Deleted", description: `File entry "${entryId}" has been deleted.` });
      setEntryId("");
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/entries/file-count"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Entry ID
          </label>
          <Input
            data-testid="input-deletefile-id"
            placeholder="my-file"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Password
          </label>
          <Input
            data-testid="input-deletefile-password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      </div>
      <Button
        data-testid="button-deletefile"
        onClick={() => deleteMutation.mutate()}
        disabled={!entryId || !password || deleteMutation.isPending}
        className="w-full"
        variant="destructive"
      >
        {deleteMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4 mr-2" />
        )}
        Delete File
      </Button>
    </div>
  );
}

type KeyEntry = {
  entryId: string;
  createdAt: string;
  type?: string;
  fileName?: string;
};

function KeysForm() {
  const { toast } = useToast();
  const [userKey, setUserKey] = useState("");
  const [entries, setEntries] = useState<KeyEntry[] | null>(null);

  const keysMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/entries/keys", { userKey });
      return res.json();
    },
    onSuccess: (data: { userKey: string; entries: KeyEntry[] }) => {
      setEntries(data.entries);
      if (data.entries.length === 0) {
        toast({ title: "No entries", description: `No entries found for user key "${userKey}".` });
      }
    },
    onError: (error: Error) => {
      setEntries(null);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" />
          User Key
        </label>
        <Input
          data-testid="input-keys-userkey"
          placeholder="my-user-key"
          value={userKey}
          onChange={(e) => setUserKey(e.target.value)}
        />
      </div>
      <Button
        data-testid="button-keys"
        onClick={() => keysMutation.mutate()}
        disabled={!userKey || keysMutation.isPending}
        className="w-full"
        variant="secondary"
      >
        {keysMutation.isPending ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Search className="w-4 h-4 mr-2" />
        )}
        List My Entries
      </Button>

      {entries !== null && entries.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found <span className="font-medium text-foreground">{entries.length}</span> entry/entries:
          </p>
          {entries.map((entry) => (
            <div
              key={entry.entryId}
              className="flex items-center justify-between gap-2 p-2.5 rounded-md border bg-muted/50"
              data-testid={`row-key-${entry.entryId}`}
            >
              <div className="flex items-center gap-2">
                {entry.type === "file" ? (
                  <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="font-mono text-sm font-medium">{entry.entryId}</span>
                {entry.type === "file" && entry.fileName && (
                  <span className="text-xs text-muted-foreground">({entry.fileName})</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(entry.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary text-primary-foreground">
              <SiDiscord className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
                Vaulten Storage Bot
              </h1>
              <p className="text-sm text-muted-foreground">
                Discord bot with password-protected text &amp; file storage
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <BotStatusCard />
          <StatsCard />
          <CommandsCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Text Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="store">
                <TabsList className="w-full grid grid-cols-4 mb-4">
                  <TabsTrigger value="store" data-testid="tab-store">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Store
                  </TabsTrigger>
                  <TabsTrigger value="retrieve" data-testid="tab-retrieve">
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    Get
                  </TabsTrigger>
                  <TabsTrigger value="update" data-testid="tab-update">
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Update
                  </TabsTrigger>
                  <TabsTrigger value="delete" data-testid="tab-delete">
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="store">
                  <StoreForm />
                </TabsContent>
                <TabsContent value="retrieve">
                  <RetrieveForm />
                </TabsContent>
                <TabsContent value="update">
                  <UpdateForm />
                </TabsContent>
                <TabsContent value="delete">
                  <DeleteForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Paperclip className="w-5 h-5" />
                File Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="storefile">
                <TabsList className="w-full grid grid-cols-3 mb-4">
                  <TabsTrigger value="storefile" data-testid="tab-storefile">
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value="getfile" data-testid="tab-getfile">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Get
                  </TabsTrigger>
                  <TabsTrigger value="deletefile" data-testid="tab-deletefile">
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Delete
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="storefile">
                  <StoreFileForm />
                </TabsContent>
                <TabsContent value="getfile">
                  <GetFileForm />
                </TabsContent>
                <TabsContent value="deletefile">
                  <DeleteFileForm />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-5 h-5" />
                Lookup by User Key
              </CardTitle>
            </CardHeader>
            <CardContent>
              <KeysForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
