import { useEffect, useId, useRef, useState } from 'react';
import { loadScript } from '@/lib/quiz/engine';
import { cn } from 'drupal-canvas';

const inputClassName =
  'h-[38px] w-full rounded-lg border-[1.5px] border-gray-300 px-3 text-sm text-ink outline-none focus:border-teal';

// Lead capture shared by the quiz gate and the standalone form component.

// Used when no Marketo form is configured (Workbench, demos). Nothing is sent.
export const DemoLeadForm = ({ onSubmit, submitLabel, buttonClassName }) => {
  const idPrefix = useId();
  const [values, setValues] = useState({
    FirstName: '',
    LastName: '',
    Email: '',
    Company: '',
    JobTitle: '',
  });
  const [errors, setErrors] = useState({});

  const update = (field) => (event) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const next = {};
    ['FirstName', 'LastName', 'Email', 'Company'].forEach((f) => {
      if (!values[f].trim()) next[f] = 'Required';
    });
    if (values.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.Email)) {
      next.Email = 'Enter a valid email';
    }
    setErrors(next);
    if (Object.keys(next).length === 0) onSubmit(values);
  };

  const field = (name, label, type = 'text') => (
    <div className="mb-3">
      <label
        className="mb-1 block text-xs font-semibold text-ink"
        htmlFor={`${idPrefix}-${name}`}
      >
        {label}
      </label>
      <input
        aria-invalid={!!errors[name]}
        className={cn(inputClassName, errors[name] && 'border-red-500')}
        id={`${idPrefix}-${name}`}
        name={name}
        onChange={update(name)}
        type={type}
        value={values[name]}
      />
      {errors[name] && (
        <div className="mt-0.5 text-[11px] text-red-500">{errors[name]}</div>
      )}
    </div>
  );

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        {field('FirstName', 'First Name')}
        {field('LastName', 'Last Name')}
      </div>
      {field('Email', 'Business Email', 'email')}
      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        {field('Company', 'Company')}
        {field('JobTitle', 'Job Title')}
      </div>
      {/* Submits on click too, so it works inside sandboxed previews. */}
      <button
        className={cn(
          'mt-1 inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-teal px-5.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal',
          buttonClassName,
        )}
        onClick={handleSubmit}
        type="button"
      >
        {submitLabel}
      </button>
      <p className="mt-2 text-center text-[10px] text-gray-400">
        Demo form — no data is sent. Configure HubSpot or Marketo to capture
        leads.
      </p>
    </form>
  );
};

export const MarketoForm = ({ baseUrl, munchkinId, formId, onSubmit }) => {
  const [error, setError] = useState(false);
  const onSubmitRef = useRef(onSubmit);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
  });

  useEffect(() => {
    let cancelled = false;
    const base = baseUrl.replace(/\/$/, '');
    loadScript(`${base}/js/forms2/js/forms2.min.js`)
      .then(() => {
        if (cancelled || !window.MktoForms2) return;
        window.MktoForms2.loadForm(base, munchkinId, Number(formId), (form) => {
          form.onSuccess((values) => {
            onSubmitRef.current(values);
            // Keep visitors in the experience instead of Marketo's thank-you URL.
            return false;
          });
        });
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [baseUrl, munchkinId, formId]);

  if (error) {
    return (
      <p className="text-xs text-red-500">
        The form could not be loaded. Please refresh and try again.
      </p>
    );
  }
  return <form id={`mktoForm_${formId}`} />;
};

// HubSpot field names ("0-1/email") mapped to the keys the quiz report uses.
const HUBSPOT_FIELDS = {
  firstname: 'FirstName',
  lastname: 'LastName',
  email: 'Email',
  company: 'Company',
  jobtitle: 'JobTitle',
};

const fromHubSpotValues = (fields = []) =>
  fields.reduce((acc, field) => {
    const key = HUBSPOT_FIELDS[String(field.name).split('/').pop()];
    if (key)
      acc[key] = Array.isArray(field.value) ? field.value[0] : field.value;
    return acc;
  }, {});

// HubSpot's current embed (hs-form-frame). It announces submissions through
// window events; `hiddenValues` fill matching hidden contact properties
// (e.g. assessment_score) when the form has them.
export const HubSpotForm = ({
  region,
  portalId,
  formId,
  hiddenValues,
  onSubmit,
}) => {
  const [error, setError] = useState(false);
  const onSubmitRef = useRef(onSubmit);
  const hiddenRef = useRef(hiddenValues);
  useEffect(() => {
    onSubmitRef.current = onSubmit;
    hiddenRef.current = hiddenValues;
  });

  useEffect(() => {
    let cancelled = false;
    const formFor = (event) => {
      try {
        return window.HubSpotFormsV4?.getFormFromEvent(event);
      } catch {
        return null;
      }
    };
    const isOurs = (form) =>
      !form || !form.getFormId || form.getFormId() === formId;

    const onReady = (event) => {
      const form = formFor(event);
      if (!form || !isOurs(form) || !hiddenRef.current) return;
      Object.entries(hiddenRef.current).forEach(([name, value]) => {
        try {
          form.setFieldValue(`0-1/${name}`, String(value ?? ''));
        } catch {
          // The form has no such field.
        }
      });
    };
    const onSuccess = async (event) => {
      const form = formFor(event);
      if (!isOurs(form)) return;
      let values = {};
      try {
        values = fromHubSpotValues(await form?.getFormFieldValues());
      } catch {
        // Fall back to empty values; the report still unlocks.
      }
      onSubmitRef.current(values);
    };

    window.addEventListener('hs-form-event:on-ready', onReady);
    window.addEventListener('hs-form-event:on-submission:success', onSuccess);
    loadScript(
      `https://js-${region}.hsforms.net/forms/embed/${portalId}.js`,
    ).catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
      window.removeEventListener('hs-form-event:on-ready', onReady);
      window.removeEventListener(
        'hs-form-event:on-submission:success',
        onSuccess,
      );
    };
  }, [region, portalId, formId]);

  if (error) {
    return (
      <p className="text-xs text-red-500">
        The form could not be loaded. Please refresh and try again.
      </p>
    );
  }
  return (
    <div
      className="hs-form-frame"
      data-form-id={formId}
      data-portal-id={portalId}
      data-region={region}
    />
  );
};
