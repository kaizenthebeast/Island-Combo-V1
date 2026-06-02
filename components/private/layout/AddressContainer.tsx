'use client'

import { useState, useEffect, useCallback } from "react"
import { Address } from "@/lib/types/users"
import AddressFormBody from "@/components/forms/AddressFormBody"
import AddressDetails from "@/components/functional-ui/placeOrder/AddressDetails"
import MobileAddressSelector from "@/components/functional-ui/placeOrder/MobileAddressSelector"
import PaymentMethod from "@/components/functional-ui/placeOrder/PaymentMethod"
import { getUserAddress } from "@/lib/account/address"
import { getUserProfile } from "@/lib/account/profile"
import AddressBillingSummary from "@/components/functional-ui/placeOrder/AddressBillingSummary"
import { MapPin, Truck, Store, AlertCircle, Loader2, Plus } from "lucide-react"
import { useCartStore } from "@/lib/store/cart-store"
import { useCheckoutStore } from "@/lib/store/checkout-store"
import { getZoneFromAddress, type ShippingZone } from "@/lib/shipping/zone"

const MAX_SAVED_ADDRESSES = 3

type ShippingQuote = {
  success: true
  zone: ShippingZone
  country: string | null
  postalCode: string | null
  totalWeightKg: number
  totalPieces: number
  options: {
    gcr?: { cost: number; ratePerKg: number; minCharge: number; weightCost: number; appliedMin: boolean }
    qpi?: { cost: number; breakdown: Array<{ weightKg: number; qty: number; pricePerPiece: number; subtotal: number }> }
  }
}

const AddressLoadingRow = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
    <Loader2 className="w-4 h-4 animate-spin" />
    Loading addresses…
  </div>
)

const AddressFetchError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5">
    <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
    <div className="flex flex-col gap-1">
      <p className="text-sm text-danger font-medium">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs text-danger underline underline-offset-2 w-fit"
      >
        Try again
      </button>
    </div>
  </div>
)

