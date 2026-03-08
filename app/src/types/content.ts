export interface Course {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  order: number;
}

export interface Material {
  id: number;
  courseId: string;
  filename: string;
  title: string;
  summary: string;
  topics: string[];
  flashcardCount: number;
  quizCount: number;
  exerciseCount: number;
}

export interface Flashcard {
  id: number;
  materialId: number;
  front: string;
  back: string;
  topic: string;
}

export interface QuizQuestion {
  id: number;
  materialId: number;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface CodingExercise {
  id: number;
  materialId: number;
  title: string;
  description: string;
  starterCode: string;
  solution: string;
  testCode: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface Explanation {
  id: number;
  materialId: number;
  prompt: string;
  modelAnswer: string;
  topic: string;
}
