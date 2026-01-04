"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { WithdrawalForm } from "@/components/wallet-internal/WithdrawalForm";
import { WithdrawalHistory } from "@/components/wallet-internal/WithdrawalHistory";
import { WithdrawalConfirmationModal } from "@/components/wallet-internal/WithdrawalConfirmationModal";
import type { WithdrawalRequest } from "@/types/withdrawals";

export default function WithdrawPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [pendingWithdrawalId, setPendingWithdrawalId] = useState<string | null>(null);

  const handleWithdrawalSuccess = (withdrawalId: string) => {
    setPendingWithdrawalId(withdrawalId);
    setShowForm(false);
  };

  const handleConfirmClick = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal);
  };

  const handleConfirmSuccess = () => {
    setSelectedWithdrawal(null);
    setPendingWithdrawalId(null);
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950" />
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.push('/wallet')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Wallet</span>
        </button>

        {/* Header */}
        <PageHeader
          title="Withdraw HBCT"
          subtitle="Send HBCT tokens to your external wallet"
        />

        <div className="mt-8 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(true)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                showForm
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              New Withdrawal
            </button>
            <button
              onClick={() => setShowForm(false)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                !showForm
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              History
            </button>
          </div>

          {/* Content */}
          {showForm ? (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
              <WithdrawalForm
                onSuccess={handleWithdrawalSuccess}
                onCancel={() => router.push('/wallet')}
              />
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6">
              <WithdrawalHistory
                limit={10}
                showPagination
                onConfirmClick={handleConfirmClick}
              />
            </div>
          )}

          {/* Success Message for Pending Withdrawal */}
          {pendingWithdrawalId && !showForm && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
              <p className="text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                Withdrawal request submitted! Check your email for the confirmation code.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <WithdrawalConfirmationModal
        withdrawal={selectedWithdrawal}
        isOpen={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        onSuccess={handleConfirmSuccess}
      />
    </div>
  );
}
