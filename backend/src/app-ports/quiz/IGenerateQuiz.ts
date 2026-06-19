export interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export interface IGenerateQuiz {
  execute(documentIds: string[], questionCount: number): Promise<QuizQuestion[]>;
}
