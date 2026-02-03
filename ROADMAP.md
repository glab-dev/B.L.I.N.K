# LED Wall Calculator - Product Roadmap

**Philosophy:** Ship features, make money, then optimize. Build for users first, architecture second.

---

## 🎯 Guiding Principles

1. **User Value First** - Every phase delivers tangible user benefits
2. **Revenue Before Optimization** - Prove business model before refactoring
3. **Incremental Progress** - Ship working features, test, iterate
4. **Current Architecture is Fine** - No build system, no ESM (yet)
5. **Follow CLAUDE.md** - Incremental changes, always working app

---

## 📅 Development Phases

### **Phase 1: Custom Panel Refinement** 🎨
**Goal:** Make custom panels fully functional with accurate calculations

**Current State:**
- Custom panel creation exists (`specs/custom-panels.js`)
- Basic fields: dimensions, resolution, power, weight, brightness
- Some calculations may not account for custom panel specs correctly

**What Needs Work:**
1. **Calculation Accuracy:**
   - Verify all calculations use custom panel specs:
     - Power calculations (max/avg watts per panel)
     - Weight calculations (panel weight, frame weight, bumper weights)
     - Data line capacity (pixels per panel)
     - Circuit distribution
     - Cable lengths based on panel dimensions
     - Bumper distribution based on panel weight and dimensions

2. **Missing Fields:**
   - **Data connector type** (RJ45, Neutrik, etc.) - affects cable planning
   - **Data input/output locations** (top/bottom/side) - affects routing
   - **Refresh rate capability** (Hz) - affects processor compatibility
   - **Viewing angle** (degrees) - for spec sheets
   - **IP rating** (IP65, etc.) - for outdoor specs
   - **Operating temp range** - for spec sheets
   - **Power connector type** (PowerCON, Edison, etc.)

3. **Validation:**
   - Min/max constraints on all fields
   - Prevent invalid combinations (e.g., resolution > physical size)
   - Warning when specs seem unusual

4. **UI Improvements:**
   - Better form layout (group related fields)
   - Unit conversion hints (show both metric/imperial)
   - Preview of panel specs before saving
   - Validation error messages

5. **Testing:**
   - Create test panel with extreme specs
   - Verify all views render correctly (standard, power, data, structure)
   - Verify PDF export includes custom panel specs
   - Verify gear list calculations are correct
   - Test save/load with custom panels

**Success Criteria:**
- [ ] Custom panel calculations match standard panels in accuracy
- [ ] All layout views (standard, power, data, structure) work with custom panels
- [ ] PDF exports show correct custom panel specs
- [ ] Gear lists calculate correctly for custom panels
- [ ] Config save/load preserves custom panels
- [ ] User can create a custom panel for any LED product and get accurate quotes

**Estimated Time:** 1-2 weeks

---

### **Phase 2: Custom Processor Creation** 🖥️
**Goal:** Allow users to define custom video processors with accurate data calculations

**Background:**
- Feature existed previously but was removed due to calculation issues
- Standard processors: Brompton (SX40, S8, M2, S4, T1, SQ200), NovaStar MX40 Pro
- Key specs: pixel capacity, output ports, bit depth, frame rate support

**What Needs Implementation:**

1. **Custom Processor Fields:**
   - **Brand/Manufacturer** (text)
   - **Model Name** (text)
   - **Base Pixel Capacity** (at 60Hz, 8-bit) - e.g., 10,400,000 pixels
   - **Output Ports Count** (e.g., 16x RJ45)
   - **Port Type** (RJ45, Fiber, SDI, HDMI)
   - **Max Frame Rate** (Hz) - affects pixel capacity
   - **Max Bit Depth** (8, 10, 12-bit)
   - **Genlock Support** (yes/no)
   - **Redundancy Support** (yes/no)
   - **Power Draw** (watts)
   - **Notes** (optional text field for special requirements)

