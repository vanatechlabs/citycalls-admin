import React from "react";
import { Badge } from "@/components/ui/badge";

export type StatusCategory = "default" | "success" | "warning" | "error" | "info";

export interface StatusBadgeProps {
  label: string;
  category?: StatusCategory;
  className?: string;
}

export function StatusBadge({ label, category = "default", className }: StatusBadgeProps) {
  let colorClasses = "bg-secondary text-secondary-foreground hover:bg-secondary/80";

  switch (category) {
    case "success":
      colorClasses = "bg-success text-success-foreground hover:bg-success/80";
      break;
    case "warning":
      colorClasses = "bg-warning text-warning-foreground hover:bg-warning/80";
      break;
    case "error":
      colorClasses = "bg-error text-error-foreground hover:bg-error/80";
      break;
    case "info":
      colorClasses = "bg-info text-info-foreground hover:bg-info/80";
      break;
  }

  return (
    <Badge className={`${colorClasses} border-transparent font-medium ${className || ""}`}>
      {label}
    </Badge>
  );
}
