import { useState } from 'react';
import { Quiz, QuizQuestion } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, CheckCircle, XCircle } from 'lucide-react';

interface QuizListProps {
  quizzes: Quiz[];
}

export default function QuizList({ quizzes }: QuizListProps) {
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No quizzes available yet.</p>
      </div>
    );
  }

  if (!activeQuiz) {
    return (
      <div className="space-y-4">
        {quizzes.map((quiz) => (
          <Card key={quiz.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveQuiz(quiz)}>
            <CardHeader>
              <CardTitle>{quiz.title}</CardTitle>
              <CardDescription>{quiz.questions.length} questions</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const question = activeQuiz.questions[currentQ];

  const handleAnswer = (idx: number) => {
    setSelected(idx);
    if (idx === question.correctAnswer) setScore(s => s + 1);
    setShowResult(true);
  };

  const nextQuestion = () => {
    if (currentQ < activeQuiz.questions.length - 1) {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const resetQuiz = () => {
    setActiveQuiz(null);
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
  };

  const isLast = currentQ === activeQuiz.questions.length - 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{activeQuiz.title}</CardTitle>
          <span className="text-sm text-muted-foreground">Q{currentQ + 1}/{activeQuiz.questions.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{question.question}</p>
        <div className="space-y-2">
          {question.options.map((opt, idx) => (
            <Button
              key={idx}
              variant={selected === idx ? (idx === question.correctAnswer ? 'default' : 'destructive') : 'outline'}
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => !showResult && handleAnswer(idx)}
              disabled={showResult}
            >
              {showResult && idx === question.correctAnswer && <CheckCircle className="w-4 h-4 mr-2" />}
              {showResult && selected === idx && idx !== question.correctAnswer && <XCircle className="w-4 h-4 mr-2" />}
              {opt}
            </Button>
          ))}
        </div>
        {showResult && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm">{question.explanation}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetQuiz}>Exit</Button>
          {showResult && !isLast && <Button onClick={nextQuestion}>Next</Button>}
          {showResult && isLast && <Button onClick={resetQuiz}>Finish (Score: {score}/{activeQuiz.questions.length})</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