2. **Calculation Logic:**
   - **Pixel capacity scaling:**
     - Higher frame rate = lower capacity (e.g., 60Hz→30Hz = 2x capacity)
     - Higher bit depth = lower capacity (e.g., 8-bit→10-bit = 0.8x capacity)
   - **Port distribution:**
     - Divide wall into regions based on processor capacity
     - Account for panel resolution and count
   - **Cable planning:**
     - Data cable type based on port type
     - Cable lengths based on wall size and drop position

3. **Integration Points:**
   - Update `specs/processors.js` or create `specs/custom-processors.js`
   - Update processor dropdown to include custom processors
   - Update `core/calculate.js` to use custom processor specs
   - Update `layouts/data.js` to visualize custom processor outputs
   - Update PDF export to show custom processor specs
   - Update gear list to include custom processor

4. **UI Flow:**
   - "Add Custom Processor" button in processor section
   - Modal form with all fields
   - Validation (capacity > 0, ports > 0, etc.)
   - Save to localStorage (`ledcalc_custom_processors`)
   - Edit/delete custom processors

5. **Edge Cases:**
   - Processor capacity insufficient for wall size (show warning)
   - Multiple processors needed (calculate how many)
   - Redundancy doubles processor count
   - Different port types need different cables

**Success Criteria:**
- [ ] User can create custom processor with any specs
- [ ] Data calculations accurately reflect custom processor capacity
- [ ] Port distribution shown correctly on data layout
- [ ] Gear list includes correct processor count
- [ ] PDF export shows custom processor specs
- [ ] Config save/load preserves custom processors
- [ ] Warning shown when wall exceeds processor capacity

**Estimated Time:** 1-2 weeks

---

### **Phase 3: Supabase Integration** ☁️
**Goal:** User accounts, cloud sync, and community gear sharing

**Components:**

#### 3.1 Supabase Setup
- Create Supabase project
- Set up authentication (email/password, Google OAuth optional)
- Create database schema:
  ```sql
  -- Users (managed by Supabase Auth)

  -- User configs (saved projects)
  configs (
    id uuid primary key,
    user_id uuid references auth.users,
    name text,
    data jsonb, -- full screen state
    created_at timestamp,
    updated_at timestamp,
    is_public boolean default false
  )

  -- Community custom panels
  community_panels (
    id uuid primary key,
    user_id uuid references auth.users,
    brand text,
    model text,
    specs jsonb,
    created_at timestamp,
    downloads int default 0,
    is_approved boolean default false
  )

  -- Community custom processors
  community_processors (
    id uuid primary key,
    user_id uuid references auth.users,
    brand text,
    model text,
    specs jsonb,
    created_at timestamp,
    downloads int default 0,
    is_approved boolean default false
  )
  ```

- Row Level Security (RLS) policies:
  - Users can read/write their own configs
  - Users can read approved community items
  - Users can write their own community submissions

#### 3.2 Authentication UI
- **Sign Up / Sign In Modal**
  - Email/password fields
  - "Create Account" and "Sign In" tabs
  - "Forgot Password" link
  - OAuth buttons (optional: Google, GitHub)
  - Remember me checkbox
  - Terms of Service acceptance

- **User Menu** (top right)
  - Avatar/initials
  - Username display
  - "My Account" link
  - "Sign Out" button
  - Display: "Free" or "Premium" badge

- **Account Page** (new route or modal)
  - Email (display only)
  - Password change
  - Delete account
  - Usage stats (projects saved, items shared)

#### 3.3 Cloud Sync
- **Auto-save to Cloud** (when signed in)
  - Save current project to Supabase on change (debounced)
  - "Last synced: 2 minutes ago" indicator
  - Conflict resolution: "Local" vs "Cloud" version picker

- **My Projects List** (new view)
  - List all saved configs from Supabase
  - Search/filter by name, date
  - Load, duplicate, delete actions
  - Sort by: newest, oldest, name

