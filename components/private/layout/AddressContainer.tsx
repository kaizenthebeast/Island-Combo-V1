'use client'

import React, { useState, useEffect, useCallback } from "react"
import { Address } from "@/types/users"
import CheckoutAddress from "@/components/forms/CheckoutAddressForm"
import AddressDetails from "@/components/functional-ui/placeOrder/AddressDetails"
import { getUserAddress, getUserProfile } from "@/lib/users"
import { Button } from '@/components/ui/button'
import AddressBillingSummary from "@/components/functional-ui/placeOrder/AddressBillingSummary"
import { MapPin, Truck, Store, AlertCircle, Loader2 } from "lucide-react"
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

  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  // Account profile — used to pre-fill (and lock) the name on the Add Address form
  const [profile, setProfile] = useState<{ first_name: string | null; last_name: string | null } | null>(null)

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
        if (!cancelled) setProfile(p ? { first_name: p.first_name, last_name: p.last_name } : null)
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
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200
                ${method === "deliver"
                  ? "border-[#900036] bg-[#FFF0F4] text-[#900036]"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                }`}
            >
              <Truck className="w-4 h-4" />
              Deliver it
            </button>
            <button
              type="button"
              onClick={() => setMethod("pickup")}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200
                ${method === "pickup"
                  ? "border-[#900036] bg-[#FFF0F4] text-[#900036]"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
                }`}
            >
              <Store className="w-4 h-4" />
              Pick it up
            </button>
          </div>

          {/* ── Shipping quote status (deliver method only) ────────────── */}
          {method === "deliver" && (shippingLoading || shippingError || shippingQuote) && (
            <div className="rounded-xl border p-4 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#900036]" />
                <h3 className="text-sm font-bold text-gray-800">Shipping estimate</h3>
              </div>

              {shippingLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating shipping…
                </div>
              )}

              {!shippingLoading && shippingError && (
                <div className="flex items-start gap-2 text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p>{shippingError}</p>
                </div>
              )}

              {!shippingLoading && !shippingError && shippingQuote && (
                <div className="flex flex-col gap-1 text-sm text-gray-700">
                  <p className="text-xs text-gray-500">
                    Zone: <span className="font-medium text-gray-700">{shippingQuote.zone}</span> · {shippingQuote.totalPieces} piece(s) · {shippingQuote.totalWeightKg}kg
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
            <div className="border rounded-xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#900036]" />
                <h2 className="text-base font-bold text-gray-800">Pickup Location</h2>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4">
                <MapPin className="w-5 h-5 text-[#900036] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-gray-800">Our Store</p>
                  <p className="text-sm text-gray-600">
                    Dolonier, Kolonia,<br />Federated States of Micronesia
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Saved addresses (deliver method only) ──────────────────── */}
          {method === "deliver" && (
            <div className="border rounded-xl p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#900036]" />
                <h2 className="text-base font-bold text-gray-800">Saved Addresses</h2>
              </div>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-4 justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading addresses…
                </div>
              )}

              {/* Error state */}
              {!loading && fetchError && (
                <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 ">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-rose-700 font-medium">{fetchError}</p>
                    <button
                      type="button"
                      onClick={fetchAddresses}
                      className="text-xs text-rose-600 underline underline-offset-2 w-fit"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!loading && !fetchError && addresses.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <MapPin className="w-8 h-8 text-gray-200" />
                  <p className="text-sm font-medium text-gray-400">No saved addresses yet</p>
                  <p className="text-xs text-gray-300">Add an address below to get started</p>
                </div>
              )}

              {/* Address list */}
              {!loading && !fetchError && addresses.map((address) => (
                <AddressDetails
                  key={address.id}
                  address={address}
                  selectedAddressId={selectedAddressId}
                  setSelectedAddressId={setSelectedAddressId}
                  onSuccess={fetchAddresses}
                />
              ))}
            </div>
          )}

          {/* ── Add new address (deliver method only) ──────────────────── */}
          {method === "deliver" && (addresses.length < 3 ? (
            <CheckoutAddress
              title="Add New Address"
              action="add"
              firstName={profile?.first_name ?? undefined}
              lastName={profile?.last_name ?? undefined}
              onSuccess={fetchAddresses}
            >
              <Button className="rounded-full" variant="default">
                + Add New Address
              </Button>
            </CheckoutAddress>
          ) : (
            // Limit reached show a notice instead of the add button
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 font-medium">
                You've reached the maximum of 3 saved addresses. Remove one to add a new one.
              </p>
            </div>
          ))}


        </div>

        <AddressBillingSummary />
      </div>
    </main>
  )
}

export default AddressContainer