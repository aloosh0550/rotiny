import {
  BookOpen,
  Dumbbell,
  Repeat,
  GraduationCap,
  Briefcase,
  HeartPulse,
  Wallet,
  Users,
  Sparkles,
  Circle,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  dumbbell: Dumbbell,
  repeat: Repeat,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  "heart-pulse": HeartPulse,
  wallet: Wallet,
  users: Users,
  sparkles: Sparkles,
  circle: Circle,
};

export const AREA_ICONS = Object.keys(MAP);

export function AreaIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Circle;
  return <Icon className={className} />;
}
