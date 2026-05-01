# 🧭 FULL APP FLOW (END TO END)

---

# 1. 🔐 AUTH FLOW (START)

## 1.1 Welcome Screen  nice homepage with nice pictures and some nice stuff

User sees:

* Sign Up
* Log In

---

## 1.2 Sign Up (Individual Account)

Each user creates a **personal account**:

Fields:

* Full Name
* Email 
*Phone
* Password

👉 Result:
User now exists as an **individual system user**

---

## 1.3 First Decision Screen

After login:

👉 “What would you like to do?”

* Create a  Pod
* Join a Pod

---
1.4 POD TYPE SELECTION (IMPROVED)

After the user clicks:

👉 Create a Pod

You show:

“What is this Pod for?”
And how many people
The splitting of expenses is actually default equally so if theyre 4 itll be 25% of whatever you get?
but then the user will be prompted to adjust as needed and then all the users of the app must approve the splitting sth you get?

🏷️ POD TYPES
🏠 Shared Residence (DEFAULT)

✔ Marked as Default Selected

For roommates, rent, utilities, groceries
✈️ Trip
For travel groups (flights, hotels, food, transport)
🧳 Short Stay
For temporary living / Airbnb / visits
👥 Other / General
Flexible use (projects, events, custom groups)
⚙️ DEFAULT SYSTEM BEHAVIOR (IMPORTANT)

Each Pod Type comes with:

✔ Pre-configured defaults:
Expense categories
Suggested split methods
Dashboard layout priorities
Example:
🏠 Shared Residence (Default)

Automatically includes:

Rent
Utilities
Food
Transport
Internet
✈️ Trip

Automatically includes:

Flights / Transport
Hotel / Accommodation
Food
Activities
🧳 Short Stay

Automatically includes:

Accommodation
Food
Transport
Miscellaneous
👥 Other



👉 “Customize your Pod”

They can:

Add/remove categories
Rename categories
Change default split method
Adjust which categories show on dashboard
Add custom expense types

# 2. 🏠 GROUP CREATION / JOIN FLOW

---

## 2.1 CREATE GROUP FLOW

User creates a group:

Fields:

* Group Name (e.g. “Tema Apartment”)
* Type (House / Trip / Project)

System generates:

* 🔑 Group Code (e.g. HSE-92KD)

User becomes:

* Admin + Member

---

## 2.2 INVITE MEMBERS (PRIMARY METHOD)

After group creation:

### OPTION 1 (MAIN)

👉 Share Group Code

* User sends code manually (WhatsApp, SMS, etc.)

OR

---

### OPTION 2 (SECONDARY - EMAIL INVITES 👇)

👉 Invite by Email (placed lower in UI)

User enters:

* Email addresses of roommates

System:

* Sends invitation emails
* Each email contains:

  * Join link
  * Group name
  * Accept button

When accepted:

* User joins group automatically

---

## 2.3 JOIN GROUP (FOR INVITED USERS)

User flow:

1. Receives link or code
2. Signs up / logs in
3. Accepts invite OR enters code
4. Gets added to group

---

# 3. 🏡 GROUP DASHBOARD (CORE SYSTEM)

Once inside a group, user sees:

---

# 📊 3.1 OVERVIEW SECTION

### 💰 Total Group Spending

* Example: GHS 3,500 this month

---

### 📂 CATEGORY BREAKDOWN (IMPORTANT)

* 🏠 Rent → GHS 2,000
* ⚡ Utilities → GHS 600
* 🚗 Transport → GHS 300
* 🥘 Food → GHS 500
* 📶 Internet → GHS 100

👉 This is clickable

---

# 🔽 3.2 CATEGORY DRILL DOWN

Example: Click Utilities

### ⚡ Utilities

* Electricity → GHS 400
* Water → GHS 150
* Gas → GHS 50

Each expense shows:

* Who added it
* Who paid it
* Date

---

# 👤 3.3 BALANCE SYSTEM (VERY IMPORTANT)

You don’t just show one number.

---

## 🔹 TOTAL BALANCE

* You owe: GHS 120

---

## 🔹 CATEGORY BALANCES

### 🏠 Rent

* You owe: GHS 80

### ⚡ Utilities

* You owe: GHS 25

### 🚗 Transport

* You owe: GHS 15

---

👉 So users understand:
**what they owe + why they owe it**

---

# 👥 3.4 PERSON-BASED VIEW

Click a roommate:

### 👤 Kwame

Shows:

* Paid Rent: GHS 200
* Paid Electricity: GHS 50

And:

* You owe Kwame (Rent): GHS X
* You owe Kwame (Utilities): GHS Y

---

# 💸 4. ADD EXPENSE FLOW

User clicks:
👉 “Add Expense”

---

## Step 1: Expense Details

* Title (e.g. “Electricity Bill”)
* Amount
* Who paid
* Date

---

## Step 2: Category Selection

* Rent
* Utilities
* Transport
* Food
* Internet
* Other

Optional subcategory:

* Electricity / Water / Gas etc.

---

## Step 3: Split Method

* Equal Split
* Weighted Split
* (future: usage-based split)

---

## Step 4: System Processing

Backend:

* Calculates shares
* Updates balances
* Updates category totals

---

## Step 5: Confirmation

* Shows who owes what immediately

---

# 📈 5. BALANCE TRACKING SYSTEM

Users always see:

* Global balance
* Category balances
* History of transactions

Everything updates in real time

---

# 🔁 6. SETTLEMENT SYSTEM (KEY FEATURE)

User clicks:
👉 “Settle Up”

---

## System does:

* Cancels unnecessary transactions
* Combines debts
* Minimizes number of payments

---

## Example Output:

Instead of 6 payments → becomes 2–3 payments

---

## Final Screen:

* A pays B
* C pays A
* Amounts shown clearly

Buttons:

* Mark as paid

---

# ⚙️ 7. GROUP SETTINGS

* Add/remove members
* View invites
* Change group name
* Default split settings
* Leave group

---

# 🔄 8. DAILY USAGE LOOP

1. Add expense
2. System categorizes it
3. Balances update instantly
4. Users check dashboard
5. End of month → settle

Repeat

NOW LETS WORK ON RESPONSIVE ACROSS ALL DEVICES PHONES TABLETS ETC ALL DEVICES DONT MAKE THINGS ... IF THEY CANT FIT WORK ON ALL THOSE VERY WELL PLEASE