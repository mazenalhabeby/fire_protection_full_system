"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { useRequireAdmin } from "@/hooks/useAuth";
import { adminApi } from "@/lib/api/admin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Users, DollarSign, Coins, Lock, ShoppingBag, Award, ChevronRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AdminSkeleton } from "@/components/skeletons/page-skeletons";
import { usePageLoading } from "@/hooks/useMinimumLoading";
import { PageHeader } from "@/components/ui/page-header";
import type { DashboardStats } from "@/types/api";

export default function AdminDashboardPage() {
  const t = useTranslations("common");
  const locale = useLocale();
  const { isLoading: authLoading, isAdmin } = useRequireAdmin(`/${locale}/dashboard`);

  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Minimum loading duration for premium feel
  const { isLoading: isMinLoading, stopLoading } = usePageLoading();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await adminApi.getDashboard();
        setDashboard(data);
      } catch (err) {
        console.error("Failed to fetch admin dashboard:", err);
      } finally {
        setIsDataLoading(false);
        stopLoading();
      }
    };

    if (!authLoading && isAdmin) {
      fetchData();
    }
  }, [authLoading, isAdmin, stopLoading]);

  const showSkeleton = authLoading || !isAdmin || isDataLoading || isMinLoading;

  if (showSkeleton) {
    return (
      <div className="flex-1 bg-background py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          <AdminSkeleton />
        </div>
      </div>
    );
  }

  const quickLinks = [
    {
      href: `/${locale}/admin/users`,
      icon: Users,
      title: "User Management",
      description: "View and manage users",
    },
    {
      href: `/${locale}/admin/deposits`,
      icon: ArrowDownLeft,
      title: "Deposits",
      description: "Monitor on-chain deposits",
    },
    {
      href: `/${locale}/admin/withdrawals`,
      icon: ArrowUpRight,
      title: "Withdrawals",
      description: "Process withdrawal requests",
    },
    {
      href: `/${locale}/admin/products`,
      icon: ShoppingBag,
      title: "Products",
      description: "Manage marketplace products",
    },
    {
      href: `/${locale}/admin/pools`,
      icon: Award,
      title: "Reward Pools",
      description: "View pool allocations",
    },
  ];

  return (
    <div className="flex-1 bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <PageHeader title="Admin Dashboard" subtitle="System overview and management" />

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Total Users"
            value={dashboard?.totalUsers || 0}
            icon={<Users className="h-5 w-5" />}
          />
          <StatCard
            label="Total Sales (USD)"
            value={`$${dashboard?.totalSalesUsd || "0"}`}
            icon={<DollarSign className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            label="Tokens Sold"
            value={dashboard?.totalTokensSold || "0"}
            icon={<Coins className="h-5 w-5" />}
          />
          <StatCard
            label="Tokens Locked"
            value={dashboard?.totalLockedTokens || "0"}
            icon={<Lock className="h-5 w-5" />}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rewards Distributed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {dashboard?.totalRewardsDistributed || "0"} HBCT
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {dashboard?.pendingOrders || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Links */}
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-primary/10 text-primary mb-3">
                  <link.icon className="h-5 w-5" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-foreground font-semibold mb-1">{link.title}</p>
              <p className="text-sm text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
