export const dynamic = "force-dynamic";

import React from "react";
import { EnterpriseAppShell } from "../../components/shell/EnterpriseAppShell";
import { loadDashboardProps } from "../../lib/loadDashboardProps";

export default async function MssPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const demoRequested = (await searchParams).demo === "1";
  const props = await loadDashboardProps(demoRequested);
  return <EnterpriseAppShell {...props} initialExperience="MSS" initialDeepLinkView="command_centre" />;
}
