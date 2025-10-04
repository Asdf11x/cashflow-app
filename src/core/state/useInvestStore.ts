// src/core/state/useInvestStore.ts
import { create } from 'zustand';
import type { ObjectInvestment, RealEstateInvestment } from '../domain/types';

type State = {
  objects: ObjectInvestment[];
  realEstates: RealEstateInvestment[];
};

type Actions = {
  addObject: (investment: ObjectInvestment) => void;
  updateObject: (investment: ObjectInvestment) => void;
  removeObject: (id: string) => void;

  addRealEstate: (investment: RealEstateInvestment) => void;
  updateRealEstate: (investment: RealEstateInvestment) => void;
  removeRealEstate: (id: string) => void;
};

export const useInvestStore = create<State & Actions>((set) => ({
  objects: [],
  realEstates: [],

  // --- Object Actions ---
  addObject: (newObject) => set((s) => ({ objects: [...s.objects, newObject] })),

  updateObject: (updatedObject) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === updatedObject.id ? updatedObject : o)),
    })),

  removeObject: (id) => set((s) => ({ objects: s.objects.filter((o) => o.id !== id) })),

  addRealEstate: (newRealEstate) =>
    set((s) => ({ realEstates: [...s.realEstates, newRealEstate] })),

  updateRealEstate: (updatedRealEstate) =>
    set((s) => ({
      realEstates: s.realEstates.map((r) =>
        r.id === updatedRealEstate.id ? updatedRealEstate : r,
      ),
    })),

  removeRealEstate: (id) => set((s) => ({ realEstates: s.realEstates.filter((r) => r.id !== id) })),
}));
