import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DemoLeadForm, HubSpotForm, MarketoForm } from '@/lib/lead-forms';
import {
  bandValue,
  calculateResults,
  collectModel,
  fillTemplate,
  resultTokens,
} from '@/lib/quiz/engine';
import { downloadReport } from '@/lib/quiz/pdf';
import { cn } from 'drupal-canvas';

const EMPTY_MODEL = { questions: [], categories: [], bands: [], report: {} };
const ADVANCE_DELAY = 320;
const LEAVE_DELAY = 400;

const TIER_STYLES = {
  low: {
    text: 'text-red-500',
    bg: 'bg-red-500',
    stroke: 'stroke-red-500',
    soft: 'bg-red-500/10',
  },
  mid: {
    text: 'text-amber-500',
    bg: 'bg-amber-500',
    stroke: 'stroke-amber-500',
    soft: 'bg-amber-500/10',
  },
  high: {
    text: 'text-emerald-500',
    bg: 'bg-emerald-500',
    stroke: 'stroke-emerald-500',
    soft: 'bg-emerald-500/10',
  },
};

const tierOf = (pct, t) =>
  pct <= t.low ? 'low' : pct <= t.mid ? 'mid' : 'high';

const Icon = ({ children, className, size = 16, strokeWidth = 2.5 }) => (
  <svg
    aria-hidden="true"
    className={className}
    fill="none"
    height={size}
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={strokeWidth}
    viewBox="0 0 24 24"
    width={size}
  >
    {children}
  </svg>
);

const ShieldIcon = ({ className }) => (
  <Icon className={className} size={28} strokeWidth={2}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
);
const ArrowRight = ({ size }) => (
  <Icon size={size}>
    <path d="M5 12h14M12 5l7 7-7 7" />
  </Icon>
);
const ChevronLeft = () => (
  <Icon>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
);
const ChevronRight = () => (
  <Icon>
    <path d="M9 18l6-6-6-6" />
  </Icon>
);
const DownloadIcon = () => (
  <Icon>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </Icon>
);
const LockIcon = () => (
  <Icon className="text-teal" strokeWidth={2}>
    <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);
