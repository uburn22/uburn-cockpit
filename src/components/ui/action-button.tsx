"use client";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  label: string;
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
  onClick?: () => void;
}

export function ActionButton({
  label,
  icon: Icon,
  variant = "outline",
  size = "sm",
  onClick,
}: ActionButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      toast.success(label, { description: "Action enregistrée" });
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handleClick} className="gap-1.5 text-xs">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}
