import type { MouseEventData, KeyboardEventData } from '../../shared/types';

type MouseHandler = (event: MouseEventData) => void;
type KeyboardHandler = (event: KeyboardEventData) => void;

export function createInputCapture(
  element: HTMLElement,
  onMouse: MouseHandler,
  onKeyboard: KeyboardHandler
) {
  // Mouse event handlers
  const handleMouseMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    onMouse({
      type: 'move',
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleClick = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    onMouse({
      type: 'click',
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      button: e.button
    });
  };

  const handleScroll = (e: WheelEvent) => {
    const rect = element.getBoundingClientRect();
    onMouse({
      type: 'scroll',
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      deltaY: e.deltaY
    });
  };

  // Keyboard event handlers
  const handleKeyDown = (e: KeyboardEvent) => {
    onKeyboard({
      type: 'keydown',
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    onKeyboard({
      type: 'keyup',
      key: e.key,
      code: e.code,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    });
  };

  // Attach listeners
  element.addEventListener('mousemove', handleMouseMove);
  element.addEventListener('click', handleClick);
  element.addEventListener('wheel', handleScroll);
  element.addEventListener('keydown', handleKeyDown);
  element.addEventListener('keyup', handleKeyUp);

  // Make element focusable
  element.tabIndex = 0;

  // Return cleanup function
  return () => {
    element.removeEventListener('mousemove', handleMouseMove);
    element.removeEventListener('click', handleClick);
    element.removeEventListener('wheel', handleScroll);
    element.removeEventListener('keydown', handleKeyDown);
    element.removeEventListener('keyup', handleKeyUp);
  };
}
