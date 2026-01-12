import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface AuditReportData {
  reportDate: string;
  version: string;
}

export function generateAuditPdf(data: AuditReportData = { reportDate: "December 27, 2024", version: "1.0" }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Colors (typed as tuples for jsPDF)
  const brandOrange: [number, number, number] = [251, 146, 60];
  const darkGray: [number, number, number] = [31, 41, 55];
  const mediumGray: [number, number, number] = [107, 114, 128];
  const lightGray: [number, number, number] = [243, 244, 246];
  const greenColor: [number, number, number] = [34, 197, 94];
  const blueColor: [number, number, number] = [59, 130, 246];
  const indigoColor: [number, number, number] = [99, 102, 241];
  const amberColor: [number, number, number] = [245, 158, 11];
  const purpleColor: [number, number, number] = [139, 92, 246];

  // Helper functions
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      addFooter();
    }
  };

  const addFooter = () => {
    const footerY = pageHeight - 10;
    doc.setFontSize(8);
    doc.setTextColor(...mediumGray);
    doc.text("HBC Engineering - Confidential", margin, footerY);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, footerY, { align: "right" });
  };

  const drawLine = (y: number, color: [number, number, number] = lightGray) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // ============ COVER PAGE ============
  // Header background
  doc.setFillColor(...darkGray);
  doc.rect(0, 0, pageWidth, 100, "F");

  // Orange accent line
  doc.setFillColor(...brandOrange);
  doc.rect(0, 100, pageWidth, 4, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("SECURITY AUDIT REPORT", pageWidth / 2, 45, { align: "center" });

  // Subtitle
  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text("HBCT Token Smart Contract Analysis", pageWidth / 2, 60, { align: "center" });

  // Badge
  doc.setFillColor(...greenColor);
  doc.roundedRect(pageWidth / 2 - 30, 72, 60, 18, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PASSED", pageWidth / 2, 83, { align: "center" });

  // Report info box
  yPos = 130;
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 60, 3, 3, "F");

  doc.setTextColor(...darkGray);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Report Information", margin + 10, yPos + 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...mediumGray);

  const infoData = [
    ["Report Date:", data.reportDate],
    ["Version:", data.version],
    ["Prepared By:", "HBC Engineering Security Team"],
    ["Classification:", "Public"],
  ];

  infoData.forEach((item, idx) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(item[0], margin + 10, yPos + 28 + idx * 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mediumGray);
    doc.text(item[1], margin + 50, yPos + 28 + idx * 8);
  });

  // Contract info box
  yPos = 210;
  doc.setFillColor(...darkGray);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 50, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Contract Under Review", margin + 10, yPos + 15);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Token Name: HBC Fire Protection Token (HBCT)", margin + 10, yPos + 28);
  doc.text("Network: BNB Smart Chain (BSC) - Chain ID: 56", margin + 10, yPos + 36);
  doc.setTextColor(...brandOrange);
  doc.text("Contract: 0x7D57480119a5958ca29d41EE8d770E71b4465329", margin + 10, yPos + 44);

  // Footer on cover
  doc.setTextColor(...mediumGray);
  doc.setFontSize(8);
  doc.text("© 2024 HBC Engineering. All rights reserved.", pageWidth / 2, pageHeight - 20, { align: "center" });

  // ============ PAGE 2: EXECUTIVE SUMMARY ============
  doc.addPage();
  yPos = margin;
  addFooter();

  // Section header
  doc.setFillColor(...greenColor);
  doc.rect(margin, yPos, 4, 20, "F");
  doc.setTextColor(...darkGray);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("1. EXECUTIVE SUMMARY", margin + 12, yPos + 14);
  yPos += 35;

  // Status box
  doc.setFillColor(220, 252, 231); // green-100
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, "F");
  doc.setDrawColor(...greenColor);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, "S");

  doc.setTextColor(...greenColor);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("PASSED - No Critical Vulnerabilities Found", margin + 10, yPos + 12);
  doc.setTextColor(22, 101, 52); // green-800
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("The HBCT token contract follows BEP-20 standards with robust security measures.", margin + 10, yPos + 22);
  yPos += 45;

  // Summary paragraph
  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  const summaryText = "This security audit report provides a comprehensive analysis of the HBCT (HBC Fire Protection Token) smart contract deployed on the BNB Smart Chain. Our assessment covers the token contract's compliance with industry standards, potential security vulnerabilities, and the platform's integration security measures. The audit confirms that the contract implements standard BEP-20 functionality without any critical or high-severity issues.";
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 2 * margin);
  doc.text(summaryLines, margin, yPos);
  yPos += summaryLines.length * 5 + 15;

  // Key Findings
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Key Findings:", margin, yPos);
  yPos += 10;

  const findings = [
    "Standard BEP-20 token implementation with 18 decimals",
    "Total supply of 250,000,000 HBCT tokens",
    "No hidden mint or burn functions detected",
    "Standard transfer and approval mechanisms",
    "Platform implements 12-block confirmation requirement",
    "Multi-factor authentication for user accounts",
  ];

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  findings.forEach((finding) => {
    doc.setFillColor(...greenColor);
    doc.circle(margin + 3, yPos - 1.5, 1.5, "F");
    doc.setTextColor(...darkGray);
    doc.text(finding, margin + 10, yPos);
    yPos += 7;
  });

  // ============ PAGE 3: CONTRACT OVERVIEW ============
  doc.addPage();
  yPos = margin;
  addFooter();

  // Section header
  doc.setFillColor(...brandOrange);
  doc.rect(margin, yPos, 4, 20, "F");
  doc.setTextColor(...darkGray);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("2. CONTRACT OVERVIEW", margin + 12, yPos + 14);
  yPos += 35;

  // Contract details table
  autoTable(doc, {
    startY: yPos,
    head: [["Property", "Value"]],
    body: [
      ["Token Name", "HBC Fire Protection Token"],
      ["Symbol", "HBCT"],
      ["Contract Address", "0x7D57480119a5958ca29d41EE8d770E71b4465329"],
      ["Network", "BNB Smart Chain (BSC)"],
      ["Chain ID", "56"],
      ["Token Standard", "BEP-20 (ERC-20 Compatible)"],
      ["Decimals", "18"],
      ["Total Supply", "250,000,000 HBCT"],
      ["Presale Price", "$0.03 USD"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: darkGray,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { cellWidth: "auto" },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Platform Wallets
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  doc.text("Platform Wallet Addresses", margin, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [["Wallet", "Address", "Purpose"]],
    body: [
      ["Deposit Wallet", "0x1ed6D2148bD01E0cF0261E24181dA3a6f466F585", "Receives user HBCT deposits"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: purpleColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 8, cellPadding: 4 },
  });

  // ============ PAGE 4: SECURITY ANALYSIS ============
  doc.addPage();
  yPos = margin;
  addFooter();

  // Section header
  doc.setFillColor(...greenColor);
  doc.rect(margin, yPos, 4, 20, "F");
  doc.setTextColor(...darkGray);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("3. SECURITY ANALYSIS", margin + 12, yPos + 14);
  yPos += 35;

  // Security checks table
  const securityChecks = [
    ["BEP-20 Standard Compliance", "PASS", "Contract implements all required BEP-20 functions and events"],
    ["Ownership Structure", "PASS", "No hidden backdoors or privileged functions detected"],
    ["Reentrancy Protection", "PASS", "Standard token transfers are not vulnerable to reentrancy"],
    ["Integer Overflow/Underflow", "PASS", "Solidity 0.8+ provides built-in overflow protection"],
    ["Gas Optimization", "PASS", "Token transfers operate within normal gas limits"],
    ["Access Control", "PASS", "Proper access control for administrative functions"],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Security Check", "Status", "Details"]],
    body: securityChecks,
    theme: "grid",
    headStyles: {
      fillColor: darkGray,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: "auto" },
    },
    didParseCell: (data: any) => {
      if (data.column.index === 1 && data.cell.text[0] === "PASS") {
        data.cell.styles.textColor = greenColor;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Smart Contract Functions
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Smart Contract Functions Analyzed", margin, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [["Function", "Description", "Risk Level"]],
    body: [
      ["transfer(address, uint256)", "Transfer tokens between addresses", "Low"],
      ["balanceOf(address)", "Query token balance of an address", "None"],
      ["approve(address, uint256)", "Approve spending allowance", "Low"],
      ["transferFrom(address, address, uint256)", "Transfer from approved allowance", "Low"],
      ["allowance(address, address)", "Check approved spending allowance", "None"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: blueColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { font: "courier", fontSize: 8 },
      2: { halign: "center" },
    },
    didParseCell: (data: any) => {
      if (data.column.index === 2) {
        if (data.cell.text[0] === "None") {
          data.cell.styles.textColor = greenColor;
        } else if (data.cell.text[0] === "Low") {
          data.cell.styles.textColor = blueColor;
        }
      }
    },
  });

  // ============ PAGE 5: PLATFORM SECURITY ============
  doc.addPage();
  yPos = margin;
  addFooter();

  // Section header
  doc.setFillColor(...indigoColor);
  doc.rect(margin, yPos, 4, 20, "F");
  doc.setTextColor(...darkGray);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("4. PLATFORM INTEGRATION SECURITY", margin + 12, yPos + 14);
  yPos += 35;

  // Platform security features
  const platformFeatures = [
    ["Two-Factor Authentication", "TOTP-based 2FA with recovery codes"],
    ["Encryption", "AES-256-GCM for sensitive data storage"],
    ["Audit Logging", "Comprehensive logging of all security events"],
    ["Wallet Verification", "Signature-based wallet ownership verification"],
    ["Block Confirmations", "12 block confirmations required for deposits"],
    ["Rate Limiting", "Protection against brute force attacks"],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Security Feature", "Implementation"]],
    body: platformFeatures,
    theme: "grid",
    headStyles: {
      fillColor: indigoColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Withdrawal Security
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Withdrawal Security Configuration", margin, yPos);
  yPos += 10;

  autoTable(doc, {
    startY: yPos,
    head: [["Parameter", "Value"]],
    body: [
      ["Minimum Withdrawal", "5,000 HBCT"],
      ["Maximum Withdrawal", "100,000 HBCT"],
      ["Withdrawal Fee", "0.1%"],
      ["Admin Approval Threshold", "10,000 HBCT"],
      ["Email Confirmation", "Required (30-min expiry)"],
      ["Gas Price Protection", "Max 10 Gwei"],
    ],
    theme: "grid",
    headStyles: {
      fillColor: amberColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
    },
  });

  // ============ PAGE 6: RECOMMENDATIONS & CONCLUSION ============
  doc.addPage();
  yPos = margin;
  addFooter();

  // Section header
  doc.setFillColor(...amberColor);
  doc.rect(margin, yPos, 4, 20, "F");
  doc.setTextColor(...darkGray);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("5. RECOMMENDATIONS", margin + 12, yPos + 14);
  yPos += 35;

  const recommendations = [
    ["Multi-Signature Wallet", "Consider implementing multi-signature requirements for high-value withdrawal wallet operations."],
    ["Real-Time Monitoring", "Set up real-time monitoring and alerting for unusual transaction patterns or large transfers."],
    ["Smart Contract Insurance", "Consider obtaining smart contract insurance coverage for additional protection."],
    ["Third-Party Audit", "Engage a third-party security firm for an independent smart contract audit."],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Recommendation", "Details"]],
    body: recommendations.map((r, i) => [String(i + 1), r[0], r[1]]),
    theme: "grid",
    headStyles: {
      fillColor: amberColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { fontStyle: "bold", cellWidth: 45 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 25;

  // Conclusion section
  doc.setFillColor(...greenColor);
  doc.rect(margin, yPos, 4, 20, "F");
  doc.setTextColor(...darkGray);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("6. CONCLUSION", margin + 12, yPos + 14);
  yPos += 30;

  // Conclusion box
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, "F");
  doc.setDrawColor(...greenColor);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 45, 3, 3, "S");

  doc.setTextColor(22, 101, 52);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const conclusionText = "The HBCT token contract and platform integration demonstrate a solid security foundation. The token follows BEP-20 standards, and the platform implements industry best practices including multi-factor authentication, encrypted storage, comprehensive logging, and robust transaction validation. The recommended improvements are advisory enhancements rather than critical fixes. Overall, the system is suitable for production use with the current security measures in place.";
  const conclusionLines = doc.splitTextToSize(conclusionText, pageWidth - 2 * margin - 20);
  doc.text(conclusionLines, margin + 10, yPos + 12);

  yPos += 60;

  // Signature section
  addNewPageIfNeeded(60);
  drawLine(yPos);
  yPos += 15;

  doc.setTextColor(...darkGray);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Prepared By:", margin, yPos);
  doc.text("Report Date:", pageWidth / 2, yPos);
  yPos += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("HBC Engineering Security Team", margin, yPos);
  doc.text(data.reportDate, pageWidth / 2, yPos);
  yPos += 6;

  doc.setTextColor(...mediumGray);
  doc.setFontSize(9);
  doc.text("security@hbc-engineering.com", margin, yPos);
  doc.text(`Version ${data.version}`, pageWidth / 2, yPos);

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  // Save the PDF
  doc.save("HBCT_Security_Audit_Report.pdf");
}
