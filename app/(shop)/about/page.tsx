import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Heart, ShieldCheck, Users, Sparkles, Store, Truck,
  Ticket, CreditCard, Headphones, MapPin, Phone, Mail, ArrowRight,
} from 'lucide-react'
import { ContentHero } from '@/shared/components/content/ContentHero'

export const metadata: Metadata = {
  title: 'About Us — Island Combo',
  description:
    'Get to know Island Combo — your trusted local shop in Kolonia, Pohnpei, bringing quality products and friendly service to the Federated States of Micronesia.',
}

const values = [
  { icon: Sparkles, title: 'Quality First', body: 'Every product on our shelves is chosen with care, so you get dependable value on each order.' },
  { icon: Heart, title: 'Community at Heart', body: "We're part of this island. When you shop with us, you're supporting a local business that gives back." },
  { icon: ShieldCheck, title: 'Trust & Transparency', body: 'Honest pricing, secure checkout, and clear policies — no surprises, ever.' },
  { icon: Users, title: 'People Over Profit', body: 'Real people, real service. We treat every customer the way we’d want to be treated.' },
]

const offerings = [
  { icon: Store, title: 'A Wide Selection', body: 'From everyday essentials to special finds, all in one convenient place.' },
  { icon: Ticket, title: 'Vouchers & Loyalty', body: 'Earn loyalty points as you shop and gift cash vouchers to friends and family.' },
  { icon: CreditCard, title: 'Flexible Payments', body: 'Pay securely online by card, or choose cash on delivery — whatever suits you.' },
  { icon: Truck, title: 'Delivery & Pickup', body: 'Get your order delivered island-wide, or collect it in store at your convenience.' },
  { icon: ShieldCheck, title: 'Secure Checkout', body: 'Your details are protected end-to-end with modern, encrypted payments.' },
  { icon: Headphones, title: 'Friendly Support', body: 'Questions or help with an order? Our team is just a call or message away.' },
]

const badges = [
  { label: 'Local', sub: 'Proudly serving the FSM community' },
  { label: 'Curated', sub: 'Quality products you can trust' },
  { label: 'Reliable', sub: 'Island-wide delivery & pickup' },
  { label: 'Secure', sub: 'Safe, protected checkout' },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <ContentHero
        eyebrow="Who We Are"
        title="Welcome to Island Combo"
        description="Your friendly neighborhood store in Kolonia, Pohnpei — bringing quality products, fair prices, and a warm island welcome to every corner of the Federated States of Micronesia."
        breadcrumb="About Us"
      />

      {/* Badges strip */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {badges.map((b) => (
          <div key={b.label} className="rounded-2xl border border-border bg-white p-4 text-center shadow-xs">
            <p className="text-lg font-extrabold text-brand">{b.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{b.sub}</p>
          </div>
        ))}
      </div>

      {/* Our story */}
      <section className="mt-14 grid items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">Our Story</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Rooted on the island, built for our community
          </h2>
        </div>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Island Combo started with a simple idea: make great products easy to find and easy to get,
            without anyone having to leave the island to do it. What began as a local shop has grown into
            a place where neighbors can browse, order, and have what they need delivered to their door.
          </p>
          <p>
            We&apos;re proudly based in Dolonier, Kolonia, and everything we do is shaped by the community we
            serve. We listen to our customers, stock what matters to island life, and keep our promises —
            because here, your reputation is everything.
          </p>
          <p>
            Today, Island Combo blends the convenience of online shopping with the trust of a store that
            knows its customers by name. We&apos;re just getting started, and we&apos;re glad you&apos;re here with us.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="mt-14 grid gap-5 md:grid-cols-2">
        <div className="rounded-3xl border border-border bg-gradient-to-br from-brand-tint to-white p-7 shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">Our Mission</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            To make quality products accessible, affordable, and effortless for every household in the
            Federated States of Micronesia — with service that feels personal and a checkout you can trust.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-gradient-to-br from-surface-soft to-white p-7 shadow-xs">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-3 text-white">
            <Heart className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-foreground">Our Vision</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            To be the island&apos;s most loved place to shop — a business that grows with its community,
            supports local life, and sets the standard for convenience and care across the region.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="mt-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">What We Stand For</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Our values</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The principles behind every order we pack and every customer we serve.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => {
            const Icon = v.icon
            return (
              <div
                key={v.title}
                className="group rounded-2xl border border-border bg-white p-6 shadow-xs transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-tint text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{v.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* What we offer */}
      <section className="mt-16">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand">Why Shop With Us</span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Everything you need, the island way
          </h2>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((o) => {
            const Icon = o.icon
            return (
              <div key={o.title} className="flex gap-4 rounded-2xl border border-border bg-white p-6 shadow-xs">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground">{o.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{o.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="relative mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand to-brand-400 px-6 py-12 text-brand-foreground shadow-sm sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-12 h-52 w-52 rounded-full bg-accent-2/20 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Come shop with us</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
              Browse our latest products and enjoy a smooth, secure checkout — with delivery and pickup
              across the island. We can&apos;t wait to serve you.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-2.5 text-sm font-semibold text-brand transition-transform hover:scale-[1.02]"
            >
              Start shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="grid gap-3 text-sm">
            <li className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Phone className="h-4 w-4 shrink-0" /> <span>320-6666</span>
            </li>
            <li className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <Mail className="h-4 w-4 shrink-0" /> <span>islandcombopni@gmail.com</span>
            </li>
            <li className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <MapPin className="h-4 w-4 shrink-0" /> <span>Dolonier, Kolonia, Federated States of Micronesia</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  )
}
