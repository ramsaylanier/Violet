import { ExternalLink as ExternalLinkIcon, LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
  platform?: string;
}

export function ExternalLink({
  href,
  children,
  icon: Icon = ExternalLinkIcon,
  className = ""
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-sm text-primary hover:underline ${className}`}
    >
      {children}
      <Icon className="w-3 h-3" />
    </a>
  );
}
