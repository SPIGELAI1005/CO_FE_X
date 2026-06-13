import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthLocaleBridge } from "@/components/auth/AuthLocaleBridge";

const searchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Sign in · CO:FE(X)" },
      { name: "description", content: "Sign in to CO:FE(X) and start earning free coffees." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { next } = Route.useSearch();
  return (
    <>
      <AuthLocaleBridge />
      <AuthForm next={next} />
    </>
  );
}
