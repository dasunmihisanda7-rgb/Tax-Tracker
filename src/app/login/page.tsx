import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Staff accounts are created by invitation. Ask an administrator if you need access."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
