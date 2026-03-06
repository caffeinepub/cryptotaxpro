import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface HarvestCandidate {
    currentPrice: number;
    asset: string;
    taxSavings: number;
    unrealizedLoss: number;
    assetName: string;
    amount: number;
}
export interface Holding {
    unrealizedGainLoss: number;
    asset: string;
    costBasisUSD: number;
    currentPriceUSD: number;
    assetName: string;
    unrealizedPct: number;
    currentValueUSD: number;
    amount: number;
}
export interface TaxSummary {
    estimatedTax: number;
    losses: number;
    netGains: number;
    income: number;
    longTermGains: number;
    shortTermGains: number;
    taxYear: bigint;
}
export interface PortfolioSummary {
    totalValue: number;
    holdings: Array<Holding>;
    totalUnrealizedGain: number;
}
export interface UserProfile {
    country: string;
    plan: string;
    costBasisMethod: string;
    currency: string;
    taxYear: bigint;
}
export interface Transaction {
    id: bigint;
    gainLossUSD: number;
    asset: string;
    flagReason: string;
    date: string;
    tags: Array<string>;
    isShortTerm: boolean;
    costBasisUSD: number;
    notes: string;
    assetName: string;
    txType: string;
    exchange: string;
    priceUSD: number;
    amount: number;
    isFlagged: boolean;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addTransaction(transaction: Transaction): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteTransaction(id: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getHarvestCandidates(): Promise<Array<HarvestCandidate>>;
    getPortfolioSummary(): Promise<PortfolioSummary>;
    getTaxSummary(_year: bigint): Promise<TaxSummary>;
    getTransaction(id: bigint): Promise<Transaction>;
    getTransactions(): Promise<Array<Transaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateTransaction(updated: Transaction): Promise<void>;
    upgradePlan(newPlan: string): Promise<void>;
}
