// Turns positioned PDF text into a guide outline: a title, and sections made
// of typed blocks (paragraph, subheading, list, cards, table, stat, quote,
// takeaway).
//
// Input pages: [{ number, width, height, items: [{ str, x, y, w, size }] }]
// where `y` is the text baseline measured from the top of the page.
//
// PDFs carry no semantics, so everything here is a heuristic based on font
// size, position and a few common phrases. It works best on designed,
// text-based PDFs (ebooks, guides, reports) and degrades to plain sections.

const round = (n, step = 0.5) => Math.round(n / step) * step;

const normalize = (text) =>
  text
    .replace(/\s+/g, ' ')
    .replace(/\s([,.;:!?%])/g, '$1')
    .trim();

// Join wrapped lines, keeping hyphens at line ends ("hardware-" + "based").
const joinLines = (lines) =>
  normalize(
    lines.reduce(
      (acc, line) =>
        acc && !acc.endsWith('-') ? `${acc} ${line}` : acc + line,
      '',
    ),
  );

const weightedMode = (values) => {
  const counts = new Map();
  values.forEach(([value, weight]) =>
    counts.set(value, (counts.get(value) || 0) + weight),
  );
  let best = null;
  let bestCount = -1;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
};

const inEdgeBand = (item, page) =>
  item.y > page.height * 0.9 || item.y < page.height * 0.08;

const chromeKey = (item) => {
  const text = /^\d{1,3}$/.test(item.str.trim()) ? '#' : item.str.trim();
  return `${text}@${Math.round(item.y / 10)}`;
};

// Text repeated at the same spot on many pages (running headers, footers,
// page numbers) is chrome, not content.
const findChrome = (pages) => {
  const seen = new Map();
  pages.forEach((page) => {
    const keys = new Set(
      page.items.filter((i) => inEdgeBand(i, page)).map(chromeKey),
    );
    keys.forEach((k) => seen.set(k, (seen.get(k) || 0) + 1));
  });
  const threshold = Math.max(2, pages.length * 0.3);
  return new Set([...seen].filter(([, n]) => n >= threshold).map(([k]) => k));
};

// Items on the same baseline become one line. Tight gaps (kerning, "T" +
// "able") join without a space; a trailing "%" or "+" may be smaller.
const BULLET_ONLY = /^[•●▪◦‣∙·–-]$/;

const toLines = (items) => {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  sorted.forEach((item) => {
    const last = lines[lines.length - 1];
    const symbol = /^[%+]$/.test(item.str.trim());
    const afterBullet = last && BULLET_ONLY.test(last.text.trim());
    const sameSize = Math.abs((last?.size ?? 0) - item.size) < 0.6;
    const gap = last ? item.x - last.right : 0;
    if (
      afterBullet &&
      Math.abs(last.y - item.y) < Math.max(2, item.size * 0.5) &&
      gap > -1 &&
      gap < item.size * 4
    ) {
      last.text = `• ${item.str}`;
      last.textX = item.x;
      last.right = item.x + item.w;
      last.size = item.size;
    } else if (
      last &&
      (sameSize || symbol) &&
      Math.abs(last.y - item.y) <
        Math.max(1.5, last.size * (symbol ? 0.6 : 0.2)) &&
      gap > -last.size &&
      gap < last.size * 0.8
    ) {
      last.text += gap < last.size * 0.12 ? item.str : ` ${item.str}`;
      last.right = Math.max(last.right, item.x + item.w);
    } else {
      lines.push({
        text: item.str,
        x: item.x,
        right: item.x + item.w,
        y: item.y,
        size: item.size,
      });
    }
  });
  return lines
    .map((l) => ({ ...l, text: normalize(l.text) }))
    .filter((l) => l.text);
};

