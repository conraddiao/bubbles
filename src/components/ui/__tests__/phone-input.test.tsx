import { describe, it, expect, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "@/test/utils";
import { PhoneInput, interpretPhoneInput } from "../phone-input";

describe("interpretPhoneInput", () => {
  it("treats a plain 10-digit US number as national", () => {
    expect(interpretPhoneInput("5551234567")).toEqual({
      kind: "national",
      digits: "5551234567",
    });
  });

  it("treats a US-formatted number as national", () => {
    expect(interpretPhoneInput("(555) 123-4567")).toEqual({
      kind: "national",
      digits: "5551234567",
    });
  });

  it("caps national input at 10 digits and truncates overflow", () => {
    // A US number the user overflows without a "+" or leading "1" stays national
    // and is truncated — it must NOT be promoted to an international "+" value.
    expect(interpretPhoneInput("55512345678")).toEqual({
      kind: "national",
      digits: "5551234567",
    });
    expect(interpretPhoneInput("55512345678999")).toEqual({
      kind: "national",
      digits: "5551234567",
    });
    expect(interpretPhoneInput("5551234")).toEqual({
      kind: "national",
      digits: "5551234",
    });
  });

  it("forwards an autofilled US number with country code as E.164", () => {
    // Browser autofill: "+1 555 123 4567"
    expect(interpretPhoneInput("+1 555 123 4567")).toEqual({
      kind: "international",
      value: "+15551234567",
    });
  });

  it("forwards an autofilled international number as E.164 without truncating", () => {
    // Regression: the old code sliced this to "4479111234" and reinterpreted it
    // as a US national number, producing "+14479111234" (garbage).
    expect(interpretPhoneInput("+44 7911 123456")).toEqual({
      kind: "international",
      value: "+447911123456",
    });
  });

  it("recovers a country code even when the source stripped the +", () => {
    expect(interpretPhoneInput("15551234567")).toEqual({
      kind: "international",
      value: "+15551234567",
    });
  });
});

describe("PhoneInput autofill handling", () => {
  it("does not corrupt an autofilled international E.164 number", () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} data-testid="phone" />);

    const input = screen.getByTestId("phone") as HTMLInputElement;
    // Simulate an autofill / paste that sets the whole value at once.
    fireEvent.change(input, { target: { value: "+447911123456" } });

    const lastValue = onChange.mock.calls.at(-1)?.[0];
    expect(lastValue).toBe("+447911123456");
    // Must NOT be the mangled US-reinterpreted number the old code produced.
    expect(lastValue).not.toBe("+14479111234");
  });

  it("keeps a plain US number working", () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} data-testid="phone" />);

    const input = screen.getByTestId("phone") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "5551234567" } });

    expect(onChange.mock.calls.at(-1)?.[0]).toBe("+15551234567");
  });
});
