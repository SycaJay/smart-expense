# Smart Expense - Software Engineering Requirements

## 1) Project Context
- **Project name:** Smart Expense
- **Domain:** Shared-expense tracking and settlement for pods (households/trips/short stays)
- **Primary problem:** Fair expense allocation and debt settlement with minimized payment transfers
- **Core objective:** Deliver a production-ready expense-sharing system plus complete software engineering artifacts for academic evaluation

## 2) Current Implementation Baseline (What Exists)

### 2.1 Functional scope currently implemented
- Landing page with Sign Up and Log In UI
- Login path to pod flow (currently demo credential based)
- Sign-up API (`POST /api/signups`) storing signup records in JSON
- Pod decision flow (Create Pod / Join Pod)
- Create Pod wizard (pod type, naming, member count, categories, split defaults)
- Join Pod via invite code format validation
- Pod dashboard views (admin/member variants)
- Group dashboard demo:
  - Total spend
  - Category breakdown + drilldown
  - Person-based drilldown
  - Transaction history filtering
  - Settlement recommendations + "mark as paid" state
- Settlement algorithm implementation (`computeShares`, `balancesFromExpenses`, `minimizeTransfers`)
- PHP router and APIs for health, pods listing, and signup intake
- MySQL schema file available (`smart_expense.sql`)

### 2.2 Technical stack currently used
- **Frontend:** React + TypeScript + Vite
- **Backend:** PHP (custom lightweight routing)
- **Database:** MySQL (schema present; partial runtime integration)
- **Version control:** Git + GitHub remote
- **Code quality tooling:** ESLint + TypeScript compile checks

### 2.3 Known gaps in current build
- Authentication is demo/local (no real user auth, no token/session backend flow)
- Passwords are saved in plain text JSON in signup API (not secure)
- Core dashboard interactions are mostly demo/local state, not persisted server-side
- Email invite flow is UI-only (not connected to mail service)
- No automated tests (unit/integration/e2e) currently present
- No CI/CD workflow files currently present

## 3) Software Engineering Deliverables Required

## 3.1 Requirements engineering deliverables
- [ ] **Software Requirements Specification (SRS)** with:
  - Problem statement
  - Scope and assumptions
  - Functional requirements
  - Non-functional requirements
  - External interface requirements
  - Constraints and risks
  - Acceptance criteria
- [ ] **Use case model** (actors + use case list + use case descriptions)
- [ ] **User stories + acceptance criteria** (INVEST-compliant)
- [ ] **Requirements traceability matrix** (proposal objective -> feature -> test -> status)

## 3.2 UML/architecture and analysis diagrams
- [ ] **System context diagram**
- [ ] **Use case diagram**
- [ ] **Architecture diagram** (frontend, backend, DB, deployment environment)
- [ ] **ERD** (users, pods, memberships, expenses, categories, splits, settlements, transactions, invites)
- [ ] **Sequence diagrams** for key flows:
  - Sign up / log in
  - Create pod
  - Join pod
  - Add expense
  - Settle up
- [ ] **Activity diagram** for expense lifecycle
- [ ] **State diagram** for invite/request status and settlement status

## 3.3 Process and project management deliverables (Scrum)
- [ ] **Product vision + goal statement**
- [ ] **Product backlog** (epics -> stories -> tasks)
- [ ] **Sprint plan** (at least 2-4 sprints with scope, estimates, owners)
- [ ] **Definition of Ready (DoR)** and **Definition of Done (DoD)**
- [ ] **Sprint board/workflow** (To Do, In Progress, Review, Done)
- [ ] **Ceremony artifacts:** planning notes, daily updates, review summary, retrospective actions
- [ ] **Burndown/Burnup chart** per sprint (if required by course)
- [ ] **Risk register** with mitigation and contingency plans

## 3.4 Implementation and code quality deliverables
- [ ] Consistent coding standards document
- [ ] Branching strategy (feature branches + PR policy)
- [ ] Pull request template with checklist
- [ ] Code review evidence (at least N reviewed PRs, per course requirement)
- [ ] Refactor demo data layer into real API-driven data layer
- [ ] Error handling strategy (UI + API)
- [ ] Logging strategy (app + server)

## 3.5 Testing deliverables
- [ ] **Unit tests**
  - Settlement algorithm correctness
  - Split calculation (equal + weighted)
  - Validation helpers (invite code, forms)
- [ ] **Integration tests**
  - API endpoints
  - DB read/write flows
- [ ] **End-to-end tests**
  - Signup/login
  - Create/join pod
  - Add expense
  - Settle up
- [ ] Test plan + test case documents
- [ ] Test report (pass/fail evidence + defect log)

