import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import Accordion from '@/components/accordion';
import AccordionItem from '@/components/accordion-item';
import Callout from '@/components/callout';
import Checklist from '@/components/checklist';
import FeatureCard from '@/components/feature-card';
import Grid from '@/components/grid';
import GuideHero from '@/components/guide-hero';
import GuideSection from '@/components/guide-section';
import GuideShell from '@/components/guide-shell';
import PullQuote from '@/components/pull-quote';
import RichText from '@/components/rich-text';
import Scorecard from '@/components/scorecard';
import ScorecardRow from '@/components/scorecard-row';
import Scrolly from '@/components/scrolly';
import ScrollyStep from '@/components/scrolly-step';
import StatCounter from '@/components/stat-counter';
import TabPanel from '@/components/tab-panel';
import Tabs from '@/components/tabs';
import Timeline from '@/components/timeline';
import TimelineItem from '@/components/timeline-item';
import { slugify } from '@/lib/guide/hooks';
import { GuideIcon } from '@/lib/guide/icons';
import { openPdf, readPages, renderPage } from '@/lib/pdf-guide/load';
import { buildGuide } from '@/lib/pdf-guide/structure';
import { cn } from 'drupal-canvas';

const escapeHtml = (text = '') =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );

const ICON_WORDS = [
  [/trust|secur|protect|shield|assurance/i, 'shield'],
  [/key|pki|certificate|custody/i, 'key'],
  [/cloud|hybrid|deploy/i, 'cloud'],
  [/innovat|new|next/i, 'sparkles'],
  [/performance|throughput|speed|excellence/i, 'gauge'],
  [/payment|financ|cost|value|price/i, 'coins'],
  [/government|regulat|complian|sovereign/i, 'scale'],
  [/code|sign|integrity|software/i, 'check'],
  [/digital asset|blockchain|network|ecosystem/i, 'network'],
  [/migrat|roadmap|journey/i, 'road'],
  [/automat|update|agil/i, 'refresh'],
  [/processor|chip|hardware/i, 'chip'],
  [/adoption|customer|people|team/i, 'users'],
  [/use case|support|portfolio|layer/i, 'layers'],
];
const FALLBACK_ICONS = ['layers', 'target', 'sparkles', 'shield', 'bolt'];
const iconFor = (title, i) =>
  ICON_WORDS.find(([re]) => re.test(title))?.[1] ||
  FALLBACK_ICONS[i % FALLBACK_ICONS.length];

const COLUMNS = { 2: 'two', 3: 'three', 4: 'four' };
const ASIDE = new Set(['stat', 'quote', 'list', 'takeaway']);
const WIDE = new Set(['cards', 'table', 'topics']);
const UNNUMBERED_THEMES = ['light', 'mist', 'gradient'];
// PDF pages used as backgrounds are blurred so their text reads as texture.
const PAGE_BACKGROUND = '[&>div[aria-hidden=true]_img]:blur-[3px]';

// Splits a section's blocks into rows: text on the left with supporting
// blocks (stats, quotes, checklists, takeaways) in a sticky right rail, and
// full-width rows for cards and tables.
const toRows = (blocks) => {
  const rows = [];
  let row = null;
  blocks.forEach((b) => {
    if (WIDE.has(b.type)) {
      rows.push({ wide: b });
      row = null;
      return;
    }
    if (!row) {
      row = { main: [], aside: [] };
      rows.push(row);
    }
    (ASIDE.has(b.type) ? row.aside : row.main).push(b);
  });
  return rows;
};

