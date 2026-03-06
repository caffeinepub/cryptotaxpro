import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Data Types
  type UserProfile = {
    country : Text;
    currency : Text;
    costBasisMethod : Text;
    taxYear : Nat;
    plan : Text;
  };

  module UserProfile {
    public func compare(a : UserProfile, b : UserProfile) : Order.Order {
      switch (Text.compare(a.country, b.country)) {
        case (#equal) { Text.compare(a.currency, b.currency) };
        case (#less) { #less };
        case (#greater) { #greater };
      };
    };
  };

  type Transaction = {
    id : Nat;
    date : Text;
    txType : Text;
    asset : Text;
    assetName : Text;
    amount : Float;
    priceUSD : Float;
    costBasisUSD : Float;
    gainLossUSD : Float;
    isShortTerm : Bool;
    tags : [Text];
    isFlagged : Bool;
    flagReason : Text;
    exchange : Text;
    notes : Text;
  };

  module Transaction {
    public func compare(a : Transaction, b : Transaction) : Order.Order {
      if (a.id < b.id) { return #less };
      if (a.id > b.id) { return #greater };
      #equal;
    };
  };

  type Holding = {
    asset : Text;
    assetName : Text;
    amount : Float;
    currentPriceUSD : Float;
    currentValueUSD : Float;
    costBasisUSD : Float;
    unrealizedGainLoss : Float;
    unrealizedPct : Float;
  };

  type TaxSummary = {
    taxYear : Nat;
    shortTermGains : Float;
    longTermGains : Float;
    income : Float;
    losses : Float;
    netGains : Float;
    estimatedTax : Float;
  };

  type HarvestCandidate = {
    asset : Text;
    assetName : Text;
    unrealizedLoss : Float;
    taxSavings : Float;
    amount : Float;
    currentPrice : Float;
  };

  type PortfolioSummary = {
    holdings : [Holding];
    totalValue : Float;
    totalUnrealizedGain : Float;
  };

  // State
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userTransactions = Map.empty<Principal, List.List<Transaction>>();
  var nextTransactionId = 1;

  // Authorization System
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Profile Management
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admin can access another user's profile");
    };

    userProfiles.get(user);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Transaction Management
  public query ({ caller }) func getTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch their transactions");
    };

    switch (userTransactions.get(caller)) {
      case (null) { [] };
      case (?transactions) { transactions.toArray().sort() };
    };
  };

  public query ({ caller }) func getTransaction(id : Nat) : async Transaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch their transactions");
    };

    switch (userTransactions.get(caller)) {
      case (null) { Runtime.trap("No transactions found for caller") };
      case (?transactions) {
        let iter = transactions.values();
        switch (iter.find(func(t) { t.id == id })) {
          case (null) { Runtime.trap("Transaction not found") };
          case (?transaction) { transaction };
        };
      };
    };
  };

  public shared ({ caller }) func addTransaction(transaction : Transaction) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify their transactions");
    };

    // Assign unique ID
    let newTransaction = {
      id = nextTransactionId;
      date = transaction.date;
      txType = transaction.txType;
      asset = transaction.asset;
      assetName = transaction.assetName;
      amount = transaction.amount;
      priceUSD = transaction.priceUSD;
      costBasisUSD = transaction.costBasisUSD;
      gainLossUSD = transaction.gainLossUSD;
      isShortTerm = transaction.isShortTerm;
      tags = transaction.tags;
      isFlagged = transaction.isFlagged;
      flagReason = transaction.flagReason;
      exchange = transaction.exchange;
      notes = transaction.notes;
    };
    nextTransactionId += 1;

    // Update transactions
    let transactions = switch (userTransactions.get(caller)) {
      case (null) { List.empty<Transaction>() };
      case (?transactions) { transactions };
    };
    transactions.add(newTransaction);

    userTransactions.add(caller, transactions);
    newTransaction.id;
  };

  public shared ({ caller }) func updateTransaction(updated : Transaction) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify their transactions");
    };

    let transactions = switch (userTransactions.get(caller)) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?transactions) { transactions };
    };

    let found = switch (transactions.values().find(func(t) { t.id == updated.id })) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?_) { true };
    };

    if (found) {
      let updatedTransactions = transactions.map<Transaction, Transaction>(
        func(t) {
          if (t.id == updated.id) { updated } else { t };
        }
      );
      userTransactions.add(caller, updatedTransactions);
    };
  };

  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete their own transactions");
    };

    let transactions = switch (userTransactions.get(caller)) {
      case (null) { List.empty<Transaction>() };
      case (?transactions) { transactions };
    };

    let filtered = transactions.filter(func(t) { t.id != id });
    userTransactions.add(caller, filtered);
  };

  // Portfolio Management
  public query ({ caller }) func getPortfolioSummary() : async PortfolioSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their portfolio");
    };

    let holdings = [createHolding("BTC", "Bitcoin", 1.5, 57000.0, 1.5 * 57000.0, 60000.0, 57000.0 - 60000.0, (57000.0 - 60000.0) / 60000.0 * 100.0)];
    let summary : PortfolioSummary = {
      holdings;
      totalValue = 85000.0;
      totalUnrealizedGain = 5000.0;
    };
    summary;
  };

  public query ({ caller }) func getTaxSummary(_year : Nat) : async TaxSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their tax summaries");
    };

    let summary : TaxSummary = {
      taxYear = 2024;
      shortTermGains = 12000.0;
      longTermGains = 30000.0;
      income = 8000.0;
      losses = -6000.0;
      netGains = 44000.0;
      estimatedTax = 12000.0;
    };
    summary;
  };

  public query ({ caller }) func getHarvestCandidates() : async [HarvestCandidate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their harvest candidates");
    };

    let candidates = [createHarvestCandidate("ADA", "Cardano", -2000.0, 600.0, 10000.0, 0.15)];
    candidates;
  };

  // Plan Management
  public shared ({ caller }) func upgradePlan(newPlan : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upgrade their plan");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?profile) {
        let updated : UserProfile = {
          country = profile.country;
          currency = profile.currency;
          costBasisMethod = profile.costBasisMethod;
          taxYear = profile.taxYear;
          plan = newPlan;
        };
        userProfiles.add(caller, updated);
      };
    };
  };

  // Internal Helper Functions
  func createHolding(asset : Text, assetName : Text, amount : Float, currentPriceUSD : Float, currentValueUSD : Float, costBasisUSD : Float, unrealizedGainLoss : Float, unrealizedPct : Float) : Holding {
    {
      asset;
      assetName;
      amount;
      currentPriceUSD;
      currentValueUSD;
      costBasisUSD;
      unrealizedGainLoss;
      unrealizedPct;
    };
  };

  func createHarvestCandidate(asset : Text, assetName : Text, unrealizedLoss : Float, taxSavings : Float, amount : Float, currentPrice : Float) : HarvestCandidate {
    {
      asset;
      assetName;
      unrealizedLoss;
      taxSavings;
      amount;
      currentPrice;
    };
  };
};