const CheckIcon = () => (
  <Icon className="mt-0.5 size-3.5 shrink-0 text-teal">
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

const TierIcon = ({ tier }) => {
  const color = TIER_STYLES[tier].text;
  if (tier === 'low') {
    return (
      <Icon className={color} size={18}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" x2="12" y1="9" y2="13" />
        <line x1="12" x2="12.01" y1="17" y2="17" />
      </Icon>
    );
  }
  if (tier === 'mid') {
    return (
      <Icon className={color} size={18}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" x2="12" y1="8" y2="12" />
        <line x1="12" x2="12.01" y1="16" y2="16" />
      </Icon>
    );
  }
  return (
    <Icon className={color} size={18}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </Icon>
  );
};

const Button = ({ variant = 'primary', size = 'md', className, ...rest }) => (
  <button
    className={cn(
      'inline-flex cursor-pointer items-center gap-2 rounded-lg font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
      size === 'md' && 'px-5.5 py-2.5 text-sm',
      size === 'lg' && 'px-8 py-3.5 text-base',
      variant === 'primary' && 'bg-teal text-white hover:bg-teal-dark',
      variant === 'navy' && 'bg-navy text-white hover:bg-navy-mid',
      variant === 'outline' &&
        'border-[1.5px] border-white/30 bg-transparent text-white hover:bg-white/10',
      variant === 'outline-dark' &&
        'border-[1.5px] border-gray-300 bg-transparent text-ink hover:bg-gray-100',
      className,
    )}
    type="button"
    {...rest}
  />
);

const Brand = ({ name, subtitle }) => (
  <div className="flex items-center gap-3">
    <ShieldIcon className="size-7 text-teal" />
    <div>
      <div className="text-[13px] font-bold tracking-[0.12em] text-white">
        {name}
      </div>
      {subtitle && (
        <div className="mt-px text-[10px] text-gray-400">{subtitle}</div>
      )}
    </div>
  </div>
);

const ScoreRing = ({ pct, level, size, thresholds }) => {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const fill = (pct / 100) * circ;
  return (
    <svg
      aria-label={`${pct}% — ${level}`}
      className="shrink-0"
      height={size}
      role="img"
      viewBox="0 0 120 120"
      width={size}
    >
      <circle
        cx="60"
        cy="60"
        fill="none"
        r={r}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="8"
      />
      <circle
        className={TIER_STYLES[tierOf(pct, thresholds)].stroke}
        cx="60"
        cy="60"
        fill="none"
        r={r}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        strokeWidth="8"
        transform="rotate(-90 60 60)"
      />
      <text
        fill="white"
        fontSize="26"
        fontWeight="bold"
        textAnchor="middle"
        x="60"
        y="56"
      >
        {pct}%
      </text>
      <text
        fill="rgba(255,255,255,0.55)"
        fontSize="9"
        textAnchor="middle"
        x="60"
        y="72"
      >
        {level}
      </text>
    </svg>
  );
};

const CategoryCard = ({ cs, showRecs, thresholds }) => {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimatedWidth(cs.percentage));
    return () => cancelAnimationFrame(id);
  }, [cs.percentage]);

  const tier = tierOf(cs.percentage, thresholds);
  const styles = TIER_STYLES[tier];
  const gap = cs.percentage - cs.benchmarkVendor;
  const recs = cs.recommendations.slice(0, 2);

  return (
    <div className="rounded-xl border border-[#f0f0f5] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              styles.soft,
            )}
          >
            <TierIcon tier={tier} />
          </div>
          <div>
            <div className="text-sm font-bold text-ink">{cs.category}</div>
            <div
              className={cn(
                'text-xs font-semibold',
                gap >= 0 ? 'text-emerald-500' : 'text-red-500',
              )}
            >
              {gap >= 0
                ? `+${gap}pts above average`
                : `${gap}pts below average`}
            </div>
          </div>
        </div>
        <div className={cn('text-[22px] font-bold', styles.text)}>
          {cs.percentage}%
        </div>
      </div>
      <div className="mb-1.5 flex items-center gap-4 text-[10px] text-gray-400">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-navy" />
          Vendor Avg {cs.benchmarkVendor}%
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-teal" />
          Customer Exp {cs.benchmarkCustomer}%
        </span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-[5px] bg-gray-100">
        <div
          className={cn(
            'absolute top-0 left-0 h-full rounded-[5px] transition-[width] duration-700 ease-out',
            styles.bg,
          )}
          style={{ width: `${animatedWidth}%` }}
        />
        <div
          className="absolute -top-0.5 h-3.5 w-0.5 bg-navy"
          style={{ left: `${cs.benchmarkVendor}%` }}
        />
        <div
          className="absolute -top-0.5 h-3.5 w-0.5 bg-teal"
          style={{ left: `${cs.benchmarkCustomer}%` }}
        />
      </div>
      {showRecs && recs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-semibold text-ink">
            Key Recommendations
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {recs.map((rec) => (
              <li
                className="flex items-start gap-2 text-xs text-gray-500"
                key={rec}
              >
                <CheckIcon />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!showRecs && cs.insight && (
        <p className="mt-2.5 text-xs/relaxed text-gray-500">{cs.insight}</p>
      )}
    </div>
  );
};

const storageKeyFor = (key) => `canvas-quiz:${key}`;

const readSaved = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(
      window.localStorage.getItem(storageKeyFor(key)) || 'null',
    );
  } catch {
    return null;
  }
};

const writeSaved = (key, value) => {
  try {
    if (value) {
      window.localStorage.setItem(storageKeyFor(key), JSON.stringify(value));
    } else {
      window.localStorage.removeItem(storageKeyFor(key));
    }
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
  }
};

