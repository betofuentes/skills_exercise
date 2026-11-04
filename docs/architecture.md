# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Keep the React app focused on route-level fetch orchestration, dashboard cards, and accessible empty/loading/error states; each route renders data from the shared `/api` contract without business logic beyond simple user-driven selection.
- Logic tier decision: Implement a thin Express API with route handlers that validate request bodies and IDs, delegate to typed Mongoose operations, and return JSON responses with deliberate 4xx status codes for invalid references or missing users instead of leaking cast errors or server exceptions.
- Data tier decision: Model the core domain in Mongoose as `User`, `Team`, `Activity`, and `Workout` with required fields, ObjectId references, and seed data that is idempotent and representative of the program’s four capabilities.
- Activity tracking approach: Store `user`, `team`, `type`, `minutes`, `points`, and `occurredAt`; calculate points from duration and require valid references to existing users and teams, rejecting empty or malformed payloads with 400-level errors.
- Team management approach: Teams keep `name`, `mascot`, and a `members` array of user IDs; creation validates `name`, synchronizes each member's singular team reference while removing stale memberships, and returns team members in the listing payload, with a default empty array when none are supplied.
- Leaderboard approach: Aggregate each team’s total activity points, sort descending by total, and assign a 1-based rank so the frontend can render a consistent leaderboard ordered by highest score first.
- Workout suggestions approach: Match a user’s seeded email address to recent activity or fitness goal, choose workouts whose `focus` aligns with that pattern, and attach a `reason` string explaining the recommendation while returning a 4xx when the user is missing.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — validates the Mongoose validation contract and the seed script; current failures indicate missing required schema fields (`name`, `email`, `fitnessGoal`, `type`, `focus`, etc.), so the data model is not yet enforcing the API contract.
- API command: `npm run test:api --prefix octofit-tracker/backend` — validates the Express endpoints and response shapes; current failures show unimplemented or incorrect 400/404 handling, empty leaderboard aggregation, and missing workout recommendation logic.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — validates the React routes for loading, empty, error, and happy-path rendering; current failures show the app is not fetching or displaying the expected API payloads, and the shared route logic is incomplete.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — checks that TypeScript compiles cleanly after the data and API changes; it is the minimum compile gate for backend correctness.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — checks that the React app and Vite config still compile after route and fetch wiring changes; it guards against UI regressions after the API contract is implemented.
