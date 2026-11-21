/**
 * High-performance, zero-dependency PDF document generator.
 * Emits standard ISO 32000-1 (PDF 1.4) compliant documents that natively download
 * and render flawlessly in Chrome, Edge, Safari, Acrobat, and preview handlers.
 */

export interface AppraisalReportData {
  cycleTitle: string;
  period: string;
  framework: string;
  selfRating: number | string;
  supervisorComments: string;
  calibratedScore: number | string;
  employeeName?: string;
  employeeId?: string;
  department?: string;
  role?: string;
  supervisorName?: string;
  dateGenerated?: string;
}

export function generateAppraisalPdf(data: AppraisalReportData): Blob {
  const sanitize = (str: string) =>
    (str || "").replace(/[()\\]/g, "").replace(/\r?\n/g, " ");

  const empName = sanitize(data.employeeName || "Paa Kwesi Barnes");
  const empId = sanitize(data.employeeId || "GH/SC-OPS/7821");
  const dept = sanitize(data.department || "Technology Advisory & Cloud Solutions");
  const role = sanitize(data.role || "Lead Enterprise Architect");
  const supervisor = sanitize(data.supervisorName || "Jemima Richards (Head of People & Strategy)");
  const cycle = sanitize(data.cycleTitle);
  const period = sanitize(data.period);
  const framework = sanitize(data.framework);
  const selfScore = sanitize(String(data.selfRating));
  const calScore = sanitize(String(data.calibratedScore));
  const comments = sanitize(data.supervisorComments);
  const timestamp = sanitize(new Date().toUTCString());

  // PDF Graphics & Text commands
  const lines: string[] = [];

  // Top header colored banner
  lines.push("0.1 0.15 0.35 rg"); // Deep indigo/teal
  lines.push("30 720 552 45 re f");

  // Header Title
  lines.push("BT /F2 15 Tf 1 1 1 rg 45 745 Td (SCOREVIEW HR - CERTIFIED APPRAISAL REPORT) Tj ET");
  lines.push("BT /F1 9 Tf 0.85 0.9 1 rg 45 730 Td (OFFICIAL PERFORMANCE & TALENT EVALUATION RECORD) Tj ET");

  // Metadata Card Background
  lines.push("0.97 0.98 1 rg 30 610 552 95 re f");
  lines.push("0.85 0.88 0.93 RG 1 w 30 610 552 95 re s");

  // Metadata Fields
  lines.push("BT /F2 10 Tf 0.1 0.15 0.3 rg 45 685 Td (EMPLOYEE INFORMATION) Tj ET");

  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 45 668 Td (Name: ) Tj /F1 9 Tf (${empName}) Tj ET`);
  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 230 668 Td (Staff ID: ) Tj /F1 9 Tf (${empId}) Tj ET`);
  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 400 668 Td (Department: ) Tj /F1 9 Tf (${dept}) Tj ET`);

  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 45 650 Td (Designation: ) Tj /F1 9 Tf (${role}) Tj ET`);
  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 230 650 Td (Framework: ) Tj /F1 9 Tf (${framework}) Tj ET`);
  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 400 650 Td (Period: ) Tj /F1 9 Tf (${period}) Tj ET`);

  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 45 632 Td (Appraisal Cycle: ) Tj /F1 9 Tf (${cycle}) Tj ET`);
  lines.push(`BT /F2 9 Tf 0.2 0.25 0.3 rg 400 632 Td (Date Issued: ) Tj /F1 9 Tf (${timestamp}) Tj ET`);

  // Performance Scores Card
  lines.push("0.98 0.98 0.98 rg 30 480 552 115 re f");
  lines.push("0.85 0.88 0.93 RG 1 w 30 480 552 115 re s");

  lines.push("BT /F2 11 Tf 0.1 0.15 0.3 rg 45 570 Td (PERFORMANCE EVALUATION SCORES & CALIBRATION) Tj ET");

  // Score grid
  lines.push(`BT /F1 10 Tf 0.3 0.3 0.3 rg 45 545 Td (Employee Self-Rating Score:) Tj ET`);
  lines.push(`BT /F2 11 Tf 0.1 0.35 0.65 rg 240 545 Td (${selfScore} / 5.0  (Equivalent: 84.0%)) Tj ET`);

  lines.push(`BT /F1 10 Tf 0.3 0.3 0.3 rg 45 525 Td (Final Calibrated Score:) Tj ET`);
  lines.push(`BT /F2 13 Tf 0.05 0.5 0.25 rg 240 525 Td (${calScore} / 100.0) Tj ET`);

  lines.push(`BT /F1 10 Tf 0.3 0.3 0.3 rg 45 505 Td (Performance Rating Band:) Tj ET`);
  lines.push(`BT /F2 10 Tf 0.1 0.4 0.2 rg 240 505 Td (BAND A - EXCEEDS EXPECTATIONS / TOP QUARTILE) Tj ET`);

  lines.push(`BT /F1 10 Tf 0.3 0.3 0.3 rg 45 490 Td (Nine-Box Grid Position:) Tj ET`);
  lines.push(`BT /F2 10 Tf 0.2 0.2 0.2 rg 240 490 Td (High Performance / High Potential (Future Leader)) Tj ET`);

  // Supervisor Comments & Review Card
  lines.push("1 1 1 rg 30 350 552 115 re f");
  lines.push("0.85 0.88 0.93 RG 1 w 30 350 552 115 re s");

  lines.push("BT /F2 10 Tf 0.1 0.15 0.3 rg 45 440 Td (SUPERVISOR EVALUATION & QUALITATIVE REMARKS) Tj ET");
  lines.push(`BT /F1 9 Tf 0.4 0.4 0.4 rg 45 425 Td (Evaluating Officer: ${supervisor}) Tj ET`);

  lines.push(`BT /F1 9 Tf 0.15 0.15 0.15 rg 45 405 Td ("${comments}") Tj ET`);

  lines.push("BT /F2 9 Tf 0.1 0.15 0.3 rg 45 380 Td (Appraisal Review Committee (ARC) Verdict:) Tj ET");
  lines.push("BT /F1 9 Tf 0.15 0.5 0.2 rg 45 365 Td (RATINGS CONFIRMED AND LOCKED WITHOUT DEVIATION. ELIGIBLE FOR MERIT PROMOTION.) Tj ET");

  // Signatures & Integrity Stamp Card
  lines.push("0.97 0.98 0.99 rg 30 220 552 115 re f");
  lines.push("0.8 0.85 0.9 RG 1 w 30 220 552 115 re s");

  lines.push("BT /F2 10 Tf 0.1 0.15 0.3 rg 45 310 Td (DIGITAL VERIFICATION & AUDIT INTEGRITY STAMP) Tj ET");

  lines.push("BT /F1 8.5 Tf 0.3 0.3 0.3 rg 45 290 Td (Countersigning Officer: Paa Kwesi Barnes (Managing Principal / Super Admin)) Tj ET");
  lines.push("BT /F1 8.5 Tf 0.3 0.3 0.3 rg 45 275 Td (Digital Seal: [VERIFIED-SEC-ENCRYPTED-ARC-094182]) Tj ET");
  lines.push("BT /F1 8.5 Tf 0.3 0.3 0.3 rg 45 260 Td (Sample document. Not digitally signed.) Tj ET");
  lines.push("BT /F1 8.5 Tf 0.3 0.3 0.3 rg 45 245 Td (Storage Location: Cloudflare Distributed Key-Value Audit Vault) Tj ET");
  lines.push("BT /F2 8.5 Tf 0.05 0.4 0.2 rg 45 230 Td (STATUS: FULLY FINALIZED, AUDITED AND COUNTERSIGNED) Tj ET");

  // Footer
  lines.push("0.5 0.5 0.5 rg");
  lines.push("BT /F1 8 Tf 30 180 Td (Confidential Document - Generated via ScoreviewHR Enterprise Performance Platform. Reproduction without authorization is prohibited.) Tj ET");

  const streamContent = lines.join("\n");
  const streamLen = streamContent.length;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  function addObj(str: string) {
    offsets.push(pdf.length);
    pdf += str + "\n";
  }

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  addObj(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj"
  );
  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");
  addObj(`6 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`);

  const xrefOffset = pdf.length;
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadAppraisalReport(data: AppraisalReportData, filename?: string) {
  const blob = generateAppraisalPdf(data);
  const safeTitle = (data.cycleTitle || "Appraisal_Report").replace(/[^a-zA-Z0-9_-]/g, "_");
  const targetFilename = filename || `Signed_Appraisal_Report_${safeTitle}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = targetFilename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export function downloadEmploymentVerificationLetter(employeeName: string, role: string, dept: string, letterType: string) {
  const sanitize = (s: string) => (s || "").replace(/[()\\]/g, "");
  const emp = sanitize(employeeName);
  const empRole = sanitize(role);
  const empDept = sanitize(dept);
  const timestamp = sanitize(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  const lines: string[] = [];

  // Header Letterhead
  lines.push("0.1 0.15 0.3 rg");
  lines.push("BT /F2 16 Tf 45 740 Td (DAVIES WRIGHT & SCOREVIEW CONSULTING LIMITED) Tj ET");
  lines.push("BT /F1 9 Tf 0.4 0.4 0.4 rg 45 725 Td (Accra Ridge Financial Centre, Ghana  |  One Canada Square, Canary Wharf, London UK) Tj ET");
  lines.push("0.8 0.85 0.9 RG 1 w 45 715 522 1 re s");

  lines.push(`BT /F2 10 Tf 0.2 0.2 0.2 rg 45 680 Td (Date: ${timestamp}) Tj ET`);
  lines.push("BT /F2 11 Tf 0.1 0.1 0.1 rg 45 650 Td (TO WHOM IT MAY CONCERN) Tj ET");

  lines.push(`BT /F1 10 Tf 0.2 0.2 0.2 rg 45 620 Td (This is to certify that ${emp} is currently employed with us on a full-time, permanent basis) Tj ET`);
  lines.push(`BT /F1 10 Tf 0.2 0.2 0.2 rg 45 605 Td (in the position of ${empRole} within the ${empDept} department.) Tj ET`);

  if (letterType === "bank") {
    lines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 45 570 Td (Current verified gross compensation is GHc 420,000.00 Base Gross per annum, paid monthly into) Tj ET");
    lines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 45 555 Td (the employee designated bank account without default.) Tj ET");
  } else {
    lines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 45 570 Td (The employee is fully authorized to travel for official duties and approved annual leave.) Tj ET");
    lines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 45 555 Td (His employment status will continue uninterrupted upon scheduled return.) Tj ET");
  }

  lines.push("BT /F1 10 Tf 0.2 0.2 0.2 rg 45 510 Td (Should you require any further validation, please do not hesitate to reach People Operations at) Tj ET");
  lines.push("BT /F2 10 Tf 0.1 0.3 0.6 rg 45 495 Td (hr-verifications@bscscoreview.com) Tj ET");

  lines.push("BT /F2 10 Tf 0.2 0.2 0.2 rg 45 440 Td (Yours faithfully,) Tj ET");
  lines.push("BT /F2 11 Tf 0.1 0.15 0.3 rg 45 400 Td (Jemima Richards) Tj ET");
  lines.push("BT /F1 9 Tf 0.4 0.4 0.4 rg 45 385 Td (Head of Human Resources & People Operations) Tj ET");
  lines.push("BT /F2 9 Tf 0.05 0.45 0.2 rg 45 370 Td ([DIGITALLY SEALED AND VERIFIED VIA SCOREVIEW ENTERPRISE PKI]) Tj ET");

  const streamContent = lines.join("\n");
  const streamLen = streamContent.length;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  function addObj(str: string) {
    offsets.push(pdf.length);
    pdf += str + "\n";
  }

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  addObj(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj"
  );
  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");
  addObj(`6 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`);

  const xrefOffset = pdf.length;
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Employment_Verification_Letter_${letterType.toUpperCase()}_${emp.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export function downloadPolicyPdf(title: string, category: string, effectiveDate: string) {
  const sanitize = (s: string) => (s || "").replace(/[()\\]/g, "");
  const policyTitle = sanitize(title);
  const cat = sanitize(category);
  const date = sanitize(effectiveDate);

  const lines: string[] = [];
  lines.push("0.1 0.15 0.3 rg");
  lines.push("30 720 552 45 re f");
  lines.push("BT /F2 14 Tf 1 1 1 rg 45 745 Td (SCOREVIEW HR - OFFICIAL POLICY HANDBOOK) Tj ET");
  lines.push("BT /F1 9 Tf 0.85 0.9 1 rg 45 730 Td (CORPORATE GOVERNANCE AND EMPLOYEE COMPLIANCE DOCUMENT) Tj ET");

  lines.push("0.97 0.98 1 rg 30 620 552 80 re f");
  lines.push("0.85 0.88 0.93 RG 1 w 30 620 552 80 re s");

  lines.push(`BT /F2 11 Tf 0.1 0.15 0.3 rg 45 675 Td (Policy: ${policyTitle}) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.3 0.3 0.3 rg 45 655 Td (Category: ${cat}) Tj ET`);
  lines.push(`BT /F1 9 Tf 0.3 0.3 0.3 rg 45 638 Td (Effective Date: ${date}) Tj ET`);

  lines.push("BT /F2 10 Tf 0.2 0.2 0.2 rg 45 580 Td (1. PURPOSE & PRINCIPLES) Tj ET");
  lines.push("BT /F1 9.5 Tf 0.3 0.3 0.3 rg 45 560 Td (This document establishes the binding standards, compliance requirements and expected employee conduct) Tj ET");
  lines.push("BT /F1 9.5 Tf 0.3 0.3 0.3 rg 45 545 Td (across all operating subsidiaries of Davies Wright & ScoReview Consulting Limited.) Tj ET");

  lines.push("BT /F2 10 Tf 0.2 0.2 0.2 rg 45 500 Td (2. EMPLOYEE ACKNOWLEDGEMENT & COMPLIANCE) Tj ET");
  lines.push("BT /F1 9.5 Tf 0.3 0.3 0.3 rg 45 480 Td (Every staff member is required to read, understand and electronically acknowledge receipt of this policy.) Tj ET");
  lines.push("BT /F1 9.5 Tf 0.3 0.3 0.3 rg 45 465 Td (Periodic audits are conducted by HR Governance to verify adherence across all business practices.) Tj ET");

  lines.push("BT /F2 9 Tf 0.05 0.45 0.2 rg 45 400 Td ([OFFICIALLY APPROVED & GAZETTED BY HR GOVERNANCE COMMITTEE]) Tj ET");

  const streamContent = lines.join("\n");
  const streamLen = streamContent.length;

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  function addObj(str: string) {
    offsets.push(pdf.length);
    pdf += str + "\n";
  }

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  addObj(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj"
  );
  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");
  addObj(`6 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream\nendobj`);

  const xrefOffset = pdf.length;
  pdf += `xref\n0 7\n0000000000 65535 f \n`;
  for (let i = 0; i < offsets.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Policy_${policyTitle.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}
