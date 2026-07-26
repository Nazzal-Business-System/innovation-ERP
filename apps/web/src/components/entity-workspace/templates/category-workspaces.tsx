"use client";

import type { ReactNode } from "react";
import {
  EntityWorkspace,
  EntityWorkspaceBody,
  EntityWorkspaceMain,
} from "../entity-workspace";
import { EntitySidebar } from "../entity-sidebar";
import type { DetailsPageLayout } from "@/lib/i18n/types";

type TemplateProps = {
  entityType: string;
  entityId: string;
  layout?: DetailsPageLayout;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  readOnly?: boolean;
  header: ReactNode;
  metrics?: ReactNode;
  main: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
};

function CategoryWorkspace({
  entityType,
  entityId,
  layout,
  loading,
  error,
  onRetry,
  readOnly,
  header,
  metrics,
  main,
  sidebar,
  footer,
  forceSidebar,
}: TemplateProps & { forceSidebar?: boolean }) {
  return (
    <EntityWorkspace
      entityType={entityType}
      entityId={entityId}
      layout={layout}
      loading={loading}
      error={error}
      onRetry={onRetry}
      readOnly={readOnly}
    >
      {header}
      {metrics}
      <EntityWorkspaceBody>
        <EntityWorkspaceMain>{main}</EntityWorkspaceMain>
        {sidebar ? <EntitySidebar force={forceSidebar}>{sidebar}</EntitySidebar> : null}
      </EntityWorkspaceBody>
      {footer}
    </EntityWorkspace>
  );
}

export function MasterDataWorkspace(props: TemplateProps) {
  /** Keep status/owner visible in Focus/Executive by stacking sidebar below main. */
  return <CategoryWorkspace {...props} forceSidebar />;
}

export function TransactionWorkspace(props: TemplateProps) {
  /** Keep workflow/actions visible in Focus/Executive by stacking sidebar below main. */
  return <CategoryWorkspace {...props} forceSidebar />;
}

export function FinancialWorkspace(props: TemplateProps) {
  /** Keep workflow/actions visible in Focus/Executive by stacking sidebar below main. */
  return <CategoryWorkspace {...props} forceSidebar />;
}

export function CrmWorkspace(props: TemplateProps) {
  /** Keep owner/workflow visible in Focus/Executive by stacking sidebar below main. */
  return <CategoryWorkspace {...props} forceSidebar />;
}

export function HrWorkspace(props: TemplateProps) {
  /** Keep employment/workflow context visible in Focus/Executive layouts. */
  return <CategoryWorkspace {...props} forceSidebar />;
}

export function OperationalWorkspace(props: TemplateProps) {
  /** Keep status/ownership context visible in Focus/Executive layouts. */
  return <CategoryWorkspace {...props} forceSidebar />;
}
