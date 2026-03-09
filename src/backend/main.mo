import Array "mo:core/Array";
import Map "mo:core/Map";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Char "mo:core/Char";

import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";



actor {
  // Types
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

  stable var stableProfiles : [(Principal, UserProfile)] = [];
  stable var stableTransactions : [(Principal, [Transaction])] = [];
  stable var stableIntegrations : [(Principal, [IntegrationConnection])] = [];
  stable var nextTransactionId = 1;

  // Helper functions for state access
  func getProfile(p : Principal) : ?UserProfile {
    switch (stableProfiles.find(func((principal, _)) { principal == p })) {
      case (null) { null };
      case (?(_, profile)) { ?profile };
    };
  };

  func setProfile(p : Principal, profile : UserProfile) {
    let filtered = stableProfiles.filter(func((principal, _)) { principal != p });
    stableProfiles := filtered.concat([(p, profile)]);
  };

  func getTransactionsFor(principal : Principal) : [Transaction] {
    switch (stableTransactions.find(func((p, _)) { p == principal })) {
      case (null) { [] };
      case (?(_, transactions)) { transactions };
    };
  };

  func setTransactions(p : Principal, transactions : [Transaction]) {
    let filtered = stableTransactions.filter(func((principal, _)) { principal != p });
    stableTransactions := filtered.concat([(p, transactions)]);
  };

  func getIntegrationsFor(principal : Principal) : [IntegrationConnection] {
    switch (stableIntegrations.find(func((p, _)) { p == principal })) {
      case (null) { [] };
      case (?(_, integrations)) { integrations };
    };
  };

  func setIntegrations(p : Principal, integrations : [IntegrationConnection]) {
    let filtered = stableIntegrations.filter(func((principal, _)) { principal != p });
    stableIntegrations := filtered.concat([(p, integrations)]);
  };

  // Authorization System
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Profile Management
  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.isAdmin(accessControlState, caller)) and caller != user) {
      Runtime.trap("Unauthorized: Only admin can access another user's profile");
    };
    getProfile(user);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    getProfile(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    setProfile(caller, profile);
  };

  // Transaction Management
  public query ({ caller }) func getTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch their transactions");
    };
    getTransactionsFor(caller).sort();
  };

  public query ({ caller }) func getTransaction(id : Nat) : async Transaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch their transactions");
    };

    switch (getTransactionsFor(caller).find(func(t) { t.id == id })) {
      case (null) { Runtime.trap("Transaction not found") };
      case (?transaction) { transaction };
    };
  };

  public shared ({ caller }) func addTransaction(transaction : Transaction) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify their transactions");
    };

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

    let transactions = getTransactionsFor(caller).concat([newTransaction]);
    setTransactions(caller, transactions);

    nextTransactionId += 1;
    newTransaction.id;
  };

  public shared ({ caller }) func addTransactions(transactions_ : [Transaction]) : async [Nat] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify their transactions");
    };

    let newIds = Array.tabulate(
      transactions_.size(),
      func(i) { nextTransactionId + i },
    );

    let newTransactions = Array.tabulate(
      transactions_.size(),
      func(i) {
        let transaction = transactions_[i];
        {
          id = newIds[i];
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
      },
    );

    let currentTransactions = getTransactionsFor(caller);
    let allTransactions = currentTransactions.concat(newTransactions);
    setTransactions(caller, allTransactions);

    nextTransactionId += transactions_.size();
    newIds;
  };

  public shared ({ caller }) func updateTransaction(updated : Transaction) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can modify their transactions");
    };

    let transactions = getTransactionsFor(caller);
    if (transactions.find(func(t) { t.id == updated.id }) == null) {
      Runtime.trap("Transaction not found");
    };

    let updatedTransactions = transactions.map(
      func(t) {
        if (t.id == updated.id) { updated } else { t };
      }
    );
    setTransactions(caller, updatedTransactions);
  };

  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete their own transactions");
    };

    let transactions = getTransactionsFor(caller);
    let filtered = transactions.filter(func(t) { t.id != id });
    setTransactions(caller, filtered);
  };

  public shared ({ caller }) func deleteTransactionsByYear(year : Nat) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete their own transactions");
    };

    let yearText = year.toText();
    let transactions = getTransactionsFor(caller);

    var deletedCount = 0;
    let filtered = transactions.filter(
      func(transaction) {
        let shouldKeep = not transaction.date.startsWith(#text yearText);
        if (not shouldKeep) { deletedCount += 1 };
        shouldKeep;
      }
    );

    setTransactions(caller, filtered);
    deletedCount;
  };

  public shared ({ caller }) func clearAllTransactions() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can clear their transactions");
    };
    setTransactions(caller, []);
  };

  // Portfolio Management
  public query ({ caller }) func getPortfolioSummary() : async PortfolioSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their portfolio");
    };
    {
      holdings = [];
      totalValue = 0.0;
      totalUnrealizedGain = 0.0;
    };
  };

  public query ({ caller }) func getTaxSummary(year : Nat) : async TaxSummary {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their tax summaries");
    };
    {
      taxYear = year;
      shortTermGains = 0.0;
      longTermGains = 0.0;
      income = 0.0;
      losses = 0.0;
      netGains = 0.0;
      estimatedTax = 0.0;
    };
  };

  public query ({ caller }) func getHarvestCandidates() : async [HarvestCandidate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their harvest candidates");
    };
    [];
  };

  // Integration Management
  public shared ({ caller }) func saveIntegration(connection : IntegrationConnection) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can manage integrations");
    };

    let current = getIntegrationsFor(caller);
    let filtered = current.filter(func(con) { con.id != connection.id });
    let updated = filtered.concat([connection]);
    setIntegrations(caller, updated);
  };

  public query ({ caller }) func getIntegrations() : async [IntegrationConnection] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can fetch integrations");
    };
    getIntegrationsFor(caller);
  };

  public shared ({ caller }) func deleteIntegration(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can manage integrations");
    };
    let filtered = getIntegrationsFor(caller).filter(func(con) { con.id != id });
    setIntegrations(caller, filtered);
  };

  // Plan Management
  public shared ({ caller }) func upgradePlan(newPlan : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can upgrade their plan");
    };
  };
};

