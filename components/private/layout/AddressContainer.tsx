'use client'

import React, { useState, useEffect, useCallback } from "react"
import { Address } from "@/types/users"
import CheckoutAddress from "@/components/forms/CheckoutAddressForm"
import AddressDetails from "@/components/functional-ui/placeOrder/AddressDetails"
import { getUserAddress } from "@/lib/users"
import { Button } from '@/components/ui/button'
import { Separator } from "@/components/ui/separator"
import AddressBillingSummary from "@/components/functional-ui/placeOrder/AddressBillingSummary"
import { MapPin, Truck, Store, AlertCircle, Loader2 } from "lucide-react"

const AddressContainer = () => {
  const [method, setMethod] = useState<"deliver" | "pickup">("deliver")
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)

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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col gap-6">
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

          {/* ── Saved addresses ────────────────────────────────────────── */}
          <div className="border rounded-xl p-5 shadow-sm flex flex-col gap-4 bg-white">
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
              <div className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5">
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

          {/* ── Add new address ────────────────────────────────────────── */}
          <CheckoutAddress
            title="Add New Address"
            action="add"
            onSuccess={fetchAddresses}
          >
            <Button className="rounded-full" variant="default">
              + Add New Address
            </Button>
          </CheckoutAddress>

          <Separator className="bg-gray-200" />
        </div>

        <AddressBillingSummary />
      </div>
    </div>
  )
}

export default AddressContainer