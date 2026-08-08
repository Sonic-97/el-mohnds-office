export interface PropertyType {
  id: number
  name: string
  createdAt: string
}

export type PropertyStatus = 'available' | 'sold' | 'reserved' | 'rented'

export interface Property {
  id: number
  name: string
  type: string
  governorate: string
  city: string
  center: string
  neighborhood: string
  zone: string
  street: string
  propertyNumber: string
  mapsUrl: string
  latitude: number | null
  longitude: number | null
  area: number | null
  price: number | null
  pricePerMeter: number | null
  status: PropertyStatus
  facadeDirection: string
  streetWidth: number | null
  ownerName: string
  ownerPhone: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type PropertyInput = Omit<Property, 'id' | 'pricePerMeter' | 'createdAt' | 'updatedAt'>

export interface PropertyFile {
  id: number
  propertyId: number
  kind: 'image' | 'pdf' | 'contract' | 'drawing' | 'other'
  name: string
  path: string
  createdAt: string
}

export type ClientRequestType = 'buy' | 'rent'

export type FollowUpStatus = 'new' | 'contacted' | 'interested' | 'viewing' | 'negotiating' | 'closed'

export interface ClientRequirements {
  requestType: ClientRequestType | ''
  type: string
  governorate: string
  city: string
  center: string
  neighborhood: string
  area: string
  budgetFrom: number | null
  budgetTo: number | null
  areaFrom: number | null
  areaTo: number | null
  desiredStatus: PropertyStatus | ''
  notes: string
}

export interface Client {
  id: number
  name: string
  phone: string
  role: 'seller' | 'buyer'
  budget: number | null
  preferredArea: string
  preferredType: string
  preferredAreaSize: number | null
  seriousness: 'very_serious' | 'serious' | 'possible' | 'not_serious'
  notes: string
  createdAt: string
  updatedAt: string
  type: string
  area: string
  requestType: ClientRequestType | ''
  governorate: string
  city: string
  center: string
  neighborhood: string
  budgetFrom: number | null
  budgetTo: number | null
  areaFrom: number | null
  areaTo: number | null
  desiredStatus: PropertyStatus | ''
  followUpDate: string
  followUpNote: string
  followUpStatus: FollowUpStatus
}

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>

export interface DocumentItem {
  id: number
  propertyId: number
  docType: string
  done: boolean
}

export interface CustomField {
  id: number
  name: string
  fieldType: 'text' | 'number'
  createdAt: string
}

export interface CustomFieldValue {
  id: number
  propertyId: number
  fieldId: number
  value: string
}

export interface PropertyDetail extends Property {
  files: PropertyFile[]
  documents: DocumentItem[]
  customValues: Record<number, string>
}

export interface DashboardStats {
  totalProperties: number
  totalLands: number
  totalApartments: number
  totalClients: number
  available: number
  sold: number
  reserved: number
  rented: number
}

export interface AttentionItem {
  kind: string
  entityType: 'property' | 'client'
  entityId: number
  title: string
  subtitle: string
}

export interface DuplicateCheck {
  hasDuplicates: boolean
  matches: Property[]
}

export interface AreaStat {
  zone: string
  count: number
  avgPricePerMeter: number | null
}

export interface SettingsMap {
  [key: string]: string
}

export interface BackupInfo {
  filePath: string
  filename: string
  createdAt: string
  filesIncluded: number
}

export interface SelectedBackup {
  filePath: string
  createdAt: string
  appVersion: string
  filesIncluded: number
}

export interface AuthStatus {
  hasAccount: boolean
  authenticated: boolean
  username: string | null
}

export interface MapPoint {
  id: number
  name: string
  type: string
  status: PropertyStatus
  price: number | null
  area: number | null
  zone: string
  city: string
  governorate: string
  latitude: number
  longitude: number
}

export interface SearchFilters {
  type: string
  zone: string
  status: string
  maxPrice: number | null
  minArea: number | null
  maxArea: number | null
  query: string
}

export type MarketDataType = 'listing' | 'official' | 'market-report' | 'manual' | 'calculated'

export interface MarketArea {
  id: number
  area: string
  landMin: number | null
  landAvg: number | null
  landMax: number | null
  landCount: number
  landDataType: MarketDataType
  aptMin: number | null
  aptAvg: number | null
  aptMax: number | null
  aptCount: number
  aptDataType: MarketDataType
  rentMin: number | null
  rentAvg: number | null
  rentMax: number | null
  rentCount: number
  rentDataType: MarketDataType
  sourceName: string
  sourceUrl: string
  sourceDate: string
  notes: string
  updatedAt: string
}

export type MarketAreaInput = Omit<MarketArea, 'id' | 'updatedAt'>

export type ZagazigPoiCategory =
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'university'
  | 'school'
  | 'bank'
  | 'government'
  | 'park'
  | 'shopping'
  | 'market'
  | 'food'
  | 'transport'

export interface ZagazigPoi {
  id: string
  category: ZagazigPoiCategory
  name: string
  lat: number
  lon: number
}

export type ZagazigRoadKind = 'main' | 'important'

export interface ZagazigRoad {
  id: string
  kind: ZagazigRoadKind
  name?: string
  points: { lat: number; lon: number }[]
}

export interface ZagazigPoiData {
  pois: ZagazigPoi[]
  roads: ZagazigRoad[]
  fetchedAt: string | null
  error?: string
}

export interface MapArea {
  id: number
  name: string
  color: string
  points: { lat: number; lon: number }[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface MapAreaInput {
  id?: number
  name: string
  color: string
  points: { lat: number; lon: number }[]
  notes: string
}

export interface OfficeAreaStat {
  zone: string
  count: number
  landCount: number
  aptCount: number
  min: number | null
  avg: number | null
  median: number | null
  max: number | null
  rentMin: number | null
  rentAvg: number | null
  rentMax: number | null
}

export interface ZagazigAreaProfile {
  name: string
  market: MarketArea | null
  office: OfficeAreaStat | null
  clientCount: number
  matchOpportunities: number
}

export interface ConstructionCost {
  id: number
  category: string
  minCost: number | null
  typicalCost: number | null
  maxCost: number | null
  sourceName: string
  sourceUrl: string
  sourceDate: string
  updatedAt: string
}

export type ConstructionCostInput = Omit<ConstructionCost, 'id' | 'updatedAt'>

export interface OfficeZoneStat {
  zone: string
  count: number
  min: number | null
  avg: number | null
  median: number | null
  max: number | null
}

export type MatchReasonKind = 'match' | 'warn' | 'conflict'

export interface MatchReason {
  label: string
  kind: MatchReasonKind
}

export interface PropertyMatch {
  property: Property
  score: number
  reasons: MatchReason[]
}

export interface ClientMatch {
  client: Client
  score: number
  reasons: MatchReason[]
}

export interface MatchOpportunityStats {
  propertiesWithClients: number
  clientsWithProperties: number
}

export interface ClientMatchSummary {
  client: Client
  propertyCount: number
  topScore: number | null
}

export interface PropertyMatchSummary {
  property: Property
  clientCount: number
  topScore: number | null
}

export interface ConstructionMaterial {
  id: number
  name: string
  unit: string
  price: number | null
  previousPrice: number | null
  source: string
  sourceUrl: string
  notes: string
  updatedAt: string
}

export type ConstructionMaterialInput = Omit<ConstructionMaterial, 'id' | 'updatedAt'>

export interface MaterialRefreshResult {
  ok: boolean
  message: string
  updated: number
}

export type CommissionType = 'percent' | 'fixed'

export interface Commission {
  id: number
  propertyId: number
  propertyName: string
  finalPrice: number
  cType: CommissionType
  rate: number
  amount: number
  received: number
  date: string
  notes: string
  createdAt: string
}

export type CommissionInput = Omit<Commission, 'id' | 'createdAt' | 'propertyName'>

export interface CommissionSummary {
  monthExpected: number
  monthReceived: number
  monthOutstanding: number
  totalExpected: number
  totalReceived: number
  totalOutstanding: number
  count: number
}

export interface DemandItem {
  label: string
  count: number
}

export interface DemandAnalytics {
  totalClients: number
  withRequirements: number
  enoughData: boolean
  topTypes: DemandItem[]
  topAreas: DemandItem[]
  budgetRanges: DemandItem[]
  avgArea: number | null
  buyersByType: DemandItem[]
}

export interface FollowUpStats {
  dueToday: number
  overdue: number
  upcoming: number
}
