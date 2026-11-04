import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const WHEN_LABELS = {
  below_benchmark: 'Below benchmark',
  above_benchmark: 'At or above benchmark',
};

const QuizAction = ({
  appliesWhen = 'below_benchmark',
  action,
  impact = 'high',
  effort = 'medium',
  timeframe,
  detail,
  className,
}) => (
  <DataCard
    className={className}
    label={`Priority action · ${WHEN_LABELS[appliesWhen] || appliesWhen}`}
    meta={[`Impact: ${impact}`, `Effort: ${effort}`, timeframe]}
    title={action}
    body={detail}
    {...quizItemAttrs('action', {
      appliesWhen,
      action,
      impact,
      effort,
      timeframe,
      detail,
    })}
  />
);

export default QuizAction;