- **Sync Between Devices**
  - User signs in on Device A, saves project
  - User signs in on Device B, sees same project
  - Real-time sync via Supabase realtime (optional)

#### 3.4 Community Gear
- **Share Custom Items**
  - "Share to Community" button on custom panels/processors
  - Adds item to `community_panels` or `community_processors`
  - Requires approval from admin (you) before visible

- **Browse Community Gear**
  - New "Community" tab in gear section
  - List community-submitted panels/processors
  - Filter by brand, type, popularity
  - Download count, user rating (future)
  - "Add to My Gear" button - copies to user's local custom items

- **Admin Approval** (for you)
  - Simple admin panel (or use Supabase dashboard)
  - Review submitted items
  - Approve/reject with notes
  - Edit specs if needed

**Integration Code Pattern:**
```javascript
// Load Supabase via CDN
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Initialize (in init.js or new auth.js)
const supabase = supabase.createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Sign in
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password
  });
  if (error) showAlert('Sign in failed: ' + error.message);
  else updateUIForUser(data.user);
}

// Save project to cloud
async function saveToCloud() {
  const user = supabase.auth.getUser();
  if (!user) return; // Not signed in

  const config = {
    name: document.getElementById('configName').value,
    data: { screens, currentScreenId, /* ... */ }
  };

  const { error } = await supabase
    .from('configs')
    .upsert({ user_id: user.id, ...config });

  if (error) showAlert('Cloud save failed');
  else showAlert('Saved to cloud!');
}

// Load community panels
async function loadCommunityPanels() {
  const { data, error } = await supabase
    .from('community_panels')
    .select('*')
    .eq('is_approved', true)
    .order('downloads', { ascending: false });

  return data || [];
}
```

**Success Criteria:**
- [ ] Users can sign up and sign in
- [ ] Projects auto-save to cloud when signed in
- [ ] Projects load across devices
- [ ] Users can share custom panels to community
- [ ] Users can browse and download community panels
- [ ] Admin can approve/reject community submissions
- [ ] Free tier: limited cloud saves (e.g., 5 projects)
- [ ] Premium tier: unlimited saves (sets up for Stripe)

**Estimated Time:** 2-3 weeks

---

### **Phase 4: Welcome Page & Onboarding** 👋
**Goal:** First-time user experience and conversion funnel

**Components:**

#### 4.1 Welcome Screen (First Visit)
- **Hero Section:**
  - Bold headline: "Design LED Walls in Minutes"
  - Subheading: "Free calculator for production professionals"
  - Screenshot/demo of the app
  - "Try for Free" button → launches app

- **Key Features:**
  - 📐 "Accurate calculations for any panel"
  - 🎨 "Beautiful PDF quotes"
  - ☁️ "Cloud sync across devices"
  - 🤝 "Share custom gear with community"

- **Pricing Teaser:**
  - Free: Basic calculator, local save
  - Premium: Cloud sync, unlimited projects, priority support
  - "See Pricing" link

#### 4.2 Onboarding Flow (In-App)
- **First Launch:**
  - Quick tutorial overlay (3-4 steps)
  - "Configure your first screen" →
  - "View layouts" →
  - "Export PDF" →
  - "Sign up to save"

- **Tooltips:**
  - Highlight key buttons on first use
  - "💡 Tip: Click 'Gear' to see equipment list"
  - Dismissible, never shown again

#### 4.3 Conversion Triggers
- **Save Prompt:**
  - After user creates a screen: "Sign up to save this project"
  - Modal with sign-up form
  - "Continue as Guest" option

- **Cloud Save Limit (Free Tier):**
  - After 5 saved projects: "You've reached the free limit"
  - "Upgrade to Premium for unlimited saves"
  - Shows pricing

**Success Criteria:**
- [ ] New users understand the app within 30 seconds
- [ ] Clear path from welcome → app → sign-up → premium
- [ ] Onboarding tooltips guide first-time users
- [ ] Conversion trigger at right moment (after value shown)

