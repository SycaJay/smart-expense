# Smart Expense - Full Project Scope Diagram Details

## 1) Use Case Diagram (Full Scope)

### Actors
- Guest User
- Registered User
- Pod Member
- Pod Admin
- System Scheduler (optional, for recurring reports/reminders)
- Email Service (external supporting actor)

### Authentication and account use cases
- Sign Up
- Verify Email
- Log In
- Log Out
- Reset Password
- Update Profile

### Pod and membership use cases
- Create Pod
- Select Pod Type
- Configure Default Categories
- Configure Default Split Method
- Generate Invite Code
- Invite Members via Code
- Invite Members via Email
- Accept Invite
- Join Pod via Code
- Leave Pod
- Remove Member (admin)
- Assign Admin Role (admin)

### Expense and transaction use cases
- Add Expense
- Select Category/Subcategory
- Select Participants
- Choose Split Method (Equal or Weighted)
- Set Weights (weighted mode)
- Save Expense
- Edit Expense
- Delete Expense
- View Transaction History
- Filter Transaction History (all/expense/payment/date/member/category)

### Dashboard and insight use cases
- View Total Pod Spending
- View Category Breakdown
- Open Category Drilldown
- View Per-Person Contributions
- Open Person Drilldown
- View Your Balance
- View Per-Category Balance
- Export Summary (CSV/PDF optional)

### Settlement use cases
- Generate Settlement Plan
- Minimize Transfers
- Record Payment
- Mark Transfer as Paid
- View Settlement History

### Settings and governance use cases
- Rename Pod
- Manage Categories
- Set Visibility of Categories on Dashboard
- Change Default Split Rules
- Manage Currency
- Manage Notification Preferences

### Actor to use case mapping
- Guest User -> Sign Up, Verify Email, Log In, Reset Password
- Registered User -> Update Profile, Join Pod via Code, Accept Invite
- Pod Member -> Add/Edit own Expense, View Dashboard, View History, Generate/View Settlement, Mark Paid, Leave Pod
- Pod Admin -> All member actions + Create Pod, Configure Pod, Invite/Remove members, Assign Admin Role, Delete any Expense, Change Defaults
- System Scheduler -> Trigger recurring reports/reminders
- Email Service -> Deliver verification, invitation, and reminder emails

### Include relationships
- Add Expense includes:
  - Select Category/Subcategory
  - Select Participants
  - Choose Split Method
  - Calculate Shares
- Generate Settlement Plan includes:
  - Compute Net Balances
  - Minimize Transfers
- Invite Members via Email includes:
  - Send Email Invitation
- Accept Invite includes:
  - Validate Token/Code

### Extend relationships
- View Dashboard extends:
  - Category Drilldown
  - Person Drilldown
  - Filtered Transaction Views
- View Settlement Plan extends:
  - Mark Transfer as Paid

---

## 2) Class Diagram (Full Scope)

### Main classes
- User
- AuthSession
- Pod
- PodMember
- Invite
- Category
- ExpenseTransaction
- ExpenseParticipant
- BalanceSnapshot
- SettlementPlan
- SettlementTransfer
- PaymentRecord
- Report
- Notification

### Class details

#### User
Attributes:
- userId: int
- fullName: string
- email: string
- phone: string
- passwordHash: string
- emailVerified: bool
- createdAt: datetime
- updatedAt: datetime

Methods:
- register()
- verifyEmail()
- login()
- logout()
- resetPassword()
- updateProfile()

#### AuthSession
Attributes:
- sessionId: string
- userId: int
- token: string
- issuedAt: datetime
- expiresAt: datetime
- revokedAt: datetime?

Methods:
- issue()
- validate()
- revoke()

#### Pod
Attributes:
- podId: int
- podName: string
- podType: PodType
- inviteCode: string
- currency: string
- defaultSplitMethod: SplitMode
- plannedMemberCount: int
- createdByUserId: int
- createdAt: datetime
- updatedAt: datetime

Methods:
- create()
- generateInviteCode()
- updateSettings()
- archive()

#### PodMember
Attributes:
- podMemberId: int
- podId: int
- userId: int
- role: RoleType
- status: MembershipStatus
- joinedAt: datetime

Methods:
- assignRole()
- remove()
- leave()

#### Invite
Attributes:
- inviteId: int
- podId: int
- invitedByUserId: int
- inviteType: InviteType
- inviteCode: string?
- inviteToken: string?
- inviteeEmail: string?
- status: InviteStatus
- expiresAt: datetime
- acceptedAt: datetime?

Methods:
- createCodeInvite()
- createEmailInvite()
- accept()
- revoke()
- expire()

