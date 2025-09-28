/**
 * CORE TYPES - Architecture Générique Data/Tools
 * ============================================== 
 * Types universels pour projets multi-domaines
 * Compatible Web + Mobile (React Native/Expo)
 */

// ===== CORE PROJECT TYPES =====

// Deprecated alias (Project) -> new canonical name Workspace
export interface Project {
  id: string;
  name: string;
  description?: string;
  domain: string;              // "construction", "research", "inventory", etc.
  metadata: Record<string, any>; // Domain-specific data
  owner: string;
  created_at: number;
  updated_at: number;
}

export interface Workspace extends Project {}

// ===== UNIVERSAL DATA TYPES =====

export interface DataEntry {
  id: string;
  project_id: string;
  data_type: string;           // "measurement", "media", "annotation", "relationship"
  content: Record<string, any>; // Flexible content structure
  tool_origin: string;         // Tool that created this data
  parent_id?: string;          // For hierarchical data
  tags?: string[];             // Flexible tagging system
  created_at: number;
  updated_at?: number;
}

// Specific data type schemas (extensible)
export interface MeasurementData {
  value: number;
  unit?: string;
  precision?: number;
  is_reference?: boolean;
  label?: string;
  coordinates?: { x?: number; y?: number; z?: number };
}

export interface MediaData {
  type: "image" | "video" | "document" | "audio";
  url: string;
  filename: string;
  mime_type: string;
  size: number;
  metadata?: Record<string, any>;
}

export interface AnnotationData {
  text: string;
  type?: "note" | "comment" | "warning" | "todo";
  references?: string[]; // IDs of referenced data entries
}

export interface RelationshipData {
  type: "hierarchy" | "reference" | "dependency" | "sequence";
  target_id: string;
  direction: "bidirectional" | "forward" | "backward";
  strength?: number; // 0-1 for weighted relationships
}

// ===== TOOLS SYSTEM =====

export interface Tool {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: string;
  category: string;            // "measurement", "media", "analysis", etc.
  platforms: Platform[];
  permissions: ToolPermissions;
  config?: ToolConfig;
}

export type Platform = "web" | "mobile" | "desktop";

export interface ToolPermissions {
  data_types: {
    create?: string[];         // Data types this tool can create
    read?: string[];           // Data types this tool can read
    update?: string[];         // Data types this tool can update
    delete?: string[];         // Data types this tool can delete
  };
  project_access?: "owner" | "collaborator" | "viewer";
}

export interface ToolConfig {
  settings?: Record<string, any>;
  ui_config?: Record<string, any>;
  default_values?: Record<string, any>;
}

// ===== USER & PERMISSIONS =====

export interface User {
  id: string;
  username: string;
  email?: string;
  role: "admin" | "user" | "viewer";
  permissions?: UserPermissions;
  profile?: Record<string, any>;
}

export interface UserPermissions {
  projects: {
    create?: boolean;
    read?: string[];           // Project IDs user can read
    update?: string[];         // Project IDs user can update
    delete?: string[];         // Project IDs user can delete
  };
  tools: {
    allowed_tools?: string[];  // Tool IDs user can access
    restricted_tools?: string[]; // Tool IDs user cannot access
  };
}

// ===== QUERY & FILTER SYSTEM =====

export interface DataFilter {
  field: string;
  operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "like" | "exists";
  value: any;
}

export interface DataQuery {
  project_id: string;
  data_types?: string[];
  filters?: DataFilter[];
  sort?: { field: string; direction: "asc" | "desc" }[];
  limit?: number;
  offset?: number;
  include_content?: boolean;
}

export interface QueryResult<T = DataEntry> {
  data: T[];
  total: number;
  has_more: boolean;
  query_time?: number;
}

// ===== SYNC & CONFLICT RESOLUTION =====

export interface SyncStatus {
  last_sync: number;
  pending_changes: number;
  conflicts: ConflictEntry[];
  status: "synced" | "pending" | "conflict" | "error";
}

export interface ConflictEntry {
  id: string;
  type: "data" | "project" | "permission";
  local_version: any;
  remote_version: any;
  created_at: number;
}

// ===== API RESPONSES =====

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ===== EVENTS & REALTIME =====

export interface SystemEvent {
  id: string;
  type: string;
  project_id?: string;
  user_id: string;
  data: Record<string, any>;
  timestamp: number;
}

export type EventListener = (event: SystemEvent) => void;

// ===== UTILITY TYPES =====

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateInput<T> = DeepPartial<Omit<T, 'id' | 'created_at'>>;