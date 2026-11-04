import { useState } from 'react';
import { GuideIcon } from '@/lib/guide/icons';
import { DemoLeadForm, HubSpotForm, MarketoForm } from '@/lib/lead-forms';
import { cn } from 'drupal-canvas';

const LeadForm = ({
  heading,
  text,
  submitLabel = 'Submit',
  successHeading = 'Thank you!',
  successText,
  marketoBaseUrl,
  marketoMunchkinId,
  marketoFormId,
  hubSpotRegion,
  hubSpotPortalId,
  hubSpotFormId,
  className,
}) => {
  const [done, setDone] = useState(false);
  const hasMarketo = marketoBaseUrl && marketoMunchkinId && marketoFormId;
  const hasHubSpot = hubSpotRegion && hubSpotPortalId && hubSpotFormId;

  return (
    <div
      className={cn(
        'quiz rounded-3xl bg-white p-7 text-guide-ink shadow-[0_32px_80px_-32px_rgba(8,15,92,0.6)] sm:p-9',
        className,
      )}
      data-guide-chrome
    >
      {done ? (
        <div aria-live="polite" className="py-6 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-guide-mint/25 text-guide-cobalt">
            <GuideIcon name="check" size={28} strokeWidth={2.5} />
          </span>
          <h3 className="mb-2 text-xl font-bold">{successHeading}</h3>
          {successText && (
            <p className="text-sm text-slate-600">{successText}</p>
          )}
        </div>
      ) : (
        <>
          {heading && <h3 className="mb-2 text-xl font-bold">{heading}</h3>}
          {text && <p className="mb-5 text-sm text-slate-600">{text}</p>}
          {hasHubSpot && (
            <HubSpotForm
              formId={hubSpotFormId}
              onSubmit={() => setDone(true)}
              portalId={hubSpotPortalId}
              region={hubSpotRegion}
            />
          )}
          {!hasHubSpot && hasMarketo && (
            <MarketoForm
              baseUrl={marketoBaseUrl}
              formId={marketoFormId}
              munchkinId={marketoMunchkinId}
              onSubmit={() => setDone(true)}
            />
          )}
          {!hasHubSpot && !hasMarketo && (
            <DemoLeadForm
              buttonClassName="bg-guide-ink hover:bg-guide-royal rounded-full"
              onSubmit={() => setDone(true)}
              submitLabel={submitLabel}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LeadForm;
