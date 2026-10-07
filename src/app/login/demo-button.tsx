"use client";

import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { startDemo } from "@/actions/demo";
import { Button } from "@/components/ui/button";

export function DemoButton() {
  return (
    <form action={startDemo} className="mt-4">
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="dark" className="w-full justify-center" disabled={pending}>
      <Sparkles className="size-4" />
      {pending ? "Preparing your demo…" : "Try the demo"}
    </Button>
  );
}
