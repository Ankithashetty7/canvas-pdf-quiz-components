import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const QuizResultBand = ({
  minPercent = 0,
  maxPercent = 100,
  overallLevel,
  categoryLevel,
  summary,
  executiveSummary,
  upliftExpected,
  upliftMaximum,
  upliftText,
  className,
}) => (
  <DataCard
    className={className}
    label={`Result band · ${minPercent}–${maxPercent}%`}
    meta={[
      overallLevel && `Overall: ${overallLevel}`,
      categoryLevel && `Category: ${categoryLevel}`,
      upliftExpected && `Uplift: ${upliftExpected} / ${upliftMaximum}`,
    ]}
    body={summary || executiveSummary || upliftText}
    {...quizItemAttrs('result-band', {
      minPercent,
      maxPercent,
      overallLevel,
      categoryLevel,
      summary,
      executiveSummary,
      upliftExpected,
      upliftMaximum,
      upliftText,
    })}
  />
);

export default QuizResultBand;
