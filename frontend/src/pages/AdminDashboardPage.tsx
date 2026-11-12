/*
  The admin area — owner of the installation only.

  A placeholder for now: the route, the guard and the sidebar entry are real,
  the contents are not. Shipping the shell first means the permission boundary
  is in place and tested before anything sensitive sits behind it, rather than
  being added around a page that already exists.
*/

import { Wrench } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AdminDashboardPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Admin"
        subtitle="Installation-wide settings and diagnostics"
      />

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Wrench size={22} className="text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold">Nothing here yet</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This is where the admin tools will live. The page is reachable only
            by an admin — everyone else is redirected away.
          </p>
        </div>
      </div>
    </div>
  );
}
