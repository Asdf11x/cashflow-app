import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ObjectInvestment, RealEstateInvestment, Depositvestment } from '../domain/types';

type State = {
  objects: ObjectInvestment[];
  realEstates: RealEstateInvestment[];
  deposits: Depositvestment[];
};

type Actions = {
  addObject: (investment: ObjectInvestment) => void;
  updateObject: (investment: ObjectInvestment) => void;
  removeObject: (id: string) => void;

  addRealEstate: (investment: RealEstateInvestment) => void;
  updateRealEstate: (investment: RealEstateInvestment) => void;
  removeRealEstate: (id: string) => void;

  addDeposit: (investment: Depositvestment) => void;
  updateDeposit: (investment: Depositvestment) => void;
  removeDeposit: (id: string) => void;
};

export const useInvestStore = create<State & Actions>()(
  persist(
    (set) => ({
      objects: [],
      realEstates: [],
      deposits: [],

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

      removeRealEstate: (id) =>
        set((s) => ({ realEstates: s.realEstates.filter((r) => r.id !== id) })),

      addDeposit: (newDeposit) => set((s) => ({ deposits: [...s.deposits, newDeposit] })),

      updateDeposit: (updatedDeposit) =>
        set((s) => ({
          deposits: s.deposits.map((d) => (d.id === updatedDeposit.id ? updatedDeposit : d)),
        })),

      removeDeposit: (id) => set((s) => ({ deposits: s.deposits.filter((d) => d.id !== id) })),
    }),
    {
      name: 'invest-storage',
    },
  ),
);
