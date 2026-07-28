import { create } from "zustand";

export type BackendStatus = "ready" | "not-ready";

interface BackendStatusStore {
  status: BackendStatus;
  setStatus: (status: BackendStatus) => void;
}

// Alimenté par les vraies requêtes de l'appli (React Query) — jamais par un ping
// dédié : une requête qui réussit marque le backend prêt, une qui échoue (timeout,
// erreur réseau) marque qu'il ne répond pas.
export const useBackendStatusStore = create<BackendStatusStore>((set) => ({
  status: "not-ready",
  setStatus: (status) => set({ status }),
}));