const Quiz = ({
  heading = 'Readiness Assessment',
  headingAccent,
  description,
  startButtonLabel = 'Start Assessment',
  startNote,
  brandName,
  brandSubtitle,
  resultsHeading = 'Your Assessment Results',
  overallLabel = 'Overall Readiness',
  benchmarkNote = 'Benchmarked against industry peers',
  categoriesHeading = 'Your Category Scores vs. Industry Benchmarks',
  gateHeading = 'Download Your Full Report',
  gateText,
  gateButtonLabel = 'Get My Full Report',
  marketoBaseUrl,
  marketoMunchkinId,
  marketoFormId,
  hubSpotRegion,
  hubSpotPortalId,
  hubSpotFormId,
  fullReportHeading = 'Your Full Assessment Report',
  detailedHeading = 'Detailed Category Analysis',
  downloadButtonLabel = 'Download PDF Report',
  ctaHeading,
  ctaText,
  ctaButtonLabel = 'Learn More',
  retakeButtonLabel = 'Retake assessment',
  ctaLink,
  lowTierMax = 40,
  midTierMax = 70,
  rememberProgress = true,
  questions,
  categories,
  resultBands,
  report,
  className,
}) => {
  const rootRef = useRef(null);
  const sourceRef = useRef(null);
  const advanceTimer = useRef(null);
  const storageKey = heading;
  const [model, setModel] = useState(EMPTY_MODEL);
  const [phase, setPhase] = useState('landing');
  const [leaving, setLeaving] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [toast, setToast] = useState(null);

  const thresholds = useMemo(
    () => ({ low: lowTierMax, mid: midTierMax }),
    [lowTierMax, midTierMax],
  );

  // Latest settings for the restore step, which runs outside React's render.
  const settingsRef = useRef({ rememberProgress, storageKey });
  const restoredRef = useRef(false);
  useEffect(() => {
    settingsRef.current = { rememberProgress, storageKey };
  });

  // Saved progress is restored once, when the authored questions first load.
  const restoreProgress = useCallback((questionCount) => {
    if (restoredRef.current || questionCount === 0) return;
    restoredRef.current = true;
    const settings = settingsRef.current;
    const saved = settings.rememberProgress
      ? readSaved(settings.storageKey)
      : null;
    if (!saved?.answers) return;
    setAnswers(saved.answers);
    setCurrentQ(saved.currentQ || 0);
    if (saved.phase === 'questions' || saved.phase === 'basic') {
      setPhase(saved.phase);
    }
  }, []);

  // Read the authored model from slot children and keep it in sync while
  // editors change content in Canvas.
  useEffect(() => {
    const source = sourceRef.current;
    if (!source) return undefined;
    let timer = null;
    // Debounced so a burst of child mounts results in one model read.
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = collectModel(source);
        setModel(next);
        restoreProgress(next.questions.length);
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(source, {
      attributes: true,
      attributeFilter: ['data-quiz-item', 'data-quiz-type'],
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [restoreProgress]);

  const total = model.questions.length;

  // Saved progress can point past the end if questions were removed.
  const questionIndex = Math.max(0, Math.min(currentQ, total - 1));

  useEffect(() => {
    if (!rememberProgress || !restoredRef.current || phase === 'landing') {
      return;
    }
    // Lead details are never stored; the full report needs the gate again.
    writeSaved(storageKey, {
      phase: phase === 'full' ? 'basic' : phase,
      currentQ,
      answers,
    });
  }, [rememberProgress, storageKey, phase, currentQ, answers]);

  useEffect(() => () => clearTimeout(advanceTimer.current), []);

  useEffect(() => {
    const root = rootRef.current;
    if (root && root.getBoundingClientRect().top < 0) {
      root.scrollIntoView({ block: 'start' });
    }
  }, [phase, currentQ]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const result = useMemo(
    () => (total ? calculateResults(model, answers, thresholds) : null),
    [model, answers, thresholds, total],
  );

  const startAssessment = () => {
    setLeaving(true);
    setTimeout(() => {
      setAnswers({});
      setCurrentQ(0);
      setUserInfo(null);
      setPhase('questions');
      setLeaving(false);
    }, LEAVE_DELAY);
  };

  // Back to the landing screen with a clean slate (kiosk / shared devices).
  const retake = () => {
    clearTimeout(advanceTimer.current);
    writeSaved(storageKey, null);
    setAnswers({});
    setCurrentQ(0);
    setUserInfo(null);
    setToast(null);
    setPhase('landing');
  };

  const RetakeButton = () => (
    <button
      className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-300 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      onClick={retake}
      type="button"
    >
      <Icon size={14}>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5" />
      </Icon>
      {retakeButtonLabel}
    </button>
  );

  const selectOption = (score) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: score }));
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => {
      if (questionIndex < total - 1) setCurrentQ(questionIndex + 1);
    }, ADVANCE_DELAY);
  };

  const goBack = () => {
    clearTimeout(advanceTimer.current);
    if (questionIndex > 0) setCurrentQ(questionIndex - 1);
  };

  const makeReport = useCallback(
    (info) =>
      downloadReport({
        model: { ...model, report: { ...model.report, brandName } },
        result,
        userInfo: info,
        thresholds,
      }).catch(() =>
        setToast('The PDF report could not be generated. Please try again.'),
      ),
    [model, result, thresholds, brandName],
  );

  const handleLead = (values) => {
    const info = {
      email: values.Email || '',
      firstName: values.FirstName || '',
      lastName: values.LastName || '',
      company: values.Company || 'Your Company',
      jobTitle: values.JobTitle || '',
    };
    setUserInfo(info);
    setTimeout(() => {
      makeReport(info);
      setPhase('full');
      setToast('Your PDF report is downloading — check your downloads folder.');
    }, 600);
  };

  const tokens = result ? resultTokens(result, userInfo?.company) : {};
  const hasMarketo = marketoBaseUrl && marketoMunchkinId && marketoFormId;
  const hasHubSpot = hubSpotRegion && hubSpotPortalId && hubSpotFormId;

  const renderLanding = () => (
    <div
      className={cn(
        'flex min-h-[560px] items-center bg-linear-135 from-navy via-navy-mid to-navy-light transition-all duration-400 ease-out',
        leaving && 'pointer-events-none -translate-y-6 opacity-0',
      )}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-20">
        <div>
          {brandName && (
            <div className="mb-8">
              <Brand name={brandName} subtitle={brandSubtitle} />
            </div>
          )}
          <h1 className="mb-4 text-[clamp(28px,4vw,48px)] leading-[1.15] font-extrabold text-white">
            <AccentHeading accent={headingAccent} text={heading} />
          </h1>
          {description && (
            <p className="mb-6 text-base/relaxed text-gray-300">
              {description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-3">
          <Button
            disabled={total === 0}
            onClick={startAssessment}
            size="lg"
            variant="primary"
          >
            {startButtonLabel}
            <ArrowRight size={20} />
          </Button>
          {startNote && (
            <p className="max-w-[260px] text-center text-xs text-gray-400">
              {startNote}
            </p>
          )}
          {total === 0 && (
            <p className="max-w-[300px] rounded-lg border border-dashed border-white/30 p-3 text-center text-xs text-gray-300">
              Add Quiz Question components to the Questions slot to enable the
              assessment.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderQuestion = () => {
    const q = model.questions[questionIndex];
    if (!q) return null;
    const sel = answers[questionIndex];
    const progress = (questionIndex / total) * 100;
    const progressCats = model.categories
      .map((cat) => {
        const start = model.questions.findIndex((x) => x.category === cat.name);
        if (start === -1) return null;
        const count = model.questions.filter(
          (x) => x.category === cat.name,
        ).length;
        const end = start + count - 1;
        return {
          name: cat.name,
          active: questionIndex >= start && questionIndex <= end,
          done: questionIndex > end,
        };
      })
      .filter(Boolean);

    return (
      <div className="flex min-h-[640px] flex-col bg-surface">
        <div className="bg-navy">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Brand name={brandName} subtitle={brandSubtitle} />
            <div aria-live="polite" className="text-sm text-gray-300">
              Question {questionIndex + 1} of {total}
            </div>
          </div>
          <div className="mx-auto max-w-6xl px-6 pt-3 pb-3 sm:pb-0">
            <div
              aria-label="Assessment progress"
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={Math.round(progress)}
              className="h-1.5 overflow-hidden rounded-[3px] bg-gray-200"
              role="progressbar"
            >
              <div
                className="h-full rounded-[3px] bg-teal transition-[width] duration-400 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1.5 hidden justify-between gap-1 pb-3 sm:flex">
              {progressCats.map((cat) => (
                <span
                  className={cn(
                    'flex-1 text-center text-[9px] text-gray-400 transition-colors',
                    cat.active && 'font-bold text-white',
                    cat.done && 'text-teal',
                  )}
                  key={cat.name}
                >
                  {cat.name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 py-5">
          <div
            className="w-full max-w-[760px] animate-slide-in rounded-xl border border-[#f0f0f5] bg-white px-5 py-7 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:px-10 sm:py-8"
            key={questionIndex}
          >
            <div className="mb-3 inline-flex items-center rounded-full bg-navy/7 px-3 py-1 text-xs font-semibold text-navy">
              {q.category}
            </div>
            <h2 className="mb-2 text-[22px] font-bold text-ink">
              {q.question}
            </h2>
            {q.description && (
              <p className="mb-7 text-sm/relaxed text-gray-500">
                {q.description}
              </p>
            )}
            <div
              aria-label={q.question}
              className="flex flex-col gap-2.5"
              role="radiogroup"
            >
              {q.options.map((opt, i) => {
                const selected = sel === opt.score;
                return (
                  <button
                    aria-checked={selected}
                    className={cn(
                      'group flex w-full cursor-pointer items-start gap-4 rounded-[10px] border-2 bg-white px-5 py-4.5 text-left transition-all duration-200',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
                      selected
                        ? 'border-teal bg-teal/5'
                        : 'border-gray-200 hover:border-navy/30 hover:bg-[#f9f9fc]',
                    )}
                    key={`${opt.label}-${i}`}
                    onClick={() => selectOption(opt.score)}
                    role="radio"
                    type="button"
                  >
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-200',
                        selected
                          ? 'bg-teal text-white'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-navy/10 group-hover:text-navy',
                      )}
                    >
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-ink">
                        {opt.label}
                      </div>
                      {opt.description && (
                        <div className="mt-0.5 text-[13px] text-gray-500">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-7 flex items-center justify-between">
              <Button
                disabled={questionIndex === 0}
                onClick={goBack}
                variant="outline-dark"
              >
                <ChevronLeft />
                Previous
              </Button>
              {sel !== undefined && questionIndex === total - 1 && (
                <Button onClick={() => setPhase('basic')} variant="navy">
                  See Results
                  <ChevronRight />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBasicResults = () => (
    <div>
      <div className="bg-linear-135 from-navy via-navy-mid to-navy-light pb-10">
        {brandName && (
          <div className="mx-auto max-w-6xl px-6 py-4">
            <Brand name={brandName} subtitle={brandSubtitle} />
          </div>
        )}
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 px-6 py-10 md:grid-cols-2">
          <div>
            <h1 className="mb-4 text-[clamp(26px,3.5vw,38px)] font-extrabold text-white">
              {resultsHeading}
            </h1>
            <p className="mb-6 text-sm/relaxed text-gray-200">
              {fillTemplate(
                bandValue(model.bands, result.overallPercentage, 'summary'),
                tokens,
              )}
            </p>
            <div className="mb-5 flex items-center gap-5">
              <ScoreRing
                level={result.overallLevel}
                pct={result.overallPercentage}
                size={112}
                thresholds={thresholds}
              />
              <div>
                <div className="mb-1 text-lg font-bold text-white">
                  {overallLabel}: {result.overallLevel}
                </div>
                <div className="text-xs text-gray-400">{benchmarkNote}</div>
              </div>
            </div>
            <RetakeButton />
          </div>
          <div className="rounded-xl bg-white p-7 shadow-[0_8px_32px_rgba(0,0,0,0.15)]">
            <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-ink">
              <LockIcon />
              {gateHeading}
            </h3>
            {gateText && (
              <p className="mb-4 text-xs text-gray-500">{gateText}</p>
            )}
            {hasHubSpot && (
              <HubSpotForm
                formId={hubSpotFormId}
                hiddenValues={{
                  assessment_score: result.overallPercentage,
                  assessment_level: result.overallLevel,
                  weakest_category: tokens.weakest,
                }}
                onSubmit={handleLead}
                portalId={hubSpotPortalId}
                region={hubSpotRegion}
              />
            )}
            {!hasHubSpot && hasMarketo && (
              <MarketoForm
                baseUrl={marketoBaseUrl}
                formId={marketoFormId}
                munchkinId={marketoMunchkinId}
                onSubmit={handleLead}
              />
            )}
            {!hasHubSpot && !hasMarketo && (
              <DemoLeadForm
                onSubmit={handleLead}
                submitLabel={gateButtonLabel}
              />
            )}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-6 text-xl font-bold text-ink">{categoriesHeading}</h2>
        <div className="flex flex-col gap-4">
          {result.categoryScores.map((cs) => (
            <CategoryCard cs={cs} key={cs.category} thresholds={thresholds} />
          ))}
        </div>
      </div>
    </div>
  );

  const renderFullResults = () => (
    <div>
      <div className="bg-linear-135 from-navy via-navy-mid to-navy-light">
        {brandName && (
          <div className="mx-auto max-w-6xl px-6 py-4">
            <Brand name={brandName} subtitle={brandSubtitle} />
          </div>
        )}
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="mb-8 flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="mb-1 text-[28px] font-extrabold text-white">
                {fullReportHeading}
              </h1>
              <p className="text-sm text-gray-300">
                Prepared for {userInfo.firstName} {userInfo.lastName} at{' '}
                {userInfo.company}
              </p>
              <div className="mt-3">
                <RetakeButton />
              </div>
            </div>
            <Button
              onClick={() => makeReport(userInfo)}
              size="lg"
              variant="primary"
            >
              <DownloadIcon />
              {downloadButtonLabel}
            </Button>
          </div>
          <div className="flex items-center gap-6">
            <ScoreRing
              level={result.overallLevel}
              pct={result.overallPercentage}
              size={96}
              thresholds={thresholds}
            />
            <div>
              <div className="mb-2 text-lg font-bold text-white">
                {overallLabel}: {result.overallLevel}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {result.categoryScores.map((cs) => (
                  <div className="text-center" key={cs.category}>
                    <div
                      className={cn(
                        'text-[13px] font-bold',
                        TIER_STYLES[tierOf(cs.percentage, thresholds)].text,
                      )}
                    >
                      {cs.percentage}%
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {cs.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-6 text-xl font-bold text-ink">{detailedHeading}</h2>
        <div className="flex flex-col gap-4">
          {result.categoryScores.map((cs) => (
            <CategoryCard
              cs={cs}
              key={cs.category}
              showRecs
              thresholds={thresholds}
            />
          ))}
        </div>
        {ctaHeading && (
          <div className="mt-8 rounded-xl bg-linear-135 from-navy to-[#2a1f8e] p-10 text-center text-white">
            <svg
              aria-hidden="true"
              className="mx-auto mb-3 text-teal"
              fill="none"
              height="32"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="32"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <h3 className="mb-2 text-[22px] font-bold">{ctaHeading}</h3>
            {ctaText && (
              <p className="mx-auto mb-6 max-w-[480px] text-sm text-gray-300">
                {ctaText}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => makeReport(userInfo)}
                size="lg"
                variant="primary"
              >
                <DownloadIcon />
                {downloadButtonLabel}
              </Button>
              {ctaLink && (
                <a
                  className="inline-flex items-center gap-2 rounded-lg border-[1.5px] border-white/30 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10"
                  href={ctaLink}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {ctaButtonLabel}
                  <ArrowRight size={16} />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  let stage = renderLanding();
  if (phase === 'questions' && total) stage = renderQuestion();
  if (phase === 'basic' && result) stage = renderBasicResults();
  if (phase === 'full' && result && userInfo) stage = renderFullResults();

  return (
    <div
      className={cn('quiz relative font-sans text-ink antialiased', className)}
      data-quiz-root
      ref={rootRef}
    >
      {stage}
      <div hidden ref={sourceRef}>
        {questions}
        {categories}
        {resultBands}
        {report}
      </div>
      {toast && (
        <div
          className="fixed right-6 bottom-6 z-[9999] max-w-[360px] animate-toast-in rounded-[10px] bg-ink px-5 py-3.5 text-sm text-white shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
};

// Highlights `accent` inside `text`, e.g. "Readiness" in the landing title.
const AccentHeading = ({ text, accent }) => {
  if (!accent || !text.includes(accent)) return text;
  const [before, ...rest] = text.split(accent);
  return (
    <>
      {before}
      <span className="text-teal">{accent}</span>
      {rest.join(accent)}
    </>
  );
};

export default Quiz;
