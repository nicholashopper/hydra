import React, { useState, useRef, useEffect } from 'react';

interface PromptInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isThinking: boolean;
  disabled: boolean;
}

export default function PromptInput({ onSend, onStop, isThinking, disabled }: PromptInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isThinking && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isThinking]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isThinking && !disabled) {
        onSend(value.trim());
        setValue('');
      }
    }

    // Cmd/Ctrl + Enter to send
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim() && !isThinking && !disabled) {
        onSend(value.trim());
        setValue('');
      }
    }
  };

  return (
    <textarea
      ref={textareaRef}
      className="prompt-input"
      placeholder={disabled ? 'Switch to AI mode to use prompts...' : 'Enter command... (Enter to send)'}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled || isThinking}
      rows={3}
    />
  );
}
