import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Transaction, UserProfile } from "../backend.d";
import {
  mockHarvestCandidates,
  mockPortfolioSummary,
  mockTaxSummary,
  mockTransactions,
  mockUserProfile,
} from "../data/mockData";
import { useActor } from "./useActor";

// ──────────────────────────────────────────────
// Transactions
// ──────────────────────────────────────────────
export function useTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!actor) return mockTransactions;
      try {
        return await actor.getTransactions();
      } catch {
        return mockTransactions;
      }
    },
    placeholderData: mockTransactions,
    enabled: !isFetching,
  });
}

export function useAddTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Transaction) => {
      if (!actor) throw new Error("No actor");
      return actor.addTransaction(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Transaction) => {
      if (!actor) throw new Error("No actor");
      return actor.updateTransaction(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteTransaction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ──────────────────────────────────────────────
// Portfolio
// ──────────────────────────────────────────────
export function usePortfolioSummary() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      if (!actor) return mockPortfolioSummary;
      try {
        return await actor.getPortfolioSummary();
      } catch {
        return mockPortfolioSummary;
      }
    },
    placeholderData: mockPortfolioSummary,
    enabled: !isFetching,
  });
}

// ──────────────────────────────────────────────
// Tax Summary
// ──────────────────────────────────────────────
export function useTaxSummary(year: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["taxSummary", year.toString()],
    queryFn: async () => {
      if (!actor) return mockTaxSummary;
      try {
        return await actor.getTaxSummary(year);
      } catch {
        return mockTaxSummary;
      }
    },
    placeholderData: mockTaxSummary,
    enabled: !isFetching,
  });
}

// ──────────────────────────────────────────────
// Harvest Candidates
// ──────────────────────────────────────────────
export function useHarvestCandidates() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["harvestCandidates"],
    queryFn: async () => {
      if (!actor) return mockHarvestCandidates;
      try {
        return await actor.getHarvestCandidates();
      } catch {
        return mockHarvestCandidates;
      }
    },
    placeholderData: mockHarvestCandidates,
    enabled: !isFetching,
  });
}

// ──────────────────────────────────────────────
// User Profile
// ──────────────────────────────────────────────
export function useUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return mockUserProfile;
      try {
        const profile = await actor.getCallerUserProfile();
        return profile ?? mockUserProfile;
      } catch {
        return mockUserProfile;
      }
    },
    placeholderData: mockUserProfile,
    enabled: !isFetching,
  });
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("No actor");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useUpgradePlan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: string) => {
      if (!actor) throw new Error("No actor");
      return actor.upgradePlan(plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}
