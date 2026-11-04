import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const QuizQuestion = ({
  category,
  question,
  description,
  options,
  className,
}) => (
  <DataCard
    className={className}
    label="Quiz question"
    meta={[category]}
    title={question}
    body={description}
    {...quizItemAttrs('question', { category, question, description })}
  >
    {options}
  </DataCard>
);

export default QuizQuestion;
