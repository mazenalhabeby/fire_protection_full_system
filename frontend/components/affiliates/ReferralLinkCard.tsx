"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Copy,
  CheckCircle,
  Link2,
  Share2,
  QrCode,
  Twitter,
  Facebook,
  MessageCircle,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

interface ReferralLinkCardProps {
  referralCode: string;
  baseUrl: string;
  className?: string;
}

export function ReferralLinkCard({
  referralCode,
  baseUrl,
  className,
}: ReferralLinkCardProps) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [customCampaign, setCustomCampaign] = useState("");

  const referralLink = `${baseUrl}/register?ref=${referralCode}${
    customCampaign ? `&utm_campaign=${customCampaign}` : ""
  }`;

  const handleCopy = async (type: "code" | "link") => {
    const textToCopy = type === "code" ? referralCode : referralLink;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(type);
    toast.success(type === "code" ? "Code copied!" : "Link copied!");
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=Join%20HBCT%20and%20get%20exclusive%20benefits!&url=${encodeURIComponent(
      referralLink
    )}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      referralLink
    )}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(
      referralLink
    )}&text=Join%20HBCT%20and%20get%20exclusive%20benefits!`,
    email: `mailto:?subject=Join%20HBCT&body=Check%20out%20HBCT:%20${encodeURIComponent(
      referralLink
    )}`,
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQR(!showQR)}
            className="text-muted-foreground"
          >
            <QrCode className="h-4 w-4 mr-1" />
            QR
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Referral Code */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Referral Code
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <div className="p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
                <p className="text-2xl font-mono font-bold text-primary text-center tracking-wider">
                  {referralCode}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-auto aspect-square"
              onClick={() => handleCopy("code")}
            >
              {copied === "code" ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Referral Link */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Referral Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-lg bg-secondary/50 border border-border overflow-hidden">
              <p className="text-sm text-foreground truncate font-mono">
                {referralLink}
              </p>
            </div>
            <Button
              variant="primary"
              size="icon"
              className="h-auto aspect-square shrink-0"
              onClick={() => handleCopy("link")}
            >
              {copied === "link" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Custom Campaign (Optional) */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Campaign Name (Optional)
          </label>
          <Input
            placeholder="e.g., twitter-promo"
            value={customCampaign}
            onChange={(e) =>
              setCustomCampaign(e.target.value.replace(/\s+/g, "-").toLowerCase())
            }
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Track different marketing campaigns
          </p>
        </div>

        {/* QR Code Section */}
        {showQR && (
          <div className="p-4 rounded-xl bg-white dark:bg-gray-800 border border-border flex flex-col items-center gap-3">
            <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <QrCode className="h-16 w-16 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Scan to open referral link
            </p>
          </div>
        )}

        {/* Social Share Buttons */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">
            Share on Social
          </label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-[#1DA1F2]/10 border-[#1DA1F2]/30 text-[#1DA1F2] hover:bg-[#1DA1F2]/20"
              onClick={() => window.open(shareLinks.twitter, "_blank")}
            >
              <Twitter className="h-4 w-4 mr-1" />
              Twitter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-[#1877F2]/10 border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2]/20"
              onClick={() => window.open(shareLinks.facebook, "_blank")}
            >
              <Facebook className="h-4 w-4 mr-1" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-[#0088cc]/10 border-[#0088cc]/30 text-[#0088cc] hover:bg-[#0088cc]/20"
              onClick={() => window.open(shareLinks.telegram, "_blank")}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              Telegram
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(shareLinks.email, "_blank")}
            >
              <Mail className="h-4 w-4 mr-1" />
              Email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
