

# **Executive Assistant MVP — Product Specification**

---

## **1\. Product Vision**

Deliver a **personal executive assistant** via mobile app that can **summarize, prioritize, and draft actions** across email and calendar.

* **Problem**: Inboxes and calendars are overwhelming; important tasks get missed.

* **Solution**: Provide an on-demand or scheduled **Daily Brief** with urgent tasks, meetings, and suggested replies.

* **Goal**: Build trust by drafting intelligently, never sending without confirmation.

---

## **2\. Target Users**

* Busy professionals without human assistants.

* Parents and families juggling multiple commitments.

* Prosumers with overlapping personal and professional inboxes.

---

## **3\. User Stories (Core Flows)**

### **Epic A — Onboarding & Accounts**

**US-A1: Connect Google via OAuth (multi-account)**  
 As a new user, I want to sign in with Google and link one or more Gmail \+ Calendar accounts (and choose a primary) so that the app can fetch my data for briefs.

* **Acceptance**

  * *Given* I tap **Sign in with Google**, *when* I complete OAuth, *then* I can select one or more accounts and set a **primary**.

  * Compose/send permission is requested, but no email is sent without explicit confirmation.

**US-A2: Defaults when I skip setup**  
 As a new user who skips settings, I want sensible defaults so that I can use the app immediately.

* **Acceptance**

  * Fetch window: **Calendar next 24h**, **Email last 96h**.

  * Ranking: show **Top 3** actions by urgency/importance; **More** reveals all.

  * **Scheduled Briefs**: **Enabled by default** at **7:00 AM** and **7:00 PM**, with **push notifications**.

**US-A3: Customize settings**  
 As a user, I want to manage accounts, schedule, and notifications so that the app fits my routine.

* **Acceptance**

  * Add/remove Google accounts; set a primary; choose inclusion for briefs.

  * Adjust times/days for briefs; set quiet hours; customize notification preferences.

  * Select tone presets; exclude contacts from drafting; set signature.

**US-A4: Land on Home**  
 As a user, after setup I want to land on Home with the **Brief** button available so that I can get a brief immediately.

* **Acceptance**

  * After login, I see the **Brief** button.

  * Scheduled briefs start at the next scheduled time.

---

### **Epic B — Brief Triggers (Scheduled & On-Demand)**

**US-B1: Scheduled brief with notification**  
 As a user, I want to receive a notification at **7:00 AM / 7:00 PM** so that I can open my brief with one tap.

* **Acceptance**

  * *Given* scheduling is ON, *when* the time arrives, *then* I receive a push notification that opens **Brief View**.

  * Honors **quiet hours** and timezone/DST changes.

**US-B2: On-demand brief**  
 As a user, I want to tap **Brief** to get an up-to-date brief at any time.

* **Acceptance**

  * Fetches calendar (next 24h) and emails (last 96h) across linked accounts.

  * If a brief exists from the past **≤5 minutes**, reuse cached results; otherwise regenerate.

**US-B3: Resilience & fallback**  
 As a user, if fetching fails I still want a useful brief.

* **Acceptance**

  * Shows **last generated brief** with a visible **timestamp** and a **Retry** option.

---

### **Epic C — Brief Generation & Ranking**

**US-C1: Concise Brief View**  
 As a user, I want the brief to focus on what matters so that I can act quickly.

* **Acceptance**

  * **Today’s Calendar** with events, conflicts, and travel time.

  * **Top 3 Actionable Emails** ranked by urgency/importance; **More** reveals the full list.

**US-C2: Cross-account deduplication**  
 As a user with multiple Google accounts, I want threads and actions deduplicated so that I don’t see duplicates.

* **Acceptance**

  * Threads are merged by message IDs, participants, and subject heuristics across accounts.

**US-C3: Explain ranking**  
 As a user, I want to know why an item is in the **Top 3** so that I trust the recommendations.

* **Acceptance**

  * On tap/hover, show rationale (e.g., deadline soon, VIP sender, prior promise).

---

### **Epic D — Acting on Items & Drafting**

**US-D1: Draft on click**  
 As a user, I want a **Draft Reply** to appear **only when I click** an actionable email so that the Brief View stays uncluttered.

* **Acceptance**

  * Clicking an item opens the thread with a tone-matched draft visible.

**US-D2: Approve before send**  
 As a user, I want full control so that nothing is sent without my consent.

* **Acceptance**

  * Actions: **Send**, **Edit**, **Delete**, **Snooze**, **Done**.

  * **Send** always requires explicit confirmation.

**US-D3: Activity Log**  
 As a user, I want an auditable history so that I can see what the assistant did.

* **Acceptance**

  * All actions (drafts generated, sends, snoozes) are recorded with timestamps and links.

---

---

## **4\. Non-Functional Requirements**

* **Privacy**: End-to-end encryption.

* **Latency**: Brief generated in under **5 seconds**.

* **Scalability**: Support scaling from 100 beta users to 10,000.

---

## **5\. Success Metrics**

* **Activation**: % of new users requesting ≥1 brief in 48h OR enabling scheduled briefs.

* **Engagement**: Average briefs per user per week (on-demand \+ scheduled).

* **Trust**: % of replies accepted without edits (\>30%).

* **Retention**: % of users requesting briefs weekly after 2 weeks.

* **Productivity**: Number of tasks closed per week via the app.

---

## **6\. Tech Stack (MVP)**

* **Frontend**: React Native (iOS \+ Android).

* **Backend**: Node.js.

* **APIs**: Google Gmail \+ Calendar (OAuth).

* **LLM Services**: OpenAI (summarization, drafting).

* **Database**: Postgres.

* **Infrastructure**: AWS (preferred), or GCP, with Firebase notifications.

---

