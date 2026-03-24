"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function AppLogo({ size = 24 }: { size?: number }) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

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
