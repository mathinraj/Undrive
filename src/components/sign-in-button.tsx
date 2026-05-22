"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogIn, ArrowRight } from "lucide-react";

export function SignInButton() {
  return (
    <Button
      onClick={() => signIn("google", { callbackUrl: "/vault" })}
      variant="outline"
      className="gap-2"
    >
      <LogIn className="h-4 w-4" />
      Sign in
    </Button>
  );
}

export function GetStartedButton() {
  return (
    <Button
      size="lg"
      onClick={() => signIn("google", { callbackUrl: "/vault" })}
      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8"
    >
      Get Started
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
