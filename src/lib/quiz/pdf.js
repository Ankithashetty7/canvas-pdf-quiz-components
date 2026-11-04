import {
  bandValue,
  fillTemplate,
  loadScript,
  priorityActions,
  resultTokens,
} from '@/lib/quiz/engine';

const PDFMAKE =
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js';
const PDFMAKE_FONTS =
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.min.js';

// pdfmake is ~1MB, so it is only fetched when a visitor asks for a report.
const loadPdfMake = async () => {
  if (window.pdfMake?.vfs) return window.pdfMake;
  await loadScript(PDFMAKE);
  await loadScript(PDFMAKE_FONTS);
  return window.pdfMake;
};

const NAVY = '#1B1464';
const TEAL = '#00B0B9';
const RED = '#C83C32';
const AMBER = '#C88C00';
const GREEN = '#009688';
const DARK = '#1E1E32';
const GRAY = '#646478';
const WHITE = '#FFFFFF';
const BG = '#F5F7FC';
const TEAL_LIGHT = '#E6F8F6';
const RED_LIGHT = '#FFF0EE';

const LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

export const pdfFileName = (report, company) => {
  const prefix = report.fileNamePrefix || 'Assessment_Report';
  return `${prefix}_${(company || 'Report').replace(/\s+/g, '_')}.pdf`;
};

