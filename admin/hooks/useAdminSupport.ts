"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi } from "@/lib/api";
import type {
  SupportTicket,
  TicketMessage,
  TicketListResponse,
  ContactListResponse,
  SupportStats,
  TicketStatus,
  UpdateTicketRequest,
  CreateMessageRequest,
} from "@/types";

// ============================================
// QUERY KEY FACTORY
// ============================================

export const supportKeys = {
  all: ["admin", "support"] as const,
  // Stats
  stats: () => [...supportKeys.all, "stats"] as const,
  // Tickets
  tickets: () => [...supportKeys.all, "tickets"] as const,
  ticketList: (params: {
    page: number;
    limit: number;
    status?: TicketStatus;
    priority?: string;
    category?: string;
    assignedTo?: string;
  }) => [...supportKeys.tickets(), "list", params] as const,
  ticketDetail: (id: string) => [...supportKeys.tickets(), "detail", id] as const,
  // Contacts
  contacts: () => [...supportKeys.all, "contacts"] as const,
  contactList: (params: { page: number; limit: number }) =>
    [...supportKeys.contacts(), "list", params] as const,
};

// ============================================
// CACHE INVALIDATION HOOK
// ============================================

export function useInvalidateSupport() {
  const queryClient = useQueryClient();

  return {
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.stats() });
    },
    invalidateTickets: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
    },
    invalidateTicketDetail: (id: string) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.ticketDetail(id) });
    },
    invalidateContacts: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.contacts() });
    },
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.all });
    },
  };
}

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Fetch support stats
 */
export function useSupportStats() {
  return useQuery({
    queryKey: supportKeys.stats(),
    queryFn: (): Promise<SupportStats> => supportApi.admin.getStats(),
    staleTime: 30 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch tickets with pagination and filters
 */
export function useAdminTickets(params: {
  page: number;
  limit: number;
  status?: TicketStatus;
  priority?: string;
  category?: string;
  assignedTo?: string;
}) {
  return useQuery({
    queryKey: supportKeys.ticketList(params),
    queryFn: (): Promise<TicketListResponse> => supportApi.admin.getTickets(params),
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch single ticket with messages
 */
export function useAdminTicket(ticketId: string | null) {
  return useQuery({
    queryKey: supportKeys.ticketDetail(ticketId || ""),
    queryFn: (): Promise<SupportTicket> => supportApi.admin.getTicket(ticketId!),
    enabled: !!ticketId,
    staleTime: 10 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch contact submissions
 */
export function useContactSubmissions(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: supportKeys.contactList(params),
    queryFn: (): Promise<ContactListResponse> => supportApi.admin.getContactSubmissions(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Update ticket (status, priority, category, assignment)
 */
export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: UpdateTicketRequest }) =>
      supportApi.admin.updateTicket(ticketId, data),

    onMutate: async ({ ticketId, data }) => {
      await queryClient.cancelQueries({ queryKey: supportKeys.ticketDetail(ticketId) });

      const previousTicket = queryClient.getQueryData<SupportTicket>(
        supportKeys.ticketDetail(ticketId)
      );

      // Optimistically update the ticket
      if (previousTicket) {
        queryClient.setQueryData<SupportTicket>(
          supportKeys.ticketDetail(ticketId),
          (old) => old ? { ...old, ...data } : old
        );
      }

      return { previousTicket };
    },

    onError: (_err, { ticketId }, context) => {
      if (context?.previousTicket) {
        queryClient.setQueryData(
          supportKeys.ticketDetail(ticketId),
          context.previousTicket
        );
      }
    },

    onSettled: (_data, _err, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.ticketDetail(ticketId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: supportKeys.stats() });
    },
  });
}

/**
 * Reply to ticket (admin)
 */
export function useAdminReplyToTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: CreateMessageRequest }) =>
      supportApi.admin.replyToTicket(ticketId, data),

    onMutate: async ({ ticketId, data }) => {
      await queryClient.cancelQueries({ queryKey: supportKeys.ticketDetail(ticketId) });

      const previousTicket = queryClient.getQueryData<SupportTicket>(
        supportKeys.ticketDetail(ticketId)
      );

      // Optimistically add the message
      if (previousTicket) {
        const optimisticMessage: TicketMessage = {
          id: `temp-${Date.now()}`,
          senderType: "ADMIN",
          content: data.content,
          isInternal: data.isInternal || false,
          createdAt: new Date().toISOString(),
        };

        queryClient.setQueryData<SupportTicket>(
          supportKeys.ticketDetail(ticketId),
          (old) =>
            old
              ? {
                  ...old,
                  messages: [...(old.messages || []), optimisticMessage],
                  status: old.status === "OPEN" ? "IN_PROGRESS" : old.status,
                }
              : old
        );
      }

      return { previousTicket };
    },

    onError: (_err, { ticketId }, context) => {
      if (context?.previousTicket) {
        queryClient.setQueryData(
          supportKeys.ticketDetail(ticketId),
          context.previousTicket
        );
      }
    },

    onSettled: (_data, _err, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: supportKeys.ticketDetail(ticketId) });
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: supportKeys.stats() });
    },
  });
}

/**
 * Mark contact as read
 */
export function useMarkContactAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) => supportApi.admin.markContactAsRead(contactId),

    onMutate: async (contactId) => {
      await queryClient.cancelQueries({ queryKey: supportKeys.contacts() });

      const queries = queryClient.getQueriesData<ContactListResponse>({
        queryKey: supportKeys.contacts(),
      });

      // Optimistically mark as read
      queries.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData<ContactListResponse>(key, {
            ...data,
            submissions: data.submissions.map((s) =>
              s.id === contactId ? { ...s, isRead: true } : s
            ),
          });
        }
      });

      return { queries };
    },

    onError: (_err, _contactId, context) => {
      // Restore previous data
      context?.queries.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.contacts() });
      queryClient.invalidateQueries({ queryKey: supportKeys.stats() });
    },
  });
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk update tickets
 */
export function useBulkUpdateTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketIds,
      data,
    }: {
      ticketIds: string[];
      data: UpdateTicketRequest;
    }) => {
      const results = await Promise.all(
        ticketIds.map((id) => supportApi.admin.updateTicket(id, data))
      );
      return results;
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: supportKeys.tickets() });
      queryClient.invalidateQueries({ queryKey: supportKeys.stats() });
    },
  });
}
