"use client";
import { cn } from "../app/utils";

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={cn(
        "rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={cn(
        "rounded-xl border border-zinc-700 bg-zinc-900/40 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}
