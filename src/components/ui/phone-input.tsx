import { forwardRef, useCallback, useLayoutEffect, useRef, useState, type ComponentProps, type ElementRef } from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type PhoneInputProps = Omit<
  ComponentProps<"input">,
  "onChange" | "value" | "ref"
> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
  };

const PhoneInput =
  forwardRef<ElementRef<typeof RPNInput.default>, PhoneInputProps>(
    ({ className, onChange, value, ...props }, ref) => {
      return (
        <RPNInput.default
          ref={ref}
          className={cn("flex", className)}
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          smartCaret={false}
          defaultCountry="US"
          value={value || undefined}
          onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
          {...props}
        />
      );
    },
  );
PhoneInput.displayName = "PhoneInput";

const PHONE_MASK = "(###) ###-####";

/**
 * Decide how to interpret a raw string arriving from the input — whether the
 * user typed it, pasted it, or the browser autofilled it.
 *
 * Browsers autofill full E.164 numbers ("+447911123456", "+1 555 123 4567").
 * The old handler blindly ran every value through `.slice(0, 10)` and treated
 * the result as a US national number, so an autofilled international number got
 * truncated to its first 10 digits and reinterpreted against the US country
 * code — producing a garbage number. When the raw value carries an unambiguous
 * country code, forward the full E.164 (with a leading "+") to
 * react-phone-number-input so its libphonenumber parsing sets the correct
 * country + national number. Otherwise treat it as a US national number and keep
 * the existing masked-input behavior — including truncating overflow past 10
 * digits, so an accidental extra keystroke doesn't get read as another country.
 */
export function interpretPhoneInput(
  raw: string,
):
  | { kind: "international"; value: string }
  | { kind: "national"; digits: string } {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");

  // Explicit international input (typed, pasted, or autofilled with a "+").
  if (trimmed.startsWith("+")) {
    return { kind: "international", value: `+${digits}` };
  }
  // US number that still carries its "1" country code, e.g. "1 555 123 4567".
  // Exactly 11 digits starting with "1" is the one no-"+" shape we treat as
  // international — it's the common US-with-country-code paste/autofill. Any
  // other overflow (e.g. an accidental 11th digit not starting with "1") stays
  // national and gets truncated below, matching the pre-existing US-mask cap.
  if (digits.length === 11 && digits.startsWith("1")) {
    return { kind: "international", value: `+${digits}` };
  }
  return { kind: "national", digits: digits.slice(0, 10) };
}

/** Render up to 10 digits into the US `(###) ###-####` mask, padding the
 * remaining slots with `_`. Returns "" for empty input. */
function formatDisplayValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "";
  let di = 0;
  return PHONE_MASK.split("")
    .map((c) => (c === "#" ? (di < digits.length ? digits[di++] : "_") : c))
    .join("");
}

/** Map a digit count to the caret offset in the masked string, so the cursor
 * lands after the last entered digit rather than inside mask punctuation. */
function getCursorPosition(digitCount: number): number {
  if (digitCount === 0) return 0;
  let di = 0;
  for (let i = 0; i < PHONE_MASK.length; i++) {
    if (PHONE_MASK[i] === "#") {
      if (++di === digitCount) return i + 1;
    }
  }
  return PHONE_MASK.length;
}

const InputComponent = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, value, onChange, placeholder, ...props }, forwardedRef) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const targetCursor = useRef<number | null>(null);

    useLayoutEffect(() => {
      if (
        targetCursor.current !== null &&
        inputRef.current &&
        document.activeElement === inputRef.current
      ) {
        inputRef.current.setSelectionRange(targetCursor.current, targetCursor.current);
        targetCursor.current = null;
      }
    });

    const refCallback = useCallback(
      (el: HTMLInputElement | null) => {
        inputRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef)
          (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      },
      [forwardedRef],
    );

    let rawValue = String(value ?? "");
    if (rawValue.startsWith('+')) {
      const parsed = RPNInput.parsePhoneNumber(rawValue);
      rawValue = parsed?.nationalNumber ?? '';
    }
    const digits = rawValue.replace(/\D/g, "").slice(0, 10);

    return (
      <Input
        className={cn("rounded-e-lg rounded-s-none font-mono", className)}
        placeholder={placeholder ?? "(___) ___-____"}
        {...props}
        ref={refCallback}
        value={formatDisplayValue(digits)}
        onChange={(e) => {
          const result = interpretPhoneInput(String(e.target.value));
          if (result.kind === "international") {
            // Hand the full E.164 to react-phone-number-input; it detects the
            // country and manages the value + caret from here, so don't force a
            // US-mask cursor position.
            targetCursor.current = null;
            onChange?.({
              ...e,
              target: { value: result.value } as EventTarget & HTMLInputElement,
              currentTarget: { value: result.value } as EventTarget & HTMLInputElement,
            });
            return;
          }
          targetCursor.current = getCursorPosition(result.digits.length);
          onChange?.({
            ...e,
            target: { value: result.digits } as EventTarget & HTMLInputElement,
            currentTarget: { value: result.digits } as EventTarget & HTMLInputElement,
          });
        }}
      />
    );
  },
);
InputComponent.displayName = "InputComponent";

type CountryEntry = { label: string; value: RPNInput.Country | undefined };

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  options: CountryEntry[];
  onChange: (country: RPNInput.Country) => void;
};

const CountrySelect = ({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover
      open={isOpen}
      modal
      onOpenChange={(open) => {
        setIsOpen(open);
        open && setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10"
          disabled={disabled}
        >
          <FlagComponent
            country={selectedCountry}
            countryName={selectedCountry}
          />
          <ChevronsUpDown
            className={cn(
              "-mr-2 size-4 opacity-50",
              disabled ? "hidden" : "opacity-100",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            value={searchValue}
            onValueChange={(value) => {
              setSearchValue(value);
              setTimeout(() => {
                if (scrollAreaRef.current) {
                  const viewportElement = scrollAreaRef.current.querySelector(
                    "[data-radix-scroll-area-viewport]",
                  );
                  if (viewportElement) {
                    viewportElement.scrollTop = 0;
                  }
                }
              }, 0);
            }}
            placeholder="Search country..."
          />
          <CommandList>
            <ScrollArea ref={scrollAreaRef} className="h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map(({ value, label }) =>
                  value ? (
                    <CountrySelectOption
                      key={value}
                      country={value}
                      countryName={label}
                      selectedCountry={selectedCountry}
                      onChange={onChange}
                      onSelectComplete={() => setIsOpen(false)}
                    />
                  ) : null,
                )}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

interface CountrySelectOptionProps extends RPNInput.FlagProps {
  selectedCountry: RPNInput.Country;
  onChange: (country: RPNInput.Country) => void;
  onSelectComplete: () => void;
}

const CountrySelectOption = ({
  country,
  countryName,
  selectedCountry,
  onChange,
  onSelectComplete,
}: CountrySelectOptionProps) => {
  const handleSelect = () => {
    onChange(country);
    onSelectComplete();
  };

  return (
    <CommandItem className="gap-2" onSelect={handleSelect}>
      <FlagComponent country={country} countryName={countryName} />
      <span className="flex-1 text-sm">{countryName}</span>
      <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
      <CheckIcon
        className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
      />
    </CommandItem>
  );
};

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-[2px] bg-foreground/20 [&_svg:not([class*='size-'])]:size-full">
      {Flag && <Flag title={countryName} />}
    </span>
  );
};

export { PhoneInput };
