'use client'

import React, { useState, useEffect, useCallback } from "react"
import { Address } from "@/types/users"
import CheckoutAddress from "@/components/forms/CheckoutAddressForm"
import AddressFormBody from "@/components/forms/AddressFormBody"
import AddressDetails from "@/components/functional-ui/placeOrder/AddressDetails"
import PaymentMethod from "@/components/functional-ui/placeOrder/PaymentMethod"
import { getUserAddress, getUserProfile } from "@/lib/users"
import { Button } from '@/components/ui/button'
import AddressBillingSummary from "@/components/functional-ui/placeOrder/AddressBillingSummary"
import { MapPin, Truck, Store, AlertCircle, Loader2, Plus } from "lucide-react"
import { useCartStore } from "@/store/cartStore"
import { useCheckoutStore } from "@/store/useCheckoutStore"
import { getZoneFromAddress, type ShippingZone } from "@/lib/shipping/zone"

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

const AddressContainer = () => {
  const [method, setMethod] = useState<"deliver" | "pickup">("deliver")
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [addingNew, setAddingNew] = useState(false)

  // Selecting a saved address cancels the inline "new address" mode
  const handleSelectSaved = (id: number | null) => {
    setSelectedAddressId(id)
    setAddingNew(false)
  }

  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  // Account profile — used to pre-fill (and lock) the name + phone on the Add Address form
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null; phone_text: string | null } | null>(null)

  const cart = useCartStore((s) => s.cart)
  const setShipping = useCheckoutStore((s) => s.setShipping)

  const fetchAddresses = useCallback(async () => {
    try {
      setFetchError(null)
      const userAddresses = await getUserAddress()
      setAddresses(userAddresses)

      // Auto-select the default address on first load only
      const defaultAddress = userAddresses.find((a: Address) => a.make_default)
      if (defaultAddress && !selectedAddressId) {
        setSelectedAddressId(defaultAddress.id)
      }
    } catch (error: any) {
      setFetchError(error.message ?? 'Failed to load addresses')
    } finally {
      setLoading(false)
    }
  }, [selectedAddressId])

  useEffect(() => {
    fetchAddresses()
  }, [])

  useEffect(() => {
    let cancelled = false
    getUserProfile()
      .then((p) => {
        if (!cancelled) setProfile(p ? { first_name: p.first_name, last_name: p.last_name, phone_text: p.phone_text } : null)
      })
      .catch(() => {
        // Silently ignore the form just won't be pre-filled. Address fetch error already surfaces auth issues.
      })
    return () => { cancelled = true }
  }, [])

  // Hit /api/shipping whenever the user is delivering to a known address with a non-empty cart
  useEffect(() => {
    if (method === "pickup") {
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

    const selected = addresses.find((a) => a.id === selectedAddressId)
    if (!selected) return

    const zone = getZoneFromAddress(selected)
    if (!zone) {
      setShippingError("Could not resolve shipping zone for this address.")
      setShippingQuote(null)
      setShipping(null, null)
      return
    }

    const controller = new AbortController()

    const fetchShipping = async () => {
      try {
        setShippingLoading(true)
        setShippingError(null)
        const res = await fetch("/api/shipping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            zone,
            country: selected.country,
            postalCode: selected.postal_code,
            // No per-product weight available yet — assume 1kg per piece.
            items: cart.map((i) => ({ weightKg: 1, qty: i.quantity })),
          }),
        })
        const data = await res.json()
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to calculate shipping")
        }
        const quote = data as ShippingQuote
        setShippingQuote(quote)
        // Default to GCR when available, fall back to QPI
        if (quote.options.gcr) {
          setShipping(quote.options.gcr.cost, "GCR")
        } else if (quote.options.qpi) {
          setShipping(quote.options.qpi.cost, "QPI")
        } else {
          setShipping(null, null)
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return
        setShippingError(err?.message ?? "Failed to calculate shipping")
        setShippingQuote(null)
        setShipping(null, null)
      } finally {
        setShippingLoading(false)
      }
    }

    fetchShipping()

    return () => controller.abort()
  }, [method, selectedAddressId, addresses, cart])

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
      <h2 className="title-header">How would you like to get your order?</h2>

      <div className="grid md:grid-cols-4 grid-cols-1 gap-10">
        <div className="md:col-span-3 flex flex-col gap-6">

          {/* ── Delivery method toggle ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod("deliver")}
              className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200
                ${method === "deliver"
                  ? "border-brand bg-brand-tint text-brand"
                  : "border-border bg-muted text-muted-foreground hover:border-border"
                }`}
            >
              <Truck className="w-4 h-4" />
              Deliver it
            </button>
            <button
              type="button"
              onClick={() => setMethod("pickup")}
              className={`cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200
                ${method === "pickup"
                  ? "border-brand bg-brand-tint text-brand"
                  : "border-border bg-muted text-muted-foreground hover:border-border"
                }`}
            >
              <Store className="w-4 h-4" />
              Pick it up
            </button>
          </div>

          {/* ── Shipping quote status (deliver method only) ────────────── */}
          {method === "deliver" && (shippingLoading || shippingError || shippingQuote) && (
            <div className="rounded-xl border p-4 shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">Shipping estimate</h3>
              </div>

              {shippingLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating shipping…
                </div>
              )}

              {!shippingLoading && shippingError && (
                <div className="flex items-start gap-2 text-sm text-danger">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p>{shippingError}</p>
                </div>
              )}

              {!shippingLoading && !shippingError && shippingQuote && (
                <div className="flex flex-col gap-1 text-sm text-foreground">
                  <p className="text-xs text-muted-foreground">
                    Zone: <span className="font-medium text-foreground">{shippingQuote.zone}</span> · {shippingQuote.totalPieces} piece(s) · {shippingQuote.totalWeightKg}kg
                  </p>
                  {/* Show only the method that the billing summary is using
                      (GCR preferred, QPI as fallback when GCR is unavailable). */}
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

          {/* ── Pickup location (pickup method only) ───────────────────── */}
          {method === "pickup" && (
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

          {/* ── Saved addresses (deliver method only) ──────────────────── */}
          {method === "deliver" && (
            <div className="border rounded-xl p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Saved Addresses</h2>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading addresses…
                </div>
              )}

              {/* Error state */}
              {!loading && fetchError && (
                <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger-tint px-3 py-2.5 ">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-danger font-medium">{fetchError}</p>
                    <button
                      type="button"
                      onClick={fetchAddresses}
                      className="text-xs text-danger underline underline-offset-2 w-fit"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && !fetchError && addresses.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">No saved addresses yet</p>
                  <p className="text-xs text-muted-foreground">Add an address below to get started</p>
                </div>
              )}

              {/* Address list */}
              {!loading && !fetchError && addresses.map((address) => (
                <AddressDetails
                  key={address.id}
                  address={address}
                  selectedAddressId={selectedAddressId}
                  setSelectedAddressId={handleSelectSaved}
                  onSuccess={fetchAddresses}
                />
              ))}
            </div>
          )}

          {/* ── Add new address (deliver method only) ──────────────────── */}
          {method === "deliver" && (addresses.length < 3 ? (
            <>
              {/* Desktop: "New address" radio that expands an inline form */}
              <div className="hidden md:flex flex-col gap-4">
                <label
                  className={`flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-colors ${
                    addingNew ? "border-brand bg-brand-tint/40" : "border-border hover:border-brand/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-brand" />
                    <span className="font-semibold text-foreground">New address</span>
                  </div>
                  <input
                    type="radio"
                    name="selectedAddress"
                    checked={addingNew}
                    onChange={() => {
                      setAddingNew(true)
                      setSelectedAddressId(null)
                    }}
                    className="w-5 h-5 accent-brand cursor-pointer shrink-0"
                  />
                </label>

                {addingNew && (
                  <div className="rounded-xl border border-border p-5 shadow-xs">
                    <h3 className="text-base font-bold text-foreground mb-4">New address</h3>
                    <AddressFormBody
                      action="add"
                      lockIdentity={!!profile?.first_name}
                      defaults={{
                        firstName: profile?.first_name ?? "",
                        lastName: profile?.last_name ?? "",
                        phone: profile?.phone_text ?? "",
                      }}
                      onSuccess={() => {
                        setAddingNew(false)
                        fetchAddresses()
                      }}
                      onCancel={() => setAddingNew(false)}
                    />
                  </div>
                )}
              </div>

              {/* Mobile: full-screen slide-out sheet */}
              <div className="md:hidden">
                <CheckoutAddress
                  title="New Address"
                  action="add"
                  firstName={profile?.first_name ?? undefined}
                  lastName={profile?.last_name ?? undefined}
                  phone={profile?.phone_text ?? undefined}
                  onSuccess={fetchAddresses}
                >
                  <Button className="rounded-full cursor-pointer w-full" variant="default">
                    + Add New Address
                  </Button>
                </CheckoutAddress>
              </div>
            </>
          ) : (
            // Limit reached show a notice instead of the add button
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-tint px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning font-medium">
                You've reached the maximum of 3 saved addresses. Remove one to add a new one.
              </p>
            </div>
          ))}

          {/* ── Payment method ─────────────────────────────────────────── */}
          <div className="border-t border-border mt-2" />
          <PaymentMethod />

        </div>

        <AddressBillingSummary />
      </div>
    </main>
  )
}

export default AddressContainer