import React from "react";
import { clsx } from "clsx";

function Badge({ className, variant = "default", ...props }) {
  const variants = {
    default: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    secondary: "bg-gray-800 text-gray-100 border-gray-700",
    destructive: "bg-red-600/20 text-red-400 border-red-500/30",
    outline: "text-white border-gray-600",
  };

  return (
    <div
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
