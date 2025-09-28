/**
 * TOOLS REGISTRY - Système de plugins d'outils
 * ============================================
 * Gestion dynamique des outils disponibles
 * Compatible Web + Mobile avec hot-loading
 */

import React from 'react';
import type { Tool, Platform, Project, DataEntry } from '../types/index.js';

// ===== TOOL COMPONENT INTERFACE =====

export interface ToolComponentProps {
  project: Project | null;
  dataEngine: any; // DataEngine instance
  onDataChange?: (data: DataEntry[]) => void;
  onProjectChange?: (project: Project) => void;
  onBack?: () => void;
  config?: Record<string, any>;
}

export type ToolComponent = React.ComponentType<ToolComponentProps>;

// ===== TOOL REGISTRATION =====

export interface ToolRegistration {
  tool: Tool;
  component: ToolComponent;
  loader?: () => Promise<ToolComponent>; // For lazy loading
  dependencies?: string[]; // Other tools this depends on
}

// ===== MAIN REGISTRY =====

export class ToolsRegistry {
  private tools = new Map<string, ToolRegistration>();
  private loadedComponents = new Map<string, ToolComponent>();
  private listeners = new Set<(tools: Tool[]) => void>();
  private currentPlatform: Platform;

  constructor(platform: Platform) {
    this.currentPlatform = platform;
  }

  // ===== TOOL REGISTRATION =====

  register(registration: ToolRegistration): void {
    const { tool } = registration;
    
    // Validate tool for current platform
    if (!tool.platforms.includes(this.currentPlatform)) {
      console.warn(`Tool ${tool.id} not compatible with platform ${this.currentPlatform}`);
      return;
    }

    this.tools.set(tool.id, registration);
    
    // Preload component if not lazy
    if (registration.component && !registration.loader) {
      this.loadedComponents.set(tool.id, registration.component);
    }

    // Notify listeners
    this.notifyListeners();
    
    console.log(`✅ Tool registered: ${tool.name} (${tool.id})`);
  }

  // ===== TOOL RETRIEVAL =====

  getAvailableTools(category?: string): Tool[] {
    const tools = Array.from(this.tools.values())
      .map(reg => reg.tool)
      .filter(tool => tool.platforms.includes(this.currentPlatform));
    
    if (category) {
      return tools.filter(tool => tool.category === category);
    }
    
    return tools.sort((a, b) => a.name.localeCompare(b.name));
  }

  getTool(toolId: string): Tool | null {
    const registration = this.tools.get(toolId);
    return registration ? registration.tool : null;
  }

  getToolsByCategory(): Record<string, Tool[]> {
    const tools = this.getAvailableTools();
    const categories: Record<string, Tool[]> = {};
    
    for (const tool of tools) {
      if (!categories[tool.category]) {
        categories[tool.category] = [];
      }
      categories[tool.category].push(tool);
    }
    
    return categories;
  }

  // ===== COMPONENT LOADING =====

  async loadToolComponent(toolId: string): Promise<ToolComponent | null> {
    // Check if already loaded
    const loaded = this.loadedComponents.get(toolId);
    if (loaded) return loaded;

    const registration = this.tools.get(toolId);
    if (!registration) {
      console.error(`Tool ${toolId} not found`);
      return null;
    }

    try {
      let component: ToolComponent;
      
      if (registration.loader) {
        // Lazy load
        console.log(`🔄 Lazy loading tool: ${toolId}`);
        component = await registration.loader();
      } else if (registration.component) {
        // Direct component
        component = registration.component;
      } else {
        console.error(`No component or loader found for tool ${toolId}`);
        return null;
      }

      // Cache loaded component
      this.loadedComponents.set(toolId, component);
      console.log(`✅ Tool component loaded: ${toolId}`);
      
      return component;
    } catch (error) {
      console.error(`Failed to load tool ${toolId}:`, error);
      return null;
    }
  }

  renderTool(toolId: string, props: ToolComponentProps): React.ReactElement | null {
    const component = this.loadedComponents.get(toolId);
    if (!component) {
      // Return loading placeholder
      return React.createElement('div', { key: toolId }, `Loading tool ${toolId}...`);
    }

    return React.createElement(component, { key: toolId, ...props });
  }