// Consecutive lines with the same size and the same left edge (or the same
// centre or right edge, for centred and right-aligned text) become a block.
const toBlocks = (lines) => {
  const sorted = [...lines].sort((a, b) => a.y - b.y || a.x - b.x);
  const blocks = [];
  sorted.forEach((line) => {
    const center = (line.x + line.right) / 2;
    const bullet = /^•\s/.test(line.text);
    const block = blocks.find(
      (b) =>
        !bullet &&
        Math.abs(b.size - line.size) < 0.6 &&
        line.y - b.bottom > 0 &&
        line.y - b.bottom < line.size * 1.9 &&
        (Math.abs(b.x - line.x) < line.size * 0.8 ||
          (b.textX !== undefined &&
            Math.abs(b.textX - line.x) < line.size * 0.8) ||
          Math.abs(b.center - center) < line.size * 1.2 ||
          Math.abs(b.lastRight - line.right) < line.size * 0.8),
    );
    if (block) {
      block.lines.push(line.text);
      block.bottom = line.y;
      block.x = Math.min(block.x, line.x);
      block.right = Math.max(block.right, line.right);
      block.center = center;
      block.lastRight = line.right;
    } else {
      blocks.push({
        lines: [line.text],
        x: line.x,
        right: line.right,
        center,
        textX: line.textX,
        lastRight: line.right,
        top: line.y - line.size,
        bottom: line.y,
        size: line.size,
      });
    }
  });
  return blocks.map((b) => ({ ...b, text: joinLines(b.lines) }));
};

const largestGap = (blocks, start, end) => {
  const sorted = [...blocks].sort((a, b) => a[start] - b[start]);
  let reach = sorted[0][end];
  let best = null;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i][start] - reach;
    if (gap > 0 && (!best || gap > best.gap)) best = { gap, index: i, sorted };
    reach = Math.max(reach, sorted[i][end]);
  }
  return best;
};

// Recursive XY-cut. Wide horizontal whitespace splits first (top to bottom);
// otherwise column gutters split left to right; otherwise narrow horizontal
// gaps. This recovers reading order for multi-column layouts without
// interleaving columns whose paragraph breaks happen to line up.
const xyCut = (blocks, body, depth = 0) => {
  if (blocks.length <= 1 || depth > 16) return blocks;
  const h = largestGap(blocks, 'top', 'bottom');
  const v = largestGap(blocks, 'x', 'right');
  let cut = null;
  if (h && h.gap >= body * 2.2) cut = h;
  else if (v && v.gap > 4) cut = v;
  else if (h) cut = h;
  if (!cut) return [...blocks].sort((a, b) => a.top - b.top);
  return [
    ...xyCut(cut.sorted.slice(0, cut.index), body, depth + 1),
    ...xyCut(cut.sorted.slice(cut.index), body, depth + 1),
  ];
};

// A page region laid out as a grid: 3+ rows whose cells start at the same
// set of 3+ x positions. Returns { table, rest } or null.
const findTable = (blocks, body) => {
  const rows = [];
  const byTop = [...blocks].sort((a, b) => a.top - b.top);
  byTop.forEach((b) => {
    const row = rows.find((r) => Math.abs(r.top - b.top) < body * 0.6);
    if (row) row.cells.push(b);
    else rows.push({ top: b.top, cells: [b] });
  });
  const gridRows = rows.filter((r) => r.cells.length >= 3);
  if (gridRows.length < 4) return null;
  const columns = gridRows[0].cells.map((c) => c.x).sort((a, b) => a - b);
  const aligned = gridRows.filter(
    (r) =>
      r.cells.length === columns.length &&
      r.cells
        .map((c) => c.x)
        .sort((a, b) => a - b)
        .every((x, i) => Math.abs(x - columns[i]) < body * 1.5),
  );
  if (aligned.length < 4) return null;
  const cellsOf = (r) =>
    [...r.cells].sort((a, b) => a.x - b.x).map((c) => c.text);
  const [header, ...bodyRows] = aligned;
  const headerCells = cellsOf(header);
  if (headerCells.some((c) => c.length > 40 || /^•/.test(c))) return null;
  const used = new Set(aligned.flatMap((r) => r.cells));
  return {
    table: {
      type: 'table',
      headers: cellsOf(header),
      rows: bodyRows.map(cellsOf),
      top: header.top,
    },
    rest: blocks.filter((b) => !used.has(b)),
  };
};

