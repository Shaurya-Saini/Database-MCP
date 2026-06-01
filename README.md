# Database MCP

A natural language interface for PostgreSQL databases, powered by **MCP (Model Context Protocol)** for secure, tool-based database operations.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Tailwind CSS)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Chat UI  │  │ History  │  │  Saved   │  │ Settings (DB + LLM) │ │
│  └────┬─────┘  └──────────┘  └──────────┘  └──────────────────────┘ │
│       │  REST API (axios + TanStack Query)                           │
└───────┼──────────────────────────────────────────────────────────────┘
        │
┌───────┼──────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                                    │
│       │                                                               │
│  ┌────▼─────┐     ┌──────────────┐     ┌──────────────────────────┐  │
│  │ API Layer│────▶│ Query        │────▶│ MCP Client               │  │
│  │ 25 endpts│     │ Executor     │     │ (Generic, LLM-agnostic)  │  │
│  └──────────┘     └──────────────┘     └──────────┬───────────────┘  │
│                                                    │ stdio            │
│  ┌──────────────┐  ┌──────────────┐     ┌──────────▼───────────────┐ │
│  │ History Svc  │  │ Saved Query  │     │ MCP Server               │ │
│  │ (SQLite)     │  │ Svc (SQLite) │     │ (FastMCP + asyncpg)      │ │
│  └──────────────┘  └──────────────┘     └──────────┬───────────────┘ │
│                                                    │                  │
│  ┌──────────────────────────────────┐   ┌──────────▼───────────────┐ │
│  │ LLM Providers                    │   │ PostgreSQL Database(s)   │ │
│  │ OpenAI │ Anthropic │ Groq        │   │ (User-configured)        │ │
│  └──────────────────────────────────┘   └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## How MCP Works in This Project

The **Model Context Protocol (MCP)** is the core architectural pattern:

1. **MCP Server** (`backend/mcp_server.py`) — Exposes PostgreSQL operations as tools:
   - `query_database` — Execute SELECT queries safely
   - `get_table_schema` — Discover table structures
   - `test_connection` — Verify database connectivity

2. **MCP Client** (`backend/services/mcp_client.py`) — Orchestrates the LLM ↔ MCP Server loop:
   - Starts the MCP Server as a subprocess with the target database's credentials
   - Discovers available tools from the server via the MCP protocol
   - Converts MCP tools to the active LLM provider's format (OpenAI, Anthropic, or Groq)
   - Runs the LLM tool-calling loop until the model produces a final answer
   - The LLM decides which tools to call, not the application code

3. **Query Flow**:
   ```
   User: "Show me the top 5 customers by revenue"
        ↓
   Frontend → POST /query → QueryExecutor → MCPClient
        ↓
   MCPClient starts MCP Server subprocess with DB credentials
        ↓
   MCPClient asks LLM: "User wants top 5 customers. Here are the available tools..."
        ↓
   LLM decides: "I need to call get_table_schema first"
        ↓
   MCPClient calls MCP Server's get_table_schema tool
        ↓
   LLM sees schema, decides: "Now I'll call query_database with the SQL"
        ↓
   MCPClient calls MCP Server's query_database tool
        ↓
   LLM receives results, produces natural language summary
        ↓
   Response returned to frontend with NL response + SQL + results
   ```

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | REST API framework |
| **MCP SDK** (`mcp`) | Model Context Protocol server & client |
| **asyncpg** | PostgreSQL async driver |
| **aiosqlite** | SQLite for config/history/saved queries |
| **Pydantic** | Data validation |
| **cryptography** | Password encryption (Fernet) |
| **OpenAI / Anthropic / Groq SDKs** | LLM provider integrations |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tooling |
| **Tailwind CSS v4** | Styling |
| **TanStack Query** | Server state management |
| **Axios** | HTTP client |
| **Lucide React** | Icons |

## Project Structure

```
New Project/
├── backend/
│   ├── app.py                    # FastAPI application (25 endpoints)
│   ├── mcp_server.py             # MCP Server (PostgreSQL tools)
│   ├── exceptions.py             # Custom exception classes
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment template
│   ├── models/                   # Pydantic schemas
│   │   ├── database.py           # DB connection models
│   │   ├── query.py              # Query request/response
│   │   ├── history.py            # History models
│   │   ├── saved_query.py        # Saved query models
│   │   ├── schema.py             # Database schema models
│   │   ├── config.py             # App config models
│   │   └── health.py             # Health check models
│   ├── services/
│   │   ├── mcp_client.py         # Generic MCP client (core)
│   │   ├── query_executor.py     # Query orchestrator
│   │   ├── database_manager.py   # Multi-DB connection manager
│   │   ├── credential_manager.py # Password encryption
│   │   ├── query_validator.py    # SQL security validator
│   │   ├── history_service.py    # Query history (SQLite)
│   │   └── saved_queries_service.py # Saved queries (SQLite)
│   └── llm_providers/
│       ├── base.py               # Abstract LLM provider
│       ├── openai_provider.py    # OpenAI GPT integration
│       ├── anthropic_provider.py # Anthropic Claude integration
│       └── groq_provider.py      # Groq (free tier) integration
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Main app layout
│   │   ├── main.tsx              # Entry point
│   │   ├── index.css             # Design system (CSS custom properties)
│   │   ├── hooks/
│   │   │   ├── useAppState.ts    # Central state management
│   │   │   └── useApi.ts         # TanStack Query hooks
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx   # Navigation sidebar
│   │   │   │   └── Header.tsx    # Top header bar
│   │   │   ├── chat/
│   │   │   │   ├── ChatContainer.tsx  # Chat view
│   │   │   │   ├── ChatInput.tsx      # Query input
│   │   │   │   └── MessageBubble.tsx  # Message display
│   │   │   └── panels/
│   │   │       ├── HistoryPanel.tsx    # Query history
│   │   │       ├── SavedQueriesPanel.tsx # Saved queries
│   │   │       └── SettingsPanel.tsx   # DB & LLM settings
│   │   ├── services/
│   │   │   └── api.ts            # Axios API client
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   ├── index.html
│   ├── package.json
│   └── tailwind.config.js
│
├── README.md
└── instructions.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/config` | App configuration |
| `POST` | `/databases` | Add database connection |
| `GET` | `/databases` | List all connections |
| `GET` | `/databases/{id}` | Get connection details |
| `PUT` | `/databases/{id}` | Update connection |
| `DELETE` | `/databases/{id}` | Delete connection |
| `POST` | `/databases/{id}/test` | Test connection |
| `GET` | `/databases/{id}/schema` | Get schema |
| `POST` | `/databases/{id}/refresh-schema` | Refresh schema cache |
| `POST` | `/query` | Execute NL query via MCP |
| `GET` | `/history` | Get query history |
| `GET` | `/history/search` | Search history |
| `DELETE` | `/history` | Clear history |
| `GET` | `/history/export` | Export history (JSON/CSV) |
| `GET` | `/saved-queries` | List saved queries |
| `POST` | `/saved-queries` | Create saved query |
| `GET` | `/saved-queries/{id}` | Get saved query |
| `PUT` | `/saved-queries/{id}` | Update saved query |
| `DELETE` | `/saved-queries/{id}` | Delete saved query |
| `POST` | `/saved-queries/import` | Import queries |
| `GET` | `/saved-queries/export` | Export queries |

## License

MIT
