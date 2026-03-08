import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";

module {
  // Redefine types needed for migration.
  type UserProfile = {
    country : Text;
    currency : Text;
    costBasisMethod : Text;
    taxYear : Nat;
    plan : Text;
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

  type IntegrationConnection = {
    id : Text;
    name : Text;
    category : Text;
    hasApiKey : Bool;
    address : Text;
    connectedAt : Int;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    userTransactions : Map.Map<Principal, List.List<Transaction>>;
    nextTransactionId : Nat;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, UserProfile>;
    userTransactions : Map.Map<Principal, List.List<Transaction>>;
    userIntegrations : Map.Map<Principal, List.List<IntegrationConnection>>;
    nextTransactionId : Nat;
  };

  // Migration function to add userIntegrations field mapped to empty Map
  public func run(old : OldActor) : NewActor {
    { old with userIntegrations = Map.empty<Principal, List.List<IntegrationConnection>>() };
  };
};
