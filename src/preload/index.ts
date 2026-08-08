import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  PropertyInput,
  ClientInput,
  SearchFilters
} from '../shared/types'

const api = {
  settings: {
    getAll: () => ipcRenderer.invoke('settings:getAll'),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value)
  },
  types: {
    list: () => ipcRenderer.invoke('types:list'),
    create: (name: string) => ipcRenderer.invoke('types:create', name),
    ensure: (name: string) => ipcRenderer.invoke('types:ensure', name),
    delete: (id: number) => ipcRenderer.invoke('types:delete', id)
  },
  properties: {
    list: () => ipcRenderer.invoke('properties:list'),
    get: (id: number) => ipcRenderer.invoke('properties:get', id),
    create: (input: PropertyInput) => ipcRenderer.invoke('properties:create', input),
    update: (id: number, input: PropertyInput) => ipcRenderer.invoke('properties:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('properties:delete', id),
    search: (filters: SearchFilters) => ipcRenderer.invoke('properties:search', filters),
    checkDuplicates: (input: PropertyInput) => ipcRenderer.invoke('properties:checkDuplicates', input),
    mapPoints: () => ipcRenderer.invoke('properties:mapPoints')
  },
  stats: {
    dashboard: () => ipcRenderer.invoke('stats:dashboard'),
    areaAverages: () => ipcRenderer.invoke('stats:areaAverages'),
    attention: () => ipcRenderer.invoke('stats:attention'),
    demand: () => ipcRenderer.invoke('stats:demand'),
    followups: () => ipcRenderer.invoke('stats:followups')
  },
  materials: {
    list: () => ipcRenderer.invoke('materials:list'),
    save: (input: import('../shared/types').ConstructionMaterialInput) => ipcRenderer.invoke('materials:save', input),
    delete: (id: number) => ipcRenderer.invoke('materials:delete', id),
    refresh: () => ipcRenderer.invoke('materials:refresh')
  },
  commissions: {
    list: () => ipcRenderer.invoke('commissions:list'),
    create: (input: import('../shared/types').CommissionInput) => ipcRenderer.invoke('commissions:create', input),
    update: (id: number, input: import('../shared/types').CommissionInput) =>
      ipcRenderer.invoke('commissions:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('commissions:delete', id),
    summary: () => ipcRenderer.invoke('commissions:summary')
  },
  files: {
    list: (propertyId: number) => ipcRenderer.invoke('files:list', propertyId),
    add: (propertyId: number, kind: string, path: string) =>
      ipcRenderer.invoke('files:add', propertyId, kind, path),
    delete: (id: number) => ipcRenderer.invoke('files:delete', id),
    open: (path: string) => ipcRenderer.invoke('files:open', path)
  },
  documents: {
    list: (propertyId: number) => ipcRenderer.invoke('documents:list', propertyId),
    toggle: (id: number, done: boolean) => ipcRenderer.invoke('documents:toggle', id, done)
  },
  clients: {
    list: () => ipcRenderer.invoke('clients:list'),
    get: (id: number) => ipcRenderer.invoke('clients:get', id),
    create: (input: ClientInput) => ipcRenderer.invoke('clients:create', input),
    update: (id: number, input: ClientInput) => ipcRenderer.invoke('clients:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('clients:delete', id)
  },
  matching: {
    clientMatches: (clientId: number) => ipcRenderer.invoke('matching:clientMatches', clientId),
    propertyMatches: (propertyId: number) => ipcRenderer.invoke('matching:propertyMatches', propertyId),
    clientMatchCount: (clientId: number) => ipcRenderer.invoke('matching:clientMatchCount', clientId),
    propertyMatchCount: (propertyId: number) => ipcRenderer.invoke('matching:propertyMatchCount', propertyId),
    opportunities: () => ipcRenderer.invoke('matching:opportunities'),
    budgetTolerance: () => ipcRenderer.invoke('matching:budgetTolerance')
  },
  customFields: {
    list: () => ipcRenderer.invoke('customFields:list'),
    create: (name: string, fieldType: 'text' | 'number') =>
      ipcRenderer.invoke('customFields:create', name, fieldType),
    delete: (id: number) => ipcRenderer.invoke('customFields:delete', id),
    save: (propertyId: number, values: Record<number, string>) =>
      ipcRenderer.invoke('customFields:save', propertyId, values)
  },
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
  branding: {
    get: () => ipcRenderer.invoke('branding:get'),
    save: (kind: 'logo' | 'banner' | 'background', payload: string | number[]) =>
      ipcRenderer.invoke('branding:save', kind, payload),
    remove: (kind: 'logo' | 'banner' | 'background') => ipcRenderer.invoke('branding:remove', kind)
  },
  market: {
    listAreas: () => ipcRenderer.invoke('market:listAreas'),
    saveArea: (input: import('../shared/types').MarketAreaInput) =>
      ipcRenderer.invoke('market:saveArea', input),
    deleteArea: (id: number) => ipcRenderer.invoke('market:deleteArea', id),
    officeStats: () => ipcRenderer.invoke('market:officeStats')
  },
  constCost: {
    list: () => ipcRenderer.invoke('constCost:list'),
    save: (input: import('../shared/types').ConstructionCostInput) =>
      ipcRenderer.invoke('constCost:save', input),
    delete: (id: number) => ipcRenderer.invoke('constCost:delete', id)
  },
  zmap: {
    getPoiData: (force?: boolean) => ipcRenderer.invoke('zmap:getPoiData', force),
    listAreas: () => ipcRenderer.invoke('zmap:listAreas'),
    saveArea: (input: import('../shared/types').MapAreaInput) =>
      ipcRenderer.invoke('zmap:saveArea', input),
    deleteArea: (id: number) => ipcRenderer.invoke('zmap:deleteArea', id)
  }
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
