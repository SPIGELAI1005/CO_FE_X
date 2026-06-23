import type { AppRole } from "@/lib/domain/campaign-reward-model";

export function hasAppRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

export function canAccessAdminRoute(roles: AppRole[]): boolean {
  return hasAppRole(roles, "admin");
}

/** Partner routes require partner role or an owned shop; admins may access all areas. */
export function canAccessPartnerRoute(roles: AppRole[], ownsShop: boolean): boolean {
  return ownsShop || hasAppRole(roles, "partner") || hasAppRole(roles, "admin");
}

export function defaultExplorerRoles(): AppRole[] {
  return ["explorer"];
}
