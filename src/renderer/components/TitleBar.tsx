import React from 'react';

export default function TitleBar() {
  const handleMinimize = () => window.hydra.window.minimize();
  const handleMaximize = () => window.hydra.window.maximize();
  const handleClose = () => window.hydra.window.close();

  return (
    <div className="title-bar">
      <div className="title-bar__logo">
        <div className="title-bar__logo-icon" />
        <span>HYDRA</span>
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '1px' }}>
          v1.0.0
        </span>
      </div>
      <div className="title-bar__controls">
        <button
          className="title-bar__btn title-bar__btn--minimize"
          onClick={handleMinimize}
          title="Minimize"
        />
        <button
          className="title-bar__btn title-bar__btn--maximize"
          onClick={handleMaximize}
          title="Maximize"
        />
        <button
          className="title-bar__btn title-bar__btn--close"
          onClick={handleClose}
          title="Close"
        />
      </div>
    </div>
  );
}
