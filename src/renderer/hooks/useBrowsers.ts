import { useState, useEffect, useCallback } from 'react';
import type { BrowserInfo, BrowserTarget } from '../../shared/types';

export function useBrowsers() {
  const [browserInfos, setBrowserInfos] = useState<BrowserInfo[]>([
    { id: 0, url: 'about:blank', title: '', isDriver: true, proxyStatus: 'none' },
    { id: 1, url: 'about:blank', title: '', isDriver: false, proxyStatus: 'none' },
    { id: 2, url: 'about:blank', title: '', isDriver: false, proxyStatus: 'none' },
    { id: 3, url: 'about:blank', title: '', isDriver: false, proxyStatus: 'none' }
  ]);
  const [driverIndex, setDriverIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubReady = window.hydra.browser.onReady(() => {
      setIsReady(true);
    });

    const unsubStatus = window.hydra.browser.onStatus((status) => {
      setBrowserInfos(status as BrowserInfo[]);
    });

    return () => {
      unsubReady();
      unsubStatus();
    };
  }, []);

  const setDriver = useCallback((index: number) => {
    setDriverIndex(index);
    window.hydra.browser.setDriver(index);
    setBrowserInfos(prev => prev.map((info, i) => ({
      ...info,
      isDriver: i === index
    })));
  }, []);

  const navigate = useCallback(async (url: string, target: BrowserTarget = 'all') => {
    return window.hydra.browser.navigate(url, target);
  }, []);

  const click = useCallback(async (element: string, target: BrowserTarget = 'all') => {
    return window.hydra.browser.click(element, target);
  }, []);

  const type = useCallback(async (
    element: string,
    text: string,
    options: { clearFirst?: boolean; pressEnter?: boolean } = {},
    target: BrowserTarget = 'all'
  ) => {
    return window.hydra.browser.type(element, text, options, target);
  }, []);

  const screenshot = useCallback(async (target: BrowserTarget = 'browser_1') => {
    return window.hydra.browser.screenshot(target);
  }, []);

  return {
    browserInfos,
    driverIndex,
    isReady,
    setDriver,
    navigate,
    click,
    type,
    screenshot
  };
}
