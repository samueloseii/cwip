# CWIP Live Deployment Test Plan

## Environment
- Live URL: https://cwip.vercel.app
- Backend: Vercel serverless Python function → Neon PostgreSQL
- Credentials: operator1@flow.org / operator123, admin@flow.org / admin123

---

## Test 1: Operator Login & Field Dashboard

**Steps:**
1. Navigate to https://cwip.vercel.app/login
2. Enter email `operator1@flow.org`, password `operator123`
3. Click "Sign In"

**Pass criteria:**
- Redirects to `/field` (not `/` admin dashboard)
- Header shows "CWIP" with "Field Mode" label
- Green "Online" status banner is visible
- Blue community card shows a community name (not empty)
- "Households" stat card shows a number > 0
- Three action buttons visible: "Record Meter Readings", "Log Payments", "Report Maintenance Issue"

---

## Test 2: Record Meter Reading (Online)

**Steps:**
1. Click "Record Meter Readings" button
2. Select the first household from the dropdown
3. Note the "Previous reading" value shown (should be a number like 542.3)
4. Type a new reading value that is higher than the previous (e.g. previous + 15)
5. Click "Save Reading"

**Pass criteria:**
- Household dropdown populates with household names + account numbers
- Previous reading value displayed is a positive number
- Consumption auto-calculates: `new_reading - previous_reading` and displays in blue
- After save: the household disappears from the dropdown (already recorded)
- "X recorded this session" counter increments to "1"
- No error message shown

---

## Test 3: Admin Login & Dashboard

**Steps:**
1. Logout from operator view (click logout icon in header)
2. Login as admin@flow.org / admin123

**Pass criteria:**
- Redirects to `/` (admin dashboard, NOT /field)
- Sidebar navigation visible with: Dashboard, Communities, Households, Meters, Billing, Maintenance, Analytics
- Dashboard shows stat cards with: total communities = 12, total households = 120
- Revenue and collection rate stats are populated (not zero/empty)

---

## Test 4: Billing Page

**Steps:**
1. Click "Billing" in sidebar

**Pass criteria:**
- Invoice table loads with multiple rows (seeded data has ~100 invoices)
- Status badges visible (paid, pending, overdue, partial) in different colors
- Table shows columns for household, amount, status, due date

---

## Test 5: Analytics Page

**Steps:**
1. Click "Analytics" in sidebar
2. Select a community from the dropdown if needed

**Pass criteria:**
- 4 analytics panels visible: Financial/Sustainability Alerts, Payment Risk, Consumption Anomalies, Maintenance Priority
- At least one panel shows actual data (not just "no data" or empty)
