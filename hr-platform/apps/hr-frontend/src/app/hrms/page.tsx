export const dynamic = "force-dynamic";

import React from "react";
import { EnterpriseAppShell } from "../../components/shell/EnterpriseAppShell";
import { loadDashboardProps } from "../../lib/loadDashboardProps";

export default async function HrmsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const demoRequested = (await searchParams).demo === "1";
  const props = await loadDashboardProps(demoRequested);
  return <EnterpriseAppShell {...props} initialExperience="HRMS" initialDeepLinkView="command_centre" />;
}
