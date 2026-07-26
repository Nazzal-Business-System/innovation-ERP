import type { Organization, Role, User } from "@prisma/client";

export function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
  };
}

export function serializeOrganization(org: Organization) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
  };
}

export function serializeRole(role: Role) {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
  };
}