**Estimated Time:** 1 week

---

### **Phase 5: Stripe Integration & Premium Features** 💳
**Goal:** Monetize the app with premium subscriptions

**Pricing Strategy:**

#### Free Tier
- ✅ Full calculator functionality
- ✅ Local save/load (.ledconfig files)
- ✅ PDF export
- ✅ 5 cloud-saved projects
- ✅ Access community gear (download only)

#### Premium Tier ($9.99/month or $99/year)
- ✅ Everything in Free
- ✅ **Unlimited cloud saves**
- ✅ **Cloud sync across devices**
- ✅ **Share custom gear to community**
- ✅ **Priority email support**
- ✅ **Early access to new features**
- ✅ **Premium badge** in community

**Implementation:**

#### 5.1 Stripe Setup
- Create Stripe account
- Create products:
  - "Premium Monthly" - $9.99/month
  - "Premium Yearly" - $99/year (save 17%)
- Get API keys (test + live)

#### 5.2 Checkout Flow
```javascript
// Load Stripe
<script src="https://js.stripe.com/v3/"></script>

// Initialize
const stripe = Stripe('pk_test_...');

// Upgrade button clicked
async function upgradeToPremium(plan) {
  const user = supabase.auth.getUser();
  if (!user) {
    showAlert('Please sign in first');
    return;
  }

  // Create checkout session via Supabase Edge Function
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { userId: user.id, plan }
  });

  // Redirect to Stripe Checkout
  await stripe.redirectToCheckout({
    sessionId: data.sessionId
  });
}
```

#### 5.3 Supabase Edge Function (Stripe Integration)
```typescript
// supabase/functions/create-checkout/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@11.1.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

serve(async (req) => {
  const { userId, plan } = await req.json();

  const session = await stripe.checkout.sessions.create({
    customer_email: userId, // Get from Supabase auth
    payment_method_types: ['card'],
    line_items: [{
      price: plan === 'yearly' ? 'price_xxx' : 'price_yyy',
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: 'https://yourapp.com?success=true',
    cancel_url: 'https://yourapp.com?canceled=true',
  });

  return new Response(JSON.stringify({ sessionId: session.id }));
});
```

#### 5.4 Webhook Handler (Stripe → Supabase)
```typescript
// supabase/functions/stripe-webhook/index.ts
// Listens for subscription events
// Updates user's premium status in Supabase
serve(async (req) => {
  const sig = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed':
      // User subscribed → update Supabase
      await supabase.from('user_subscriptions').insert({
        user_id: event.data.object.customer,
        status: 'active',
        plan: 'premium'
      });
      break;

    case 'customer.subscription.deleted':
      // User cancelled → downgrade
      await supabase.from('user_subscriptions').update({
        status: 'canceled'
      });
      break;
  }
});
```

#### 5.5 Premium Feature Gating
```javascript
// Check if user is premium
async function isPremiumUser() {
  const user = supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single();

  return data?.status === 'active';
}

// Gate premium features
async function saveToCloud() {
  const isPremium = await isPremiumUser();
  const savedCount = await getCloudSaveCount();

  if (!isPremium && savedCount >= 5) {
    showUpgradeModal('You\'ve reached the free limit of 5 projects');
    return;
  }

  // Proceed with save...
}
```

#### 5.6 UI Updates
- **Upgrade CTA:**
  - "Upgrade to Premium" button in header (if free user)
  - Badge: "Premium" or "Free" next to username

- **Pricing Page:**
  - Feature comparison table
  - "Choose Plan" buttons
  - FAQ section

- **Billing Page:**
  - Current plan display
  - "Manage Subscription" → Stripe customer portal
  - Cancel subscription (with confirmation)

**Success Criteria:**
- [ ] Users can subscribe via Stripe Checkout
- [ ] Premium features are gated correctly
- [ ] Webhooks update user status in real-time
- [ ] Users can manage subscription (upgrade, cancel)
- [ ] Revenue flows to your Stripe account
- [ ] Free tier users see upgrade prompts at right moments

