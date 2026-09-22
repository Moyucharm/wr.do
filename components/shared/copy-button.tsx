"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Icons } from "./icons";

interface CopyButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function CopyButton({
  value,
  className,
  children,
  onClick,
  ...props
}: CopyButtonProps) {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  }, [hasCopied]);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    navigator.clipboard.writeText(value);
    setHasCopied(true);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className={cn(
        "z-10 p-1.5 text-foreground hover:border hover:text-foreground dark:text-foreground",
        children ? "h-[30px] w-auto gap-1" : "size-[30px]",
        className,
      )}
      onClick={handleClick}
      {...props}
    >
      <span className="sr-only">Copy</span>
      {children}
      {hasCopied ? (
        <Icons.check className="size-4" />
      ) : (
        <Icons.copy className="size-4" />
      )}
    </Button>
  );
}