const STAT = /^([$€£]?)(\d{1,3}(?:[.,]\d+)?)\s*(%|\+|x|k|m|bn)$/i;
const NUMBER_ONLY = /^\d{1,2}$/;
const QUOTE_MARKS = /^[“”"«»‘’]+$/;
const TAKEAWAY =
  /^(key takeaways?|the bottom line|in summary|key point)\s*:?\s*(.*)$/i;
const TOC = /^(table of )?contents$/i;
const LIST_HEADING =
  /:$|should consider|look for|checklist|key (points|features)/i;

// Groups repeated "title + short text" pairs into card grids, and runs of
// single-item lists into cards as well.
const TOPIC_BODY = new Set(['paragraph', 'lead', 'list']);

const groupTopics = (blocks) => {
  const out = [];
  let i = 0;
  const topicAt = (j) => {
    const head = blocks[j];
    if (head?.type !== 'subheading' || head.text.length > 90) return null;
    const body = [];
    let k = j + 1;
    while (blocks[k] && TOPIC_BODY.has(blocks[k].type)) {
      body.push(blocks[k]);
      k += 1;
    }
    return body.length ? { title: head.text, body, end: k } : null;
  };
  while (i < blocks.length) {
    const topics = [];
    let j = i;
    let topic = topicAt(j);
    while (topic) {
      topics.push({ title: topic.title, body: topic.body });
      j = topic.end;
      topic = topicAt(j);
    }
    // Only a group where most topics carry real content; short pairs are
    // left for card grids.
    const longTopics = topics.filter(
      (t) =>
        t.body.length > 1 ||
        (t.body[0]?.text || t.body[0]?.items?.join(' ') || '').length > 160,
    ).length;
    if (topics.length >= 3 && longTopics >= Math.ceil(topics.length / 2)) {
      out.push({ type: 'topics', items: topics, page: blocks[i].page });
      i = j;
    } else {
      out.push(blocks[i]);
      i += 1;
    }
  }
  return out;
};

const groupCards = (blocks) => {
  const out = [];
  let i = 0;
  const pairAt = (j) => {
    const a = blocks[j];
    const b = blocks[j + 1];
    if (!a || !b || b.type !== 'paragraph' || b.text.length > 320) return null;
    if (a.type === 'subheading' && a.text.length < 80)
      return { title: a.text, text: b.text };
    if (a.type === 'paragraph' && a.text.length < 60 && /:$/.test(a.text)) {
      return { title: a.text.replace(/:$/, ''), text: b.text };
    }
    if (a.type === 'list' && a.items.length === 1 && a.heading) {
      return null;
    }
    return null;
  };
  while (i < blocks.length) {
    const cards = [];
    let j = i;
    let pair = pairAt(j);
    while (pair) {
      cards.push(pair);
      j += 2;
      pair = pairAt(j);
    }
    while (
      blocks[j]?.type === 'list' &&
      blocks[j].items.length === 1 &&
      blocks[j].heading
    ) {
      cards.push({ title: blocks[j].heading, text: blocks[j].items[0] });
      j += 1;
    }
    if (!cards.length) {
      while (
        blocks[j]?.type === 'subheading' &&
        blocks[j].text.length < 40 &&
        blocks[j + 1]?.type !== 'paragraph'
      ) {
        cards.push({ title: blocks[j].text, text: '' });
        j += 1;
      }
      if (cards.length < 3) {
        cards.length = 0;
        j = i;
      }
    }
    if (cards.length >= 2) {
      out.push({ type: 'cards', items: cards, page: blocks[i].page });
      i = j;
    } else {
      out.push(blocks[i]);
      i += 1;
    }
  }
  return out;
};

export const buildGuide = (pages) => {
  const chrome = findChrome(pages);
  const prepared = pages.map((page) => {
    const items = page.items.filter(
      (item) =>
        item.str.trim() &&
        !(inEdgeBand(item, page) && chrome.has(chromeKey(item))),
    );
    return { page, blocks: toBlocks(toLines(items)) };
  });

  const allBlocks = prepared.flatMap((p) => p.blocks);
  const body =
    weightedMode(allBlocks.map((b) => [round(b.size), b.text.length])) || 10;

  const perPage = prepared.map(({ page, blocks }) => {
    const found = findTable(blocks, body);
    const flow = xyCut(found ? found.rest : blocks, body);
    if (found) {
      const at = flow.findIndex((b) => b.top > found.table.top);
      flow.splice(at === -1 ? flow.length : at, 0, found.table);
    }
    return { page, blocks: flow };
  });

  // Section headings: the large size used on the most pages.
  const pageCounts = new Map();
  perPage.forEach(({ blocks }) => {
    new Set(
      blocks
        .filter(
          (b) =>
            b.type !== 'table' &&
            b.size >= body * 2 &&
            b.size < body * 6 &&
            !STAT.test(b.text) &&
            !NUMBER_ONLY.test(b.text),
        )
        .map((b) => round(b.size, 2)),
    ).forEach((s) => pageCounts.set(s, (pageCounts.get(s) || 0) + 1));
  });
  const headingSize =
    [...pageCounts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ||
    body * 2.4;
  const kind = (b) => {
    if (b.type === 'table') return 'table';
    if (b.size >= headingSize * 1.6 || b.size >= body * 4.5) return 'display';
    if (b.size >= headingSize * 0.85) return 'heading';
    if (b.size >= body * 1.2) return 'subheading';
    return 'text';
  };

  // Cover: the largest text on page one is the title, the next the subtitle.
  const [cover, ...rest] = perPage;
  const coverBlocks = [...(cover?.blocks || [])]
    .filter((b) => b.text)
    .sort((a, b) => b.size - a.size);
  const title = coverBlocks[0]?.text.replace(/:$/, '') || 'Untitled guide';
  const subtitle =
    coverBlocks.find(
      (b) => b.size < coverBlocks[0].size * 0.8 && b.text.length > 12,
    )?.text || '';

  const sections = [];
  let current = null;
  const startSection = (heading, page, eyebrow = '') => {
    current = { heading, eyebrow, number: '', page, blocks: [] };
    sections.push(current);
  };
  const push = (block) => {
    if (!current) startSection('', block.page);
    current.blocks.push(block);
  };

  rest.forEach(({ page, blocks }) => {
    if (blocks.some((b) => kind(b) === 'heading' && TOC.test(b.text))) return;

    let pendingNumber = '';
    let pendingEyebrow = '';
    let pendingQuote = false;
    let listBlock = null;
    let takeaway = false;
    let stat = null;

    blocks.forEach((b, index) => {
      const k = kind(b);
      const text = b.text;
      const next = blocks[index + 1];

      if (k === 'table') {
        push({ ...b, page: page.number });
        listBlock = null;
        return;
      }
      if (/^\d{1,3}$/.test(text) && k === 'text') return;
      if (/^©/.test(text)) return;
      if (text.length < 18 && /^[a-z]/.test(text)) return;
      if (QUOTE_MARKS.test(text)) {
        pendingQuote = true;
        return;
      }
      if (k === 'display' || k === 'heading') {
        if (NUMBER_ONLY.test(text)) {
          pendingNumber = text;
          return;
        }
        const m = text.match(STAT);
        if (m) {
          stat = {
            type: 'stat',
            prefix: m[1],
            value: Number(m[2].replace(',', '.')),
            suffix: m[3] || '',
            label: '',
            source: '',
            page: page.number,
          };
          push(stat);
          return;
        }
        const continues =
          current &&
          current.page === page.number &&
          !current.blocks.length &&
          current.heading &&
          !pendingNumber;
        if (continues) current.heading = `${current.heading} ${text}`;
        else startSection(text, page.number, pendingEyebrow);
        if (pendingNumber) current.number = pendingNumber;
        const step = pendingEyebrow.match(
          /^(step|phase|stage|part|chapter)\s*(\d{1,2})\b/i,
        );
        if (step && !current.number) {
          current.number = step[2].padStart(2, '0');
        }
        pendingNumber = '';
        pendingEyebrow = '';
        listBlock = null;
        takeaway = false;
        return;
      }

      // A small label right before a heading is its eyebrow ("Introduction").
      if (
        k === 'subheading' &&
        text.length < 40 &&
        next &&
        (kind(next) === 'heading' || kind(next) === 'display') &&
        !STAT.test(next.text)
      ) {
        pendingEyebrow = text;
        return;
      }

      // Label for the most recent stat.
      if (stat && !stat.label && (k === 'text' || k === 'subheading')) {
        if (/^\(.*\)$/.test(text)) {
          stat.source = text.slice(1, -1);
          return;
        }
        if (!/:$/.test(text)) {
          stat.label = text;
          return;
        }
      }
      if (stat && stat.label && !stat.source && /^\(.*\)$/.test(text)) {
        stat.source = text.slice(1, -1);
        return;
      }

      const takeawayMatch = text.match(TAKEAWAY);
      if (takeawayMatch && (k === 'subheading' || text.length < 30)) {
        listBlock = null;
        if (takeawayMatch[2])
          push({ type: 'takeaway', text: takeawayMatch[2], page: page.number });
        else takeaway = true;
        return;
      }
      if (takeaway) {
        push({ type: 'takeaway', text, page: page.number });
        takeaway = false;
        return;
      }

      if (k === 'subheading') {
        if (LIST_HEADING.test(text) && text.length < 70) {
          listBlock = {
            type: 'list',
            heading: text.replace(/:$/, ''),
            items: [],
            page: page.number,
          };
          push(listBlock);
          return;
        }
        listBlock = null;
        push({
          type: text.length > 90 ? 'lead' : 'subheading',
          text,
          page: page.number,
        });
        return;
      }

      // Body-sized text. A lowercase start continues an unfinished sentence
      // that the layout split into separate blocks.
      if (/^[a-z]/.test(text)) {
        const blocksSoFar = current?.blocks || [];
        for (
          let x = blocksSoFar.length - 1;
          x >= Math.max(0, blocksSoFar.length - 3);
          x--
        ) {
          const target = blocksSoFar[x];
          if (target.type === 'paragraph' && !/[.!?:]$/.test(target.text)) {
            target.text = `${target.text} ${text}`;
            return;
          }
          if (target.type === 'list' && target.items.length) {
            const lastItem = target.items[target.items.length - 1];
            if (!/[.!?:]$/.test(lastItem)) {
              target.items[target.items.length - 1] = `${lastItem} ${text}`;
              return;
            }
          }
        }
      }
      if (pendingQuote) {
        push({ type: 'quote', text, attribution: '', page: page.number });
        pendingQuote = false;
        return;
      }
      const last = current?.blocks[current.blocks.length - 1];
      if (
        last?.type === 'quote' &&
        !last.attribution &&
        /^(source|—|–|according)/i.test(text)
      ) {
        last.attribution = text.replace(/^(source:?|—|–)\s*/i, '');
        return;
      }
      if (listBlock && text.length < 260) {
        listBlock.items.push(text.replace(/^[•●▪–-]\s*/, ''));
        return;
      }
      const recentList = [...(current?.blocks || [])]
        .slice(-2)
        .find((x) => x.type === 'list' && x.heading);
      if (recentList && text.length < 180 && !/[.!?]$/.test(text)) {
        recentList.items.push(text);
        return;
      }
      listBlock = null;
      if (/^[•●▪]\s/.test(text)) {
        const item = text.replace(/^[•●▪]\s*/, '');
        if (last?.type === 'list' && !last.heading) last.items.push(item);
        else
          push({ type: 'list', heading: '', items: [item], page: page.number });
        return;
      }
      push({ type: 'paragraph', text, page: page.number });
    });
  });

  const joinDanglingTitles = (blocks) => {
    const out = [];
    blocks.forEach((b) => {
      if (b.type === 'list' && !b.items.length && b.heading) {
        const target = out
          .slice(-2)
          .reverse()
          .find((x) => x.type === 'subheading' && !/[.!?:]$/.test(x.text));
        if (target) target.text = `${target.text} ${b.heading}`;
        return;
      }
      out.push(b);
    });
    return out;
  };

  const cleaned = sections
    .map((s) => ({
      ...s,
      blocks: groupCards(groupTopics(joinDanglingTitles(s.blocks))),
    }))
    .filter((s) => s.heading || s.blocks.length);

  return { title, subtitle, sections: cleaned, pageCount: pages.length };
};
