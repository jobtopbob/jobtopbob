"use client";

import { Users } from "lucide-react";

export default function ContactsPage() {
  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col gap-6 p-7 pt-7 overflow-y-auto">
        <div>
          <h1
            className="text-4xl font-bold text-text-primary tracking-tight"
            style={{ letterSpacing: -1 }}
          >
            Contacts
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Track your professional network and manage relationships.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">
            Coming soon
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            A networking CRM to track recruiters, hiring managers, and referrals
            across all your applications.
          </p>
        </div>
      </div>
    </div>
  );
}
