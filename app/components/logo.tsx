import { Link } from "@remix-run/react";
import { PresentationIcon } from "lucide-react";

interface LogoProps {
  to?: string;
  className?: string;
}

export function Logo({ to = "/", className = "" }: LogoProps) {
  return (
    <Link to={to} className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <PresentationIcon className="h-10 w-10 text-primary" />
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/20 animate-pulse"></div>
      </div>
      <span className="text-2xl font-bold tracking-tight">Slide Sage</span>
    </Link>
  );
}
