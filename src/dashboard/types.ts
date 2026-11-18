export type UserRole = 'owner' | 'admin';

export type OwnerTab = 'business' | 'leads' | 'reviews' | 'analytics' | 'offers' | 'settings' | 'form';
export type AdminTab = 'overview' | 'businesses' | 'leads' | 'reviews' | 'more';

export interface BusinessListing {
  id: string;
  name: string;
  owner: string;
  ownerId?: string;
  category: string;
  location: string;
  phone: string;
  status: 'Active' | 'Pending' | 'Rejected' | 'Draft' | 'Suspended' | 'Paused';
  slug?: string;
  rejectionReason?: string;
  offers?: { id: string; title: string; description: string; code: string; occasion: string; validUntil: string; isActive: boolean }[];
  timeAgo: string;
  rating?: number;
  reviewsCount?: number;
  views?: number;
  enquiries?: number;
  description?: string;
  verified?: boolean;
  googlePlaceVerificationStatus?: 'unverified' | 'verified' | 'mismatch';
  alternatePhone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  logo?: string;
  images?: string[];
  services?: string[];
  address?: Record<string, string>;
  averageRating?: number;
  kycStatus?: 'not_submitted' | 'submitted' | 'verified' | 'rejected';
  gstNumber?: string;
  msmeNumber?: string;
  kycDocuments?: { type: string; url: string; status?: string }[];
  plan?: 'free' | 'premium';
  planExpiresAt?: string;
  workingHours?: { day: string; isClosed?: boolean; opens?: string; closes?: string }[];
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  service?: string;
  status: 'New' | 'Contacted' | 'Converted';
  timestamp: string;
  message: string;
  targetBusiness: string;
  notes?: string[];
}

export interface Review {
  id: string;
  businessId?: string;
  businessName?: string;
  createdAt?: string;
  author: string;
  rating: number;
  timeAgo: string;
  comment: string;
  verified: boolean;
  reply?: string;
  replyDate?: string;
}

export type TimeRange = '7D' | '30D' | '3M' | '1Y';

export type OwnerMetricDimension = 'Views' | 'Enquiries' | 'Calls' | 'Website Clicks';
