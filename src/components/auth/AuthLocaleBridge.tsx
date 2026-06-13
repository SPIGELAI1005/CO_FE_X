import { useEffect } from "react";
import { useTranslation } from "react-i18next";

type AuthMode = "signin" | "signup";

declare global {
  interface Window {
    cofexAuthStrings?: (mode: AuthMode) => {
      title: string;
      subtitle: string;
      submit: string;
      toggle: string;
      continueGoogle: string;
      continueApple: string;
      orEmail: string;
      forgotPassword: string;
      email: string;
      password: string;
      name: string;
    };
    cofexRefreshAuthCopy?: () => void;
  }
}

function applyAuthDom(mode: AuthMode, copy: ReturnType<NonNullable<typeof window.cofexAuthStrings>>) {
  const title = document.querySelector("[data-cofex-auth-title]");
  const subtitle = document.querySelector("[data-cofex-auth-subtitle]");
  const submit = document.querySelector("[data-cofex-auth-submit]");
  const toggle = document.querySelector("[data-cofex-auth-toggle]");
  const google = document.querySelector("[data-cofex-oauth='google']");
  const apple = document.querySelector("[data-cofex-oauth='apple']");
  const orEmail = document.querySelector("[data-cofex-auth-or-email]");
  const forgot = document.querySelector("[data-cofex-auth-forgot] a");

  if (title) title.textContent = copy.title;
  if (subtitle) subtitle.textContent = copy.subtitle;
  if (submit) submit.textContent = copy.submit;
  if (toggle) toggle.textContent = copy.toggle;
  if (google) google.lastChild && (google.lastChild.textContent = ` ${copy.continueGoogle}`);
  if (apple) apple.lastChild && (apple.lastChild.textContent = ` ${copy.continueApple}`);
  if (orEmail) orEmail.textContent = copy.orEmail;
  if (forgot) forgot.textContent = copy.forgotPassword;

  const emailInput = document.querySelector("[data-cofex-auth-form] input[name='email']") as HTMLInputElement | null;
  const passwordInput = document.querySelector("[data-cofex-auth-form] input[name='password']") as HTMLInputElement | null;
  const nameInput = document.querySelector("[data-cofex-auth-name-field] input[name='name']") as HTMLInputElement | null;
  if (emailInput) emailInput.placeholder = copy.email;
  if (passwordInput) passwordInput.placeholder = copy.password;
  if (nameInput) nameInput.placeholder = copy.name;
}

/** Keeps vanilla auth DOM in sync with i18n (cofex-auth.js toggles mode). */
export function AuthLocaleBridge() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    function strings(mode: AuthMode) {
      const signIn = mode === "signin";
      return {
        title: signIn ? t("auth.welcomeBack") : t("auth.joinNetwork"),
        subtitle: signIn ? t("auth.signInSubtitle") : t("auth.signUpSubtitle"),
        submit: signIn ? t("auth.signIn") : t("auth.createAccount"),
        toggle: signIn ? t("auth.toggleSignUp") : t("auth.toggleSignIn"),
        continueGoogle: t("auth.continueGoogle"),
        continueApple: t("auth.continueApple"),
        orEmail: t("auth.orEmail"),
        forgotPassword: t("auth.forgotPassword"),
        email: t("auth.email"),
        password: t("auth.password"),
        name: t("auth.name"),
      };
    }

    window.cofexAuthStrings = strings;

    window.cofexRefreshAuthCopy = () => {
      const form = document.querySelector("[data-cofex-auth-form]");
      const mode = (form?.getAttribute("data-cofex-auth-mode") as AuthMode) || "signin";
      applyAuthDom(mode, strings(mode));
    };

    window.cofexRefreshAuthCopy();

    const onChange = () => window.cofexRefreshAuthCopy?.();
    i18n.on("languageChanged", onChange);
    return () => {
      i18n.off("languageChanged", onChange);
      delete window.cofexAuthStrings;
      delete window.cofexRefreshAuthCopy;
    };
  }, [i18n, t]);

  return null;
}