**Estimated Time:** 2-3 weeks

---

### **Phase 6: Custom Domain & Branding** 🌐
**Goal:** Professional domain and brand presence

**Steps:**

1. **Purchase Domain:**
   - Buy domain (e.g., `ledwallcalculator.com` or `ledquote.pro`)
   - Recommended: Namecheap, Google Domains, Cloudflare

2. **Configure Netlify:**
   - Add custom domain in Netlify settings
   - Netlify provides DNS records (A, CNAME)
   - Add DNS records to your domain registrar
   - Enable HTTPS (automatic with Netlify)

3. **Update App:**
   - Change all URLs to custom domain
   - Update Stripe webhook URLs
   - Update Supabase redirect URLs
   - Update social share links

4. **Branding:**
   - Favicon (custom LED icon)
   - App name in manifest
   - Meta tags for SEO
   - Open Graph tags for social sharing

5. **Analytics (Optional):**
   - Google Analytics or Plausible
   - Track: signups, upgrades, exports
   - Privacy-friendly (GDPR compliant)

**Success Criteria:**
- [ ] App loads on custom domain with HTTPS
- [ ] All features work on custom domain
- [ ] SEO meta tags set
- [ ] Social sharing shows correct preview
- [ ] Analytics tracking key metrics

**Estimated Time:** 1 day

---

### **Phase 7 (Future): ES Modules Migration** 🏗️
**Goal:** Modernize architecture (only if needed)

**When to Do This:**
- After you have paying users
- After features are stable
- If maintenance becomes painful
- If you hire developers who prefer ESM

**Approach:**
- One module at a time (incremental)
- Test after each conversion
- Don't break working app
- Follow CLAUDE.md refactoring rules

**Estimated Time:** 4-6 weeks (if you decide to do it)

---

## 📊 Success Metrics

### Phase 1-2 (Features)
- Custom panels work in 100% of cases
- Custom processors calculate accurately
- Zero calculation bugs reported

### Phase 3 (Supabase)
- 100+ user signups in first month
- 50% of users save projects to cloud
- 10+ community items shared

### Phase 4 (Onboarding)
- 80% of visitors understand app within 30 seconds
- 20% of visitors sign up
- 10% of signups create a project

### Phase 5 (Stripe)
- 5% of free users upgrade to premium
- $500+ MRR within 3 months
- <2% churn rate

### Phase 6 (Domain)
- Custom domain live
- SSL working
- All features functional

---

## 🚀 Quick Start

**This Week:**
1. Read this roadmap
2. Review custom panel fields with Claude
3. Start Phase 1: Custom Panel Refinement

**This Month:**
1. Complete Phase 1 & 2 (custom panels + processors)
2. Plan Supabase schema
3. Design authentication UI

**This Quarter:**
1. Launch Supabase integration
2. Get first paying customers
3. Iterate based on feedback

---

## 💡 Key Decisions

### ✅ What We're Doing
- Keeping current architecture (no build system)
- Using CDN for all dependencies (Supabase, Stripe, jsPDF)
- Incremental feature development
- User value before infrastructure
- Free tier with premium upsell

### ❌ What We're NOT Doing (Yet)
- ES Modules migration
- Build system (Webpack, Vite)
- TypeScript
- Framework rewrite (React, Vue, Svelte)
- Native app wrappers (Capacitor, Electron)

### 🤔 What We'll Decide Later
- ESM migration (if maintenance becomes painful)
- Framework adoption (if team grows)
- Native apps (if mobile users demand it)

---

## 📞 Next Steps

1. **Review this roadmap** - does it match your vision?
2. **Discuss custom panels** - what fields are missing?
3. **Plan custom processors** - what went wrong before?
4. **Start Phase 1** - let's refine custom panels first

**Ready to start?** Let's dive into Phase 1: Custom Panel Refinement.
