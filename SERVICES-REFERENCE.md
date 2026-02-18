# B.L.I.N.K. — Services & Pricing Reference

## Deployment Pipeline

```
 You write code
      │
      ▼
 ┌──────────┐     push      ┌──────────┐    auto-deploy    ┌──────────┐
 │  GitHub   │ ────────────► │ Netlify  │ ◄──────────────── │  (build) │
 │  (repo)   │               │ (hosting)│                   └──────────┘
 └──────────┘               └────┬─────┘
                                  │ serves files
                                  ▼
                            ┌──────────┐    DNS/SSL/CDN
                            │Cloudflare│ ──────────────► your-domain.com
                            └──────────┘
                                  │
                                  ▼
                             Users visit
                              your app
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
              ┌──────────┐ ┌──────────┐  ┌──────────┐
              │ Supabase │ │  Stripe  │  │  Resend  │
              │ auth/DB  │ │ payments │  │  email   │
              └──────────┘ └──────────┘  └──────────┘
```

---

## 1. GitHub — Version Control & CI/CD

**What it does for B.L.I.N.K.:** Stores all source code, tracks every change you make, and triggers automatic deployments to Netlify whenever you push a commit. It's your single source of truth for the codebase.

**Free tier:**

| Resource | Limit |
|----------|-------|
| Public repos | Unlimited |
| Private repos | Unlimited |
| Collaborators | Unlimited |
| Actions minutes (public repos) | Unlimited |
| Actions minutes (private repos) | 2,000/month |
| Packages storage | 500 MB |

**How usage works:** B.L.I.N.K. is a public repo, so GitHub Actions are completely unlimited. Storage and minutes only become a concern if you add private repos or very heavy CI workflows.

**Key insight:** Essentially free forever for your use case. No limits that matter.

---

## 2. Cloudflare — Domain Registrar & DNS

**What it does for B.L.I.N.K.:** Hosts your custom domain name and provides DNS routing, SSL certificates, CDN caching, and security — all pointing traffic to your Netlify deployment. When someone types your domain, Cloudflare resolves it, applies security, and routes them to Netlify.

**Pricing:** ~$10.46/year for a .com domain (at-cost, zero markup)

**What's included free with every domain:**

| Feature | Description |
|---------|-------------|
| DNS management | Route your domain to Netlify |
| CDN | Cache static assets globally for faster loading |
| SSL certificate | HTTPS encryption (automatic) |
| WHOIS privacy | Hides your personal info from domain lookups |
| DNSSEC | One-click domain security |
| DDoS protection | Blocks malicious traffic |

**How it works:** Cloudflare sits between your users and Netlify. Users hit your domain → Cloudflare resolves DNS → applies CDN caching → routes to Netlify → serves your app. The CDN layer means returning visitors load faster because static assets are cached at edge servers worldwide.

**Key insight:** Cheapest possible domain cost ($10.46/yr vs $15-20 at GoDaddy/Namecheap) because Cloudflare charges at-cost with zero markup — they don't profit on domain sales. Plus you get a free security and performance layer that other registrars charge extra for. No reason to use any other registrar.

---

## 3. Netlify — Static Hosting & Deployment

**What it does for B.L.I.N.K.:** Hosts the actual HTML, CSS, and JS files and serves them to users worldwide. When you push to GitHub, Netlify automatically pulls the code, builds (if needed), and deploys it live. It's your web server.

**Free tier: 300 credits/month**

| Action | Credit Cost |
|--------|-------------|
| Production deploy (you push code) | 15 credits each |
| Bandwidth (users loading your app) | 10 credits per 1 GB transferred |
| Web requests (every page/asset load) | 3 credits per 10,000 requests |
| Serverless functions | 5 credits per GB-hour |
| Form submissions | 1 credit each |
| Deploy previews / branch deploys | Free (no credits) |
| Failed deploys | Free (no credits) |

**How usage works:** Credits are consumed by BOTH your deployments AND your users visiting the app. If you deploy 10 times in a month, that's 150 credits just for deploys. The rest gets eaten by user traffic (bandwidth + requests).

**Rough math for B.L.I.N.K.:** Your app is ~2-3 MB total. A single user visit might use ~3 MB with cache misses. At 10 credits/GB, one visit costs a fraction of a credit. You'd need thousands of visits to burn through credits on bandwidth alone. Deploy frequency (15 credits each) is the bigger chunk.

**What happens at 300 credits:** Your site pauses (goes offline) for the rest of the month. No overage charges — it just stops serving. You get email warnings at 50%, 75%, and 100% usage. All projects on your account pause if one hits the limit.

**Key insight:** Deploy frequency is the biggest credit drain, not user traffic. 10 deploys/month + moderate traffic fits comfortably in the free tier. Batch your commits when possible to save deploy credits.

