import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const QuizReport = ({
  reportTitle,
  reportTitleAccent,
  tagline,
  websiteLabel,
  copyrightText,
  benchmarkSource,
  ctaHeading,
  ctaText,
  ctaLinkLabel,
  fileNamePrefix = 'Assessment_Report',
  nextSteps,
  className,
}) => (
  <DataCard
    className={className}
    label="PDF report settings"
    meta={[websiteLabel, `${fileNamePrefix}_<Company>.pdf`]}
    title={[reportTitle, reportTitleAccent].filter(Boolean).join(' ')}
    body={tagline}
    {...quizItemAttrs('report', {
      reportTitle,
      reportTitleAccent,
      tagline,
      websiteLabel,
      copyrightText,
      benchmarkSource,
      ctaHeading,
      ctaText,
      ctaLinkLabel,
      fileNamePrefix,
    })}
  >
    {nextSteps}
  </DataCard>
);

export default QuizReport;
