import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Download, Clock, Cpu, ChevronDown, ChevronUp,
  Shield, AlertTriangle, Info, Search, Terminal, Loader2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { reportService } from '../services/api';

const SCORE_COLOR = (s) =>
  s >= 80 ? '#00ff41' : s >= 60 ? '#eab308' : '#ff3860';

const SEVERITY_ORDER = { Critical: 4, High: 3, Medium: 2, Low: 1, Info: 0 };

const RISK_BADGE = {
  Low:      'badge-low',
  Medium:   'badge-medium',
  High:     'badge-high',
  Critical: 'badge-critical',
};

const safeParseReport = (reportJson) => {
  try {
    return typeof reportJson === 'string' ? JSON.parse(reportJson) : (reportJson || {});
  } catch (err) {
    console.error('Failed to parse report JSON:', err);
    return {};
  }
};

const sanitizeReportData = (reportData) => {
  const data = reportData || {};
  const logsLower = (data.raw_logs || '').toLowerCase();
  const findings = (data.findings_summary || []).filter((finding) => {
    const title = (finding.title || '').toLowerCase();
    const evidence = (finding.technical_evidence || '').trim().toLowerCase();

    if (!evidence || evidence.includes('no technical evidence') || evidence.includes('not available')) {
      return false;
    }
    if (title.includes('sql injection') && (
      logsLower.includes('no parameter(s) found') ||
      logsLower.includes('all parameters appear to be not injectable')
    )) {
      return false;
    }
    if (title.includes('xss') && logsLower.includes('argument --seeds')) {
      return false;
    }

    return true;
  });

  return { ...data, findings_summary: findings };
};

const formatAuditTimestamp = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

const buildAuditId = (report) => {
  const date = new Date(report.created_at);
  const stamp = Number.isNaN(date.getTime())
    ? 'UNKNOWN'
    : date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
  return `RX-AUDIT-${report.scan_id}-${stamp}`;
};

const summarizeFindings = (findings, counts, integrity) => {
  if (!findings.length) {
    if (integrity?.status && integrity.status !== 'HIGH') {
      const issueText = integrity.issues?.length
        ? ` Scan reliability was ${integrity.status} because ${integrity.issues.join(' ')}`
        : ` Scan reliability was ${integrity.status}.`;
      return `No confirmed vulnerabilities were identified during the automated scan window.${issueText} A validation rerun is recommended before treating the target as clean.`;
    }
    return 'No confirmed vulnerabilities were identified during the automated scan window.';
  }

  return `The assessment identified ${findings.length} confirmed security finding(s). ${counts.Critical} are Critical, ${counts.High} are High, ${counts.Medium} are Medium, and ${counts.Low} are Low severity. Remediation should be prioritized according to business exposure and exploitation risk.`;
};

const buildConclusionText = (target, findings, integrity) => {
  if (!findings.length) {
    if (integrity?.status && integrity.status !== 'HIGH') {
      return `The assessment of ${target} did not confirm any vulnerabilities within the collected telemetry, but scan reliability was reduced. Stabilize the target and rerun validation to close the remaining uncertainty.`;
    }
    return `The assessment of ${target} did not confirm any vulnerabilities within the collected telemetry. Continued hardening, monitoring, and periodic reassessment are recommended.`;
  }

  const highest = findings[0]?.severity || 'Low';
  if (highest === 'Critical' || highest === 'High') {
    return `The assessment of ${target} confirmed material security weaknesses that require prioritized remediation. A defense-in-depth response, followed by validation testing, is recommended before the next release window.`;
  }
  return `The assessment of ${target} confirmed lower-severity security weaknesses that should be remediated through planned hardening and followed by a validation scan.`;
};

