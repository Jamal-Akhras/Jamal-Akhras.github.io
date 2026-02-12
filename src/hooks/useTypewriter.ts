import { useState, useEffect } from "react";

export function useTypewriter(text: string, speed: number = 30, startDelay: number = 0) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);

    if (!text) return;

    let currentIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const startTyping = () => {
      const typeNextChar = () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
          timeoutId = setTimeout(typeNextChar, speed);
        } else {
          setIsComplete(true);
        }
      };
      typeNextChar();
    };

    const delayTimeout = setTimeout(startTyping, startDelay);

    return () => {
      clearTimeout(delayTimeout);
      clearTimeout(timeoutId);
    };
  }, [text, speed, startDelay]);

  return { displayedText, isComplete };
}
