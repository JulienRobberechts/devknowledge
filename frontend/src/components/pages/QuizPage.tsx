import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  BrainCircuit,
  ChevronRight,
  RotateCcw,
  CheckCircle,
  XCircle,
  Loader2,
  Trophy,
} from "lucide-react";
import PageHeader from "../ui/PageHeader";
import { useDocuments } from "../../hooks/useDocuments";
import { api } from "../../services/api";
import type { QuizQuestion } from "../../types/domain";

type Phase = "setup" | "quiz" | "results";

const QUESTION_COUNTS = [5, 10, 15];

function SetupScreen({
  onStart,
}: {
  onStart: (documentIds: string[], count: number) => void;
}) {
  const { data: documents = [], isLoading } = useDocuments();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [count, setCount] = useState(5);
  const ready = documents.filter((d) => d.status === "ready");

  function toggleDoc(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Documents{" "}
            <span className="text-slate-400 font-normal">
              (select one or more)
            </span>
          </label>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading documents…</p>
          ) : ready.length === 0 ? (
            <p className="text-sm text-slate-400">
              No indexed documents. Import documents first.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {ready.map((doc) => {
                const checked = selectedIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      checked
                        ? "border-amber-400 bg-amber-50 text-[#92400e]"
                        : "border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDoc(doc.id)}
                      className="accent-[#d97706]"
                    />
                    {doc.title}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Number of questions
          </label>
          <div className="flex gap-2">
            {QUESTION_COUNTS.map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  count === n
                    ? "bg-[#1f2937] text-[#fcd34d] border-[#1f2937]"
                    : "border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(selectedIds, count)}
          disabled={selectedIds.length === 0}
          className="w-full py-2.5 bg-[#d97706] text-white rounded-lg text-sm font-medium hover:bg-[#b45309] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <BrainCircuit size={16} />
          Generate quiz
        </button>
      </div>
    </div>
  );
}

function QuizScreen({
  questions,
  onFinish,
}: {
  questions: QuizQuestion[];
  onFinish: (answers: number[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  const question = questions[index];
  const isLast = index === questions.length - 1;
  const confirmed = selected !== null;
  const progress = ((index + 1) / questions.length) * 100;

  function next() {
    const newAnswers = [...answers, selected!];
    if (isLast) {
      onFinish(newAnswers);
    } else {
      setAnswers(newAnswers);
      setSelected(null);
      setIndex(index + 1);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Question {index + 1} / {questions.length}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className="bg-[#d97706] h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <p className="text-slate-800 font-medium leading-snug">
          {question.text}
        </p>
        <div className="space-y-2">
          {question.options.map((option, i) => {
            let style =
              "border border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/40";
            if (confirmed) {
              if (i === question.correctIndex)
                style = "border border-green-400 bg-green-50 text-green-800";
              else if (i === selected)
                style = "border border-red-400 bg-red-50 text-red-700";
              else style = "border border-slate-100 text-slate-400";
            } else if (i === selected) {
              style = "border border-amber-400 bg-amber-50 text-[#92400e]";
            }
            return (
              <button
                key={i}
                onClick={() => !confirmed && setSelected(i)}
                disabled={confirmed}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors flex items-center gap-3 ${style}`}
              >
                <span className="font-mono text-xs shrink-0 font-semibold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
                {confirmed && i === question.correctIndex && (
                  <CheckCircle
                    size={14}
                    className="ml-auto text-green-500 shrink-0"
                  />
                )}
                {confirmed && i === selected && i !== question.correctIndex && (
                  <XCircle
                    size={14}
                    className="ml-auto text-red-400 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>
        {confirmed && (
          <button
            onClick={next}
            className="w-full py-2.5 bg-[#1f2937] text-white rounded-lg text-sm font-medium hover:bg-[#374151] transition-colors flex items-center justify-center gap-2"
          >
            {isLast ? "See results" : "Next"}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function ResultsScreen({
  questions,
  answers,
  onRestart,
}: {
  questions: QuizQuestion[];
  answers: number[];
  onRestart: () => void;
}) {
  const correct = answers.filter(
    (a, i) => a === questions[i].correctIndex,
  ).length;
  const pct = Math.round((correct / questions.length) * 100);
  const color =
    pct >= 80
      ? "text-green-600"
      : pct >= 50
        ? "text-[#d97706]"
        : "text-red-500";

  return (
    <div className="max-w-xl space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 text-center">
        <Trophy size={36} className={`mx-auto ${color}`} />
        <div>
          <p className={`text-4xl font-bold ${color}`}>{pct}%</p>
          <p className="text-sm text-slate-500 mt-1">
            {correct} correct out of {questions.length}
          </p>
        </div>
        <button
          onClick={onRestart}
          className="mt-2 flex items-center gap-2 mx-auto px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <RotateCcw size={14} />
          New quiz
        </button>
      </div>
      <div className="space-y-3">
        {questions.map((q, i) => {
          const isCorrect = answers[i] === q.correctIndex;
          return (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2"
            >
              <div className="flex items-start gap-2">
                {isCorrect ? (
                  <CheckCircle
                    size={16}
                    className="text-green-500 shrink-0 mt-0.5"
                  />
                ) : (
                  <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                )}
                <p className="text-sm text-slate-700">{q.text}</p>
              </div>
              {!isCorrect && (
                <p className="text-xs text-slate-500 pl-6">
                  <span className="text-red-500">Your answer: </span>
                  {q.options[answers[i]]}
                  <span className="text-green-600 ml-2">
                    ✓ {q.options[q.correctIndex]}
                  </span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function QuizPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);

  const {
    mutate: generate,
    isPending,
    error,
  } = useMutation({
    mutationFn: ({
      documentIds,
      count,
    }: {
      documentIds: string[];
      count: number;
    }) => api.generateQuiz(documentIds, count),
    onSuccess: (data) => {
      setQuestions(data.questions);
      setPhase("quiz");
    },
  });

  return (
    <div className="p-8 space-y-6">
      <PageHeader
        icon={<BrainCircuit className="text-[#d97706]" size={28} />}
        title="Quiz"
        info="Generate multiple-choice questions from your documents to test your knowledge."
      />
      {isPending ? (
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 size={20} className="animate-spin text-[#d97706]" />
          <span className="text-sm">Generating quiz…</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <p className="text-sm text-red-500">
            {error instanceof Error ? error.message : "Generation failed"}
          </p>
          <SetupScreen
            onStart={(ids, count) => generate({ documentIds: ids, count })}
          />
        </div>
      ) : phase === "setup" ? (
        <SetupScreen
          onStart={(ids, count) => generate({ documentIds: ids, count })}
        />
      ) : phase === "quiz" ? (
        <QuizScreen
          questions={questions}
          onFinish={(a) => {
            setAnswers(a);
            setPhase("results");
          }}
        />
      ) : (
        <ResultsScreen
          questions={questions}
          answers={answers}
          onRestart={() => {
            setPhase("setup");
            setQuestions([]);
            setAnswers([]);
          }}
        />
      )}
    </div>
  );
}
