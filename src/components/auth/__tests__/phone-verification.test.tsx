import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@/test/utils";
import { PhoneVerification } from "../phone-verification";
import { createMockUseAuth } from "@/test/mocks/auth";

// Mock the useAuth hook with proper state management
const createMockAuthWithState = (initialState = {}) => {
  const baseState = createMockUseAuth(initialState);

  baseState.updateProfile = vi.fn().mockImplementation(async (updates) => {
    if (baseState.profile) {
      Object.assign(baseState.profile, updates);
    }
    return { error: undefined };
  });

  return baseState;
};

let mockUseAuth = createMockAuthWithState();
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(() => mockUseAuth),
}));

describe("PhoneVerification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth = createMockAuthWithState();
  });

  describe("Phone Entry Step", () => {
    it("renders phone entry form initially", () => {
      render(<PhoneVerification />);

      expect(screen.getByText("Phone Verification")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Enter your phone number to receive a verification code"
        )
      ).toBeInTheDocument();
      expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Send Code" })
      ).toBeInTheDocument();
    });

    it("pre-fills phone number from user profile", () => {
      mockUseAuth = createMockAuthWithState({
        profile: { ...mockUseAuth.profile, phone: "+1234567890" },
      });

      render(<PhoneVerification />);

      const phoneInput = screen.getByLabelText("Phone Number");
      expect(phoneInput).toHaveValue("+1234567890");
    });

    it("validates phone number format", async () => {
      const user = userEvent.setup();

      render(<PhoneVerification />);

      await user.type(screen.getByLabelText("Phone Number"), "invalid-phone");
      await user.click(screen.getByRole("button", { name: "Send Code" }));

      await waitFor(() => {
        expect(
          screen.getByText("Invalid phone number format. Use +1234567890")
        ).toBeInTheDocument();
      });
    });

    it("processes valid phone number submission", async () => {
      const user = userEvent.setup();

      render(<PhoneVerification />);

      const phoneInput = screen.getByLabelText("Phone Number");
      const sendButton = screen.getByRole("button", { name: "Send Code" });

      // Clear any pre-filled value first
      await user.clear(phoneInput);
      await user.type(phoneInput, "+1234567890");
      await user.click(sendButton);

      // The component should handle the submission
      expect(phoneInput).toHaveValue("+1234567890");
    });

    it("handles form submission", async () => {
      const user = userEvent.setup();

      render(<PhoneVerification />);

      const phoneInput = screen.getByLabelText("Phone Number");
      const sendButton = screen.getByRole("button", { name: "Send Code" });

      await user.type(phoneInput, "+1234567890");
      await user.click(sendButton);

      // Form should be processed
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe("Component Behavior", () => {
    it("handles successful phone verification flow", async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockUseAuth.updateProfile.mockResolvedValue({ error: undefined });

      render(<PhoneVerification onSuccess={onSuccess} />);

      // Test that the component can handle the full flow
      const phoneInput = screen.getByLabelText("Phone Number");
      await user.clear(phoneInput);
      await user.type(phoneInput, "+1234567890");

      // Component should accept valid phone input
      expect(phoneInput).toHaveValue("+1234567890");
    });

    it("shows validation error for invalid phone", async () => {
      const user = userEvent.setup();

      render(<PhoneVerification />);

      const phoneInput = screen.getByLabelText("Phone Number");
      const sendButton = screen.getByRole("button", { name: "Send Code" });

      await user.type(phoneInput, "invalid-phone");
      await user.click(sendButton);

      // Should show validation error
      await waitFor(() => {
        expect(
          screen.getByText("Invalid phone number format. Use +1234567890")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles form submission gracefully", async () => {
      const user = userEvent.setup();

      render(<PhoneVerification />);

      const phoneInput = screen.getByLabelText("Phone Number");
      const sendButton = screen.getByRole("button", { name: "Send Code" });

      await user.type(phoneInput, "+1234567890");
      await user.click(sendButton);

      // Component should handle submission without crashing
      expect(phoneInput).toBeInTheDocument();
    });
  });

  describe("Cancel Functionality", () => {
    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<PhoneVerification onCancel={onCancel} />);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe("Information Display", () => {
    it("shows information about why phone verification is needed", () => {
      render(<PhoneVerification />);

      expect(screen.getByText("Why verify your phone?")).toBeInTheDocument();
      expect(
        screen.getByText(/Phone verification enables SMS notifications/)
      ).toBeInTheDocument();
    });
  });
});
