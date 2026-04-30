"use client";

import { create } from "zustand";

const STORAGE_KEY = "undrive-passcode";

interface PasscodeConfig {
  enabled: boolean;
  hash: string;
  autoLockMinutes: number;
}

interface PasscodeState {
  isLocked: boolean;
  config: PasscodeConfig | null;

  initialize: () => void;
  lock: () => void;
  unlock: (pin: string) => boolean;
  setPasscode: (pin: string, autoLockMinutes?: number) => void;
  removePasscode: () => void;
  updateAutoLock: (minutes: number) => void;
  verifyPin: (pin: string) => boolean;
}

async function hashPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(pin + "undrive-salt-v1");
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hashPinSync(pin: string): string {
  let hash = 0;
  const str = pin + "undrive-salt-v1";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function loadConfig(): PasscodeConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveConfig(config: PasscodeConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export const usePasscodeStore = create<PasscodeState>((set, get) => ({
  isLocked: false,
  config: null,

  initialize: () => {
    const config = loadConfig();
    set({
      config,
      isLocked: config?.enabled ?? false,
    });
  },

  lock: () => {
    const { config } = get();
    if (config?.enabled) {
      set({ isLocked: true });
    }
  },

  unlock: (pin: string) => {
    const { config } = get();
    if (!config) return true;

    const inputHash = hashPinSync(pin);
    if (inputHash === config.hash) {
      set({ isLocked: false });
      return true;
    }
    return false;
  },

  verifyPin: (pin: string) => {
    const { config } = get();
    if (!config) return false;
    return hashPinSync(pin) === config.hash;
  },

  setPasscode: (pin: string, autoLockMinutes?: number) => {
    const existing = get().config;
    const config: PasscodeConfig = {
      enabled: true,
      hash: hashPinSync(pin),
      autoLockMinutes: autoLockMinutes ?? existing?.autoLockMinutes ?? 5,
    };
    saveConfig(config);
    set({ config, isLocked: false });
  },

  removePasscode: () => {
    clearConfig();
    set({ config: null, isLocked: false });
  },

  updateAutoLock: (minutes: number) => {
    const { config } = get();
    if (!config) return;
    const updated = { ...config, autoLockMinutes: minutes };
    saveConfig(updated);
    set({ config: updated });
  },
}));
