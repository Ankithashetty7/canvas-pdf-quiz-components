// Quiz engine shared by the `quiz` wrapper and its data child components.
//
// Canvas renders every slot child as its own component, so the wrapper cannot
// read child props through React. Instead each child renders a node with
// `data-quiz-type` and a JSON `data-quiz-item` payload, and the wrapper reads
// the model back from the DOM.

export const QUIZ_TYPE_ATTR = 'data-quiz-type';
export const QUIZ_ITEM_ATTR = 'data-quiz-item';

export const quizItemAttrs = (type, item) => ({
  [QUIZ_TYPE_ATTR]: type,
  [QUIZ_ITEM_ATTR]: JSON.stringify(item),
});

const readItem = (el) => {
  try {
    return JSON.parse(el.getAttribute(QUIZ_ITEM_ATTR) || '{}');
  } catch {
    return {};
  }
};

const ofType = (scope, type) =>
  Array.from(scope.querySelectorAll(`[${QUIZ_TYPE_ATTR}="${type}"]`));

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

// Extracts list items from a formatted-text (HTML) prop. Falls back to
// paragraphs or line breaks so editors can author either way.
export const htmlToList = (html) => {
  if (!html) return [];
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let nodes = Array.from(doc.querySelectorAll('li'));
  if (!nodes.length) nodes = Array.from(doc.querySelectorAll('p'));
  const items = nodes.length
    ? nodes.map((n) => n.textContent)
    : (doc.body.textContent || '').split(/\n+/);
  return items.map((s) => s.trim()).filter(Boolean);
};

export const collectModel = (root) => {
  const questions = ofType(root, 'question').map((el) => {
    const item = readItem(el);
    const options = ofType(el, 'option').map((optEl, i) => {
      const opt = readItem(optEl);
      return {
        label: opt.label || `Option ${i + 1}`,
        description: opt.description || '',
        score: toNumber(opt.score, i + 1),
      };
    });
    return {
      category: item.category || 'General',
      question: item.question || '',
      description: item.description || '',
      options,
    };
  });

  const categories = ofType(root, 'category').map((el) => {
    const item = readItem(el);
    const tiers = {};
    ofType(el, 'category-tier').forEach((tierEl) => {
      const tier = readItem(tierEl);
      if (!tier.tier) return;
      tiers[tier.tier] = {
        insight: tier.insight || '',
        whatItMeans: tier.whatItMeans || '',
        recommendations: htmlToList(tier.recommendations),
      };
    });
    const actions = {};
    ofType(el, 'action').forEach((actionEl) => {
      const action = readItem(actionEl);
      actions[action.appliesWhen || 'below_benchmark'] = {
        action: action.action || '',
        impact: action.impact || 'medium',
        effort: action.effort || 'medium',
        timeframe: action.timeframe || '',
        detail: action.detail || '',
      };
    });
    return {
      name: item.name || '',
      focusArea: item.focusArea || '',
      vendorBenchmark: toNumber(item.vendorBenchmark, 50),
      customerBenchmark: toNumber(item.customerBenchmark, 50),
      tiers,
      actions,
    };
  });

  const bands = ofType(root, 'result-band').map((el) => {
    const item = readItem(el);
    return {
      ...item,
      minPercent: toNumber(item.minPercent, 0),
      maxPercent: toNumber(item.maxPercent, 100),
    };
  });

  const reportEl = ofType(root, 'report')[0];
  const report = reportEl ? readItem(reportEl) : {};
  report.nextSteps = reportEl
    ? ofType(reportEl, 'next-step').map((stepEl) => readItem(stepEl))
    : [];

  // Category order follows the category components; categories referenced by
  // questions but not authored are appended with neutral benchmarks.
  const known = new Set(categories.map((c) => c.name));
  questions.forEach((q) => {
    if (!known.has(q.category)) {
      known.add(q.category);
      categories.push({
        name: q.category,
        focusArea: '',
        vendorBenchmark: 50,
        customerBenchmark: 50,
        tiers: {},
        actions: {},
      });
    }
  });

  return { questions, categories, bands, report };
};

// Picks the first band that covers `pct` and defines `field`.
export const bandValue = (bands, pct, field) => {
  const band = bands.find(
    (b) =>
      pct >= b.minPercent &&
      pct <= b.maxPercent &&
      b[field] !== undefined &&
      b[field] !== '',
  );
  return band ? band[field] : '';
};

export const tierFor = (pct, thresholds) =>
  pct <= thresholds.low ? 'low' : pct <= thresholds.mid ? 'mid' : 'high';