const TextRun = ({ blocks, lead }) => {
  const firstParagraph = blocks.findIndex((b) => b.type !== 'subheading');
  const html = blocks
    .map((b, i) => {
      if (b.type === 'subheading') return `<h3>${escapeHtml(b.text)}</h3>`;
      const size =
        b.type === 'lead' ||
        (lead && i === firstParagraph && b.text.length < 360)
          ? 'lead'
          : 'normal';
      return `<p data-size="${size}">${escapeHtml(b.text)}</p>`;
    })
    .join('');
  return (
    <RichText
      className="[&_p[data-size=lead]]:text-lg/relaxed [&_p[data-size=lead]]:font-medium [&_p[data-size=lead]]:text-guide-ink in-data-[theme=dark]:[&_p[data-size=lead]]:text-white sm:[&_p[data-size=lead]]:text-xl/relaxed"
      text={html}
    />
  );
};

const AsideBlock = ({ block }) => {
  if (block.type === 'stat') {
    return (
      <StatCounter
        display={block.suffix === '%' ? 'ring' : 'number'}
        label={block.label}
        prefix={block.prefix}
        source={block.source}
        suffix={block.suffix}
        value={block.value}
      />
    );
  }
  if (block.type === 'quote') {
    return (
      <PullQuote quote={block.text} size="medium" source={block.attribution} />
    );
  }
  if (block.type === 'takeaway') {
    return (
      <Callout
        text={`<p>${escapeHtml(block.text)}</p>`}
        title="Key Takeaway"
        variant="takeaway"
      />
    );
  }
  return (
    <Checklist
      heading={block.heading}
      items={`<ul>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`}
    />
  );
};

