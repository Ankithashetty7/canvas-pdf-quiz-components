import { useCallback, useEffect, useRef, useState } from 'react';
import { GuideIcon } from '@/lib/guide/icons';
import { cn } from 'drupal-canvas';

const readSections = (root) =>
  Array.from(root.querySelectorAll('[data-guide-section]'))
    .filter((el) => el.id && el.dataset.navLabel)
    .map((el) => ({
      id: el.id,
      label: el.dataset.navLabel,
      number: el.dataset.navNumber || '',
    }));

const sameSections = (a, b) =>
  a.length === b.length &&
  a.every((s, i) => s.id === b[i].id && s.label === b[i].label);

const IconButton = ({ label, icon, onClick, active, className, ...rest }) => (
  <button
    aria-label={label}
    className={cn(
      'inline-flex size-10 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guide-mint',
      active && 'bg-white/10 text-white',
      className,
    )}
    onClick={onClick}
    title={label}
    type="button"
    {...rest}
  >
    <GuideIcon name={icon} size={20} />
  </button>
);

const GuideShell = ({
  title,
  brandName,
  description,
  publishedDate,
  pdfUrl,
  showShare = true,
  showPrint = true,
  showSectionDots = true,
  content,
  className,
}) => {
  const contentRef = useRef(null);
  const menuRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [sections, setSections] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Reading progress across the guide content.
  useEffect(() => {
    let frame = null;
    const update = () => {
      frame = null;
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrollable = el.offsetHeight - window.innerHeight;
      const value = scrollable > 0 ? -rect.top / scrollable : 0;
      setProgress(Math.min(1, Math.max(0, value)));
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  // Table of contents is built from guide sections in the content slot.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return undefined;
    let timer = null;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = readSections(root);
        setSections((prev) => (sameSections(prev, next) ? prev : next));
      }, 50);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['id', 'data-nav-label'],
      childList: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Highlight the section crossing the middle of the viewport.
  useEffect(() => {
    if (!sections.length || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  const closeMenus = useCallback(() => {
    setMenuOpen(false);
    setShareOpen(false);
  }, []);

  useEffect(() => {
    if (!menuOpen && !shareOpen) return undefined;
    const onKey = (event) => event.key === 'Escape' && closeMenus();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, shareOpen, closeMenus]);

  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector('a')?.focus();
  }, [menuOpen]);

  const pageUrl = () =>
    typeof window === 'undefined' ? '' : window.location.href.split('#')[0];

  const share = (network) => {
    const url = encodeURIComponent(pageUrl());
    const text = encodeURIComponent(title || document.title);
    const targets = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      x: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      email: `mailto:?subject=${text}&body=${url}`,
    };
    if (network === 'email') window.location.assign(targets.email);
    else
      window.open(
        targets[network],
        '_blank',
        'noopener,noreferrer,width=640,height=560',
      );
    setShareOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', pageUrl());
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: publishedDate || undefined,
    author: brandName
      ? { '@type': 'Organization', name: brandName }
      : undefined,
    publisher: brandName
      ? { '@type': 'Organization', name: brandName }
      : undefined,
    hasPart: sections.map((s) => ({
      '@type': 'WebPageElement',
      name: s.label,
      url: `#${s.id}`,
    })),
  };

  return (
    <div className={cn('guide-shell relative font-sans', className)}>
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
        type="application/ld+json"
      />
      <header
        className="sticky top-0 z-40 border-b border-white/10 bg-guide-deep/85 text-white backdrop-blur-md"
        data-guide-chrome
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <IconButton
            aria-controls="guide-toc"
            aria-expanded={menuOpen}
            icon={menuOpen ? 'close' : 'menu'}
            label={menuOpen ? 'Close contents' : 'Open contents'}
            onClick={() => {
              setShareOpen(false);
              setMenuOpen((v) => !v);
            }}
          />
          <div className="min-w-0 flex-1">
            {brandName && (
              <div className="text-[10px] font-bold tracking-[0.2em] text-guide-mint uppercase">
                {brandName}
              </div>
            )}
            <div className="truncate text-sm font-semibold">{title}</div>
          </div>
          <div className="flex items-center gap-1">
            {showShare && (
              <div className="relative">
                <IconButton
                  active={shareOpen}
                  aria-expanded={shareOpen}
                  aria-haspopup="menu"
                  icon="share"
                  label="Share"
                  onClick={() => {
                    setMenuOpen(false);
                    setShareOpen((v) => !v);
                  }}
                />
                {shareOpen && (
                  <div
                    className="absolute top-12 right-0 w-48 overflow-hidden rounded-xl border border-white/10 bg-guide-ink p-1 shadow-2xl"
                    role="menu"
                  >
                    {[
                      ['linkedin', 'LinkedIn', 'users'],
                      ['x', 'X (Twitter)', 'share'],
                      ['email', 'Email', 'mail'],
                    ].map(([key, label, icon]) => (
                      <button
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                        key={key}
                        onClick={() => share(key)}
                        role="menuitem"
                        type="button"
                      >
                        <GuideIcon
                          className="text-guide-mint"
                          name={icon}
                          size={16}
                        />
                        {label}
                      </button>
                    ))}
                    <button
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                      onClick={copyLink}
                      role="menuitem"
                      type="button"
                    >
                      <GuideIcon
                        className="text-guide-mint"
                        name="link"
                        size={16}
                      />
                      {copied ? 'Link copied' : 'Copy link'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {showPrint && (
              <IconButton
                icon="print"
                label="Print or save as PDF"
                onClick={() => window.print()}
              />
            )}
            {pdfUrl && (
              <a
                className="ml-1 hidden items-center gap-2 rounded-full bg-guide-mint px-4 py-2 text-sm font-semibold text-guide-deep transition-colors hover:bg-white sm:inline-flex"
                href={pdfUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GuideIcon name="download" size={16} strokeWidth={2.25} />
                PDF
              </a>
            )}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-linear-to-r from-guide-mint to-guide-cyan"
          style={{ transform: `scaleX(${progress})` }}
        />
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 flex" data-guide-chrome>
          <nav
            aria-label="Guide contents"
            className="flex h-full w-full max-w-sm flex-col overflow-y-auto bg-guide-ink p-6 text-white shadow-2xl"
            id="guide-toc"
            ref={menuRef}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-bold tracking-[0.2em] text-guide-mint uppercase">
                Contents
              </span>
              <IconButton
                icon="close"
                label="Close contents"
                onClick={closeMenus}
              />
            </div>
            <div className="mb-6 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-guide-mint"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <ol className="m-0 flex list-none flex-col gap-1 p-0">
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    aria-current={activeId === s.id ? 'true' : undefined}
                    className={cn(
                      'flex items-baseline gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 no-underline transition-colors hover:bg-white/10 hover:text-white',
                      activeId === s.id && 'bg-white/10 text-white',
                    )}
                    href={`#${s.id}`}
                    onClick={closeMenus}
                  >
                    <span className="w-6 shrink-0 text-xs font-bold text-guide-mint tabular-nums">
                      {s.number}
                    </span>
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <button
            aria-label="Close contents"
            className="flex-1 cursor-default bg-black/50"
            onClick={closeMenus}
            type="button"
          />
        </div>
      )}

      {showSectionDots && sections.length > 1 && (
        <nav
          aria-label="Section navigation"
          className="fixed top-1/2 right-4 z-30 hidden -translate-y-1/2 flex-col gap-2.5 xl:flex"
          data-guide-chrome
        >
          {sections.map((s) => (
            <a
              aria-label={s.label}
              className="group relative flex items-center justify-end"
              href={`#${s.id}`}
              key={s.id}
            >
              <span className="pointer-events-none absolute right-6 rounded-md bg-guide-ink px-2 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {s.label}
              </span>
              <span
                className={cn(
                  'block size-2.5 rounded-full border border-guide-cobalt bg-white/70 transition-all',
                  activeId === s.id && 'h-5 border-guide-mint bg-guide-mint',
                )}
              />
            </a>
          ))}
        </nav>
      )}

      <div ref={contentRef}>{content}</div>
    </div>
  );
};

export default GuideShell;
