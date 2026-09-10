export type FileItem = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  parentId?: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  viewUrl: string;
  downloadUrl: string;
  createdAt: string;
  deletedAt?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
};

export type FolderItem = {
  id: string;
  name: string;
  parentId?: string | null;
  createdAt: string;
  deletedAt?: string | null;
};

export type PagedResponse<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type FileShare = {
  id: string;
  fileId: string;
  userId: string;
  email: string;
  fullName: string;
  permission: "VIEW" | "DOWNLOAD" | "EDIT";
  createdAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  storageQuotaBytes?: number | null;
  effectiveStorageQuotaBytes?: number | null;
  storageUsedBytes?: number;
  twoFactorEnabled?: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  enabled: boolean;
  roles: string[];
  createdAt: string;
  storageQuotaBytes?: number | null;
  effectiveStorageQuotaBytes?: number | null;
  storageUsedBytes: number;
};

export type AuditLog = {
  id: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  targetName?: string | null;
  message: string;
  metadataJson?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

export type StorageNode = {
  id: number;
  name: string;
  note?: string;
  endpoint: string;
  region: string;
  bucket: string;
  capacityBytes: number;
  bandwidthLimitBytes: number;
  bandwidthUsedBytes: number;
  bandwidthResetAt?: string;
  usedBytes: number;
  enabled: boolean;
  priority: number;
  lastCheckedAt?: string;
  lastError?: string;
};

export type MigrationJob = {
  id: string;
  sourceNodeId: number;
  sourceNodeName: string;
  targetNodeId: number;
  targetNodeName: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  totalFiles: number;
  migratedFiles: number;
  totalFolders: number;
  migratedFolders: number;
  totalBytes: number;
  migratedBytes: number;
  errorMessage?: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
};

export type AdminDashboard = {
  totals: {
    users: number;
    activeUsers: number;
    files: number;
    storageUsedBytes: number;
    storageCapacityBytes: number;
    bandwidthUsedBytes: number;
    bandwidthLimitBytes: number;
    storageNodes: number;
    healthyNodes: number;
    unreadAlerts: number;
  };
  nodes: StorageNode[];
  topUsers: AdminUser[];
  recentMigrations: MigrationJob[];
  recentAuditLogs: AuditLog[];
  alerts: Array<{
    type: string;
    severity: "danger" | "warning" | string;
    title: string;
    message: string;
    targetType?: string | null;
    targetId?: string | null;
  }>;
};

export type TrashPolicy = {
  retentionDays: number;
};

export type SmtpSettings = {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  passwordConfigured: boolean;
  startTls: boolean;
  auth: boolean;
  fromEmail: string;
  fromName: string;
  otpSubject: string;
};

export type SystemSettings = {
  trashPolicy: TrashPolicy;
  smtp: SmtpSettings;
};

export type EmailTemplate = {
  key: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  targetType?: string | null;
  targetId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type DeveloperApiKey = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  active: boolean;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  token?: string | null;
};

export type ApiUsageLog = {
  id: string;
  apiKeyId: string;
  apiKeyName: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ipAddress?: string | null;
  errorMessage?: string | null;
  createdAt: string;
};

export type DeveloperStats = {
  apiKeys: number;
  activeApiKeys: number;
  requestsToday: number;
  failedRequestsToday: number;
  rateLimitPerMinute: number;
};

export type AuthResponse = {
  accessToken?: string | null;
  refreshToken?: string | null;
  user?: AuthUser | null;
  twoFactorRequired?: boolean;
  twoFactorToken?: string | null;
  emailVerificationRequired?: boolean;
  email?: string | null;
};

export type PayosSettings = {
  enabled: boolean;
  clientId: string;
  apiKeyConfigured: boolean;
  checksumKeyConfigured: boolean;
  returnUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  encryptionConfigured: boolean;
};

export type BillingPlan = {
  id: string;
  name: string;
  quotaBytes: number;
  quotaGb: number;
  price: number;
  currency: string;
  durationDays: number;
  description: string;
  active: boolean;
  sortOrder: number;
};

export type CheckoutResponse = {
  orderId: string;
  orderCode: number;
  checkoutUrl: string;
};
