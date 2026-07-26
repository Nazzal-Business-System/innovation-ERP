/** Public login-page preview metrics for the demo organization (no auth). */
export interface LoginPreviewMetric {
  id: "branches" | "employees" | "customers" | "warehouses" | "products";
  label: string;
  value: number;
}

export interface LoginPreviewResponse {
  organizationName: string;
  organizationSlug: string;
  status: "operational" | "unavailable";
  metrics: LoginPreviewMetric[];
}