const AddressContainer = () => {
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"deliver" | "pickup">("deliver")
  const [addresses, setAddresses] = useState<Address[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Selecting a saved address cancels the inline "new address" mode.
  const handleSelectSaved = (id: number | null) => {
    setSelectedAddressId(id)
    setIsAddingNew(false)
  }

  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [isLoadingShipping, setIsLoadingShipping] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  // Account profile — used to pre-fill (and lock) the name + phone on the Add Address form.
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; phone_text: string | null } | null>(null)

  const cart = useCartStore((state) => state.cart)
  const setShipping = useCheckoutStore((state) => state.setShipping)

  const fetchAddresses = useCallback(async () => {
    try {
      setFetchError(null)
      const userAddresses = await getUserAddress()
      setAddresses(userAddresses)

      // Auto-select the default address only when nothing is selected yet.
      // The functional update reads the current selection, so this callback
      // doesn't need selectedAddressId as a dependency (keeps it stable).
      const defaultAddress = userAddresses.find((address: Address) => address.make_default)
      if (defaultAddress) {
        setSelectedAddressId((current) => current ?? defaultAddress.id)
      }
    } catch (error: unknown) {
      setFetchError(error instanceof Error ? error.message : 'Failed to load addresses')
    } finally {
      setIsLoadingAddresses(false)
    }
  }, [])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  useEffect(() => {
    let cancelled = false
    getUserProfile()
      .then((p) => {
        if (!cancelled) setProfile(p ? { first_name: p.first_name, last_name: p.last_name, phone_text: p.phone_text } : null)
      })
      .catch(() => {
        // Ignore: the form just won't be pre-filled. The address fetch already surfaces auth issues.
      })
    return () => { cancelled = true }
  }, [])

  // Re-quote shipping whenever the user is delivering to a known address with a non-empty cart.
  useEffect(() => {
    if (fulfillmentMethod === "pickup") {
      setShippingQuote(null)
      setShippingError(null)
      setShipping(0, null)
      return
    }

    if (!selectedAddressId || cart.length === 0) {
      setShippingQuote(null)
      setShippingError(null)
      setShipping(null, null)
      return
    }

    const selectedAddress = addresses.find((address) => address.id === selectedAddressId)
    if (!selectedAddress) return

    const zone = getZoneFromAddress(selectedAddress)
    if (!zone) {
      setShippingError("Could not resolve shipping zone for this address.")
      setShippingQuote(null)
      setShipping(null, null)
      return
    }

    const controller = new AbortController()

    const fetchShipping = async () => {
      try {
        setIsLoadingShipping(true)
        setShippingError(null)
        const response = await fetch("/api/shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            zone,
            country: selectedAddress.country,
            postalCode: selectedAddress.postal_code,
            // No per-product weight available yet — assume 1kg per piece.
            items: cart.map((item) => ({ weightKg: 1, qty: item.quantity })),
          }),
        })
        const payload = await response.json()
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Failed to calculate shipping")
        }
        const quote = payload.data as ShippingQuote
        setShippingQuote(quote)
        // Prefer GCR, fall back to QPI.
        if (quote.options.gcr) {
          setShipping(quote.options.gcr.cost, "GCR")
        } else if (quote.options.qpi) {
          setShipping(quote.options.qpi.cost, "QPI")
        } else {
          setShipping(null, null)
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") return
        setShippingError(error instanceof Error ? error.message : "Failed to calculate shipping")
        setShippingQuote(null)
        setShipping(null, null)
      } finally {
        setIsLoadingShipping(false)
      }
    }

    fetchShipping()

    return () => controller.abort()
  }, [fulfillmentMethod, selectedAddressId, addresses, cart, setShipping])

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <h2 className="title-header">How would you like to get your order?</h2>

      <div className="grid md:grid-cols-4 grid-cols-1 gap-10">
        <div className="md:col-span-3 flex flex-col gap-6">

          {/* Delivery method toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFulfillmentMethod("deliver")}
              className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200
                ${fulfillmentMethod === "deliver"
                  ? "border-brand bg-brand-tint text-brand"
                  : "border-border bg-muted text-muted-foreground hover:border-border"
                }`}
            >
              <Truck className="w-4 h-4" />
              Deliver it
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentMethod("pickup")}
              className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200
                ${fulfillmentMethod === "pickup"
                  ? "border-brand bg-brand-tint text-brand"
                  : "border-border bg-muted text-muted-foreground hover:border-border"
                }`}
            >
              <Store className="w-4 h-4" />
              Pick it up
            </button>
          </div>

          {/* Shipping quote status (deliver method only) */}
          {fulfillmentMethod === "deliver" && (isLoadingShipping || shippingError || shippingQuote) && (
            <div className="rounded-xl border p-4 shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">Shipping estimate</h3>
              </div>

              {isLoadingShipping && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating shipping…
                </div>
              )}

              {!isLoadingShipping && shippingError && (
                <div className="flex items-start gap-2 text-sm text-danger">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p>{shippingError}</p>
                </div>
              )}

              {!isLoadingShipping && !shippingError && shippingQuote && (
                <div className="flex flex-col gap-1 text-sm text-foreground">
                  <p className="text-xs text-muted-foreground">
                    Zone: <span className="font-medium text-foreground">{shippingQuote.zone}</span> · {shippingQuote.totalPieces} piece(s) · {shippingQuote.totalWeightKg}kg
                  </p>
                  {/* Show only the method the billing summary uses (GCR preferred, QPI fallback). */}
                  {shippingQuote.options.gcr ? (
                    <div className="flex justify-between">
                      <span>Standard (GCR){shippingQuote.options.gcr.appliedMin ? " — min charge" : ""}</span>
                      <span className="font-semibold">${shippingQuote.options.gcr.cost.toFixed(2)}</span>
                    </div>
                  ) : shippingQuote.options.qpi ? (
                    <div className="flex justify-between">
                      <span>Quick Pak (QPI)</span>
                      <span className="font-semibold">${shippingQuote.options.qpi.cost.toFixed(2)}</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Pickup location (pickup method only) */}
          {fulfillmentMethod === "pickup" && (
            <div className="border rounded-xl p-5 shadow-xs flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground">Island Combo</p>
                <p className="text-sm text-muted-foreground">
                  Dolonier, Kolonia, Federated States of Micronesia
                  <br />
                  #691-320-6666
                </p>
              </div>
            </div>
          )}

          {/* Addresses (deliver method only) */}
          {fulfillmentMethod === "deliver" && (
            <>
              {/* DESKTOP: saved-address list + inline new-address form */}
              <div className="hidden md:flex flex-col gap-6">
                <div className="border rounded-xl p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">Saved Addresses</h2>
                  </div>

                  {isLoadingAddresses && <AddressLoadingRow />}

                  {!isLoadingAddresses && fetchError && (
                    <AddressFetchError message={fetchError} onRetry={fetchAddresses} />
                  )}

                  {!isLoadingAddresses && !fetchError && addresses.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <MapPin className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-muted-foreground">No saved addresses yet</p>
                      <p className="text-xs text-muted-foreground">Add an address below to get started</p>
                    </div>
                  )}

                  {!isLoadingAddresses && !fetchError && addresses.map((address) => (
                    <AddressDetails
                      key={address.id}
                      address={address}
                      selectedAddressId={selectedAddressId}
                      setSelectedAddressId={handleSelectSaved}
                      onSuccess={fetchAddresses}
                    />
                  ))}
                </div>

                {addresses.length < MAX_SAVED_ADDRESSES ? (
                  <div className="flex flex-col gap-4">
                    <label
                      className={`flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${isAddingNew ? "border-brand bg-brand-tint/40" : "border-border hover:border-brand/40"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-4 h-4 text-brand" />
                        <span className="font-semibold text-foreground">New address</span>
                      </div>
                      <input
                        type="radio"
                        name="selectedAddress"
                        checked={isAddingNew}
                        onChange={() => {
                          setIsAddingNew(true)
                          setSelectedAddressId(null)
                        }}
                        className="w-5 h-5 accent-brand cursor-pointer shrink-0"
                      />
                    </label>

                    {isAddingNew && (
                      <div className="rounded-xl border border-border p-5 shadow-xs">
                        <h3 className="text-base font-bold text-foreground mb-4">New address</h3>
                        <AddressFormBody
                          action="add"
                          lockIdentity={!!profile?.first_name}
                          saveLabel="Add address"
                          defaults={{
                            firstName: profile?.first_name ?? "",
                            lastName: profile?.last_name ?? "",
                            phone: profile?.phone_text ?? "",
                          }}
                          onSuccess={() => {
                            setIsAddingNew(false)
                            fetchAddresses()
                          }}
                          onCancel={() => setIsAddingNew(false)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-tint px-3 py-2.5">
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-warning font-medium">
                      You&apos;ve reached the maximum of {MAX_SAVED_ADDRESSES} saved addresses. Remove one to add a new one.
                    </p>
                  </div>
                )}
              </div>

              {/* MOBILE: tap-to-open list / form selector */}
              <div className="md:hidden">
                {isLoadingAddresses ? (
                  <AddressLoadingRow />
                ) : fetchError ? (
                  <AddressFetchError message={fetchError} onRetry={fetchAddresses} />
                ) : (
                  <MobileAddressSelector
                    addresses={addresses}
                    selectedAddressId={selectedAddressId}
                    onSelect={handleSelectSaved}
                    profile={profile}
                    onChanged={fetchAddresses}
                  />
                )}
              </div>
            </>
          )}

          {/* Payment method — only relevant for delivery */}
          {fulfillmentMethod === "deliver" && (
            <>
              <div className="border-t border-border mt-2" />
              <PaymentMethod />
            </>
          )}



        <AddressBillingSummary />
      </div>
    </main>
  )
}

export default AddressContainer
