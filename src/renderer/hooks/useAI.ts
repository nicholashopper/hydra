import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '../../shared/types';

interface ToolCall {
  name: string;
  input: unknown;
}

export function useAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [currentToolCalls, setCurrentToolCalls] = useState<ToolCall[]>([]);
  const [tokenUsage, setTokenUsage] = useState({ input: 0, output: 0 });

  useEffect(() => {
    const unsubThinking = window.hydra.ai.onThinking((thinking) => {
      setIsThinking(thinking);
      if (!thinking) {
        setCurrentToolCalls([]);
      }
    });

    const unsubToolCall = window.hydra.ai.onToolCall((toolCall) => {
      setCurrentToolCalls(prev => [...prev, toolCall]);
    });

    const unsubTokenCount = window.hydra.ai.onTokenCount((count) => {
      setTokenUsage(count);
    });

    return () => {
      unsubThinking();
      unsubToolCall();
      unsubTokenCount();
    };
  }, []);

  const sendMessage = useCallback(async (content: string): Promise<ChatMessage | null> => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentToolCalls([]);

    const result = await window.hydra.ai.sendMessage(content);

    if (result.success && result.data) {
      setMessages(prev => [...prev, result.data!]);
      return result.data;
    }

    return null;
  }, []);

  const stop = useCallback(() => {
    window.hydra.ai.stop();
    setIsThinking(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentToolCalls([]);
  }, []);

  return {
    messages,
    isThinking,
    currentToolCalls,
    tokenUsage,
    sendMessage,
    stop,
    clearMessages
  };
}
