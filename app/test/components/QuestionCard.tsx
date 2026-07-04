"use client";

import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import type { BuiltQuestion } from "@/lib/quiz/build";
import SmsBubble from "./SmsBubble";
import BrowserMock from "./BrowserMock";
import EmailMock from "./EmailMock";

const DIFFICULTY_LABEL: Record<BuiltQuestion["difficulty"], string> = {
  easy: "Lehká",
  medium: "Střední",
  hard: "Těžká",
};

interface QuestionCardProps {
  question: BuiltQuestion;
  selected: number | null;
  onAnswer: (index: number) => void;
  onNext: () => void;
  isLast: boolean;
}

export default function QuestionCard({ question, selected, onAnswer, onNext, isLast }: QuestionCardProps) {
  const answered = selected !== null;
  const wasCorrect = answered && selected === question.correctIndex;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary px-2.5 py-1 rounded-full mb-4">
        {DIFFICULTY_LABEL[question.difficulty]}
      </span>

      {question.ui === "sms" && (
        <SmsBubble sender={question.sender} time={question.time} body={question.body} />
      )}
      {question.ui === "browser" && <BrowserMock domain={question.domain} body={question.body} />}
      {question.ui === "email" && (
        <EmailMock from={question.from} subject={question.subject} body={question.body} />
      )}

      <div className="mt-5 space-y-2.5">
        {question.choices.map((choice, i) => {
          const isCorrectChoice = i === question.correctIndex;
          const isPicked = selected === i;

          let cls = "border-border bg-secondary/40 hover:border-primary/40 hover:bg-secondary active:scale-[0.99]";
          if (answered) {
            if (isCorrectChoice) cls = "border-success/50 bg-success/10 text-foreground";
            else if (isPicked) cls = "border-destructive/50 bg-destructive/10 text-foreground";
            else cls = "border-border bg-secondary/20 opacity-50";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`w-full flex items-center justify-between gap-3 text-left rounded-xl border px-4 py-3 text-sm sm:text-[15px] font-medium transition-colors disabled:cursor-default ${cls}`}
            >
              <span>{choice}</span>
              {answered && isCorrectChoice && <CheckCircle2 size={18} className="text-success shrink-0" />}
              {answered && isPicked && !isCorrectChoice && <XCircle size={18} className="text-destructive shrink-0" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={`mt-4 rounded-xl border px-4 py-3.5 text-sm ${
            wasCorrect ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <p className={`font-bold uppercase tracking-wide text-xs mb-1.5 ${wasCorrect ? "text-success" : "text-destructive"}`}>
            {wasCorrect ? "Správně!" : "Bohužel, špatně."}
          </p>
          <p className="text-foreground/90 leading-relaxed">{question.explanation}</p>
        </div>
      )}

      {answered && (
        <button
          type="button"
          onClick={onNext}
          className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 brand-gradient text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
        >
          {isLast ? "Zobrazit výsledek" : "Další otázka"}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