export const buildReportDoc = ({ model, result, userInfo, thresholds }) => {
  const report = model.report || {};
  const company = userInfo.company;
  const tokens = resultTokens(result, company);
  const lc = (pct) =>
    pct <= thresholds.low ? RED : pct <= thresholds.mid ? AMBER : GREEN;

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const pct = result.overallPercentage;
  const scores = result.categoryScores;
  const impact = {
    low: bandValue(model.bands, pct, 'upliftExpected'),
    high: bandValue(model.bands, pct, 'upliftMaximum'),
    text: bandValue(model.bands, pct, 'upliftText'),
  };
  const actions = priorityActions(scores);
  const strengths = [...scores]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 2);
  const weaknesses = [...scores]
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 2);
  const sorted = [...scores].sort((a, b) => a.percentage - b.percentage);
  const belowAvg = scores.filter((s) => s.percentage < s.benchmarkVendor);
  const top = scores.reduce((a, b) => (a.percentage > b.percentage ? a : b));
  const findings = [
    `${company} scores ${belowAvg.length} of ${scores.length} categories below vendor average`,
    `Biggest gap: ${sorted[0].category} at ${sorted[0].percentage}% (vendor avg: ${sorted[0].benchmarkVendor}%)`,
    `Key strength: ${top.category} at ${top.percentage}%`,
  ];
  if (impact.low) {
    findings.push(
      `Estimated revenue uplift from addressing gaps: ${impact.low} (max: ${impact.high})`,
    );
  }

  const brand = report.brandName || '';
  const sectionTitle = (title) => ({
    stack: [
      {
        text: title,
        fontSize: 13,
        bold: true,
        color: NAVY,
        margin: [0, 0, 0, 2],
      },
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 90,
            y2: 0,
            lineWidth: 1.5,
            lineColor: TEAL,
          },
          {
            type: 'line',
            x1: 90,
            y1: 0,
            x2: 475,
            y2: 0,
            lineWidth: 0.3,
            lineColor: '#DCDCE8',
          },
        ],
      },
    ],
    margin: [0, 0, 0, 8],
  });

  const catDetails = scores.map((cs) => {
    const col = lc(cs.percentage);
    const bw = 240;
    const fw = Math.max((bw * cs.percentage) / 100, 3);
    const vx = (bw * cs.benchmarkVendor) / 100;
    return {
      stack: [
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    {
                      columns: [
                        {
                          text: cs.category,
                          fontSize: 11,
                          bold: true,
                          color: NAVY,
                          width: '*',
                        },
                        {
                          stack: [
                            {
                              text: `${cs.percentage}%`,
                              fontSize: 18,
                              bold: true,
                              color: col,
                              alignment: 'right',
                            },
                            {
                              text: cs.level,
                              fontSize: 7,
                              color: GRAY,
                              alignment: 'right',
                            },
                          ],
                          width: 60,
                        },
                      ],
                      margin: [0, 0, 0, 6],
                    },
                    {
                      canvas: [
                        {
                          type: 'rect',
                          x: 0,
                          y: 0,
                          w: bw,
                          h: 8,
                          r: 2,
                          color: '#E6E8F0',
                        },
                        {
                          type: 'rect',
                          x: 0,
                          y: 0,
                          w: fw,
                          h: 8,
                          r: 2,
                          color: col,
                        },
                        {
                          type: 'line',
                          x1: vx,
                          y1: -2,
                          x2: vx,
                          y2: 10,
                          lineWidth: 1.2,
                          lineColor: NAVY,
                        },
                      ],
                    },
                    {
                      columns: [
                        {
                          text: `Vendor Avg: ${cs.benchmarkVendor}%`,
                          fontSize: 6,
                          color: '#A0A0AF',
                        },
                        {
                          text: `Customer Exp: ${cs.benchmarkCustomer}%`,
                          fontSize: 6,
                          color: '#A0A0AF',
                        },
                      ],
                      margin: [0, 2, 0, 8],
                    },
                    {
                      text: 'What This Means',
                      fontSize: 8,
                      bold: true,
                      color: NAVY,
                      margin: [0, 0, 0, 3],
                    },
                    {
                      text: fillTemplate(cs.whatItMeans, tokens),
                      fontSize: 7.5,
                      color: DARK,
                      margin: [0, 0, 0, 6],
                    },
                    {
                      text: 'Recommended Actions',
                      fontSize: 8,
                      bold: true,
                      color: NAVY,
                      margin: [0, 0, 0, 3],
                    },
                    ...cs.recommendations.map((r, i) => ({
                      columns: [
                        {
                          text: `${i + 1}.`,
                          fontSize: 7.5,
                          bold: true,
                          color: TEAL,
                          width: 12,
                        },
                        { text: r, fontSize: 7.5, color: DARK, width: '*' },
                      ],
                      margin: [0, 0, 0, 3],
                    })),
                  ],
                  fillColor: BG,
                  margin: [10, 10, 10, 10],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (i) => (i === 0 ? 2 : 0),
            vLineColor: () => col,
          },
          margin: [0, 0, 0, 8],
        },
      ],
    };
  });

  const actionRows = actions.map((a, i) => [
    {
      text: `${i + 1}`,
      fontSize: 7.5,
      bold: true,
      alignment: 'center',
      color: DARK,
    },
    { text: a.action, fontSize: 7.5, color: DARK },
    {
      text: LABELS[a.impact] || a.impact,
      fontSize: 7.5,
      alignment: 'center',
      color: a.impact === 'high' ? GREEN : AMBER,
      bold: true,
    },
    {
      text: LABELS[a.effort] || a.effort,
      fontSize: 7.5,
      alignment: 'center',
      color: DARK,
    },
    { text: a.timeframe, fontSize: 7.5, alignment: 'center', color: DARK },
  ]);

  const benchRows = scores.map((cs) => {
    const gap = cs.percentage - cs.benchmarkVendor;
    return [
      { text: cs.category, fontSize: 7.5, bold: true, color: DARK },
      {
        text: `${cs.percentage}%`,
        fontSize: 7.5,
        color: lc(cs.percentage),
        bold: true,
        alignment: 'center',
      },
      {
        text: `${cs.benchmarkVendor}%`,
        fontSize: 7.5,
        color: DARK,
        alignment: 'center',
      },
      {
        text: `${cs.benchmarkCustomer}%`,
        fontSize: 7.5,
        color: DARK,
        alignment: 'center',
      },
      {
        text: gap >= 0 ? `+${gap}pts` : `${gap}pts`,
        fontSize: 7.5,
        bold: true,
        color: gap >= 0 ? GREEN : RED,
        alignment: 'center',
      },
      { text: cs.level, fontSize: 7.5, color: DARK, alignment: 'center' },
    ];
  });

  const headerCell = (text, alignment) => ({
    text,
    fontSize: 7.5,
    bold: true,
    color: WHITE,
    alignment,
    fillColor: NAVY,
  });

  const content = [
    // Cover
    {
      stack: [
        {
          canvas: [
            { type: 'rect', x: -40, y: -40, w: 595, h: 175, color: NAVY },
            { type: 'rect', x: -40, y: 135, w: 595, h: 3, color: TEAL },
          ],
        },
        {
          stack: [
            {
              text: brand,
              fontSize: 16,
              bold: true,
              color: WHITE,
              margin: [0, -165, 0, 2],
            },
            {
              text: report.tagline || '',
              fontSize: 7,
              color: '#B4B4D4',
              margin: [0, 0, 0, 24],
            },
            {
              text: report.reportTitle || '',
              fontSize: 28,
              bold: true,
              color: WHITE,
            },
            {
              text: report.reportTitleAccent || '',
              fontSize: 28,
              bold: true,
              color: TEAL,
              margin: [0, 0, 0, 14],
            },
            {
              text: `Prepared for ${userInfo.firstName} ${userInfo.lastName}  |  ${company}`,
              fontSize: 9,
              color: '#C8C8DC',
              margin: [0, 0, 0, 4],
            },
            { text: dateStr, fontSize: 8, color: '#A0A0BE' },
          ],
        },
      ],
    },
    { text: '', pageBreak: 'after' },

    // Executive summary
    sectionTitle('Executive Summary'),
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            {
              stack: [
                {
                  text: `${pct}%`,
                  fontSize: 30,
                  bold: true,
                  color: lc(pct),
                  alignment: 'center',
                },
                {
                  text: 'OVERALL SCORE',
                  fontSize: 6,
                  color: '#B4B4D4',
                  alignment: 'center',
                },
              ],
              fillColor: NAVY,
              margin: [6, 10, 6, 10],
            },
            {
              stack: [
                {
                  text: result.overallLevel,
                  fontSize: 13,
                  bold: true,
                  color: WHITE,
                  alignment: 'center',
                },
                {
                  text: 'MATURITY LEVEL',
                  fontSize: 6,
                  color: '#B4B4D4',
                  alignment: 'center',
                },
              ],
              fillColor: NAVY,
              margin: [6, 14, 6, 10],
            },
            {
              stack: [
                {
                  text: impact.low || '—',
                  fontSize: 13,
                  bold: true,
                  color: TEAL,
                  alignment: 'center',
                },
                {
                  text: 'REVENUE UPLIFT',
                  fontSize: 6,
                  color: '#B4B4D4',
                  alignment: 'center',
                },
              ],
              fillColor: NAVY,
              margin: [6, 14, 6, 10],
            },
            {
              stack: [
                {
                  text: weaknesses[0]?.category || '',
                  fontSize: weaknesses[0]?.category.length > 14 ? 8 : 11,
                  bold: true,
                  color: RED,
                  alignment: 'center',
                },
                {
                  text: `${weaknesses[0]?.percentage || 0}%`,
                  fontSize: 11,
                  bold: true,
                  color: RED,
                  alignment: 'center',
                },
                {
                  text: 'BIGGEST GAP',
                  fontSize: 6,
                  color: '#B4B4D4',
                  alignment: 'center',
                },
              ],
              fillColor: NAVY,
              margin: [6, 8, 6, 8],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: (i) => (i === 0 || i === 4 ? 0 : 0.3),
        vLineColor: () => '#3C378C',
      },
      margin: [0, 0, 0, 10],
    },
    {
      text: fillTemplate(
        bandValue(model.bands, pct, 'executiveSummary'),
        tokens,
      ),
      fontSize: 8.5,
      color: DARK,
      margin: [0, 0, 0, 10],
    },

    // Key findings
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                {
                  text: 'KEY FINDINGS AT A GLANCE',
                  fontSize: 9,
                  bold: true,
                  color: TEAL,
                  margin: [0, 0, 0, 6],
                },
                ...findings.map((f) => ({
                  text: `• ${f}`,
                  fontSize: 7.5,
                  color: '#DCDCEB',
                  margin: [0, 0, 0, 3],
                })),
              ],
              fillColor: NAVY,
              margin: [12, 10, 12, 8],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10],
    },

    // Strengths and gaps
    {
      columns: [
        {
          width: '50%',
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    {
                      text: 'TOP STRENGTHS',
                      fontSize: 8,
                      bold: true,
                      color: TEAL,
                      margin: [0, 0, 0, 6],
                    },
                    ...strengths.map((s) => {
                      const d = s.percentage - s.benchmarkVendor;
                      return {
                        stack: [
                          {
                            columns: [
                              {
                                text: s.category,
                                fontSize: 7.5,
                                bold: true,
                                color: DARK,
                                width: '*',
                              },
                              {
                                text: `${s.percentage}%`,
                                fontSize: 9,
                                bold: true,
                                color: TEAL,
                                width: 'auto',
                              },
                            ],
                          },
                          {
                            text:
                              d >= 0
                                ? `${d}pts above vendor average`
                                : `${Math.abs(d)}pts below vendor avg`,
                            fontSize: 6.5,
                            color: GRAY,
                            margin: [0, 1, 0, 5],
                          },
                        ],
                      };
                    }),
                  ],
                  fillColor: TEAL_LIGHT,
                  margin: [10, 8, 10, 8],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (i) => (i === 0 ? 2 : 0),
            vLineColor: () => TEAL,
          },
        },
        { width: 8, text: '' },
        {
          width: '50%',
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    {
                      text: 'PRIORITY GAPS',
                      fontSize: 8,
                      bold: true,
                      color: RED,
                      margin: [0, 0, 0, 6],
                    },
                    ...weaknesses.map((s) => {
                      const d = s.benchmarkVendor - s.percentage;
                      return {
                        stack: [
                          {
                            columns: [
                              {
                                text: s.category,
                                fontSize: 7.5,
                                bold: true,
                                color: DARK,
                                width: '*',
                              },
                              {
                                text: `${s.percentage}%`,
                                fontSize: 9,
                                bold: true,
                                color: RED,
                                width: 'auto',
                              },
                            ],
                          },
                          {
                            text:
                              d > 0
                                ? `${d}pts below vendor average`
                                : 'At or above vendor average',
                            fontSize: 6.5,
                            color: GRAY,
                            margin: [0, 1, 0, 5],
                          },
                        ],
                      };
                    }),
                  ],
                  fillColor: RED_LIGHT,
                  margin: [10, 8, 10, 8],
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0,
            vLineWidth: (i) => (i === 0 ? 2 : 0),
            vLineColor: () => RED,
          },
        },
      ],
      margin: [0, 0, 0, 16],
    },

    // Benchmark bars
    sectionTitle('Performance vs. Industry Benchmarks'),
    {
      columns: [
        {
          canvas: [
            { type: 'rect', x: 0, y: 2, w: 16, h: 7, r: 1, color: TEAL },
          ],
          width: 20,
        },
        { text: 'Your Score', fontSize: 6.5, color: GRAY, width: 60 },
        {
          canvas: [{ type: 'rect', x: 0, y: 2, w: 3, h: 7, color: NAVY }],
          width: 8,
        },
        { text: 'Vendor Average', fontSize: 6.5, color: GRAY, width: 80 },
        {
          canvas: [{ type: 'rect', x: 0, y: 2, w: 3, h: 7, color: TEAL }],
          width: 8,
        },
        {
          text: 'Customer Expectation',
          fontSize: 6.5,
          color: GRAY,
          width: '*',
        },
      ],
      margin: [0, 0, 0, 8],
    },
    ...scores.map((cs) => {
      const bw = 320;
      const fw = Math.max((bw * cs.percentage) / 100, 3);
      const vx = (bw * cs.benchmarkVendor) / 100;
      const cx = (bw * cs.benchmarkCustomer) / 100;
      return {
        columns: [
          {
            text: cs.category,
            fontSize: 7.5,
            bold: true,
            color: DARK,
            width: 110,
          },
          {
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: bw,
                h: 10,
                r: 2,
                color: '#E6E8F0',
              },
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: fw,
                h: 10,
                r: 2,
                color: lc(cs.percentage),
              },
              {
                type: 'line',
                x1: vx,
                y1: -2,
                x2: vx,
                y2: 12,
                lineWidth: 1.5,
                lineColor: NAVY,
              },
              {
                type: 'line',
                x1: cx,
                y1: -2,
                x2: cx,
                y2: 12,
                lineWidth: 1.5,
                lineColor: TEAL,
              },
            ],
            width: 320,
          },
          {
            text: `${cs.percentage}%`,
            fontSize: 7,
            bold: true,
            color: lc(cs.percentage),
            width: 30,
            alignment: 'right',
          },
        ],
        margin: [0, 3, 0, 7],
      };
    }),

    // Category detail
    { text: '', pageBreak: 'before' },
    sectionTitle('Detailed Category Analysis'),
    {
      text: 'Each category below shows your score, how you compare to peers, what it means for your business, and specific actions to improve.',
      fontSize: 8,
      color: GRAY,
      margin: [0, 0, 0, 10],
    },
    ...catDetails,

    // Action plan
    { text: '', pageBreak: 'before' },
    sectionTitle('Priority Action Plan'),
    {
      text: `Based on ${company}'s assessment results, here are the highest-impact actions ranked by potential revenue impact and implementation feasibility.`,
      fontSize: 8,
      color: GRAY,
      margin: [0, 0, 0, 10],
    },
    {
      table: {
        headerRows: 1,
        widths: [18, '*', 45, 35, 50],
        body: [
          [
            headerCell('#', 'center'),
            headerCell('Action'),
            headerCell('Revenue Impact', 'center'),
            headerCell('Effort', 'center'),
            headerCell('Timeframe', 'center'),
          ],
          ...actionRows,
        ],
      },
      layout: {
        hLineWidth: (i) => (i === 0 || i === 1 ? 0 : 0.3),
        vLineWidth: () => 0,
        hLineColor: () => '#DCDCE8',
        fillColor: (row) => (row > 0 && row % 2 === 0 ? BG : null),
      },
      margin: [0, 0, 0, 12],
    },
    {
      text: 'Action Details',
      fontSize: 8.5,
      bold: true,
      color: NAVY,
      margin: [0, 0, 0, 6],
    },
    ...actions.map((a, i) => ({
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                {
                  text: `${i + 1}. ${a.action}`,
                  fontSize: 8,
                  bold: true,
                  color: NAVY,
                  margin: [0, 0, 0, 3],
                },
                { text: a.detail, fontSize: 7.5, color: DARK },
              ],
              fillColor: BG,
              margin: [8, 6, 8, 6],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 4],
    })),
  ];

  if (impact.low) {
    content.push(sectionTitle('Estimated Revenue Impact'), {
      table: {
        widths: ['*', '*', '*'],
        body: [
          [
            {
              stack: [
                {
                  text: impact.low,
                  fontSize: 22,
                  bold: true,
                  color: TEAL,
                  alignment: 'center',
                },
                {
                  text: 'Expected Revenue Uplift',
                  fontSize: 7,
                  color: GRAY,
                  alignment: 'center',
                },
              ],
              margin: [8, 12, 8, 8],
            },
            {
              stack: [
                {
                  text: impact.high,
                  fontSize: 22,
                  bold: true,
                  color: NAVY,
                  alignment: 'center',
                },
                {
                  text: 'Maximum Potential',
                  fontSize: 7,
                  color: GRAY,
                  alignment: 'center',
                },
              ],
              margin: [8, 12, 8, 8],
            },
            {
              text: impact.text,
              fontSize: 7,
              color: DARK,
              margin: [8, 10, 8, 8],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: (i) => (i === 0 || i === 3 ? 0.5 : 0.3),
        hLineColor: () => TEAL,
        vLineColor: () => TEAL,
        fillColor: () => TEAL_LIGHT,
      },
      margin: [0, 0, 0, 16],
    });
  }

  content.push(
    sectionTitle('Full Benchmark Comparison'),
    {
      text: report.benchmarkSource || '',
      fontSize: 7,
      color: GRAY,
      margin: [0, 0, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        widths: ['*', 45, 50, 55, 55, 55],
        body: [
          [
            { ...headerCell('Category'), fontSize: 7 },
            { ...headerCell('Your Score', 'center'), fontSize: 7 },
            { ...headerCell('Vendor Avg', 'center'), fontSize: 7 },
            { ...headerCell('Customer Exp.', 'center'), fontSize: 7 },
            { ...headerCell('Gap vs. Vendors', 'center'), fontSize: 7 },
            { ...headerCell('Maturity Level', 'center'), fontSize: 7 },
          ],
          ...benchRows,
        ],
      },
      layout: {
        hLineWidth: (i) => (i === 0 || i === 1 ? 0 : 0.3),
        vLineWidth: () => 0,
        hLineColor: () => '#DCDCE8',
        fillColor: (row) => (row > 0 && row % 2 === 0 ? BG : null),
      },
      margin: [0, 0, 0, 16],
    },
  );

  if (report.nextSteps?.length) {
    content.push(
      sectionTitle('Recommended Next Steps'),
      ...report.nextSteps.map((ns, i) => ({
        columns: [
          {
            text: `${i + 1}`,
            fontSize: 10,
            bold: true,
            color: TEAL,
            width: 16,
          },
          {
            stack: [
              {
                text: ns.title,
                fontSize: 9,
                bold: true,
                color: NAVY,
                margin: [0, 0, 0, 2],
              },
              {
                text: fillTemplate(ns.detail, tokens),
                fontSize: 7.5,
                color: DARK,
              },
            ],
            width: '*',
          },
        ],
        margin: [0, 0, 0, 10],
      })),
    );
  }

  if (report.ctaHeading) {
    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                {
                  text: report.ctaHeading,
                  fontSize: 12,
                  bold: true,
                  color: WHITE,
                  margin: [0, 0, 0, 6],
                },
                {
                  text: report.ctaText || '',
                  fontSize: 8,
                  color: '#C8C8DC',
                  margin: [0, 0, 0, 8],
                },
                {
                  text: report.ctaLinkLabel || '',
                  fontSize: 8.5,
                  bold: true,
                  color: TEAL,
                },
              ],
              fillColor: NAVY,
              margin: [16, 12, 16, 12],
            },
          ],
        ],
      },
      layout: 'noBorders',
    });
  }

  return {
    pageSize: 'A4',
    pageMargins: [40, 50, 40, 60],
    footer: (pg, total) => ({
      stack: [
        {
          canvas: [
            { type: 'rect', x: 0, y: 0, w: 595, h: 26, color: NAVY },
            { type: 'rect', x: 0, y: 0, w: 595, h: 1, color: TEAL },
          ],
        },
        {
          columns: [
            {
              text: brand,
              fontSize: 6.5,
              bold: true,
              color: WHITE,
              width: '*',
            },
            {
              text: `Confidential — Prepared for ${company}${report.copyrightText ? `  |  ${report.copyrightText}` : ''}`,
              fontSize: 5.5,
              color: '#8C8CAF',
              alignment: 'center',
              width: '*',
            },
            {
              text: `${pg} / ${total}`,
              fontSize: 6,
              color: '#A0A0BE',
              alignment: 'right',
              width: '*',
            },
          ],
          margin: [40, -20, 40, 0],
        },
      ],
    }),
    header: (pg) =>
      pg === 1
        ? null
        : {
            stack: [
              {
                canvas: [
                  { type: 'rect', x: 0, y: 0, w: 595, h: 22, color: NAVY },
                  { type: 'rect', x: 0, y: 22, w: 595, h: 1.5, color: TEAL },
                ],
              },
              {
                columns: [
                  {
                    text: brand,
                    fontSize: 8,
                    bold: true,
                    color: WHITE,
                    width: '*',
                  },
                  {
                    text: report.websiteLabel || '',
                    fontSize: 6,
                    color: '#A0A0BE',
                    alignment: 'right',
                    width: 'auto',
                  },
                ],
                margin: [40, -16, 40, 0],
              },
            ],
          },
    content,
  };
};

export const downloadReport = async (args) => {
  const pdfMake = await loadPdfMake();
  const doc = buildReportDoc(args);
  pdfMake
    .createPdf(doc)
    .download(pdfFileName(args.model.report || {}, args.userInfo.company));
};
