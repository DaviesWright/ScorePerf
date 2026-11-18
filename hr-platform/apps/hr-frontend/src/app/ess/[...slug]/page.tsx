export const dynamic = "force-dynamic";

import React from "react";
import { EnterpriseAppShell } from "../../../components/shell/EnterpriseAppShell";
import { loadDashboardProps, resolveDeepLinkView } from "../../../lib/loadDashboardProps";

export default async function EssSubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { slug } = await params;
  const demoRequested = (await searchParams).demo === "1";
  const props = await loadDashboardProps(demoRequested);
  const view = resolveDeepLinkView("ESS", slug) ?? "self_service";
  return <EnterpriseAppShell {...props} initialExperience="ESS" initialDeepLinkView={view} />;
}
