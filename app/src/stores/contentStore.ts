import { create } from 'zustand';
import type { Course, Material, Flashcard, QuizQuestion, CodingExercise, Explanation } from '@/types/content';

import coursesData from '@/data/courses.json';
import materialsData from '@/data/materials.json';
import flashcardsData from '@/data/flashcards.json';
import quizzesData from '@/data/quizzes.json';
import exercisesData from '@/data/exercises.json';
import explanationsData from '@/data/explanations.json';

interface ContentState {
  courses: Course[];
  materials: Material[];
  flashcards: Flashcard[];
  quizzes: QuizQuestion[];
  exercises: CodingExercise[];
  explanations: Explanation[];

  getCourse: (id: string) => Course | undefined;
  getMaterial: (id: number) => Material | undefined;
  getMaterialsByCourse: (courseId: string) => Material[];
  getFlashcardsByMaterial: (materialId: number) => Flashcard[];
  getFlashcardsByCourse: (courseId: string) => Flashcard[];
  getQuizzesByMaterial: (materialId: number) => QuizQuestion[];
  getQuizzesByCourse: (courseId: string) => QuizQuestion[];
  getExercisesByMaterial: (materialId: number) => CodingExercise[];
  getExercisesByCourse: (courseId: string) => CodingExercise[];
  getExplanationsByMaterial: (materialId: number) => Explanation[];
}

export const useContentStore = create<ContentState>()((set, get) => ({
  courses: coursesData as Course[],
  materials: materialsData as Material[],
  flashcards: flashcardsData as Flashcard[],
  quizzes: quizzesData as QuizQuestion[],
  exercises: exercisesData as CodingExercise[],
  explanations: explanationsData as Explanation[],

  getCourse: (id) => get().courses.find(c => c.id === id),
  getMaterial: (id) => get().materials.find(m => m.id === id),
  getMaterialsByCourse: (courseId) => get().materials.filter(m => m.courseId === courseId),
  getFlashcardsByMaterial: (materialId) => get().flashcards.filter(f => f.materialId === materialId),
  getFlashcardsByCourse: (courseId) => {
    const materialIds = get().materials.filter(m => m.courseId === courseId).map(m => m.id);
    return get().flashcards.filter(f => materialIds.includes(f.materialId));
  },
  getQuizzesByMaterial: (materialId) => get().quizzes.filter(q => q.materialId === materialId),
  getQuizzesByCourse: (courseId) => {
    const materialIds = get().materials.filter(m => m.courseId === courseId).map(m => m.id);
    return get().quizzes.filter(q => materialIds.includes(q.materialId));
  },
  getExercisesByMaterial: (materialId) => get().exercises.filter(e => e.materialId === materialId),
  getExercisesByCourse: (courseId) => {
    const materialIds = get().materials.filter(m => m.courseId === courseId).map(m => m.id);
    return get().exercises.filter(e => materialIds.includes(e.materialId));
  },
  getExplanationsByMaterial: (materialId) => get().explanations.filter(e => e.materialId === materialId),
}));
