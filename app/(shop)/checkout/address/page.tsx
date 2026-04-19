import React from 'react'
import { Suspense } from "react";
import AddressContainer from '@/components/private/layout/AddressContainer';

const AddressPage = () => {
    return (
        <section className="section-container">
            <Suspense fallback={<div>Loading...</div>} >
                <AddressContainer />
            </Suspense>

        </section>
    )
}

export default AddressPage