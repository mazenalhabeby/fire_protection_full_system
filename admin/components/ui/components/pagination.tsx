"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PaginationProps {
  pagination: PaginationInfo;
  page: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  className?: string;
}

export function Pagination({
  pagination,
  page,
  onPageChange,
  showInfo = true,
  className = "",
}: PaginationProps) {
  const { limit, total, totalPages } = pagination;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div
      className={`flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-gray-800 ${className}`}
    >
      {showInfo && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {startItem} to {endItem} of {total}
        </p>
      )}
      {!showInfo && <div />}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || totalPages === 0}
          className="h-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
