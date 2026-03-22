"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function AppLogo({ size = 24 }: { size?: number }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div style={{ width: size, height: size }} className="shrink-0 rounded-lg" />;
  }

  return (
    <Image
      src={resolvedTheme === "dark" ? "/dark.png" : "/light.png"}
      alt="JobTopBob"
      width={size}
      height={size}
      className="shrink-0 rounded-lg"
    />
  );
}