#### Category
Attributes:
- categoryId: int
- podId: int
- parentCategoryId: int?
- label: string
- type: CategoryType
- showOnDashboard: bool
- sortOrder: int

Methods:
- create()
- rename()
- toggleVisibility()
- reorder()

#### ExpenseTransaction
Attributes:
- expenseId: int
- podId: int
- categoryId: int?
- title: string
- amount: decimal
- splitMode: SplitMode
- paidByUserId: int
- createdByUserId: int
- expenseDate: date
- notes: string?
- status: ExpenseStatus
- createdAt: datetime
- updatedAt: datetime

Methods:
- create()
- edit()
- delete()
- validate()
- computeShares()

#### ExpenseParticipant
Attributes:
- expenseParticipantId: int
- expenseId: int
- userId: int
- weight: decimal
- allocatedAmount: decimal

Methods:
- setWeight()
- setAllocatedAmount()

#### BalanceSnapshot
Attributes:
- snapshotId: int
- podId: int
- generatedAt: datetime
- netBalances: map<userId, decimal>

Methods:
- calculateFromExpenses()
- getUserBalance()

#### SettlementPlan
Attributes:
- settlementPlanId: int
- podId: int
- generatedByUserId: int
- generatedAt: datetime
- status: SettlementStatus

Methods:
- generate()
- minimizeTransfers()
- close()

#### SettlementTransfer
Attributes:
- transferId: int
- settlementPlanId: int
- fromUserId: int
- toUserId: int
- amount: decimal
- status: TransferStatus
- paidAt: datetime?

Methods:
- markPaid()
- markPending()

#### PaymentRecord
Attributes:
- paymentId: int
- transferId: int
- payerUserId: int
- receiverUserId: int
- amount: decimal
- paymentMethod: PaymentMethod
- paidAt: datetime
- note: string?

Methods:
- record()
- verify()

#### Report
Attributes:
- reportId: int
- podId: int
- reportType: ReportType
- periodStart: date
- periodEnd: date
- generatedAt: datetime

Methods:
- generateDashboardReport()
- generateCategoryReport()
- generateSettlementReport()
- exportCSV()
- exportPDF()

#### Notification
Attributes:
- notificationId: int
- userId: int
- type: NotificationType
- title: string
- body: string
- readAt: datetime?
- createdAt: datetime

Methods:
- send()
- markRead()

### Key relationships and multiplicities
- User 1..* AuthSession
- User *..* Pod via PodMember
- Pod 1..* PodMember
- Pod 1..* Invite
- Pod 1..* Category
- Pod 1..* ExpenseTransaction
- Category 1..* ExpenseTransaction
- ExpenseTransaction 1..* ExpenseParticipant
- User 1..* ExpenseParticipant
- Pod 1..* BalanceSnapshot
- Pod 1..* SettlementPlan
- SettlementPlan 1..* SettlementTransfer
- SettlementTransfer 0..1 PaymentRecord
- Pod 1..* Report
- User 1..* Notification

### Enums
- PodType = {shared_residence, trip, short_stay, other}
- SplitMode = {equal, weighted}
- RoleType = {admin, member}
- MembershipStatus = {active, removed, left}
- InviteType = {code, email}
- InviteStatus = {pending, accepted, expired, revoked}
- CategoryType = {default, custom}
- ExpenseStatus = {active, deleted}
- SettlementStatus = {open, closed}
- TransferStatus = {pending, paid}
- PaymentMethod = {cash, mobile_money, bank_transfer, other}
- ReportType = {dashboard, category, settlement, monthly_summary}
- NotificationType = {invite, reminder, settlement, system}

---

## 3) ER Diagram (Full Scope)

### Tables to include
- users
- auth_sessions
- pods
- pod_members
- invites
- pod_categories
- expenses
- expense_participants
- balance_snapshots
- settlement_plans
- settlement_transfers
- payment_records
- reports
- notifications

### users
- user_id (PK)
- full_name
- email (UNIQUE)
- phone
- password_hash
- email_verified
- created_at
- updated_at

### auth_sessions
- session_id (PK)
- user_id (FK -> users.user_id)
- token_hash (UNIQUE)
- issued_at
- expires_at
- revoked_at (nullable)

### pods
- pod_id (PK)
- pod_name
- pod_type
- invite_code (UNIQUE)
- currency
- default_split_method
- planned_member_count
- created_by_user_id (FK -> users.user_id)
- created_at
- updated_at

### pod_members
- pod_member_id (PK)
- pod_id (FK -> pods.pod_id)
- user_id (FK -> users.user_id)
- member_role
- member_status
- joined_at
- UNIQUE (pod_id, user_id)

