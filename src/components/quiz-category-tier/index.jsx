import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const TIER_LABELS = { low: 'Low score', mid: 'Mid score', high: 'High score' };

const QuizCategoryTier = ({
  tier = 'low',
  insight,
  whatItMeans,
  recommendations,
  className,
}) => (
  <DataCard
    className={className}
    label={`Category content · ${TIER_LABELS[tier] || tier}`}
    body={insight}
    {...quizItemAttrs('category-tier', {
      tier,
      insight,
      whatItMeans,
      recommendations,
    })}
  />
);

export default QuizCategoryTier;
