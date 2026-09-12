"use client";

/* eslint-disable react-hooks/refs -- reads last committed value during render on
   purpose: the ViewTransition prop must be known at commit time, and the ref is
   only written after commit, so interrupted renders can never skew it. */
import { useEffect, useRef, type ReactNode } from "react";
import { ViewTransition } from "react";

/**
 * Cross-dissolves its child (with the vt-dissolve blur) only when `value`
 * actually changes; re-renders with the same value stay completely static.
 */
export function Dissolve({ value, children }: { value: string; children: ReactNode }) {
  const prev = useRef<string | null>(null);
  const changed = prev.current !== null && prev.current !== value;

  useEffect(() => {
    prev.current = value;
  });

  return <ViewTransition update={changed ? "vt-dissolve" : "none"}>{children}</ViewTransition>;
}