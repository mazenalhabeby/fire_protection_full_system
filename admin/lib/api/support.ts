// Support API Client

import { api } from './client';
import type {
  FAQCategory,
  SupportTicket,
  TicketMessage,
  CreateTicketRequest,
  CreateMessageRequest,
  ContactFormRequest,
  UpdateTicketRequest,
  TicketListResponse,
  ContactListResponse,
  SupportStats,
  TicketStatus,
} from '@/types';

export const supportApi = {
  // ============================================
  // Public Endpoints
  // ============================================

  /**
   * Get all FAQ categories with items
   */
  getFAQ: () => api.get<FAQCategory[]>('/support/faq'),

  /**
   * Track FAQ item view
   */
  trackFAQView: (id: string) => api.patch(`/support/faq/${id}/view`),

  /**
   * Rate FAQ item
   */
  rateFAQItem: (id: string, helpful: boolean) =>
    api.post(`/support/faq/${id}/rate`, { helpful }),

  /**
   * Submit contact form
   */
  submitContactForm: (data: ContactFormRequest) =>
    api.post<{ success: boolean; message: string }>('/support/contact', data),

  // ============================================
  // User Ticket Endpoints
  // ============================================

  /**
   * Get user's tickets
   */
  getMyTickets: (status?: TicketStatus) =>
    api.get<SupportTicket[]>('/support/tickets', status ? { status } : undefined),

  /**
   * Create a new ticket
   */
  createTicket: (data: CreateTicketRequest) =>
    api.post<SupportTicket>('/support/tickets', data),

  /**
   * Get ticket by ID
   */
  getTicket: (id: string) => api.get<SupportTicket>(`/support/tickets/${id}`),

  /**
   * Reply to a ticket
   */
  replyToTicket: (id: string, data: CreateMessageRequest) =>
    api.post<TicketMessage>(`/support/tickets/${id}/reply`, data),

  // ============================================
  // Admin Endpoints
  // ============================================

  admin: {
    /**
     * Get support stats
     */
    getStats: () => api.get<SupportStats>('/admin/support/stats'),

    /**
     * Get all tickets with filters
     */
    getTickets: (params?: {
      status?: TicketStatus;
      priority?: string;
      category?: string;
      assignedTo?: string;
      page?: number;
      limit?: number;
    }) => api.get<TicketListResponse>('/admin/support/tickets', params),

    /**
     * Get ticket by ID (admin view)
     */
    getTicket: (id: string) => api.get<SupportTicket>(`/admin/support/tickets/${id}`),

    /**
     * Update ticket (status, priority, assignment)
     */
    updateTicket: (id: string, data: UpdateTicketRequest) =>
      api.patch<SupportTicket>(`/admin/support/tickets/${id}`, data),

    /**
     * Reply to ticket (admin)
     */
    replyToTicket: (id: string, data: CreateMessageRequest) =>
      api.post<TicketMessage>(`/admin/support/tickets/${id}/reply`, data),

    /**
     * Get contact submissions
     */
    getContactSubmissions: (params?: { page?: number; limit?: number }) =>
      api.get<ContactListResponse>('/admin/support/contacts', params),

    /**
     * Mark contact as read
     */
    markContactAsRead: (id: string) =>
      api.patch(`/admin/support/contacts/${id}/read`),
  },
};
