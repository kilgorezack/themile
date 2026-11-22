"use client";

import { useInView } from "./hooks";

export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article";
  id?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <Tag
      id={id}
      ref={ref}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
