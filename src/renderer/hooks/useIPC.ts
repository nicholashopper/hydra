import { useCallback } from 'react';
import type { Profile, BrowserTarget, ChatMessage, IPCResponse } from '../../shared/types';

export function useIPC() {
  // Profile operations
  const listProfiles = useCallback(async (): Promise<Profile[]> => {
    const result = await window.hydra.profiles.list();
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to list profiles');
  }, []);

  const createProfile = useCallback(async (name: string): Promise<Profile> => {
    const result = await window.hydra.profiles.create(name);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'Failed to create profile');
  }, []);

  const loadProfile = useCallback(async (id: string): Promise<void> => {
    const result = await window.hydra.profiles.load(id);
    if (!result.success) {
      throw new Error(result.error || 'Failed to load profile');
    }
  }, []);

  // Browser operations
  const navigate = useCallback(async (url: string, target: BrowserTarget = 'all'): Promise<void> => {
    const result = await window.hydra.browser.navigate(url, target);
    if (!result.success) {
      throw new Error(result.error || 'Navigation failed');
    }
  }, []);

  const click = useCallback(async (element: string, target: BrowserTarget = 'all'): Promise<void> => {
    const result = await window.hydra.browser.click(element, target);
    if (!result.success) {
      throw new Error(result.error || 'Click failed');
    }
  }, []);

  // AI operations
  const sendMessage = useCallback(async (message: string): Promise<ChatMessage> => {
    const result = await window.hydra.ai.sendMessage(message);
    if (result.success && result.data) {
      return result.data;
    }
    throw new Error(result.error || 'AI request failed');
  }, []);

  const stopAI = useCallback((): void => {
    window.hydra.ai.stop();
  }, []);

  return {
    listProfiles,
    createProfile,
    loadProfile,
    navigate,
    click,
    sendMessage,
    stopAI
  };
}
