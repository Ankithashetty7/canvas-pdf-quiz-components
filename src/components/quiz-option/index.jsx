import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const QuizOption = ({ label, description, score = 1, className }) => (
  <DataCard
    className={className}
    label="Answer option"
    meta={[`Score ${score}`]}
    title={label}
    body={description}
    {...quizItemAttrs('option', { label, description, score })}
  />
);

export default QuizOption;
