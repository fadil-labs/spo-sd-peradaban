import { describe, it, expect } from "vitest";

const normalizePaymentMethods = (methods: any[]) => {
  return methods.map((pm) => ({
    id: pm.id,
    name: pm.name,
    method_type: pm.method_type,
  }));
};

describe("Payment methods normalization", () => {
  it("should normalize multiple payment methods correctly", () => {
    const rawMethods = [
      { id: "1", name: "QRIS", method_type: "e_wallet" },
      { id: "2", name: "Transfer Bank", method_type: "transfer" },
      { id: "3", name: "Cash", method_type: "cash" },
      { id: "4", name: "Virtual Account", method_type: "virtual_account" },
    ];

    const normalized = normalizePaymentMethods(rawMethods);

    expect(normalized).toHaveLength(4);
    expect(normalized.map((m) => m.name)).toEqual([
      "QRIS",
      "Transfer Bank",
      "Cash",
      "Virtual Account",
    ]);
    expect(normalized[0].method_type).toBe("e_wallet");
    expect(normalized[1].method_type).toBe("transfer");
  });

  it("should handle empty array", () => {
    const normalized = normalizePaymentMethods([]);
    expect(normalized).toHaveLength(0);
  });

  it("should handle null method_type", () => {
    const rawMethods = [
      { id: "1", name: "QRIS", method_type: null },
    ];

    const normalized = normalizePaymentMethods(rawMethods);
    expect(normalized[0].method_type).toBeNull();
  });
});
