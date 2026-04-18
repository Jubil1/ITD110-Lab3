# ITD110 Lab 3 — Neo4j graph database + Node.js API

Full-stack lab project: **Express** backend talking to **Neo4j** over Bolt, and a **plain HTML/CSS/JS** frontend for CRUD on students, faculty, and courses. Relationships in the graph:

- `(Student)-[:ENROLLED_IN]->(Course)`
- `(Faculty)-[:TEACHES]->(Course)`

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or newer  
- [Neo4j Desktop](https://neo4j.com/download/) (local DBMS)  
- Git (optional)

## 1. Neo4j Desktop

1. Create a **local instance** (Neo4j Desktop 2.x: **Create instance**).  
2. Set the DBMS password (e.g. `12345678` to match the sample below).  
3. **Start** the instance until it shows **RUNNING**.  
4. Open **Neo4j Browser**: [http://localhost:7474](http://localhost:7474) and sign in as user `neo4j` with your password.

### Database name

This project expects a database named **`itd110`** (see `NEO4J_DATABASE` in `.env`). In Neo4j Browser run:

```cypher
CREATE DATABASE itd110 IF NOT EXISTS;
```

Then select database **`itd110`** in the Browser dropdown before testing queries.

> If you prefer the default database only, set `NEO4J_DATABASE=neo4j` in your `.env` instead.

### Ports

- **7474** — Neo4j Browser (HTTP)  
- **7687** — Bolt (used by the Node driver)

## 2. Backend setup

```bash
cd backend
cp .env.example .env
```

Edit **`backend/.env`**:

| Variable | Example | Notes |
|----------|---------|--------|
| `PORT` | `5001` | API port |
| `NEO4J_URI` | `bolt://localhost:7687` | Bolt URL |
| `NEO4J_USER` | `neo4j` | |
| `NEO4J_PASSWORD` | *(your DBMS password)* | |
| `NEO4J_DATABASE` | `itd110` | Must exist (see above) |

Optional (local Desktop usually needs **no** TLS):

```env
# Only set to true for TLS endpoints (e.g. Neo4j Aura)
NEO4J_ENCRYPTED=true
```

If the DBMS is slow to accept connections after a restart, you can tune retries:

```env
NEO4J_CONNECT_RETRIES=15
NEO4J_CONNECT_RETRY_MS=2000
```

Install and run:

```bash
npm install
npm run dev
```

You should see:

- `Neo4j Connected: ...`
- `Server running on port 5001`

Health check: [http://localhost:5001/api/health](http://localhost:5001/api/health)

### API routes

| Resource | Base path |
|----------|-----------|
| Students | `GET/POST /api/students`, `GET/PUT/DELETE /api/students/:id` |
| Faculty | `GET/POST /api/faculty`, `GET/PUT/DELETE /api/faculty/:id` |
| Courses | `GET/POST /api/courses`, `GET/PUT/DELETE /api/courses/:id` |

## 3. Frontend

No build step. With the backend running:

**Option A — open files directly**

Open `frontend/index.html` in your browser (double-click or “Open with” browser).

**Option B — simple static server**

```bash
cd frontend
npx --yes serve .
```

Use the URL printed in the terminal (often `http://localhost:3000`).

**Note:** `npm serve` is not a valid command. You must use **`npx`** (as above) so Node runs the `serve` package.

Use the sidebar to switch between **Students**, **Faculty**, and **Courses**. Create courses first if you need enrollment / teaching assignments in the dropdowns.

## Course activity checklist (ITD110 Lab 3)

| Requirement | How this project satisfies it |
|---------------|--------------------------------|
| **≥ 2 nodes + relationships** | Create e.g. a **Course** and a **Student** (with **ENROLLED_IN**) and/or **Faculty** (with **TEACHES**). Use Neo4j Browser: `MATCH (n) RETURN n` to show the graph. |
| **Full CRUD** | Each entity has **Create** (form submit), **Read** (tables + load for Edit), **Update** (Edit + save), **Delete** (Delete + confirm) via `/api/students`, `/api/faculty`, `/api/courses`. |
| **Improved UI/UX** | Clear page intros, sidebar branding, status messages, field hints (e.g. multi-select, “add courses first”), skip link, scrollable tables on small screens, and empty-state messaging. |

## 4. Verify the graph (optional)

In Neo4j Browser (database **`itd110`** selected):

```cypher
MATCH (n) RETURN n LIMIT 50;
```

Or relationship-focused:

```cypher
MATCH (s:Student)-[r:ENROLLED_IN]->(c:Course)
RETURN s, r, c;
MATCH (f:Faculty)-[t:TEACHES]->(c:Course)
RETURN f, t, c;
```

## Troubleshooting

| Symptom | What to try |
|---------|-------------|
| “Encryption” / “compatible encryption settings” on connect | Keep `NEO4J_ENCRYPTED` unset or `false` for local Desktop; ensure URI is `bolt://localhost:7687`. |
| `ECONNREFUSED` / connect errors | Confirm Neo4j instance is **RUNNING**; retry `npm run dev`. |
| `Failed to fetch` in the browser | Backend not running or wrong port; confirm `Server running on port 5001` and frontend uses `http://localhost:5001/api/...`. |
| Nodemon restarts and API dies | Ensure Neo4j stays up; this repo’s `nodemon.json` limits watched folders; `db.js` retries connections on startup. |

## Repository layout

```
ITD110-Lab3/
├── backend/          # Express + neo4j-driver
│   ├── .env.example  # Copy to .env (not committed)
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   └── server.js
├── frontend/         # Static HTML/CSS/JS
└── README.md
```

## License / course use

Provided for **ITD110** coursework. Adjust credentials and deployment for production as needed.