const buildNextSteps = (findings, integrity) => {
  const steps = [];
  const severities = new Set(findings.map((finding) => finding.severity));

  if (severities.has('Critical') || severities.has('High')) {
    steps.push('Remediate verified Critical and High severity findings first.');
  }
  if (severities.has('Medium')) {
    steps.push('Schedule Medium severity fixes and validate compensating controls.');
  }
  if (!findings.length) {
    steps.push(
      integrity?.status && integrity.status !== 'HIGH'
        ? 'Stabilize the target and rerun the validation scan.'
        : 'Maintain routine monitoring and rerun the assessment after material changes.'
    );
  } else {
    steps.push('Perform a validation scan to confirm the effectiveness of remediation.');
  }
  if (integrity?.issues?.length) {
    steps.push(`Resolve scan reliability issues noted during the assessment: ${integrity.issues.join(' ')}`);
  }

  return steps.slice(0, 3);
};

const getDisplayExecutiveSummary = (target, data) => {
  const findings = data.findings_summary || [];
  const integrity = data.scan_integrity || null;
  if (!findings.length) {
    return buildConclusionText(target, findings, integrity);
  }
  return data.executive_summary || buildConclusionText(target, findings, integrity);
};

/* ─── PDF Generator (Industry-Grade WAPT Format) ─── */
function generatePDF(r) {
  if (r.status !== 'Completed') return;
  try {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const MARGIN = 50; 
    
    // Corporate Color Palette (Slate/Navy/Blue)
    const NAVY_DARK = [15, 23, 42];    // Slate 900
    const NAVY_ACCENT = [30, 41, 59];  // Slate 800
    const BLUE_PRIMARY = [37, 99, 235]; // Blue 600
    const GREY_TEXT = [71, 85, 105];   // Slate 500
    const WHITE = [255, 255, 255];
    // Severity Accent Colors
    const CRITICAL = [220, 38, 38];   // Red 600
    const HIGH = [234, 88, 12];       // Orange 600
    const MEDIUM = [145, 158, 11];    // Amber 500
    const LOW = [22, 163, 74];        // Green 600

    // Parse Data
    const data = sanitizeReportData(safeParseReport(r.report_json));
    const findings = [...(data.findings_summary || [])].sort((a, b) => {
      const sevA = SEVERITY_ORDER[a.severity] || 0;
      const sevB = SEVERITY_ORDER[b.severity] || 0;
      if (sevA !== sevB) return sevB - sevA;
      return (b.confidence_score || 0) - (a.confidence_score || 0);
    });
    const integrity = data.scan_integrity || null;

    const counts = {
      Critical: findings.filter(f => f.severity?.toLowerCase() === 'critical').length,
      High: findings.filter(f => f.severity?.toLowerCase() === 'high').length,
      Medium: findings.filter(f => f.severity?.toLowerCase() === 'medium').length,
      Low: findings.filter(f => f.severity?.toLowerCase() === 'low' || f.severity?.toLowerCase() === 'info').length,
    };

    let y = 0;

    const drawPageHeader = (doc) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('RECONX AI | CONFIDENTIAL SECURITY AUDIT', MARGIN, 35);
      doc.text(`TARGET: ${r.target_url}`, W - MARGIN - 120, 35, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(MARGIN, 42, W - MARGIN, 42);
    };

    const drawPageFooter = (doc, pageNum, total) => {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Confidential - Generated by ReconX Autonomous Reasoning Engine`, MARGIN, H - 30);
      doc.text(`Page ${pageNum} of ${total}`, W - MARGIN - 40, H - 30);
      doc.line(MARGIN, H - 45, W - MARGIN, H - 45);
    };

    const sectionTitle = (num, title) => {
      if (y > H - 100) { doc.addPage(); y = 80; drawPageHeader(doc); }
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY_DARK);
      doc.text(`${num}. ${title}`, MARGIN, y);
      y += 8;
      doc.setDrawColor(...BLUE_PRIMARY);
      doc.setLineWidth(2);
      doc.line(MARGIN, y, MARGIN + 50, y);
      y += 28;
    };

    const subTitle = (title) => {
      if (y > H - 60) { doc.addPage(); y = 80; drawPageHeader(doc); }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY_ACCENT);
      doc.text(title, MARGIN, y);
      y += 18;
    };

    const bodyParagraph = (str, color = GREY_TEXT, size = 10) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(str || 'N/A', W - MARGIN * 2);
      if (y + (lines.length * 14) > H - 60) { doc.addPage(); y = 80; drawPageHeader(doc); }
      doc.text(lines, MARGIN, y);
      y += (lines.length * 14) + 12;
    };

    const drawMetadataTable = (rows) => {
      autoTable(doc, {
        startY: H - 190,
        margin: { left: MARGIN, right: MARGIN },
        body: rows,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 8, lineColor: NAVY_DARK, lineWidth: 0.25 },
        bodyStyles: { textColor: WHITE },
        columnStyles: {
          0: { cellWidth: 165, fillColor: NAVY_DARK, fontStyle: 'bold' },
          1: { fillColor: NAVY_ACCENT },
        },
      });
    };

    const drawKeyValueTable = (rows) => {
      if (y > H - 140) { doc.addPage(); y = 80; drawPageHeader(doc); }
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        body: rows,
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.25, textColor: GREY_TEXT },
        columnStyles: {
          0: { cellWidth: 120, fontStyle: 'bold', textColor: NAVY_DARK, fillColor: [248, 250, 252] },
          1: { fillColor: WHITE },
        },
      });
      y = doc.lastAutoTable.finalY + 12;
    };

    const drawEvidenceBlock = (text) => {
      const pendingLines = [...doc.splitTextToSize(text, W - MARGIN * 2 - 20)];

      while (pendingLines.length > 0) {
        const maxLines = Math.max(1, Math.floor((H - 75 - y) / 11));
        const chunk = pendingLines.splice(0, maxLines);
        const blockH = (chunk.length * 11) + 16;
        if (y + blockH > H - 60) { doc.addPage(); y = 80; drawPageHeader(doc); }
        doc.setFillColor(15, 23, 42);
        doc.rect(MARGIN, y, W - MARGIN * 2, blockH, 'F');
        doc.setFont('courier', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(52, 211, 153);
        doc.text(chunk, MARGIN + 10, y + 15);
        y += blockH + 12;
      }
    };

    // ═══════════════════════════════════════════════════════════════════
    // TITLE PAGE
    // ═══════════════════════════════════════════════════════════════════
    doc.setFillColor(...NAVY_DARK);
    doc.rect(0, 0, W, H, 'F');
    
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    doc.text('ReconX', W/2 - 70, H/2 - 20);
    doc.setTextColor(...BLUE_PRIMARY);
    doc.text('AI', W/2 + 75, H/2 - 20);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('Autonomous Web Application Penetration Test Report', W/2, H/2 + 20, { align: 'center' });
    
    doc.setFillColor(...NAVY_ACCENT);
    doc.rect(MARGIN, H - 200, W - MARGIN * 2, 120, 'F');
    
    drawMetadataTable([
      ['TARGET HOST', r.target_url || 'N/A'],
      ['AUDIT TIMESTAMP', formatAuditTimestamp(r.created_at)],
      ['AUDIT IDENTIFIER', buildAuditId(r)],
      ['DOCUMENT CLASSIFICATION', 'STRICTLY CONFIDENTIAL'],
    ]);

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 1: EXECUTIVE SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    doc.addPage(); y = 80;
    drawPageHeader(doc);
    
    sectionTitle('1', 'Executive Summary');
    subTitle('1.1 Assessment Objective');
    bodyParagraph(`This report documents the security assessment conducted on ${r.target_url}. The objective was to identify security vulnerabilities, evaluate the existing security posture, and provide actionable remediation guidance to reduce the organization's technological risk surface.`);
    
    subTitle('1.2 Scope of Engagement');
    bodyParagraph(`The scope of this automated engagement was limited to the public-facing infrastructure at the domain ${r.target_url}. Testing included external reconnaissance, service enumeration, and vulnerability verification.`);
    
    subTitle('1.3 Key Findings Summary');
    bodyParagraph(summarizeFindings(findings, counts, integrity));
    
    subTitle('1.4 Overall Risk Posture');
    bodyParagraph(getDisplayExecutiveSummary(r.target_url, data));

    // ─── Section 1.5: Scan Integrity Audit ───
    if (integrity) {
      subTitle('1.5 Scan Reliability Audit');
      const integrityColor = integrity.status === 'HIGH' ? LOW : integrity.status === 'MEDIUM' ? MEDIUM : CRITICAL;
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...integrityColor);
      bodyParagraph(`SCAN INTEGRITY: ${integrity.status} (${integrity.score}%)`, integrityColor, 10);
      
      if (integrity.issues && integrity.issues.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(...GREY_TEXT);
        integrity.issues.forEach(issue => {
          bodyParagraph(`- ${issue}`, GREY_TEXT, 9);
          y -= 8;
        });
        y += 12;
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 2: ENGAGEMENT OVERVIEW
    // ═══════════════════════════════════════════════════════════════════
    y += 20;
    sectionTitle('2', 'Engagement Overview');
    subTitle('2.1 Testing Methodology');
    bodyParagraph('The audit was executed using the ReconX Agentic Hacking Methodology, which adheres to the OWASP Testing Guide and PTES standards. This methodology involves Reconnaissance, Scanning, Enumeration, Vulnerability Analysis, and Reporting.');
    
    subTitle('2.2 Compliance Mapping');
    bodyParagraph('The findings in this report map to the OWASP Top 10 and CWE (Common Weakness Enumeration) registries to ensure standard vulnerability classification.');
    
    subTitle('2.3 Assessment Tools');
    bodyParagraph('ReconX AI leveraged a distributed toolset including Nmap for infrastructure auditing, Shodan Intelligence for OSINT, VirusTotal for reputation analysis, and custom heuristic modules for vulnerability detection.');

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 3: RISK PRIORITIZATION MATRIX
    // ═══════════════════════════════════════════════════════════════════
    doc.addPage(); y = 80;
    drawPageHeader(doc);
    
    sectionTitle('3', 'Risk Prioritization Matrix');
    bodyParagraph('The matrix below summarizes the risk distribution found during the assessment.');
    
    const boxW = (W - MARGIN * 2) / 4;
    const boxH = 60;
    
    const drawMatrixBox = (label, count, color, x) => {
      doc.setFillColor(...color);
      doc.setDrawColor(0);
      doc.rect(x, y, boxW, 25, 'F');
      doc.rect(x, y, boxW, 25, 'D');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255);
      doc.text(label.toUpperCase(), x + boxW/2, y + 16, { align: 'center' });
      
      doc.setFillColor(255);
      doc.rect(x, y + 25, boxW, 35, 'F');
      doc.rect(x, y + 25, boxW, 35, 'D');
      doc.setFontSize(18);
      doc.setTextColor(...NAVY_DARK);
      doc.text(String(count), x + boxW/2, y + 50, { align: 'center' });
    };

    drawMatrixBox('Critical', counts.Critical, CRITICAL, MARGIN);
    drawMatrixBox('High', counts.High, HIGH, MARGIN + boxW);
    drawMatrixBox('Medium', counts.Medium, MEDIUM, MARGIN + boxW * 2);
    drawMatrixBox('Low', counts.Low, LOW, MARGIN + boxW * 3);
    
    y += boxH + 40;

    // ─── Section 3.5: Positive Security Findings ───
    if (data.positive_findings && data.positive_findings.length > 0) {
      subTitle('3.1 Positive Security Findings');
      data.positive_findings.forEach(f => {
        doc.setTextColor(...LOW);
        bodyParagraph(`[Verified] ${f}`, LOW, 9);
        y -= 8;
      });
      y += 18;
    }

    // ─── Section 3.6: Assessment Limitations ───
    if (data.assessment_limitations && data.assessment_limitations.length > 0) {
      subTitle('3.2 Assessment Limitations');
      data.assessment_limitations.forEach(l => {
        doc.setTextColor(...NAVY_ACCENT);
        bodyParagraph(`[Skipped] ${l}`, GREY_TEXT, 9);
        y -= 8;
      });
      y += 18;
    }

    // ─── Section 3.7: Detailed Test Coverage ───
    if (data.test_results && data.test_results.length > 0) {
      subTitle('3.3 Detailed Test Execution Flow');
      doc.setFontSize(8);
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Security Test Tool', 'Result / Status']],
        body: data.test_results.map(t => [t.tool, t.status]),
        theme: 'striped',
        headStyles: { fillColor: NAVY_DARK, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        didDrawPage: (d) => { y = d.cursor.y + 20; }
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 4: DETAILED FINDINGS & REMEDIATION
    // ═══════════════════════════════════════════════════════════════════
    sectionTitle('4', 'Detailed Findings & Remediation');
    
    if (findings.length === 0) {
      bodyParagraph('No confirmed vulnerabilities were identified during the automated scanning window. Review the scan reliability section for any limitations that may warrant a rerun.');
    } else {
      findings.forEach((f, i) => {
        if (y > H - 150) { doc.addPage(); y = 80; drawPageHeader(doc); }
        
        doc.setFillColor(248, 250, 252);
        doc.rect(MARGIN, y, W - MARGIN * 2, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...NAVY_DARK);
        doc.text(`FINDING #${i+1}: ${f.title}`, MARGIN + 10, y + 15);
        
        const sevColor = f.severity?.toLowerCase() === 'critical' ? CRITICAL : 
                         f.severity?.toLowerCase() === 'high' ? HIGH :
                         f.severity?.toLowerCase() === 'medium' ? MEDIUM : LOW;
        
        doc.setFillColor(...sevColor);
        doc.rect(W - MARGIN - 70, y + 4, 60, 14, 'F');
        doc.setTextColor(255);
        doc.setFontSize(7);
        doc.text(f.severity?.toUpperCase() || 'UNKNOWN', W - MARGIN - 40, y + 13, { align: 'center' });
        
        y += 35;

        drawKeyValueTable([
          ['CVSS v3.1 Score', String(f.cvss_score ?? 'N/A')],
          ['OWASP Category', f.owasp || 'N/A'],
          ['AI Confidence', f.confidence_score != null ? `${f.confidence_score}%` : 'N/A'],
        ]);

        subTitle('Vulnerability Description (AI Analysis)');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...GREY_TEXT);
        doc.text('Note: This analysis is AI-generated for context and should be verified against the technical evidence below.', MARGIN, y - 5);
        
        bodyParagraph(f.description || f.business_impact || 'Verified issue detected. Refer to the technical evidence below for grounded details.');
        
        subTitle('Business Impact');
        bodyParagraph(f.business_impact || 'Potential for unauthorized access or data exposure.');
        
        subTitle('Reproducibility Steps');
        if (f.reproducibility_steps && Array.isArray(f.reproducibility_steps)) {
          f.reproducibility_steps.forEach((step, sIdx) => {
            bodyParagraph(`${sIdx + 1}. ${step}`, GREY_TEXT, 9);
            y -= 8;
          });
          y += 12;
        } else {
          bodyParagraph('Deterministic verification steps were not provided for this finding.');
        }

        subTitle('Technical Evidence');
        if (f.technical_evidence) {
          drawEvidenceBlock(f.technical_evidence);
        } else {
          bodyParagraph('No grounded technical evidence was retained for this finding.');
        }

        subTitle('Remediation Recommendations');
        bodyParagraph(f.fix || 'Apply security patches and harden configurations.', BLUE_PRIMARY, 9.5);
        
        y += 15;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(MARGIN, y, W - MARGIN, y);
        y += 25;
      });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 5: CONCLUSION & RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════════
    doc.addPage(); y = 80;
    drawPageHeader(doc);
    
    sectionTitle('5', 'Conclusion');
    bodyParagraph(buildConclusionText(r.target_url, findings, integrity));
    
    subTitle('Next Steps');
    const nextSteps = buildNextSteps(findings, integrity);
    nextSteps.forEach((step, idx) => bodyParagraph(`${idx + 1}. ${step}`));

    y += 30;

    // ═══════════════════════════════════════════════════════════════════
    // SECTION 6: APPENDICES (RAW LOGS)
    // ═══════════════════════════════════════════════════════════════════
    sectionTitle('6', 'Technical Appendix');
    bodyParagraph('Raw intelligence data logs gathered during the autonomous reconnaissance phase.');
    
    const logs = data.raw_logs || 'No raw logs available for this audit.';
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const logLines = doc.splitTextToSize(logs.substring(0, 12000), W - MARGIN * 2);
    
    for (const line of logLines) {
      if (y > H - 60) { doc.addPage(); y = 80; drawPageHeader(doc); doc.setFont('courier', 'normal'); doc.setFontSize(7); }
      doc.text(line, MARGIN, y);
      y += 9;
    }

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i > 1) drawPageFooter(doc, i, pageCount);
    }

    doc.save(`ReconX_Professional_Audit_${r.scan_id}.pdf`);
  } catch (err) {
    console.error('PDF Overhaul Error:', err);
    alert('Failed to generate industry-grade audit report.');
  }
}

function ReportCard({ r, idx }) {
  const [expanded, setExpanded] = useState(false);
  const isPending = r.status !== 'Completed' && r.status !== 'Failed';
  const data = sanitizeReportData(safeParseReport(r.report_json));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className={`glass rounded-2xl overflow-hidden border-[#0d230d] ${isPending ? 'opacity-80' : ''}`}
    >
      <div className="p-5 md:p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div
            className={`w-16 h-16 shrink-0 rounded-full border-2 flex flex-col items-center justify-center ${isPending ? 'animate-pulse' : ''}`}
            style={{ 
              borderColor: isPending ? '#22d3ee44' : SCORE_COLOR(r.score) + '44', 
              background: isPending ? '#22d3ee10' : SCORE_COLOR(r.score) + '10' 
            }}
          >
            {isPending ? (
              <Loader2 className="text-cyan-400 animate-spin" size={24} />
            ) : (
              <>
                <span className="text-xl font-black" style={{ color: SCORE_COLOR(r.score) }}>{r.score}</span>
                <span className="text-[8px] text-[var(--color-text-muted)] font-mono uppercase tracking-widest">Score</span>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-sm md:text-base font-bold text-white font-mono truncate max-w-xs">{r.target_url}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${isPending ? 'bg-cyan-500/10 text-cyan-400' : RISK_BADGE[r.risk]}`}>
                {isPending ? 'PROCESSING' : `${r.risk} Risk`}
              </span>
              {!isPending && data.scan_integrity && (
                <span 
                  className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold border ${
                    data.scan_integrity.status === 'HIGH' ? 'border-green-500/30 text-green-400 bg-green-500/5' :
                    data.scan_integrity.status === 'MEDIUM' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' :
                    'border-red-500/30 text-red-500 bg-red-500/5'
                  }`}
                  title={`Scan Integrity: ${data.scan_integrity.score}%`}
                >
                  {data.scan_integrity.status} INTEGRITY
                </span>
              )}
              <span className="text-[10px] text-[var(--color-text-muted)] bg-[#0d150d] border border-[#0d230d] px-2 py-0.5 rounded font-mono">#{r.scan_id}</span>
            </div>
            
            <p className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1 font-mono uppercase tracking-wider">
              <Clock size={11} /> {formatAuditTimestamp(r.created_at)} · {r.scan_type} Scan
            </p>

            <div className="flex items-start gap-2 bg-[#0d150d] rounded-xl px-4 py-3 border border-[#0d230d]">
              <Cpu size={14} className={`${isPending ? 'text-cyan-400 animate-pulse' : 'text-[var(--color-neon-green)]'} mt-0.5 shrink-0`} />
              <p className="text-xs text-[var(--color-text-muted)] italic leading-relaxed">
                <span className={`${isPending ? 'text-cyan-400' : 'text-[var(--color-neon-cyan)]'} font-bold not-italic font-mono uppercase text-[9px]`}>
                  {isPending ? 'AI Engine: ' : 'AI Analysis (Non-Authoritative): '}
                </span>
                {isPending ? "Autonomous reasoning engine is analyzing terminal data..." : getDisplayExecutiveSummary(r.target_url, data)}
              </p>
            </div>
          </div>

          <div className="flex gap-2 shrink-0 self-start lg:self-center">
            {!isPending && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-3 border border-[#0d230d] rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-neon-green)] hover:border-[var(--color-neon-green)]/40 transition-all bg-[#0a120a]"
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            )}
            <button
              onClick={() => generatePDF(r)}
              disabled={isPending}
              className={`p-3 rounded-xl transition-all shadow-lg flex items-center gap-2 font-mono text-xs font-bold
                ${isPending 
                  ? 'bg-gray-800/10 border border-gray-800 text-gray-600 cursor-not-allowed' 
                  : 'bg-[var(--color-neon-green)]/10 border border-[var(--color-neon-green)]/40 text-[var(--color-neon-green)] hover:bg-[var(--color-neon-green)] hover:text-black shadow-neon-green/10'}`}
            >
              <Download size={18} /> PDF
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#0d230d]"
          >
            <div className="p-6 space-y-5 bg-[#050805]/40 font-mono">
               <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                    <AlertTriangle size={12} className="text-yellow-500" /> Vulnerability Digest
                  </h3>
                  <div className="space-y-2">
                    {(data.findings_summary || [])
                      .slice()
                      .sort((a,b) => {
                        const scoreA = (SEVERITY_ORDER[a.severity] || 0) * 1000 + (a.confidence_score || 0);
                        const scoreB = (SEVERITY_ORDER[b.severity] || 0) * 1000 + (b.confidence_score || 0);
                        return scoreB - scoreA;
                      })
                      .map((f, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#0d150d] px-4 py-3 rounded-xl border border-[#0d230d]/50">
                        <span className="flex-1 text-xs text-white font-bold">{f.title}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[9px] text-cyan-400 font-mono font-bold bg-[#0a120a] px-2 py-0.5 rounded border border-cyan-400/20">CONF: {f.confidence_score || 0}%</span>
                           <span className="text-[9px] text-[var(--color-neon-green)] font-mono font-bold bg-[#0a120a] px-2 py-0.5 rounded border border-[var(--color-neon-green)]/20">CVSS {f.cvss_score || 'N/A'}</span>
                           <span className={`text-[9px] px-2 py-0.5 rounded font-bold badge-${f.severity?.toLowerCase() || 'medium'}`}>{f.severity}</span>
                           <span className="text-[9px] badge-info px-2 py-0.5 rounded uppercase">{f.owasp || 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                    {(data.findings_summary || []).length === 0 && (
                      <p className="text-xs text-[var(--color-text-muted)] italic px-4">No critical vulnerabilities were identified in this audit window.</p>
                    )}
                  </div>
               </div>

               {(data.positive_findings || data.test_results) && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.positive_findings && data.positive_findings.length > 0 && (
                      <div className="bg-[#0a1a0a] border border-green-900/30 rounded-xl p-4">
                        <h3 className="text-[9px] uppercase tracking-widest text-green-400 mb-2 flex items-center gap-2">
                          <Shield size={10} /> Positive Findings
                        </h3>
                        <ul className="space-y-1">
                          {data.positive_findings.map((f, i) => (
                            <li key={i} className="text-[10px] text-green-200/70 flex items-start gap-1">
                              <span className="text-green-500">✓</span> {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {data.assessment_limitations && data.assessment_limitations.length > 0 && (
                      <div className="bg-[#0a0a12] border border-slate-800 rounded-xl p-4">
                        <h3 className="text-[9px] uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                          <Info size={10} /> Assessment Limitations
                        </h3>
                        <ul className="space-y-1">
                          {data.assessment_limitations.map((l, i) => (
                            <li key={i} className="text-[10px] text-slate-300/70 flex items-start gap-1">
                              <span className="text-slate-500">•</span> {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                 </div>
               )}

               {data.test_results && data.test_results.length > 0 && (
                 <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                      <Search size={12} className="text-blue-400" /> Test Coverage Analysis
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {data.test_results.map((t, i) => (
                        <div key={i} className="bg-[#0a120a] border border-[#0d230d] p-2 rounded-lg flex flex-col gap-1">
                          <span className="text-[10px] text-white font-bold">{t.tool}</span>
                          <span className="text-[9px] text-[var(--color-text-muted)]">{t.status}</span>
                        </div>
                      ))}
                    </div>
                 </div>
               )}

               {data.remediation_priority && (
                 <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                      <Shield size={12} className="text-[var(--color-neon-green)]" /> Remediation Priority
                    </h3>
                    <ul className="space-y-1.5 ml-2">
                      {data.remediation_priority.map((p, i) => (
                        <li key={i} className="text-[11px] text-[var(--color-text-muted)] flex items-start gap-2">
                          <span className="text-[var(--color-neon-green)] leading-none mt-1">▶</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                 </div>
               )}

               {data.raw_logs && (
                 <div>
                    <h3 className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] mb-3 flex items-center gap-2">
                      <Terminal size={12} className="text-[var(--color-neon-cyan)]" /> Technical Operator Logs
                    </h3>
                    <div className="bg-[#050805] border border-[#0d230d] rounded-xl p-4 max-h-60 overflow-y-auto font-mono text-[10px] leading-relaxed text-[var(--color-text-muted)] whitespace-pre-wrap terminal-scroll">
                      {data.raw_logs}
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  const fetchReports = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await reportService.getAll();
      
      if (reports.length > 0) {
        reports.forEach(oldR => {
          const newR = res.data.find(r => r.scan_id === oldR.scan_id);
          if (oldR.status !== 'Completed' && newR?.status === 'Completed') {
            setNotification(`Intelligence Report Ready: ${newR.target_url}`);
            setTimeout(() => setNotification(null), 8000);
          }
        });
      }

      setReports(res.data);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [reports]);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    const hasPending = reports.some(r => r.status !== 'Completed' && r.status !== 'Failed');
    if (!hasPending) return;

    const interval = setInterval(() => {
      fetchReports(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [reports, fetchReports]);

  return (
    <div className="space-y-6 pb-12 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[var(--color-neon-green)] text-black px-6 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-3 border border-white/20"
          >
            <Shield size={20} />
            {notification}
            <button onClick={() => setNotification(null)} className="ml-4 opacity-50 hover:opacity-100">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <FileText className="text-[var(--color-neon-green)]" size={26} />
            AI Intelligence Reports
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 font-mono">
            {reports.length} security audits detected in our audit trail.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-neon-green)]/20 border-t-[var(--color-neon-green)] rounded-full animate-spin" />
        </div>
      ) : reports.length > 0 ? (
        <div className="space-y-5">
          {reports.map((r, i) => <ReportCard key={r.scan_id} r={r} idx={i} />)}
        </div>
      ) : (
        <div className="glass p-16 flex flex-col items-center text-center gap-5">
          <div className="p-4 bg-[#0a120a] rounded-full border border-[#0d230d]">
             <Search size={32} className="text-[var(--color-text-muted)] opacity-50" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white font-mono">No reports available.</p>
            <p className="text-xs text-[var(--color-text-muted)] font-mono">Completed scans automatically generate AI analysis reports here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
