import React from "react";

interface GlassContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  key?: React.Key;
}

export function GlassContainer({ children, className = "", id }: GlassContainerProps) {
  return (
    <div
      id={id}
      className={`bg-glass rounded-none border border-[#2a2a2a] p-6 md:p-8 transition-all duration-300 ${className}`}
    >
      {children}
    </div>
  );
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
  key?: React.Key;
}

export function GlassCard({ children, className = "", onClick, id }: GlassCardProps) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={`bg-glass-card rounded-none border border-[#333333] p-5 md:p-6 transition-all duration-200 ${
        onClick ? "cursor-pointer hover:border-[#444444] hover:scale-[1.01] active:scale-[0.99]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function GlassBadge({
  children,
  variant = "grey",
  className = ""
}: {
  children: React.ReactNode;
  variant?: "grey" | "silver" | "dark" | "red";
  className?: string;
}) {
  const styles = {
    grey: "bg-[#222222] text-gray-300 border-[#333333]",
    silver: "bg-[#3a3a3a] text-white border-[#444444]",
    dark: "bg-[#0d0d0d] text-gray-500 border-[#2a2a2a]",
    red: "bg-red-900/30 text-red-400 border-red-800"
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-none text-xs font-mono font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
