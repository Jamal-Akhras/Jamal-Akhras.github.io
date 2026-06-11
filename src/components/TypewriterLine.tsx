import { useEffect } from "react";
import { useReducedMotion } from "framer-motion";
import { useTypewriter } from "../hooks/useTypewriter";

interface TypewriterLineProps {
  text: string;
  delay: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterLine({ text, delay, className, onComplete }: TypewriterLineProps) {
  const { displayedText, isComplete } = useTypewriter(text, 20, delay);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  if (!text) return <div className="h-4" />;

  return (
    <div className={className}>
      {reduceMotion ? text : displayedText}
      {!reduceMotion && !isComplete && <span className="animate-pulse">|</span>}
    </div>
  );
}