  // ===== TOOL PERMISSIONS =====

  canUserAccessTool(toolId: string, userTools: string[]): boolean {
    const tool = this.getTool(toolId);
    if (!tool) return false;

    // Check if user has access to this tool
    return userTools.includes(toolId) || userTools.includes('*');
  }

  getAuthorizedTools(userTools: string[]): Tool[] {
    return this.getAvailableTools().filter(tool => 
      this.canUserAccessTool(tool.id, userTools)
    );
  }

  // ===== TOOL DEPENDENCIES =====

  private async loadDependencies(_toolId: string): Promise<void> {
    // TODO: Implement dependency loading logic
    return Promise.resolve();
  }

  // ===== EVENT SYSTEM =====

  onToolsChanged(listener: (tools: Tool[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const tools = this.getAvailableTools();
    this.listeners.forEach(listener => listener(tools));
  }

  // ===== BULK OPERATIONS =====

  async preloadAllTools(): Promise<void> {
    const tools = this.getAvailableTools();
    const loadPromises = tools.map(tool => this.loadToolComponent(tool.id));
    
    await Promise.allSettled(loadPromises);
    console.log(`🚀 Preloaded ${tools.length} tools`);
  }

  unregisterTool(toolId: string): void {
    this.tools.delete(toolId);
    this.loadedComponents.delete(toolId);
    this.notifyListeners();
    console.log(`🗑️ Tool unregistered: ${toolId}`);
  }

  // ===== UTILITY METHODS =====

  getRegistryStats(): {
    totalTools: number;
    loadedTools: number;
    platformTools: number;
    categories: string[];
  } {
    const allTools = Array.from(this.tools.values()).map(reg => reg.tool);
    const platformTools = allTools.filter(tool => tool.platforms.includes(this.currentPlatform));
    const categories = [...new Set(platformTools.map(tool => tool.category))];

    return {
      totalTools: allTools.length,
      loadedTools: this.loadedComponents.size,
      platformTools: platformTools.length,
      categories
    };
  }

  // ===== SEARCH & FILTER =====

  searchTools(query: string): Tool[] {
    const normalizedQuery = query.toLowerCase();
    
    return this.getAvailableTools().filter(tool => 
      tool.name.toLowerCase().includes(normalizedQuery) ||
      tool.description?.toLowerCase().includes(normalizedQuery) ||
      tool.category.toLowerCase().includes(normalizedQuery)
    );
  }
}

// ===== GLOBAL REGISTRY INSTANCE =====

let globalRegistry: ToolsRegistry | null = null;

export function getGlobalRegistry(platform?: Platform): ToolsRegistry {
  if (!globalRegistry) {
    if (!platform) {
      // Auto-detect platform
      platform = typeof window !== 'undefined' ? 'web' : 'mobile';
    }
    globalRegistry = new ToolsRegistry(platform);
  }
  return globalRegistry;
}

export function resetGlobalRegistry(): void {
  globalRegistry = null;
}

// ===== HELPER FUNCTIONS =====

export function createTool(
  id: string,
  name: string,
  category: string,
  component: ToolComponent,
  options: Partial<Tool> = {}
): ToolRegistration {
  const tool: Tool = {
    id,
    name,
    category,
    version: '1.0.0',
    platforms: ['web', 'mobile'],
    permissions: {
      data_types: {
        create: [],
        read: [],
        update: [],
        delete: []
      }
    },
    ...options
  };

  return {
    tool,
    component
  };
}

export function createLazyTool(
  id: string,
  name: string,
  category: string,
  loader: () => Promise<ToolComponent>,
  options: Partial<Tool> = {}
): ToolRegistration {
  const tool: Tool = {
    id,
    name,
    category,
    version: '1.0.0',
    platforms: ['web', 'mobile'],
    permissions: {
      data_types: {
        create: [],
        read: [],
        update: [],
        delete: []
      }
    },
    ...options
  };

  return {
    tool,
    component: null as any, // Will be loaded lazily
    loader
  };
}