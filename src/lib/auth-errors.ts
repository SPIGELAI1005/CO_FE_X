const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Please confirm your email before signing in.",
  user_already_registered: "An account with this email already exists.",
  weak_password: "Password must be at least 6 characters.",
  over_email_send_rate_limit: "Too many emails sent. Wait a few minutes and try again.",
};

export function friendlyAuthError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong";
  const msg = error.message.toLowerCase();
  for (const [key, friendly] of Object.entries(AUTH_ERROR_MESSAGES)) {
    if (msg.includes(key.replace(/_/g, " ")) || msg.includes(key)) return friendly;
  }
  if (msg.includes("invalid login")) return AUTH_ERROR_MESSAGES.invalid_credentials;
  return error.message;
}
