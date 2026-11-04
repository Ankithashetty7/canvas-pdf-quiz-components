import { DataCard } from '@/lib/quiz/DataCard';
import { quizItemAttrs } from '@/lib/quiz/engine';

const QuizNextStep = ({ title, detail, className }) => (
  <DataCard
    className={className}
    label="Report next step"
    title={title}
    body={detail}
    {...quizItemAttrs('next-step', { title, detail })}
  />
);

export default QuizNextStep;
