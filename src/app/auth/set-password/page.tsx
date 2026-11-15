import { AuthCard } from "@/components/auth-card";
import { SetPasswordForm } from "./set-password-form";

export default function SetPasswordPage() {
  return (
    <AuthCard title="Set your password" description="Choose a password for your staff account.">
      <SetPasswordForm />
    </AuthCard>
  );
}
