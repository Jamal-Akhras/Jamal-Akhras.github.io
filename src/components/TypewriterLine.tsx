import { useEffect } from "react";
import { useTypewriter } from "../hooks/useTypewriter";

interface TypewriterLineProps {
  text: string;
  delay: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterLine({ text, delay, className, onComplete }: TypewriterLineProps) {
  const { displayedText, isComplete } = useTypewriter(text, 20, delay);

  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  if (!text) return <div className="h-4" />;

  return (
    <div className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">▌</span>}
    </div>
  );
}
