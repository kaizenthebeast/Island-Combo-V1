import type { Metadata } from 'next'
import { ContentHero } from '@/shared/components/content/ContentHero'
import { LegalArticle, type LegalSection } from '@/shared/components/content/LegalArticle'

export const metadata: Metadata = {
  title: 'Terms & Conditions — Island Combo',
  description:
    'The terms and conditions that govern your use of Island Combo, including orders, payments, delivery, vouchers, returns, and your responsibilities as a customer.',
}

const LAST_UPDATED = 'June 13, 2026'

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    body: (
      <>
        <p>
          Welcome to Island Combo. These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of
          our website, services, and any purchases you make. By browsing our store, creating an account, or
          placing an order, you agree to be bound by these Terms.
        </p>
        <p>
          If you do not agree with any part of these Terms, please do not use our services. We may update
          these Terms from time to time, and your continued use of the store means you accept the changes.
        </p>
      </>
    ),
  },
  {
    id: 'accounts',
    title: 'Accounts & Eligibility',
    body: (
      <>
        <p>
          To place orders you may need to create an account. You agree to provide accurate, current
          information and to keep your login credentials secure. You are responsible for all activity that
          happens under your account.
        </p>
        <ul>
          <li>You must be of legal age to form a binding contract in your jurisdiction.</li>
          <li>One person or entity may not maintain multiple accounts to abuse promotions or rewards.</li>
          <li>Notify us immediately if you suspect any unauthorized use of your account.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'orders',
    title: 'Orders & Pricing',
    body: (
      <>
        <p>
          All orders are subject to acceptance and product availability. We reserve the right to refuse or
          cancel any order, including where a product is mispriced, out of stock, or where we suspect
          fraudulent activity.
        </p>
        <p>
          Prices are shown in US Dollars and may change without notice. The price that applies to your order
          is the price displayed at the time you complete checkout. Promotional discounts and promo codes are
          subject to their own terms and may be withdrawn at any time.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payments',
    body: (
      <>
        <p>
          We accept secure online card payments and, where offered, <strong>cash on delivery</strong> or{' '}
          <strong>cash on pickup</strong>. Online payments are processed by trusted third-party payment
          providers; we never store your full card details on our own servers.
        </p>
        <p>
          For cash on delivery or pickup orders, payment is due in full when you receive or collect your
          order. Orders may be cancelled if payment cannot be completed.
        </p>
      </>
    ),
  },
  {
    id: 'delivery',
    title: 'Shipping, Delivery & Pickup',
    body: (
      <>
        <p>
          We offer island-wide delivery and in-store pickup. Estimated delivery times are provided in good
          faith but are not guaranteed and may be affected by weather, shipping conditions, or factors
          outside our control.
        </p>
        <ul>
          <li>Please ensure your delivery address and contact number are accurate and complete.</li>
          <li>For pickup orders, we&apos;ll notify you when your order is ready to collect.</li>
          <li>Risk of loss passes to you once the order is delivered or collected.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'vouchers',
    title: 'Cash Vouchers & Loyalty',
    body: (
      <>
        <p>
          Cash vouchers and loyalty points are offered as a convenience and a thank-you to our customers.
          They have no cash-redemption value except as expressly described at purchase, and they may not be
          transferred, sold, or combined except where we permit it.
        </p>
        <ul>
          <li>Loyalty points are earned and redeemed according to the rates shown at checkout.</li>
          <li>Vouchers may carry expiry dates and usage conditions stated at the time of purchase.</li>
          <li>We may adjust or reverse points and vouchers issued in error or through abuse.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'returns',
    title: 'Returns & Refunds',
    body: (
      <>
        <p>
          We want you to be happy with your order. If an item arrives damaged, faulty, or incorrect, please
          contact us promptly so we can make it right. Eligible items may be returned or refunded in line
          with the policy shown for your order.
        </p>
        <p>
          To help us assess a return or refund, we may ask for photos or a short video of the item as you
          received it. Refunds are issued to the original payment method where applicable.
        </p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'Acceptable Use',
    body: (
      <>
        <p>You agree not to misuse our store or services. In particular, you must not:</p>
        <ul>
          <li>Attempt to gain unauthorized access to our systems, accounts, or data.</li>
          <li>Interfere with the security or proper working of the website.</li>
          <li>Use the store for any unlawful, fraudulent, or abusive purpose.</li>
          <li>Resell or exploit our content or rewards in ways we have not authorized.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    body: (
      <p>
        All content on this website — including our name, logo, text, graphics, and product imagery — is the
        property of Island Combo or its licensors and is protected by applicable laws. You may not copy,
        reproduce, or use it without our prior written permission.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    body: (
      <p>
        To the fullest extent permitted by law, Island Combo is not liable for any indirect, incidental, or
        consequential losses arising from your use of the store or any product purchased. Our total liability
        for any claim relating to an order will not exceed the amount you paid for that order. Nothing in
        these Terms limits liability that cannot be excluded under applicable law.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    body: (
      <p>
        We may revise these Terms at any time to reflect changes in our services or legal requirements. The
        &quot;last updated&quot; date above shows when they were most recently changed. We encourage you to review
        this page periodically.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: (
      <>
        <p>Questions about these Terms? We&apos;re happy to help.</p>
        <ul>
          <li><strong>Phone:</strong> 320-6666</li>
          <li><strong>Email:</strong> <a href="mailto:islandcombopni@gmail.com">islandcombopni@gmail.com</a></li>
          <li><strong>Address:</strong> Dolonier, Kolonia, Federated States of Micronesia</li>
        </ul>
      </>
    ),
  },
]

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <ContentHero
        eyebrow="Legal"
        title="Terms & Conditions"
        description="Please read these terms carefully. They explain the rules for using Island Combo and the agreement between you and us when you shop with us."
        breadcrumb="Terms & Conditions"
      />
      <LegalArticle
        lastUpdated={LAST_UPDATED}
        intro={
          <p>
            These Terms form a binding agreement between you and Island Combo. They cover how you use our
            store, place orders, pay, and receive your items — along with your rights and responsibilities as
            a customer. By using our services, you accept these Terms in full.
          </p>
        }
        sections={sections}
      />
    </div>
  )
}
