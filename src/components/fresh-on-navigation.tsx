"use client";

import { Fragment } from "react";
import { useRouter } from "next/navigation";

/**
 * With cacheComponents on, Next keeps recently visited pages alive (React <Activity>),
 * so a form would reopen with whatever was last typed into it. Wrapping a form in this
 * remounts it on every fresh visit (link click, router.push) and still restores the
 * draft on browser back/forward.
 */
export function FreshOnNavigation({ children }: { children: React.ReactNode }) {
  const { bfcacheId } = useRouter();
  return <Fragment key={bfcacheId}>{children}</Fragment>;
}