### invites
- invite_id (PK)
- pod_id (FK -> pods.pod_id)
- invited_by_user_id (FK -> users.user_id)
- invite_type
- invite_code (nullable)
- invite_token (nullable, UNIQUE)
- invitee_email (nullable)
- status
- expires_at
- accepted_at (nullable)
- created_at

### pod_categories
- pod_category_id (PK)
- pod_id (FK -> pods.pod_id)
- parent_category_id (nullable FK -> pod_categories.pod_category_id)
- category_label
- category_type
- show_on_dashboard
- sort_order
- created_at

### expenses
- expense_id (PK)
- pod_id (FK -> pods.pod_id)
- pod_category_id (nullable FK -> pod_categories.pod_category_id)
- expense_title
- amount
- split_mode
- paid_by_user_id (FK -> users.user_id)
- created_by_user_id (FK -> users.user_id)
- expense_date
- notes
- status
- created_at
- updated_at

### expense_participants
- expense_participant_id (PK)
- expense_id (FK -> expenses.expense_id)
- user_id (FK -> users.user_id)
- weight
- allocated_amount
- UNIQUE (expense_id, user_id)

### balance_snapshots
- snapshot_id (PK)
- pod_id (FK -> pods.pod_id)
- generated_at

### settlement_plans
- settlement_plan_id (PK)
- pod_id (FK -> pods.pod_id)
- generated_by_user_id (FK -> users.user_id)
- generated_at
- status

### settlement_transfers
- transfer_id (PK)
- settlement_plan_id (FK -> settlement_plans.settlement_plan_id)
- from_user_id (FK -> users.user_id)
- to_user_id (FK -> users.user_id)
- amount
- status
- paid_at (nullable)

### payment_records
- payment_id (PK)
- transfer_id (FK -> settlement_transfers.transfer_id)
- payer_user_id (FK -> users.user_id)
- receiver_user_id (FK -> users.user_id)
- amount
- payment_method
- paid_at
- note

### reports
- report_id (PK)
- pod_id (FK -> pods.pod_id)
- report_type
- period_start
- period_end
- generated_at

### notifications
- notification_id (PK)
- user_id (FK -> users.user_id)
- notification_type
- title
- body
- read_at (nullable)
- created_at

### Cardinalities
- users 1..* auth_sessions
- users *..* pods via pod_members
- pods 1..* invites
- pods 1..* pod_categories
- pods 1..* expenses
- pod_categories 1..* expenses
- expenses 1..* expense_participants
- users 1..* expense_participants
- pods 1..* settlement_plans
- settlement_plans 1..* settlement_transfers
- settlement_transfers 0..1 payment_records
- pods 1..* reports
- users 1..* notifications

---

## 4) System Architecture Diagram (Full Scope)

### Client and presentation
- Web Browser
- React + TypeScript frontend
- Responsive UI for mobile/tablet/desktop

### Frontend modules
- Auth module (signup, login, password reset)
- Pod module (create, join, settings, membership management)
- Expense module (create/edit/delete/filter transactions)
- Dashboard module (totals, category breakdown, person drilldowns)
- Settlement module (plan generation, transfer status updates)
- Reports module (export views)
- Notification center

### API/application layer
- PHP REST API service
- Route/controller layer
- Service/business layer:
  - Auth service
  - Pod service
  - Expense service
  - Settlement service
  - Report service
  - Notification service
- Validation and authorization middleware

### Persistence layer
- MySQL relational database
- Optional cache layer (Redis) for sessions and dashboard performance
- File/object storage for report exports (optional)

### External integrations
- Email provider (invites, verification, reminders)
- Payment channel integration (optional future)
- Hosting platform (Hostinger)
- CI/CD pipeline runner (GitHub Actions)

### Cross-cutting concerns
- Authentication and session/token management
- Role-based access control (admin/member)
- Logging and monitoring
- Error handling
- Security controls (input validation, password hashing, token expiry)

### Main flow paths to show
1. User -> Frontend -> Auth API -> DB (login/signup/session)
2. User -> Frontend -> Pod/Expense APIs -> DB (transactions and dashboard data)
3. User -> Frontend -> Settlement API -> DB (plan + transfer updates)
4. API -> Email service (verification/invite/reminder)
5. CI/CD -> build/test/deploy -> hosting environment

---

## 5) Sequence Diagram (Full Scope)

Create two sequence diagrams.

## 5A) Login Flow (Full Scope)

### Lifelines
- User
- Web UI (React Login)
- Auth API
- User Repository/DB
- Session Service
- Notification Service (optional for login alerts)

### Main success sequence
1. User enters email/password and submits
2. UI validates format and sends login request
3. Auth API validates request payload
4. Auth API fetches user by email from DB
5. Auth API verifies password hash
6. Auth API checks email verification + account status
7. Session Service creates session/token
8. Auth API returns success + token/session metadata
9. UI stores session securely and loads user context
10. UI redirects user to pod decision/dashboard

