"use client";

import { Link } from "@/i18n/navigation";
import {
  Mail,
  MessageSquare,
  MapPin,
  Phone,
  Clock,
  Globe,
} from "lucide-react";
import { useParams } from "next/navigation";
import { QuickContactForm, HelpNav } from "@/components/help";

export default function ContactPage() {
  const params = useParams();
  const locale = params.locale as string;

  const contactInfo = [
    {
      icon: Mail,
      title: "Email",
      value: "support@hbctoken.com",
      description: "For general inquiries",
    },
    {
      icon: Phone,
      title: "Phone",
      value: "+1 (555) 123-4567",
      description: "Mon-Fri, 9am-6pm EST",
    },
    {
      icon: MapPin,
      title: "Office",
      value: "123 Fire Safety Blvd",
      description: "New York, NY 10001",
    },
    {
      icon: Clock,
      title: "Response Time",
      value: "Within 24 hours",
      description: "Usually faster",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-4 sm:py-6 lg:py-8">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8">
        {/* Help Navigation */}
        <div className="mb-4 sm:mb-6 lg:mb-8 animate-in fade-in slide-in-from-left-4 duration-300">
          <HelpNav />
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Left Column - Form */}
            <div className="order-2 lg:order-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 lg:p-8 shadow-lg">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                      Create Support Ticket
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      No account required - track via email
                    </p>
                  </div>
                </div>

                <QuickContactForm />
              </div>
            </div>

            {/* Right Column - Info */}
            <div className="order-1 lg:order-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-3 lg:mb-4">
                  Get in Touch
                </h1>
                <p className="text-base lg:text-lg text-gray-600 dark:text-gray-400">
                  Have a question or need assistance? Our team is here to help.
                  Reach out through any of the channels below.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 lg:mb-8">
                {contactInfo.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 sm:p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-300"
                    style={{ animationDelay: `${100 + index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 truncate">
                          {item.value}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="p-4 sm:p-6 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800/50">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    Follow Us
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {["Twitter", "Discord", "Telegram", "LinkedIn"].map(
                    (social) => (
                      <a
                        key={social}
                        href="#"
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {social}
                      </a>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
