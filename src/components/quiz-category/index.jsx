import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const QuizCategory = ({
  name,
  focusArea,
  vendorBenchmark = 50,
  customerBenchmark = 50,
  tiers,
  actions,
  className,
}) => (
  <DataCard
    className={className}
    label="Quiz category"
    meta={[
      focusArea && `Focus: ${focusArea}`,
      `Vendor avg ${vendorBenchmark}%`,
      `Customer exp ${customerBenchmark}%`,
    ]}
    title={name}
    {...quizItemAttrs('category', {
      name,
      focusArea,
      vendorBenchmark,
      customerBenchmark,
    })}
  >
    {tiers}
    {actions}
  </DataCard>
);

export default QuizCategory;
