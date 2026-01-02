import React, { useEffect, useRef } from 'react';
import type { ChatMessage, DriverMode } from '../../shared/types';

interface AIChatProps {
  messages: ChatMessage[];
  isThinking: boolean;
  toolCalls: Array<{ name: string; input: unknown }>;
  driverMode: DriverMode;
}

export default function AIChat({ messages, isThinking, toolCalls, driverMode }: AIChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolCalls, isThinking]);

  if (driverMode !== 'ai') {
    return (
      <div className="chat-messages">
        <div className="empty-state">
          <div className="empty-state__icon">🖱️</div>
          <div className="empty-state__text">
            Human driver mode active.<br />
            Click on a browser to set it as driver.<br />
            Your inputs will be broadcast to target browsers.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.length === 0 && !isThinking && (
        <div className="empty-state">
          <div className="empty-state__icon">🤖</div>
          <div className="empty-state__text">
            AI driver mode active.<br />
            Type a command to control the browsers.<br />
            <br />
            Examples:<br />
            "Go to google.com"<br />
            "Click the search button"<br />
            "Type 'hello world' in the input"
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div key={message.id} className={`chat-message chat-message--${message.role}`}>
          <div className="chat-message__role">
            {message.role === 'user' ? '> USER' : '< HYDRA'}
          </div>
          <div className="chat-message__content">
            {message.content}
          </div>
          {message.tokenCount && (
            <div className="chat-message__tokens">
              Tokens: {message.tokenCount}
            </div>
          )}
        </div>
      ))}

      {toolCalls.map((call, index) => (
        <div key={index} className="tool-call">
          <div className="tool-call__name">
            ⚡ {call.name}
          </div>
          <div className="tool-call__input">
            {JSON.stringify(call.input)}
          </div>
        </div>
      ))}

      {isThinking && (
        <div className="thinking-indicator">
          <div className="thinking-dots">
            <span />
            <span />
            <span />
          </div>
          Processing...
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
