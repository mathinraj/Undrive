import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <Image
      src="/logo.svg"
      alt="Undrive"
      width={size}
      height={size}
      className={cn("rounded-md", className)}
    />
  );
}
