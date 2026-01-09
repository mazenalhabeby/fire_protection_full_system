"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  useContactSubmissions,
  useMarkContactAsRead,
} from "@/hooks/useAdminSupport";
import { AdminSkeleton } from "@/components/skeletons";
import { cn } from "@/components/ui";
import {
  ArrowLeft,
  Mail,
  MailOpen,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Eye,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ContactSubmission } from "@/types";

export default function ContactSubmissionsPage() {
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(
    null
  );

  // Queries
  const {
    data: contactsData,
    isLoading,
    refetch,
  } = useContactSubmissions({ page, limit: 20 });

  // Mutations
  const markAsRead = useMarkContactAsRead();

  const handleRefresh = () => {
    refetch();
  };

  const handleViewContact = async (contact: ContactSubmission) => {
    setSelectedContact(contact);
    if (!contact.isRead) {
      await markAsRead.mutateAsync(contact.id);
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <AdminSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/support"
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Contact Submissions
            </h1>
            <p className="text-sm text-gray-500">
              Messages from the contact form
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Submissions Table */}
      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
        {!contactsData?.submissions?.length ? (
          <div className="p-8 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No contact submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {contactsData.submissions.map((contact) => (
                  <tr
                    key={contact.id}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer",
                      !contact.isRead && "bg-blue-50/50 dark:bg-blue-500/5"
                    )}
                    onClick={() => handleViewContact(contact)}
                  >
                    <td className="px-4 py-3">
                      {contact.isRead ? (
                        <MailOpen className="h-5 w-5 text-gray-400" />
                      ) : (
                        <div className="relative">
                          <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          !contact.isRead
                            ? "font-semibold text-gray-900 dark:text-white"
                            : "text-gray-700 dark:text-gray-300"
                        )}
                      >
                        {contact.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {contact.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm truncate max-w-[200px] block",
                          !contact.isRead
                            ? "font-medium text-gray-900 dark:text-white"
                            : "text-gray-600 dark:text-gray-400"
                        )}
                      >
                        {contact.subject}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">
                        {formatDate(contact.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewContact(contact);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Eye className="h-4 w-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {contactsData?.pagination && contactsData.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {contactsData.pagination.totalPages} (
            {contactsData.pagination.total} total)
          </span>
          <button
            onClick={() =>
              setPage((p) =>
                Math.min(contactsData.pagination.totalPages, p + 1)
              )
            }
            disabled={page === contactsData.pagination.totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
        <ContactDetailModal
          contact={selectedContact}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  );
}

// ============================================
// CONTACT DETAIL MODAL
// ============================================

function ContactDetailModal({
  contact,
  onClose,
}: {
  contact: ContactSubmission;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Contact Message
            </h2>
            <p className="text-sm text-gray-500">
              Received {formatDate(contact.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Sender Info */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 uppercase mb-1">Name</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {contact.name}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 uppercase mb-1">Email</p>
              <a
                href={`mailto:${contact.email}`}
                className="font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                {contact.email}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Subject */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-2">Subject</p>
            <p className="font-medium text-gray-900 dark:text-white text-lg">
              {contact.subject}
            </p>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs text-gray-500 uppercase mb-2">Message</p>
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {contact.message}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
                contact.isRead
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
              )}
            >
              {contact.isRead ? (
                <>
                  <MailOpen className="h-4 w-4" />
                  Read
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Unread
                </>
              )}
            </div>
            {contact.isReplied && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400">
                Replied
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
          <a
            href={`mailto:${contact.email}?subject=Re: ${encodeURIComponent(contact.subject)}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Reply via Email
          </a>
        </div>
      </div>
    </div>
  );
}
