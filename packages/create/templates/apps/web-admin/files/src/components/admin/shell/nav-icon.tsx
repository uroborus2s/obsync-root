import type { LucideProps } from 'lucide-react';
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  FileClock,
  Gauge,
  KeyRound,
  Layers3,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon
} from 'lucide-react';

import type { NavigationIcon } from '@/app/config/navigation';

const iconMap: Record<NavigationIcon, LucideIcon> = {
  dashboard: Gauge,
  users: Users,
  roles: KeyRound,
  reports: BarChart3,
  logs: FileClock,
  settings: Settings2,
  shield: ShieldCheck,
  sparkles: Sparkles,
  workspace: Layers3,
  operations: BriefcaseBusiness,
  bot: Bot
};

export function NavIcon({
  icon,
  ...props
}: { icon: NavigationIcon } & LucideProps) {
  const Icon = iconMap[icon];
  return <Icon {...props} />;
}