## 3.6 Security and privacy deliverables
- [ ] Password hashing (e.g., `password_hash` in PHP)
- [ ] Input validation + sanitization on all API endpoints
- [ ] Authentication and authorization model (RBAC for pod admin/member actions)
- [ ] Session/token security strategy
- [ ] Secret management policy (`.env`, no plaintext secrets in repo)
- [ ] Basic threat model (OWASP Top 10 relevance)
- [ ] Data retention and privacy statement

## 3.7 DevOps, CI/CD, and deployment deliverables
- [ ] CI workflow (GitHub Actions):
  - Install dependencies
  - Run lint
  - Run tests
  - Build frontend
  - Optional PHP static checks
- [ ] Branch protection policy (required checks + PR review)
- [ ] Deployment pipeline:
  - Staging deployment
  - Production deployment (Hostinger target)
- [ ] Environment configuration documentation
- [ ] Rollback and recovery plan
- [ ] Monitoring/health checks and operational runbook

## 3.8 Documentation deliverables
- [ ] Project README rewritten for this specific product
- [ ] API documentation (endpoint specs + request/response samples)
- [ ] Architecture decision records (ADRs) for key choices
- [ ] Setup guide (local dev + DB import + backend config)
- [ ] User manual / quick-start guide for end users
- [ ] Demo script for final presentation

## 4) Functional Requirements (Target Product Behavior)

## 4.1 User and identity
- Users can sign up with full name, email, phone, password
- Users can log in securely with server-validated credentials
- Users can log out and manage sessions safely

## 4.2 Pod management
- Authenticated users can create pods by selecting type and defaults
- System generates unique invite code per pod
- Pod admins can invite members by code and/or email
- Users can join pods via valid invite flow

## 4.3 Expense lifecycle
- Users can add expense details (title, amount, payer, date)
- Users can assign category/subcategory
- Users can choose split mode (equal/weighted; future usage-based)
- System calculates participant shares and updates balances

## 4.4 Dashboard and insight
- Dashboard shows total spend, category totals, and drilldowns
- Dashboard shows person-based contribution and owed amounts
- Dashboard shows transaction history with filtering

## 4.5 Settlement
- System computes net balances per member
- System produces minimized transfer set (least practical payments)
- Users can mark transfer settlement status
- Settlement history is stored and auditable

## 5) Non-Functional Requirements
- **Usability:** Responsive UI for mobile, tablet, desktop
- **Performance:** Typical dashboard load under acceptable threshold (define measurable target)
- **Reliability:** Graceful degradation when backend unavailable
- **Security:** No plaintext passwords, secure auth/session handling
- **Maintainability:** Modular architecture, typed interfaces, documented APIs
- **Scalability:** Data model supports multiple pods and growing member counts
- **Observability:** Logs and health checks for diagnostics

## 6) Proposed Tooling Map (What to report in project defense)
- **Planning & backlog:** Jira/Trello/Notion (pick one and keep evidence)
- **Version control:** Git + GitHub
- **Frontend:** React, TypeScript, Vite
- **Backend/API:** PHP
- **Database:** MySQL
- **Design/diagrams:** Figma + Draw.io/Lucidchart/PlantUML
- **Testing:** Vitest/Jest (unit), Playwright/Cypress (e2e), Postman/newman (API)
- **CI/CD:** GitHub Actions
- **Deployment:** Hostinger (or course-approved equivalent)
- **Collaboration:** GitHub Issues/Projects + PR reviews

## 7) Prioritized Gap-Closure Backlog

## 7.1 Priority P0 (must complete first)
- [ ] Replace demo login with real auth (DB-backed users + sessions/tokens)
- [ ] Hash passwords and migrate signup storage from JSON to DB
- [ ] Persist pods, members, expenses, and balances to backend DB
- [ ] Build core API set for create/join pod, add expense, fetch dashboard
- [ ] Add CI pipeline with lint/build/test gates
- [ ] Create minimum test suite for settlement math and critical APIs

## 7.2 Priority P1 (important for complete engineering quality)
- [ ] Implement email invite backend integration
- [ ] Add role-based permissions for pod admin/member actions
- [ ] Add error boundaries and robust API error UX
- [ ] Produce required UML/SE diagrams and traceability matrix
- [ ] Establish Scrum artifacts (backlog, sprint plans, retrospective evidence)

## 7.3 Priority P2 (polish and final defense readiness)
- [ ] Improve observability/logging and operational runbook
- [ ] Add performance metrics and optimization evidence
- [ ] Finalize deployment automation + rollback playbook
- [ ] Finalize user manual and demo script with scenario walkthroughs

## 8) Definition of Done for Final Submission
- [ ] All core proposal objectives are implemented and demoable
- [ ] All required diagrams and SRS/process documents are complete
- [ ] CI pipeline green on main branch
- [ ] Test report and defect log included
- [ ] Security basics addressed (password hashing, validation, auth)
- [ ] Deployment is reproducible and documented
- [ ] Traceability matrix shows objective-to-feature-to-test coverage

