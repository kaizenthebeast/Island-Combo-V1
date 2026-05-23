// United Cargo shipping-zone resolution.
//
// Priority for US addresses:
//   1) ZIP prefix → airport hub (HNL / LAX_SFO / DEN_IAH / ORD_IAD_EWR_JFK)
//   2) ZIP prefix → zone-pair fallback (US_ZONES_1_2 / 3_4 / 5_6)
//   3) Locality keyword → airport hub
//   4) US_ZONES_5_6 as last-resort default
//
// Zone-pair fallback follows the United Cargo US zone map:
//   Zones 1+2 → East Coast (Northeast + Southeast + DC + VA)
//   Zones 3+4 → Midwest + South-Central
//   Zones 5+6 → West + Hawaii  (Zone 7 AK and Zone 8 PR also bucketed here)

export type ShippingZone =
  | "GUM_KSA_TKK"
  | "OTHER_MICRONESIA"
  | "JP_MNL_TPE"
  | "HNL"
  | "LAX_SFO"
  | "DEN_IAH"
  | "ORD_IAD_EWR_JFK"
  | "US_ZONES_1_2"
  | "US_ZONES_3_4"
  | "US_ZONES_5_6"

export type AddressForZone = {
  country?: string | null
  locality?: string | null
  postal_code?: string | null
}

export function getZoneFromAddress(addr: AddressForZone | undefined | null): ShippingZone | null {
  if (!addr?.country) return null

  const country = addr.country.toLowerCase().trim()
  const locality = (addr.locality ?? "").toLowerCase().trim()

  const isUS =
    country === "us" || country === "usa" ||
    country.includes("united states") || country.includes("america")

  if (isUS) return getUSZone(addr.postal_code, locality)

  // Chuuk addresses ship via TKK — keep this before generic Micronesia check
  if (
    locality.includes("chuuk") ||
    locality.includes("truk") ||
    locality.includes("weno")
  ) return "GUM_KSA_TKK"

  if (country === "gu" || country.includes("guam")) return "GUM_KSA_TKK"
  if (country === "ksa" || country.includes("saudi")) return "GUM_KSA_TKK"

  if (country === "ph" || country.includes("philippines")) return "JP_MNL_TPE"
  if (country === "jp" || country.includes("japan")) return "JP_MNL_TPE"
  if (country === "tw" || country.includes("taiwan")) return "JP_MNL_TPE"

  // FSM (other than Chuuk), Palau, Marshall Islands and other Micronesian destinations
  if (
    country.includes("micronesia") ||
    country.includes("federated states") ||
    country === "fsm" ||
    country === "pw" || country.includes("palau") ||
    country === "mh" || country.includes("marshall")
  ) return "OTHER_MICRONESIA"

  return null
}

function getUSZone(postalCode: string | null | undefined, locality: string): ShippingZone {
  const prefix3 = zipPrefix3(postalCode)
  if (prefix3 !== null) {
    return airportFromZip(prefix3) ?? zonePairFromZip(prefix3)
  }
  return airportFromLocality(locality) ?? "US_ZONES_5_6"
}

function zipPrefix3(postal: string | null | undefined): number | null {
  if (!postal) return null
  const digits = postal.replace(/[^0-9]/g, "")
  if (digits.length < 3) return null
  const n = parseInt(digits.slice(0, 3), 10)
  return Number.isNaN(n) ? null : n
}

// Airport-hub ZIP ranges — checked before the zone-pair fallback so that
// a Chicago ZIP (606xx) gets ORD_IAD_EWR_JFK pricing instead of US_ZONES_3_4.
function airportFromZip(p: number): ShippingZone | null {
  if (p >= 967 && p <= 968) return "HNL"              // Honolulu / Hawaii
  if (p >= 900 && p <= 908) return "LAX_SFO"          // Los Angeles metro
  if (p >= 940 && p <= 961) return "LAX_SFO"          // SF Bay Area
  if (p >= 800 && p <= 802) return "DEN_IAH"          // Denver
  if (p >= 770 && p <= 779) return "DEN_IAH"          // Houston
  if (p >= 600 && p <= 606) return "ORD_IAD_EWR_JFK"  // Chicago (ORD)
  if (p >= 100 && p <= 119) return "ORD_IAD_EWR_JFK"  // NYC (JFK)
  if (p >= 70  && p <= 89)  return "ORD_IAD_EWR_JFK"  // NJ (EWR)
  if (p >= 200 && p <= 205) return "ORD_IAD_EWR_JFK"  // DC (IAD)
  return null
}

function zonePairFromZip(p: number): ShippingZone {
  if (p <= 399) return "US_ZONES_1_2"   // Zones 1+2: East Coast
  if (p <= 799) return "US_ZONES_3_4"   // Zones 3+4: Midwest + South-Central
  return "US_ZONES_5_6"                 // Zones 5+6+7+8: West + HI + AK + PR
}

function airportFromLocality(loc: string): ShippingZone | null {
  if (loc.includes("honolulu") || loc.includes("hawaii")) return "HNL"
  if (
    loc.includes("los angeles") || loc.includes("san francisco") ||
    loc.includes("oakland") || loc.includes("san jose")
  ) return "LAX_SFO"
  if (loc.includes("denver") || loc.includes("houston")) return "DEN_IAH"
  if (
    loc.includes("chicago") ||
    loc.includes("new york") || loc === "nyc" ||
    loc.includes("newark") ||
    loc.includes("washington")
  ) return "ORD_IAD_EWR_JFK"
  return null
}