### Failure branches
- Invalid email/password -> error response -> UI shows auth error
- Unverified email -> UI prompts verification flow
- Locked/disabled account -> UI shows restricted access message
- DB/service failure -> UI shows retry message

## 5B) Add Expense Flow (Full Scope)

### Lifelines
- User
- Add Expense UI
- Expense API
- Split Calculation Service
- Balance Service
- Settlement Service
- Database
- Dashboard UI
- Notification Service (optional)

### Main success sequence
1. User opens add-expense form
2. User enters title, amount, payer, date, category, participants, split mode, weights
3. UI performs client-side validation
4. UI sends create-expense request to Expense API
5. API validates payload and authorization (member belongs to pod)
6. API persists expense row
7. API persists expense participant rows
8. Split Calculation Service computes final allocated shares
9. Balance Service recalculates net balances for pod members
10. Settlement Service regenerates optimized transfer recommendations
11. API commits transaction and returns updated summary payload
12. Dashboard UI refreshes totals, category breakdown, history, balances, settle-up section
13. Optional: Notification service sends update to affected members

### Failure branches
- Validation error -> API returns field errors -> UI displays inline messages
- Authorization failure -> API returns forbidden -> UI blocks action
- DB transaction failure -> rollback -> UI shows save failure
- Settlement recompute failure -> return partial status with retry flag (if designed that way)

---

## Cross-Diagram Consistency Rules (Full Scope)

- Keep names consistent: User, Pod, Category, ExpenseTransaction, SettlementPlan, Transfer.
- Use same role model everywhere: Guest, Registered User, Member, Admin.
- Ensure Use Case actions are represented by Class methods and Sequence messages.
- Ensure Class entities map directly to ER tables.
- Keep architecture aligned with chosen stack: React frontend, PHP API, MySQL persistence, email integration, CI/CD pipeline.

---

## 6) Scrum Diagram (Full Scope)

Use a **Scrum workflow/cycle diagram** showing how this project is managed from backlog to release.

### Scrum roles to include
- Product Owner
- Scrum Master
- Development Team
- Stakeholders (lecturer/supervisor/client panel)

### Scrum artifacts to include
- Product Backlog
- Sprint Backlog
- Increment (potentially shippable product output)
- Definition of Done (DoD)
- Definition of Ready (DoR)

### Scrum events to include
- Sprint Planning
- Daily Scrum
- Sprint Review
- Sprint Retrospective
- Backlog Refinement (optional but recommended)

### Workflow blocks to include
1. Product Vision and Requirements
2. Product Backlog Creation
3. Backlog Prioritization
4. Sprint Planning
5. Sprint Backlog Selection
6. Sprint Execution (1-2 weeks or course-approved length)
7. Daily Scrum loop
8. Development + Testing + Integration
9. Sprint Review (demo increment)
10. Sprint Retrospective (improvements)
11. Backlog Update/Re-prioritization
12. Next Sprint cycle

### How to connect the flow
- Product Owner feeds and prioritizes Product Backlog.
- Sprint Planning pulls high-priority items into Sprint Backlog.
- Development Team executes tasks during Sprint.
- Daily Scrum happens repeatedly inside Sprint execution.
- Sprint ends with Review (product/demo feedback) and Retrospective (process feedback).
- Outcomes of Review + Retrospective feed back into Product Backlog.
- Cycle repeats until release goals are met.

### Sprint board states to show in the same diagram (or companion mini-diagram)
- To Do
- In Progress
- Code Review
- Testing
- Done

### Metrics/controls to annotate
- Story points or effort estimates per backlog item
- Sprint goal per sprint
- Burndown trend (optional annotation)
- Velocity (optional annotation across sprints)

### Smart Expense project-specific backlog lanes to include
- Authentication and user management
- Pod creation/join/invite management
- Expense capture and split logic
- Dashboard analytics and drilldowns
- Settlement optimization and payment tracking
- Security hardening
- Testing and CI/CD
- Documentation and diagrams

### Definition of Ready (sample content for diagram note)
- User story has clear description
- Acceptance criteria defined
- Dependencies identified
- UI/API impact understood
- Estimation completed

### Definition of Done (sample content for diagram note)
- Code implemented and reviewed
- Tests written/passed
- Integration complete
- No blocking bugs
- Documentation updated
- Deployed to staging/demo environment

### Suggested sprint loop annotation (for your project)
- Sprint 1: Auth + Pod core
- Sprint 2: Expense + Dashboard
- Sprint 3: Settlement + Reports + hardening
- Sprint 4: Testing, CI/CD, documentation, final polish

