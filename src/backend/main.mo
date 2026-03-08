import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Migration "migration";

import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

// Data migration on upgrade
(with migration = Migration.run)
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

  type IntegrationConnection = {
    id : Text;
    name : Text;
    category : Text;
    hasApiKey : Bool;
    address : Text;
    connectedAt : Int;
  };

  // State
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userTransactions = Map.empty<Principal, List.List<Transaction>>();
  let userIntegrations = Map.empty<Principal, List.List<IntegrationConnection>>();
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

    // Return empty holdings and zeroed values per requirements
    let summary : PortfolioSummary = {
      holdings = [];
      totalValue = 0.0;
      totalUnrealizedGain = 0.0;
    };
    summary;
  };

  public query ({ caller }) func getTaxSummary(year : Nat) : async TaxSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their tax summaries");
    };

    // Return zeros for all fields per requirements
    let summary : TaxSummary = {
      taxYear = year;
      shortTermGains = 0.0;
      longTermGains = 0.0;
      income = 0.0;
      losses = 0.0;
      netGains = 0.0;
      estimatedTax = 0.0;
    };
    summary;
  };

  public query ({ caller }) func getHarvestCandidates() : async [HarvestCandidate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their harvest candidates");
    };

    // Return empty array per requirements
    [];
  };

  // Integration Management
  public shared ({ caller }) func saveIntegration(connection : IntegrationConnection) : async () {
    // Authorization check
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can manage integrations");
    };

    let connections = switch (userIntegrations.get(caller)) {
      case (null) { List.empty<IntegrationConnection>() };
      case (?connections) { connections };
    };

    // Remove existing integration with same id if present
    let filtered = connections.filter(func(con) { con.id != connection.id });

    // Add new/updated integration to front
    filtered.add(connection);
    userIntegrations.add(caller, filtered);
  };

  public query ({ caller }) func getIntegrations() : async [IntegrationConnection] {
    // Authorization check
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch integrations");
    };

    let connections = switch (userIntegrations.get(caller)) {
      case (null) { List.empty<IntegrationConnection>() };
      case (?connections) { connections };
    };

    connections.toArray();
  };

  public shared ({ caller }) func deleteIntegration(id : Text) : async () {
    // Authorization check
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can manage integrations");
    };

    let connections = switch (userIntegrations.get(caller)) {
      case (null) { List.empty<IntegrationConnection>() };
      case (?connections) { connections };
    };

    let filtered = connections.filter(func(con) { con.id != id });
    userIntegrations.add(caller, filtered);
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
};