// Template syntax used in authored copy:
//   {token}                       -> value of token
//   {?token>3|when true|else}     -> conditional on a numeric token
// Supported operators: > >= < <= == !=
const CONDITIONAL =
  /\{\?(\w+)(>=|<=|==|!=|>|<)(-?\d+(?:\.\d+)?)\|((?:[^|{}]|\{\w+\})*)\|((?:[^|{}]|\{\w+\})*)\}/g;

const compare = (a, op, b) => {
  switch (op) {
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '==':
      return a === b;
    default:
      return a !== b;
  }
};

export const fillTemplate = (template, tokens) => {
  if (!template) return '';
  const withConditionals = template.replace(
    CONDITIONAL,
    (_, name, op, num, whenTrue, whenFalse) =>
      compare(Number(tokens[name]), op, Number(num)) ? whenTrue : whenFalse,
  );
  return withConditionals.replace(/\{(\w+)\}/g, (match, name) =>
    tokens[name] !== undefined ? String(tokens[name]) : match,
  );
};

const joinList = (items) => {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

export const calculateResults = (model, answers, thresholds) => {
  const { questions, categories, bands } = model;
  const catMap = {};
  questions.forEach((q, i) => {
    const max = Math.max(0, ...q.options.map((o) => o.score));
    if (!catMap[q.category]) catMap[q.category] = { total: 0, max: 0 };
    catMap[q.category].total += answers[i] || 0;
    catMap[q.category].max += max;
  });

  const categoryScores = categories.map((cat) => {
    const d = catMap[cat.name] || { total: 0, max: 4 };
    const percentage = d.max ? Math.round((d.total / d.max) * 100) : 0;
    const tier = tierFor(percentage, thresholds);
    return {
      category: cat.name,
      focusArea: cat.focusArea,
      score: d.total,
      maxScore: d.max,
      percentage,
      tier,
      level: bandValue(bands, percentage, 'categoryLevel'),
      recommendations: cat.tiers[tier]?.recommendations || [],
      insight: cat.tiers[tier]?.insight || '',
      whatItMeans: cat.tiers[tier]?.whatItMeans || '',
      actions: cat.actions,
      benchmarkVendor: cat.vendorBenchmark,
      benchmarkCustomer: cat.customerBenchmark,
    };
  });

  const overallScore = Object.values(answers).reduce((a, b) => a + b, 0);
  const maxTotal = questions.reduce(
    (sum, q) => sum + Math.max(0, ...q.options.map((o) => o.score)),
    0,
  );
  const overallPercentage = maxTotal
    ? Math.round((overallScore / maxTotal) * 100)
    : 0;

  return {
    overallScore,
    overallPercentage,
    overallLevel: bandValue(bands, overallPercentage, 'overallLevel'),
    categoryScores,
  };
};

// The focus area with the most below-benchmark categories. Ties go to the
// broader focus area (the one covering more categories).
const dominantFocusArea = (scores) => {
  const groups = {};
  scores.forEach((s) => {
    if (!s.focusArea) return;
    groups[s.focusArea] ||= { below: 0, size: 0 };
    groups[s.focusArea].size += 1;
    if (s.percentage < s.benchmarkVendor) groups[s.focusArea].below += 1;
  });
  const ranked = Object.entries(groups).sort(
    ([, a], [, b]) => b.below - a.below || b.size - a.size,
  );
  return ranked[0]?.[0] || '';
};

export const resultTokens = (result, company) => {
  const scores = result.categoryScores;
  const sorted = [...scores].sort((a, b) => a.percentage - b.percentage);
  const weakest = sorted[0] || { category: '', percentage: 0 };
  const strongest = sorted[sorted.length - 1] || weakest;
  const below = scores.filter((c) => c.percentage < c.benchmarkVendor);
  return {
    percent: result.overallPercentage,
    level: result.overallLevel,
    company: company || '',
    weakest: weakest.category,
    weakestPercent: weakest.percentage,
    weakestGap: (weakest.benchmarkVendor || 0) - weakest.percentage,
    strongest: strongest.category,
    strongestPercent: strongest.percentage,
    belowCount: below.length,
    categoryCount: scores.length,
    pattern: dominantFocusArea(scores),
    topGaps: joinList(sorted.slice(0, 3).map((s) => s.category)),
  };
};

export const priorityActions = (scores) =>
  [...scores]
    .sort(
      (a, b) =>
        b.benchmarkVendor - b.percentage - (a.benchmarkVendor - a.percentage),
    )
    .map((cs) =>
      cs.percentage >= cs.benchmarkVendor
        ? cs.actions.above_benchmark
        : cs.actions.below_benchmark,
    )
    .filter((a) => a && a.action)
    .slice(0, 6);

export const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
      }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', reject);
    document.head.appendChild(script);
  });
