"use client";

import Link from "next/link";
import {
  Mail,
  MessageSquare,
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  Globe,
} from "lucide-react";
import { useParams } from "next/navigation";
import { QuickContactForm } from "@/components/help";

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-8 animate-in fade-in slide-in-from-left-4 duration-300">
          <Link
            href={`/${locale}/help`}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Help Center
          </Link>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column - Form */}
            <div className="order-2 lg:order-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Send a Message
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      We&apos;ll get back to you soon
                    </p>
                  </div>
                </div>

                <QuickContactForm />
              </div>
            </div>

            {/* Right Column - Info */}
            <div className="order-1 lg:order-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                  Get in Touch
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Have a question or need assistance? Our team is here to help.
                  Reach out through any of the channels below.
                </p>
              </div>

              {/* Contact Cards */}
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                {contactInfo.map((item, index) => (
                  <div
                    key={index}
                    className="p-5 rounded-xl bg-white dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4 duration-300"
                    style={{ animationDelay: `${100 + index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300">
                          {item.value}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="p-6 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800/50">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Follow Us
                  </h3>
                </div>
                <div className="flex gap-3">
                  {["Twitter", "Discord", "Telegram", "LinkedIn"].map(
                    (social) => (
                      <a
                        key={social}
                        href="#"
                        className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
