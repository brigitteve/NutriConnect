import { create } from "zustand";
import { persist } from "zustand/middleware";

type DemoView = "auto" | "cliente" | "restaurante";

interface DemoState {
  view: DemoView;
  setView: (v: DemoView) => void;
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set) => ({
      view: "auto",
      setView: (view) => set({ view }),
    }),
    { name: "nutriconnect-demo-view" },
  ),
);
