import { createFileRoute } from '@tanstack/react-router';

import { AuditLogsPage } from '@/features/audit-logs/pages/audit-logs-page';

export const Route = createFileRoute('/_authenticated/audit-logs')({
  component: AuditLogsPage
});
