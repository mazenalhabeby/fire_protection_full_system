// Support System Types

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_REPLY' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory =
  | 'GENERAL'
  | 'TECHNICAL'
  | 'BILLING'
  | 'ACCOUNT'
  | 'TOKEN_PURCHASE'
  | 'LOCKING'
  | 'MARKETPLACE'
  | 'AFFILIATE'
  | 'OTHER';
export type SenderType = 'USER' | 'ADMIN' | 'SYSTEM';

// FAQ Types
export interface FAQCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  items: FAQItem[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  viewCount?: number;
  helpful?: number;
  notHelpful?: number;
}

// Ticket Types
export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  assignee?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
  messages?: TicketMessage[];
  _count?: {
    messages: number;
  };
}

export interface TicketMessage {
  id: string;
  senderType: SenderType;
  content: string;
  isInternal: boolean;
  createdAt: string;
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
  };
}

// Contact Submission
export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  isReplied: boolean;
  createdAt: string;
}

// Request DTOs
export interface CreateTicketRequest {
  subject: string;
  message: string;
  category?: TicketCategory;
  priority?: TicketPriority;
}

export interface CreateMessageRequest {
  content: string;
  isInternal?: boolean;
}

export interface ContactFormRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
}

// Response Types
export interface TicketListResponse {
  tickets: SupportTicket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContactListResponse {
  submissions: ContactSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SupportStats {
  tickets: {
    open: number;
    inProgress: number;
    awaitingReply: number;
    resolved: number;
    total: number;
  };
  unreadContacts: number;
}

// UI Helper Types
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  AWAITING_REPLY: 'Awaiting Reply',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL: 'General Inquiry',
  TECHNICAL: 'Technical Support',
  BILLING: 'Billing',
  ACCOUNT: 'Account',
  TOKEN_PURCHASE: 'Token Purchase',
  LOCKING: 'Token Locking',
  MARKETPLACE: 'Marketplace',
  AFFILIATE: 'Affiliate Program',
  OTHER: 'Other',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  OPEN: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  IN_PROGRESS: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  AWAITING_REPLY: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  URGENT: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};
