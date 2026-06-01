# Setup & Running Instructions

## Prerequisites

- **Python 3.11+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **PostgreSQL** — A running PostgreSQL instance (local or remote) that you want to query

## Backend Setup

### 1. Create a virtual environment

```bash
cd "New Project/backend"
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Create `.env` file

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with the following **required** values:

```env
# Generate an encryption key (run this command and paste the output):
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-generated-key-here

# Server
HOST=0.0.0.0
PORT=8000

# CORS (frontend URL)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 4. Start the backend

```bash
# From the backend directory
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

Or run directly:

```bash
python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger documentation.

---

## Frontend Setup

### 1. Install dependencies

```bash
cd "New Project/frontend"
npm install
```

### 2. Configure API URL (optional)

Create a `.env` file in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

This is optional — the default is already `http://localhost:8000`.

### 3. Start the development server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## First Use Walkthrough

### Step 1: Open the app

Open `http://localhost:5173` in your browser. You'll see the chat interface with the sidebar.

### Step 2: Configure LLM Provider

1. Click **Settings** in the sidebar (gear icon)
2. Under **LLM Provider**:
   - Select a provider (Groq recommended — free tier)
   - Select a model
   - Enter your API key
   - **Groq**: Get a free API key at [console.groq.com](https://console.groq.com)
   - **OpenAI**: Get a key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Anthropic**: Get a key at [console.anthropic.com](https://console.anthropic.com)

### Step 3: Add a Database Connection

1. Still in **Settings**, under **Database Connections**, click **Add**
2. Fill in your PostgreSQL connection details:
   - **Connection name**: A friendly name (e.g., "Local Dev DB")
   - **Host**: `localhost` (or your DB host)
   - **Port**: `5432` (default PostgreSQL port)
   - **Database**: Your database name
   - **Username**: Your database username
   - **Password**: Your database password
3. Click **Add Connection** — it will validate the connection before saving

### Step 4: Select the database

Use the **database selector dropdown** in the header bar to select your newly added database.

### Step 5: Start chatting!

1. Click **Chat** in the sidebar
2. Type a natural language question, for example:
   - "Show me all tables in the database"
   - "What are the top 10 rows from the users table?"
   - "How many records are in each table?"
3. Press **Enter** to send

The system will:
1. Connect to the MCP Server with your database credentials
2. The LLM will discover available tools (schema, query)
3. The LLM decides which tools to call and in what order
4. Results are displayed with the natural language response, SQL query, and a results table

### Step 6: Explore other features

- **History** tab: See all past queries, search, and re-run them
- **Saved Queries** tab: Save frequently used queries for quick access
- **Dark/Light mode**: Toggle with the sun/moon icon in the header

---

## Troubleshooting

### Backend won't start

1. **"ENCRYPTION_KEY environment variable not set"**
   - Generate a key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
   - Add it to your `.env` file

2. **Import errors**
   - Make sure you're running from the `New Project` directory (parent of `backend`):
     ```bash
     cd "New Project"
     uvicorn backend.app:app --reload
     ```

3. **MCP SDK not found**
   - Run `pip install mcp` to install the MCP SDK

### Frontend won't connect to backend

1. Check the backend is running on port 8000
2. Check CORS is configured in backend `.env`:
   ```
   CORS_ORIGINS=http://localhost:5173
   ```

### Database connection fails

1. Ensure PostgreSQL is running and accepting connections
2. Check host, port, database name, username, and password
3. If using SSL, enable the SSL checkbox in settings
4. Check that your PostgreSQL `pg_hba.conf` allows connections from the backend host

### Query returns errors

1. The MCP Server only allows SELECT queries (read-only by default)
2. Check that the LLM API key is valid and has credits
3. If using Groq free tier, be mindful of rate limits (30 requests/minute)
