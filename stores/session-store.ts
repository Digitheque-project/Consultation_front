import { create } from "zustand";

interface SessionState {
  tenantId: string | null;
  token: string | null;
  setTenantId: (tenantId: string | null) => void;
  setToken: (token: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  tenantId: null,
  token: null,
  setTenantId: (tenantId) => set({ tenantId }),
  setToken: (token) => set({ token }),
  clearSession: () => set({ tenantId: null, token: null }),
}));
