import type { Metadata } from 'next'
import { ContentHero } from '@/shared/components/content/ContentHero'
import { LegalArticle, type LegalSection } from '@/shared/components/content/LegalArticle'

export const metadata: Metadata = {
  title: 'Privacy Policy — Island Combo',
  description:
    'How Island Combo collects, uses, and protects your personal information when you shop with us, and the choices and rights you have over your data.',
}

const LAST_UPDATED = 'June 13, 2026'

const sections: LegalSection[] = [
  {
    id: 'collect',
    title: 'Information We Collect',
    body: (
      <>
        <p>We collect information you give us and information generated as you use our store, including:</p>
        <ul>
          <li><strong>Account details</strong> — your name, email address, and phone number.</li>
          <li><strong>Order information</strong> — delivery or pickup address, items purchased, and order history.</li>
          <li><strong>Payment details</strong> — handled securely by our payment provider (see below).</li>
          <li><strong>Usage data</strong> — device, browser, and activity on the site to keep it working and secure.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How We Use Your Information',
    body: (
      <>
        <p>We use your information to run our store and serve you well — specifically to:</p>
        <ul>
          <li>Process and deliver your orders, and keep you updated on their status.</li>
          <li>Manage your account, loyalty points, and cash vouchers.</li>
          <li>Provide customer support and respond to your requests.</li>
          <li>Protect against fraud, abuse, and unauthorized access.</li>
          <li>Improve our products, service, and website experience.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payment Information',
    body: (
      <p>
        Online card payments are processed by trusted third-party payment providers. Your full card number is
        entered directly with the provider and is <strong>never stored on our own servers</strong>. We receive
        only the information we need to confirm and fulfil your order, such as a confirmation that payment
        succeeded.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies & Tracking',
    body: (
      <p>
        We use cookies and similar technologies to keep you signed in, remember your cart, and understand how
        the store is used so we can improve it. You can control cookies through your browser settings, though
        disabling some may affect how the site works.
      </p>
    ),
  },
  {
    id: 'sharing',
    title: 'How We Share Information',
    body: (
      <>
        <p>
          We do <strong>not</strong> sell your personal information. We share it only as needed to operate our
          store, including with:
        </p>
        <ul>
          <li>Payment providers, to process your transactions securely.</li>
          <li>Delivery and logistics partners, to get your order to you.</li>
          <li>Technology providers who host and secure our services on our behalf.</li>
          <li>Authorities, where required by law or to protect our rights and customers.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    title: 'Data Security',
    body: (
      <p>
        We use modern technical and organizational measures — including encryption in transit and strict
        access controls — to protect your information. No method of transmission or storage is completely
        secure, but we work continuously to safeguard your data and limit who can access it.
      </p>
    ),
  },
  {
    id: 'rights',
    title: 'Your Rights & Choices',
    body: (
      <>
        <p>You have control over your information. Depending on your location, you may:</p>
        <ul>
          <li>Access, correct, or update the details in your account.</li>
          <li>Request a copy of the personal information we hold about you.</li>
          <li>Ask us to delete your account and associated personal data.</li>
          <li>Opt out of non-essential marketing communications at any time.</li>
        </ul>
        <p>To exercise any of these rights, contact us using the details below.</p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'Data Retention',
    body: (
      <p>
        We keep your information only for as long as needed to provide our services, comply with legal and
        accounting obligations, resolve disputes, and enforce our agreements. When personal data is deleted,
        records tied to completed orders may be retained in a de-identified form where the law requires.
      </p>
    ),
  },
  {
    id: 'children',
    title: "Children's Privacy",
    body: (
      <p>
        Our store is intended for adults and is not directed at children. We do not knowingly collect
        personal information from children. If you believe a child has provided us information, please contact
        us and we will take appropriate steps to remove it.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    body: (
      <p>
        We may update this Privacy Policy as our services and legal obligations evolve. The &quot;last
        updated&quot; date above reflects the most recent changes. Significant updates will be highlighted on
        this page, and we encourage you to review it from time to time.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: (
      <>
        <p>Questions about your privacy or this policy? Reach out anytime.</p>
        <ul>
          <li><strong>Phone:</strong> 320-6666</li>
          <li><strong>Email:</strong> <a href="mailto:islandcombopni@gmail.com">islandcombopni@gmail.com</a></li>
          <li><strong>Address:</strong> Dolonier, Kolonia, Federated States of Micronesia</li>
        </ul>
      </>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <ContentHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="Your privacy matters to us. This policy explains what information we collect, how we use it, and the choices you have when you shop with Island Combo."
        breadcrumb="Privacy Policy"
      />
      <LegalArticle
        lastUpdated={LAST_UPDATED}
        intro={
          <p>
            At Island Combo, we&apos;re committed to protecting your personal information and being transparent
            about how we use it. This policy describes the data we collect, why we collect it, how we keep it
            safe, and the rights you have over it.
          </p>
        }
        sections={sections}
      />
    </div>
  )
}
