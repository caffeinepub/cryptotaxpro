module {
  // No migration needed, just new function implementation
  type Actor = { nextTransactionId : Nat };
  public func run(state : Actor) : Actor { state };
};