---

## 4. Supabase — Backend (Auth + Database + Storage)

**What it does for B.L.I.N.K.:** Handles user accounts (sign up, log in), stores user data in a PostgreSQL database (saved projects, preferences), and provides file storage. It replaces building your own backend server — you get auth, a database, and an API without writing server code.

**Free tier:**

| Resource | Limit |
|----------|-------|
| Auth users (MAUs) | 50,000/month |
| Database storage | 500 MB |
| File storage | 1 GB |
| Bandwidth (egress) | 10 GB |
| Edge function invocations | 500,000/month |
| Projects | 2 |

**How usage works:** These limits are based on your users' activity, not your deployments. Every time a user signs in during a month, that counts as 1 MAU (monthly active user). Every time they save or load a project, that's database reads/writes counting toward storage and bandwidth.

**Important catch:** Free projects pause after 1 week of inactivity (no user activity). The app won't crash, but the first request after pausing takes ~10 seconds to "wake up" the database. Regular user activity prevents this entirely.

**Key insight:** 50,000 MAUs and 500 MB storage is very generous for a utility app like B.L.I.N.K. You'd need a massive user base saving tons of LED configurations to approach these limits. This free tier is solid for launching and growing.

---

## 5. Stripe — Payment Processing

**What it does for B.L.I.N.K.:** Processes credit card payments for premium features. Handles the entire payment flow — card entry UI, charging, receipts, refunds, and subscription management if needed. No monthly fees, no setup fees — you only pay when you actually process a payment.

**Canada fees:**

| Transaction Type | Fee |
|-----------------|-----|
| Domestic (Canadian card → your Canadian account) | 2.9% + C$0.30 |
| International card | 3.7% + C$0.30 |
| + Currency conversion (e.g., USD card paying CAD) | +2% on top |
| Chargebacks (customer disputes) | $15 each |

**One-time payment examples:**

| You Charge | Stripe Takes | You Keep | Effective Fee % |
|-----------|-------------|----------|-----------------|
| $5 | $0.45 | $4.55 | 9.0% |
| $10 | $0.59 | $9.41 | 5.9% |
| $20 | $0.88 | $19.12 | 4.4% |
| $50 | $1.75 | $48.25 | 3.5% |

**One-time vs subscription comparison (over 1 year):**

| Model | Stripe Fees / Year | You Keep / Year |
|-------|-------------------|-----------------|
| $20 one-time | $0.88 (once) | $19.12 total |
| $5/month subscription | $5.40 | $54.60 |
| $10/month subscription | $7.08 | $112.92 |
| $20/year subscription | $0.88/year | $19.12/year |

**Key insight:** The $0.30 flat fee per transaction hurts more on small amounts — a $5 charge loses 9% to Stripe, while $20 only loses 4.4%. One-time payments are simpler to implement with zero churn risk. Subscriptions earn more long-term but need ongoing value to justify the recurring charge.

---

## 6. Resend — Transactional Email

**What it does for B.L.I.N.K.:** Sends emails from your app on your behalf — password reset emails, email verification, sharing gear lists or configurations via email, and any notification emails you might add.

**Free tier:**

| Resource | Limit |
|----------|-------|
| Emails per month | 3,000 |
| Daily cap | 100/day |
| Custom domains | 1 |
| Log retention | 1 day |
| Analytics (opens/clicks) | None |

**How usage works:** Every email your app sends counts toward the limit. If a user clicks "Email me my gear list," that's 1 email. Password reset? 1 email. The 100/day limit means you can't burst more than 100 emails in a single day, even if you haven't hit the 3,000 monthly cap.

**Rate limits:** All accounts start at 2 requests/second. Bounce rate must stay under 4%, spam rate under 0.08%.

**Key insight:** 3,000 emails/month is plenty for a utility app. Unless you're sending newsletters or batch marketing emails, you'd need 100+ daily active users all triggering emails to worry about this limit.

---

## Cost Summary

| Service | Role | Monthly Cost | Annual Cost |
|---------|------|-------------|-------------|
| GitHub | Code hosting & CI/CD | $0 | $0 |
| Cloudflare | Domain & DNS/CDN/SSL | $0 | ~$10.46 |
| Netlify | App hosting & deployment | $0 | $0 |
| Supabase | Auth, database, storage | $0 | $0 |
| Stripe | Payment processing | Per-transaction only | Per-transaction only |
| Resend | Transactional email | $0 | $0 |
| **Total** | | **$0/month** | **~$10.46/year** + Stripe fees on revenue |

Your entire production stack runs for **~$10.46/year** until you outgrow the free tiers — which for B.L.I.N.K.'s use case, would require significant user growth.
