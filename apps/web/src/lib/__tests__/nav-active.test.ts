import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectNavLeafHrefs,
  isNavItemActive,
  pathMatchesNavHref,
  resolveActiveNavHref,
} from "../nav-active.ts";

describe("pathMatchesNavHref", () => {
  it("treats /dashboard as exact-only", () => {
    assert.equal(pathMatchesNavHref("/dashboard", "/dashboard"), true);
    assert.equal(pathMatchesNavHref("/dashboard/knowledge", "/dashboard"), false);
  });

  it("matches exact and nested child paths", () => {
    assert.equal(pathMatchesNavHref("/dashboard/knowledge/articles", "/dashboard/knowledge/articles"), true);
    assert.equal(
      pathMatchesNavHref("/dashboard/knowledge/articles/abc", "/dashboard/knowledge/articles"),
      true
    );
    assert.equal(pathMatchesNavHref("/dashboard/knowledge", "/dashboard/knowledge/articles"), false);
  });
});

describe("resolveActiveNavHref / isNavItemActive", () => {
  const hrefs = collectNavLeafHrefs();

  it("activates Knowledge Overview only on module root", () => {
    assert.equal(resolveActiveNavHref("/dashboard/knowledge", hrefs), "/dashboard/knowledge");
    assert.equal(isNavItemActive("/dashboard/knowledge", "/dashboard/knowledge", hrefs), true);
    assert.equal(isNavItemActive("/dashboard/knowledge/articles", "/dashboard/knowledge", hrefs), false);
  });

  it("activates Articles for list, new, and detail routes — not Overview", () => {
    for (const path of [
      "/dashboard/knowledge/articles",
      "/dashboard/knowledge/articles/new",
      "/dashboard/knowledge/articles/art_123",
    ]) {
      assert.equal(resolveActiveNavHref(path, hrefs), "/dashboard/knowledge/articles");
      assert.equal(isNavItemActive("/dashboard/knowledge", path, hrefs), false);
      assert.equal(isNavItemActive("/dashboard/knowledge/articles", path, hrefs), true);
    }
  });

  it("activates Categories for category detail", () => {
    assert.equal(
      resolveActiveNavHref("/dashboard/knowledge/categories/cat_1", hrefs),
      "/dashboard/knowledge/categories"
    );
  });

  it("activates Tags only under tags", () => {
    assert.equal(resolveActiveNavHref("/dashboard/knowledge/tags", hrefs), "/dashboard/knowledge/tags");
  });

  it("keeps Projects Overview for project detail ids without activating Tasks", () => {
    const path = "/dashboard/projects/proj_abc";
    assert.equal(resolveActiveNavHref(path, hrefs), "/dashboard/projects");
    assert.equal(isNavItemActive("/dashboard/projects/tasks", path, hrefs), false);
  });

  it("activates Tasks for task list and nested routes", () => {
    assert.equal(resolveActiveNavHref("/dashboard/projects/tasks", hrefs), "/dashboard/projects/tasks");
    assert.equal(
      resolveActiveNavHref("/dashboard/projects/tasks/task_1", hrefs),
      "/dashboard/projects/tasks"
    );
  });

  it("activates Support Tickets for ticket detail", () => {
    assert.equal(
      resolveActiveNavHref("/dashboard/support/tickets/t_1", hrefs),
      "/dashboard/support/tickets"
    );
    assert.equal(isNavItemActive("/dashboard/support", "/dashboard/support/tickets/t_1", hrefs), false);
  });

  it("activates HR Employees for employee detail", () => {
    assert.equal(
      resolveActiveNavHref("/dashboard/hr/employees/emp_1", hrefs),
      "/dashboard/hr/employees"
    );
  });

  it("activates Documents Files for file detail", () => {
    assert.equal(
      resolveActiveNavHref("/dashboard/documents/files/f_1", hrefs),
      "/dashboard/documents/files"
    );
  });

  it("activates Accounting / Finance / Operations overviews only on roots", () => {
    assert.equal(resolveActiveNavHref("/dashboard/accounting", hrefs), "/dashboard/accounting");
    assert.equal(
      resolveActiveNavHref("/dashboard/accounting/journal-entries", hrefs),
      "/dashboard/accounting/journal-entries"
    );
    assert.equal(resolveActiveNavHref("/dashboard/finance", hrefs), "/dashboard/finance");
    assert.equal(
      resolveActiveNavHref("/dashboard/finance/customer-invoices/inv_1", hrefs),
      "/dashboard/finance/customer-invoices"
    );
    assert.equal(resolveActiveNavHref("/dashboard/operations", hrefs), "/dashboard/operations");
  });

  it("activates CRM leaves without Overview collision", () => {
    assert.equal(resolveActiveNavHref("/dashboard/crm/leads/l_1", hrefs), "/dashboard/crm/leads");
    assert.equal(isNavItemActive("/dashboard/crm", "/dashboard/crm/leads/l_1", hrefs), false);
  });

  it("returns null for profile routes", () => {
    assert.equal(resolveActiveNavHref("/dashboard/profile", hrefs), null);
    assert.equal(resolveActiveNavHref("/dashboard/profile/security", hrefs), null);
  });

  it("returns null for employee Settings so footer owns the active state", () => {
    assert.equal(resolveActiveNavHref("/dashboard/my-workspace/settings", hrefs), null);
  });

  it("activates Settings for nested settings routes", () => {
    assert.equal(resolveActiveNavHref("/dashboard/settings", hrefs), "/dashboard/settings");
    assert.equal(resolveActiveNavHref("/dashboard/settings/users", hrefs), "/dashboard/settings");
  });

  it("never marks more than one leaf active for knowledge article paths", () => {
    const path = "/dashboard/knowledge/articles/new";
    const active = hrefs.filter((h) => isNavItemActive(h, path, hrefs));
    assert.deepEqual(active, ["/dashboard/knowledge/articles"]);
  });
});
