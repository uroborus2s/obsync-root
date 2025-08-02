import { createFileRoute } from '@tanstack/react-router';
import TaskSettingsPage from '@/features/tasks/pages/task-settings-page';
export const Route = createFileRoute('/_authenticated/tasks/settings')({
    component: TaskSettingsPage,
});
//# sourceMappingURL=settings.js.map