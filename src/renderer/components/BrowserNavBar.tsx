import React, { useState, useEffect, useRef } from 'react';

interface BrowserNavBarProps {
  browserIndex: number;
  url: string;
  style?: React.CSSProperties;
}

export default function BrowserNavBar({ browserIndex, url, style }: BrowserNavBarProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputUrl(url);
    }
  }, [url, isEditing]);

  const handleBack = () => {
    window.hydra.browser.goBack(browserIndex);
  };

  const handleForward = () => {
    window.hydra.browser.goForward(browserIndex);
  };

  const handleRefresh = () => {
    window.hydra.browser.refresh(browserIndex);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      await window.hydra.browser.goToUrl(browserIndex, inputUrl.trim());
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setInputUrl(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputUrl(url);
      inputRef.current?.blur();
    }
  };

  // Format URL for display
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className="browser-nav-bar" style={style}>
      <div className="browser-nav-bar__controls">
        <button
          className="browser-nav-bar__btn"
          onClick={handleBack}
          title="Back"
        >
          &lt;
        </button>
        <button
          className="browser-nav-bar__btn"
          onClick={handleForward}
          title="Forward"
        >
          &gt;
        </button>
        <button
          className="browser-nav-bar__btn"
          onClick={handleRefresh}
          title="Refresh"
        >
          &#8635;
        </button>
      </div>
      <form className="browser-nav-bar__url-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="browser-nav-bar__url-input"
          value={isEditing ? inputUrl : displayUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Enter URL..."
        />
      </form>
      <div className="browser-nav-bar__badge">
        {browserIndex + 1}
      </div>
    </div>
  );
}
