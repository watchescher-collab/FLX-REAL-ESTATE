export type PropertyType = 'Invest' | 'Live';
export type ApprovalStatus = 'Approved' | 'Pending' | 'Needs_Revision' | 'Sold';

export interface PropertyLocation {
  lat: number;
  lng: number;
  address: string;
  ward?: string;
  district?: string;
  region?: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  license: string;
  role: string;
}

export interface OwnerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  accountStatus: 'Invited' | 'Active';
}

export interface PropertyMetadata {
  beds: number;
  baths: number;
  sqft: number;
  lot_size?: string;
  year_built?: number;
  // Investment metrics
  cap_rate?: number; // percentage, e.g. 8.4
  gross_yield?: number; // percentage
  projected_monthly_rent?: number;
  projected_annual_cashflow?: number;
  occupancy_rate?: number; // percentage
  short_term_rental_allowed?: boolean;
  estimated_appreciation_5yr?: number;
  // Live / Residential metrics
  luxury_finishes?: string[];
  walk_score?: number;
  school_rating?: number; // 1-10
  hoa_monthly?: number;
}

export interface Property {
  id: string;
  created_at: string;
  title: string;
  property_type: PropertyType;
  status: ApprovalStatus;
  price: number;
  video_url: string;
  video_resolution?: string;
  thumbnail_url: string;
  images: string[];
  location: PropertyLocation;
  agent: AgentInfo;
  owner?: OwnerInfo;
  metadata: PropertyMetadata;
  description: string;
  featured?: boolean;
  intake_notes?: string;
}

export type LeadStatus = 'New' | 'Contacted' | 'Tour_Scheduled' | 'Offer_Placed' | 'Closed';
export type InquiryType = 'Tour' | 'Investor_Deck' | 'Make_Offer' | 'General';
export type LeadIntent = 'Buy' | 'Rent';

export interface Lead {
  id: string;
  property_id?: string;
  client_id?: string;
  assigned_agent_id?: string;
  property_title?: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  inquiry_type: InquiryType;
  intent: LeadIntent;
  budget?: string;
  preferred_date?: string;
  message: string;
  status: LeadStatus;
  created_at: string;
  notes?: string;
}

export interface FilterState {
  property_type: 'All' | 'Invest' | 'Live';
  search: string;
  city: string;
  min_price: number;
  max_price: number;
  min_beds: number;
  min_cap_rate: number;
  has_video: boolean;
  sort_by: 'featured' | 'price_asc' | 'price_desc' | 'cap_rate_desc' | 'newest';
}

export type ActiveAppView = 'discovery' | 'client_account' | 'investor_desk' | 'agent_intake' | 'owner_portfolio' | 'admin_crm';

export type ThemeMode = 'dark' | 'light';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  clientCategory?: string;
  password?: string;
  picture?: string;
  role?: 'Agent' | 'Investor' | 'Owner' | 'Admin' | 'Client';
  isVerified?: boolean;
  provider: 'local';
  lastLogin?: string;
}
