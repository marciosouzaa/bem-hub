export type PhoneNormalizationStatus =
  | "supported"
  | "unsupported_country"
  | "invalid";

export type PhoneNormalizationResult = {
  canonicalPhone: string | null;
  countryCode: string | null;
  matchKey: string | null;
  reason:
    | "brazilian_landline"
    | "brazilian_mobile"
    | "country_not_supported"
    | "invalid_area_code"
    | "invalid_brazilian_number"
    | "invalid_length"
    | "legacy_mobile_ninth_digit_added"
    | "missing_phone";
  status: PhoneNormalizationStatus;
};

export function normalizeContactPhone(input: string | null | undefined): PhoneNormalizationResult {
  const rawPhone = input?.trim() ?? "";
  if (!rawPhone) return invalidResult("missing_phone");

  const hasExplicitCountry = rawPhone.startsWith("+")
    || rawPhone.replace(/\D/g, "").startsWith("00");
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length < 8 || digits.length > 15) {
    return invalidResult("invalid_length", digits || null);
  }

  let nationalNumber: string;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    nationalNumber = digits.slice(2);
  } else if (!hasExplicitCountry && (digits.length === 10 || digits.length === 11)) {
    nationalNumber = digits;
    digits = `55${digits}`;
  } else {
    return {
      canonicalPhone: digits,
      countryCode: null,
      matchKey: `intl:${digits}`,
      reason: "country_not_supported",
      status: "unsupported_country",
    };
  }

  const areaCode = nationalNumber.slice(0, 2);
  const subscriber = nationalNumber.slice(2);
  if (!/^[1-9][1-9]$/.test(areaCode)) {
    return invalidResult("invalid_area_code", digits, "55");
  }

  let normalizedSubscriber: string;
  let reason: PhoneNormalizationResult["reason"];
  if (subscriber.length === 8 && /^[6-9]/.test(subscriber)) {
    normalizedSubscriber = `9${subscriber}`;
    reason = "legacy_mobile_ninth_digit_added";
  } else if (subscriber.length === 8 && /^[2-5]/.test(subscriber)) {
    normalizedSubscriber = subscriber;
    reason = "brazilian_landline";
  } else if (subscriber.length === 9 && subscriber.startsWith("9")) {
    normalizedSubscriber = subscriber;
    reason = "brazilian_mobile";
  } else {
    return invalidResult("invalid_brazilian_number", digits, "55");
  }

  const canonicalPhone = `55${areaCode}${normalizedSubscriber}`;
  return {
    canonicalPhone,
    countryCode: "55",
    matchKey: `br:${canonicalPhone}`,
    reason,
    status: "supported",
  };
}

export function formatContactPhone(phone: string | null, status: PhoneNormalizationStatus) {
  if (!phone) return "Não informado";
  if (status !== "supported" || !phone.startsWith("55")) return `+${phone}`;

  const national = phone.slice(2);
  const areaCode = national.slice(0, 2);
  const subscriber = national.slice(2);
  if (subscriber.length === 9) {
    return `+55 (${areaCode}) ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
  }
  return `+55 (${areaCode}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
}

function invalidResult(
  reason: PhoneNormalizationResult["reason"],
  canonicalPhone: string | null = null,
  countryCode: string | null = null,
): PhoneNormalizationResult {
  return {
    canonicalPhone,
    countryCode,
    matchKey: null,
    reason,
    status: "invalid",
  };
}