const TableBlock = ({ block }) => {
  const [, second, third] = block.headers;
  if (
    block.headers.length === 3 &&
    /red flag|risk|avoid|watch/i.test(third || '')
  ) {
    return (
      <Scorecard
        rows={block.rows.map((row) => (
          <ScorecardRow
            category={row[0].replace(/^\d+\.\s*/, '')}
            key={row[0]}
            lookFor={row[1]}
            lookForLabel={second}
            redFlag={row[2]}
            redFlagLabel={third}
          />
        ))}
        summaryHeading="Rate a vendor as you read"
        vendorLabel="Scorecard"
      />
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white in-data-[theme=dark]:border-white/10 in-data-[theme=dark]:bg-white/5">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-guide-ink text-white">
            {block.headers.map((h) => (
              <th className="px-5 py-3 font-semibold" key={h} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr
              className="border-t border-slate-200 transition-colors hover:bg-guide-mint/10 in-data-[theme=dark]:border-white/10"
              key={row.join('|')}
            >
              {row.map((cell, i) => (
                <td
                  className={cn(
                    'px-5 py-4 align-top text-slate-700 in-data-[theme=dark]:text-guide-haze',
                    i === 0 &&
                      'font-semibold text-guide-ink in-data-[theme=dark]:text-white',
                  )}
                  key={`${i}-${cell}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Picks an interactive pattern for a group of parallel items.
const SEQUENCE =
  /traditional|\bthen\b|\bnow\b|today|future|\bnext\b|before|after|\bstep\b|phase|stage|evolv|\b(19|20)\d{2}\b|first|finally|why it matters/i;

const cardsLayout = (items) => {
  const avg = items.reduce((n, c) => n + c.text.length, 0) / items.length;
  const sequence = items.filter((c) => SEQUENCE.test(c.title)).length;
  if (items.length >= 3 && items.length <= 6 && sequence >= 2)
    return 'timeline';
  if (items.length >= 3 && avg > 260) return 'accordion';
  if (items.length >= 5 && avg > 60) return 'tabs';
  return 'grid';
};

// Loose "title + one or two lines" lists are parallel items too; fold them
// into card groups and merge neighbouring groups.
const isTitledText = (a, b) =>
  a?.type === 'subheading' &&
  a.text.length < 70 &&
  b?.type === 'paragraph' &&
  b.text.length < 320;

const normalizeBlocks = (input) => {
  // "Title + short paragraph" next to a card group belongs to the group.
  const blocks = [];
  for (let i = 0; i < input.length; i++) {
    const nearCards =
      input[i - 1]?.type === 'cards' ||
      input[i + 2]?.type === 'cards' ||
      (input[i + 2]?.type === 'list' && input[i + 2].heading);
    if (isTitledText(input[i], input[i + 1]) && nearCards) {
      blocks.push({
        type: 'cards',
        items: [{ title: input[i].text, text: input[i + 1].text }],
        page: input[i].page,
      });
      i += 1;
    } else {
      blocks.push(input[i]);
    }
  }
  const out = [];
  blocks.forEach((b) => {
    const foldable =
      b.type === 'list' &&
      b.heading &&
      b.heading.length < 70 &&
      b.items.length <= 4 &&
      b.items.join(' ').length < 380 &&
      !/consider|look for|checklist/i.test(b.heading);
    let asCards = b;
    if (foldable) {
      // A heading split over two lines ("Enterprise encryption and" +
      // "key management:") arrives as a dangling subheading first.
      const prev = out[out.length - 1];
      let title = b.heading;
      if (
        prev?.type === 'subheading' &&
        !/[.:!?]$/.test(prev.text) &&
        prev.text.length < 60
      ) {
        out.pop();
        title = `${prev.text} ${b.heading}`;
      }
      asCards = {
        type: 'cards',
        items: [{ title, text: b.items.join(' ') }],
        page: b.page,
        source: b,
      };
    }
    const last = out[out.length - 1];
    if (asCards.type === 'cards' && last?.type === 'cards') {
      last.items = [...last.items, ...asCards.items];
    } else {
      out.push(
        asCards.type === 'cards'
          ? { ...asCards, items: [...asCards.items] }
          : asCards,
      );
    }
  });
  // A lone list that found no neighbours stays a checklist.
  return out.map((b) =>
    b.type === 'cards' && b.items.length === 1 && b.source ? b.source : b,
  );
};

const CardsBlock = ({ block }) => {
  const { items } = block;
  const layout = cardsLayout(items);

  if (layout === 'timeline') {
    return (
      <div className="max-w-3xl">
        <Timeline
          items={items.map((card, i) => (
            <TimelineItem
              heading={card.title}
              icon={iconFor(card.title, i)}
              key={`${card.title}-${i}`}
              label={`Step ${i + 1}`}
              text={card.text}
            />
          ))}
        />
      </div>
    );
  }

  if (layout === 'tabs') {
    return (
      <Tabs
        label="Topics"
        orientation="vertical"
        panels={items.map((card, i) => (
          <TabPanel
            heading={card.title}
            icon={iconFor(`${card.title} ${card.text}`, i)}
            key={`${card.title}-${i}`}
            label={
              card.title.length > 42
                ? `${card.title.slice(0, 40)}…`
                : card.title
            }
            text={card.text}
          />
        ))}
      />
    );
  }

  if (layout === 'accordion') {
    return (
      <div className="rounded-3xl bg-white p-2 text-slate-900 shadow-[0_24px_60px_-32px_rgba(8,15,92,0.45)] sm:p-4">
        <Accordion
          items={items.map((card, i) => (
            <AccordionItem
              content={<RichText text={`<p>${escapeHtml(card.text)}</p>`} />}
              defaultOpen={i === 0}
              key={`${card.title}-${i}`}
              title={card.title}
            />
          ))}
          variant="default"
        />
      </div>
    );
  }

  return (
    <Grid
      columns={COLUMNS[items.length] || 'three'}
      items={items.map((card, i) => (
        <FeatureCard
          align={card.text ? 'left' : 'center'}
          heading={card.title}
          icon={iconFor(`${card.title} ${card.text}`, i)}
          key={`${card.title}-${i}`}
          text={card.text}
        />
      ))}
    />
  );
};

const NUMBERED_TITLE = /^(\d{1,2}[).:]|step\s*\d|phase\s*\d)/i;

const topicsLayout = (items) => {
  const numbered = items.filter((t) => NUMBERED_TITLE.test(t.title)).length;
  if (numbered >= Math.max(3, items.length - 1)) return 'steps';
  const sequence = items.filter((t) => SEQUENCE.test(t.title)).length;
  if (items.length <= 6 && sequence >= 2) return 'steps';
  const avg =
    items.reduce(
      (n, t) =>
        n +
        t.body.reduce(
          (m, b) => m + (b.text || b.items?.join(' ') || '').length,
          0,
        ),
      0,
    ) / items.length;
  return avg > 420 ? 'accordion' : 'tabs';
};

const topicHtml = (body) =>
  body
    .map((b) =>
      b.type === 'list'
        ? `${b.heading ? `<h3>${escapeHtml(b.heading)}</h3>` : ''}<ul>${b.items
            .map((i) => `<li>${escapeHtml(i)}</li>`)
            .join('')}</ul>`
        : `<p>${escapeHtml(b.text)}</p>`,
    )
    .join('');

const topicText = (body) =>
  body
    .map((b) =>
      b.type === 'list' ? b.items.map((i) => `• ${i}`).join(' ') : b.text,
    )
    .join(' ');

// Subheadings that each own a few paragraphs: steps, an accordion or tabs.
const TopicsBlock = ({ block }) => {
  const { items } = block;
  const layout = topicsLayout(items);
  if (layout === 'steps') {
    return (
      <div className="max-w-4xl">
        <Timeline
          items={items.map((t, i) => (
            <TimelineItem
              heading={t.title.replace(NUMBERED_TITLE, '').trim() || t.title}
              icon={iconFor(t.title, i)}
              key={`${t.title}-${i}`}
              label={`Step ${i + 1}`}
              text={topicText(t.body)}
            />
          ))}
        />
      </div>
    );
  }
  if (layout === 'accordion') {
    return (
      <div className="max-w-4xl rounded-3xl bg-white p-2 text-slate-900 shadow-[0_24px_60px_-32px_rgba(8,15,92,0.45)] sm:p-4">
        <Accordion
          items={items.map((t, i) => (
            <AccordionItem
              content={<RichText text={topicHtml(t.body)} />}
              defaultOpen={i === 0}
              key={`${t.title}-${i}`}
              title={t.title}
            />
          ))}
          variant="default"
        />
      </div>
    );
  }
  return (
    <Tabs
      label="Topics"
      orientation="vertical"
      panels={items.map((t, i) => (
        <TabPanel
          content={<RichText text={topicHtml(t.body)} />}
          heading={t.title}
          icon={iconFor(`${t.title} ${topicText(t.body)}`, i)}
          key={`${t.title}-${i}`}
          label={t.title.length > 42 ? `${t.title.slice(0, 40)}…` : t.title}
        />
      ))}
    />
  );
};

// Text + sticky aside rows, cards and tables for one section's blocks.
const SectionRows = ({ blocks, lead = true }) => {
  const rows = toRows(normalizeBlocks(blocks));
  return (
    <div className="flex flex-col gap-14">
      {rows.map((row, i) => {
        if (row.wide) {
          return (
            <div key={`wide-${i}`}>
              {row.wide.type === 'table' && <TableBlock block={row.wide} />}
              {row.wide.type === 'cards' && <CardsBlock block={row.wide} />}
              {row.wide.type === 'topics' && <TopicsBlock block={row.wide} />}
            </div>
          );
        }
        const hasMain = row.main.length > 0;
        const hasAside = row.aside.length > 0;
        return (
          <div
            className={cn(
              'grid gap-10',
              hasMain &&
                hasAside &&
                'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16',
            )}
            key={`row-${i}`}
          >
            {hasMain && (
              <div className="max-w-3xl">
                <TextRun blocks={row.main} lead={lead && i === 0} />
              </div>
            )}
            {hasAside && (
              <div
                className={cn(
                  'flex flex-col gap-8',
                  hasMain && 'lg:sticky lg:top-28 lg:self-start',
                  !hasMain && 'md:grid md:grid-cols-2',
                )}
              >
                {row.aside.map((b, j) => (
                  <AsideBlock block={b} key={`${b.type}-${j}`} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ViewPageButton = ({ page, onViewPage }) =>
  onViewPage ? (
    <button
      className="mt-10 inline-flex cursor-pointer items-center gap-2 rounded-full border border-current/20 px-4 py-2 text-xs font-semibold opacity-70 transition-opacity hover:opacity-100"
      data-guide-chrome
      onClick={() => onViewPage(page)}
      type="button"
    >
      <GuideIcon name="eye" size={14} strokeWidth={2} />
      View original page {page}
    </button>
  ) : null;

const shortLabel = (heading) =>
  heading
    .split(/,|\band\b|:/)[0]
    .trim()
    .split(' ')
    .slice(0, 4)
    .join(' ');

// Runs of 3+ numbered sections (chapters "01"–"10") become one scrollytelling
// section; the unnumbered section right before a run introduces it.
const toUnits = (sections) => {
  const units = [];
  let i = 0;
  while (i < sections.length) {
    let j = i;
    while (j < sections.length && sections[j].number) j += 1;
    if (j - i >= 3) {
      const prev = units[units.length - 1];
      const intro = prev?.type === 'section' ? units.pop().section : null;
      units.push({ type: 'chapters', intro, chapters: sections.slice(i, j) });
      i = j;
    } else {
      units.push({ type: 'section', section: sections[i] });
      i += 1;
    }
  }
  return units;
};

// Section pages rendered as parallax backgrounds for dark sections.
const backgroundPages = (guide) =>
  toUnits(guide.sections)
    .map((u, i) =>
      u.type === 'chapters'
        ? (u.intro || u.chapters[0]).page
        : i % 3 === 2
          ? u.section.page
          : null,
    )
    .filter(Boolean);

const GuideBody = ({ guide, backgrounds, onViewPage }) => {
  const used = new Set();
  const uniqueId = (heading, page) => {
    let id = slugify(heading) || `section-${page}`;
    while (used.has(id)) id = `${id}-${page}`;
    used.add(id);
    return id;
  };
  let plain = 0;

  return toUnits(guide.sections).map((unit, index) => {
    if (unit.type === 'chapters') {
      const { intro, chapters } = unit;
      const heading = intro?.heading || 'Chapters';
      const id = uniqueId(heading, chapters[0].page);
      const bgPage = (intro || chapters[0]).page;
      return (
        <GuideSection
          anchorId={id}
          className={PAGE_BACKGROUND}
          backgroundImage={
            backgrounds[bgPage]
              ? { src: backgrounds[bgPage], alt: '' }
              : undefined
          }
          content={
            <>
              {intro?.blocks.length > 0 && (
                <SectionRows blocks={intro.blocks} />
              )}
              <Scrolly
                railTitle={`${chapters.length} chapters`}
                steps={chapters.map((chapter) => (
                  <ScrollyStep
                    anchorId={uniqueId(chapter.heading, chapter.page)}
                    content={
                      <>
                        <SectionRows blocks={chapter.blocks} lead={false} />
                        <ViewPageButton
                          onViewPage={onViewPage}
                          page={chapter.page}
                        />
                      </>
                    }
                    heading={chapter.heading}
                    key={chapter.page}
                    label={shortLabel(chapter.heading)}
                    number={chapter.number}
                  />
                ))}
              />
            </>
          }
          eyebrow={intro?.eyebrow}
          heading={heading}
          key={id}
          navLabel={heading}
          parallax
          theme="dark"
          width="wide"
        />
      );
    }

    const { section } = unit;
    const id = uniqueId(section.heading, section.page);
    const theme = UNNUMBERED_THEMES[plain++ % UNNUMBERED_THEMES.length];
    const bg = index % 3 === 2 ? backgrounds[section.page] : null;
    return (
      <GuideSection
        anchorId={id}
        className={PAGE_BACKGROUND}
        backgroundImage={bg ? { src: bg, alt: '' } : undefined}
        content={
          <>
            <SectionRows blocks={section.blocks} />
            <ViewPageButton onViewPage={onViewPage} page={section.page} />
          </>
        }
        eyebrow={section.eyebrow}
        heading={section.heading}
        key={id}
        navLabel={section.heading}
        number={section.number}
        parallax={!!bg}
        theme={bg ? 'deep' : theme}
        width="wide"
      />
    );
  });
};

// Shown while no PDF is set (editors see what to do) or when loading fails.
const Notice = ({ error }) => (
  <div className="flex min-h-[360px] items-center justify-center bg-guide-deep px-4 py-16 text-white">
    <div className="max-w-lg text-center">
      <GuideIcon
        className="mx-auto mb-5 text-guide-mint"
        name={error ? 'alert' : 'layers'}
        size={44}
      />
      <p className="mb-2 text-xl font-bold">
        {error
          ? 'This guide could not be built'
          : 'Choose a PDF to build the guide'}
      </p>
      <p
        className="text-sm/relaxed text-guide-haze"
        role={error ? 'alert' : undefined}
      >
        {error ||
          'Select a PDF from the media library in the PDF field (or set a PDF URL). It is converted into an interactive guide when the page loads.'}
      </p>
    </div>
  </div>
);

const Progress = ({ label, value }) => (
  <div className="flex min-h-[640px] items-center justify-center bg-guide-deep px-4 text-white">
    <div aria-live="polite" className="w-full max-w-md text-center">
      <GuideIcon
        className="mx-auto mb-6 animate-pulse text-guide-mint"
        name="layers"
        size={48}
      />
      <p className="mb-4 text-lg font-semibold">{label}</p>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-linear-to-r from-guide-mint to-guide-cyan transition-[width] duration-300"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  </div>
);

const PageModal = ({ image, number, onClose }) => {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      aria-label={`Original page ${number}`}
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
      data-guide-chrome
      role="dialog"
    >
      <button
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <div className="relative max-h-full overflow-auto rounded-2xl bg-white p-2 shadow-2xl">
        <button
          aria-label="Close original page"
          className="absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full bg-guide-ink text-white"
          onClick={onClose}
          type="button"
        >
          <GuideIcon name="close" size={18} />
        </button>
        {image ? (
          <img
            alt={`Original PDF page ${number}`}
            className="block max-h-[85vh] w-auto"
            src={image}
          />
        ) : (
          <div className="flex h-96 w-72 items-center justify-center text-sm text-slate-500">
            Rendering page {number}…
          </div>
        )}
      </div>
    </div>
  );
};

// The document prop's shape can vary by Canvas version; accept a plain string
// or an object with a URL-like field.
const urlOf = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return urlOf(value.src ?? value.url ?? value.uri ?? value.href ?? '');
  }
  return '';
};

const PdfGuide = ({
  pdf,
  pdfUrl: pdfUrlProp,
  brandName,
  showOriginalPages = true,
  className,
}) => {
  // A media-library document wins over the plain URL fallback.
  const pdfUrl = urlOf(pdf) || urlOf(pdfUrlProp);
  const docRef = useRef(null);
  const [status, setStatus] = useState(pdfUrl ? 'loading' : 'idle');
  const [progress, setProgress] = useState({ label: 'Opening PDF…', value: 0 });
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [backgrounds, setBackgrounds] = useState({});

  const convert = useCallback(async (source) => {
    setStatus('loading');
    setError('');
    setProgress({ label: 'Opening PDF…', value: 0.02 });
    try {
      docRef.current?.destroy?.();
      const doc = await openPdf(source);
      docRef.current = doc;
      const pages = await readPages(doc, (n, total) =>
        setProgress({
          label: `Reading page ${n} of ${total}`,
          value: (n / total) * 0.85,
        }),
      );
      setProgress({ label: 'Designing the interactive layout…', value: 0.92 });
      const outline = buildGuide(pages);
      if (!outline.sections.length) {
        throw new Error(
          'No selectable text found. Scanned (image-only) PDFs are not supported.',
        );
      }
      setBackgrounds({});
      setGuide(outline);
      setStatus('ready');
    } catch (err) {
      const detail = err?.message || String(err || 'Unknown error');
      let message = `The PDF could not be read (${detail}).`;
      if (err?.name === 'InvalidPDFException') {
        message = 'This file is not a valid PDF, or it is damaged.';
      } else if (err?.name === 'PasswordException') {
        message =
          'This PDF is password-protected. Remove the password and try again.';
      } else if (
        typeof source === 'string' &&
        (err?.name === 'MissingPDFException' ||
          err?.name === 'UnexpectedResponseException' ||
          /fetch|network/i.test(detail))
      ) {
        message = `The PDF could not be loaded from ${source}. It must be publicly reachable from this site (same domain or CORS enabled).`;
      } else if (!window.pdfjsLib) {
        message =
          'The PDF reader could not be loaded. Check that the site allows scripts from cdnjs.cloudflare.com.';
      }
      setError(message);
      setStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (!pdfUrl) return undefined;
    const id = setTimeout(() => convert(pdfUrl), 0);
    return () => clearTimeout(id);
  }, [pdfUrl, convert]);

  useEffect(() => () => docRef.current?.destroy?.(), []);

  // Render the cover and the pages behind dark sections one by one, after
  // the guide is on screen.
  useEffect(() => {
    if (!guide || !docRef.current) return undefined;
    let cancelled = false;
    const doc = docRef.current;
    (async () => {
      const jobs = [
        ['cover', 1, 1600],
        ...backgroundPages(guide).map((page) => [page, page, 1200]),
      ];
      for (const [key, page, width] of jobs) {
        try {
          const rendered = await renderPage(doc, page, width);
          const src = key === 'cover' ? rendered : rendered.src;
          if (cancelled) return;
          setBackgrounds((prev) => ({ ...prev, [key]: src }));
        } catch {
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [guide]);

  const viewPage = async (number) => {
    setModal({ number, image: null });
    try {
      const { src } = await renderPage(docRef.current, number, 1100);
      setModal((m) => (m?.number === number ? { number, image: src } : m));
    } catch {
      setModal(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className={cn('font-sans', className)}>
        <Progress label={progress.label} value={progress.value} />
      </div>
    );
  }

  if (status !== 'ready' || !guide) {
    return (
      <div className={cn('font-sans', className)}>
        <Notice error={error} />
      </div>
    );
  }

  const firstId = guide.sections[0] ? slugify(guide.sections[0].heading) : '';

  return (
    <div className={cn('relative font-sans', className)}>
      <GuideShell
        brandName={brandName}
        description={guide.subtitle}
        pdfUrl={pdfUrl}
        title={guide.title}
        content={
          <Fragment>
            <GuideHero
              backgroundImage={
                backgrounds.cover
                  ? { ...backgrounds.cover, alt: '' }
                  : undefined
              }
              eyebrow={`Interactive edition · ${guide.pageCount} pages`}
              heading={guide.title}
              parallax
              primaryLabel="Start reading"
              primaryLink={firstId ? `#${firstId}` : undefined}
              secondaryLabel={pdfUrl ? 'Original PDF' : undefined}
              secondaryLink={pdfUrl}
              subheading={guide.subtitle}
            />
            <GuideBody
              backgrounds={backgrounds}
              guide={guide}
              onViewPage={showOriginalPages ? viewPage : null}
            />
          </Fragment>
        }
      />
      {modal && (
        <PageModal
          image={modal.image}
          number={modal.number}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};

export default PdfGuide;
