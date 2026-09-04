import { useEffect, useMemo, useState } from "react";

import {
  LayoutDashboard,
  Ticket,
  Bot,
  BookOpen,
  Workflow,
  BarChart3,
  Users,
  Settings,
  Search,
  Bell,
  Plus,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  X,
  Send,
  Loader2,
  ChevronRight,
  UserRound,
  FileText,
  ShieldCheck,
  MessageSquare,
  Database,
} from "lucide-react";

import axios from "axios";

import "./App.css";

const N8N_WEBHOOK_URL =
  "https://saish2005.app.n8n.cloud/webhook/ticketpilot/new-ticket";

const STORAGE_KEY = "ticketpilot_tickets";

const initialTickets = [
  {
    id: "#TK-1042",
    subject: "Refund request for recent purchase",
    customer: "Aarav Mehta",
    category: "Refund",
    priority: "Medium",
    sentiment: "Neutral",
    status: "AI Resolved",
    requiresHuman: false,
    description:
      "Customer requested a refund for a recent purchase.",
    answer:
      "To request a refund, please provide your order ID and the email address registered with your account.",
    sources: ["refund-policy.txt"],
    retrievedDocuments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "#TK-1041",
    subject: "Unable to update delivery address",
    customer: "Riya Shah",
    category: "Account",
    priority: "High",
    sentiment: "Neutral",
    status: "Needs Agent",
    requiresHuman: true,
    description:
      "Customer is unable to update the delivery address.",
    answer:
      "Human support is required to assist with this request.",
    sources: [],
    retrievedDocuments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
  },
  {
    id: "#TK-1040",
    subject: "Payment charged twice",
    customer: "Kabir Joshi",
    category: "Billing",
    priority: "High",
    sentiment: "Negative",
    status: "In Progress",
    requiresHuman: true,
    description:
      "Customer reports being charged twice for the same transaction.",
    answer:
      "Human support is required to investigate the duplicate charge.",
    sources: [],
    retrievedDocuments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  },
  {
    id: "#TK-1039",
    subject: "Where is my order?",
    customer: "Ananya Patil",
    category: "Shipping",
    priority: "Low",
    sentiment: "Neutral",
    status: "AI Resolved",
    requiresHuman: false,
    description:
      "Customer asked for an update regarding their order.",
    answer:
      "Please check your order tracking information for the latest delivery status.",
    sources: [],
    retrievedDocuments: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
  },
];

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Tickets",
    icon: Ticket,
  },
  {
    label: "AI Copilot",
    icon: Bot,
  },
  {
    label: "Knowledge Base",
    icon: BookOpen,
  },
  {
    label: "Workflows",
    icon: Workflow,
  },
  {
    label: "Analytics",
    icon: BarChart3,
  },
  {
    label: "Agents",
    icon: Users,
  },
];

function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  const [ticketText, setTicketText] = useState("");

  const [showTicketForm, setShowTicketForm] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [ticketResult, setTicketResult] =
    useState(null);

  const [selectedTicket, setSelectedTicket] =
    useState(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [tickets, setTickets] = useState(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error(
        "Unable to load stored tickets:",
        error
      );
    }

    return initialTickets;
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tickets)
      );
    } catch (error) {
      console.error(
        "Unable to persist tickets:",
        error
      );
    }
  }, [tickets]);

  const stats = useMemo(() => {
    const openTickets = tickets.filter(
      (ticket) =>
        ticket.status !== "AI Resolved"
    ).length;

    const aiResolved = tickets.filter(
      (ticket) =>
        ticket.status === "AI Resolved"
    ).length;

    const slaAtRisk = tickets.filter(
      (ticket) =>
        ticket.priority === "High" &&
        ticket.status !== "AI Resolved"
    ).length;

    return [
      {
        label: "Open Tickets",
        value: String(openTickets),
        change: "+12.5%",
        icon: Ticket,
      },
      {
        label: "AI Resolved",
        value: String(aiResolved),
        change: "+18.2%",
        icon: Bot,
      },
      {
        label: "Avg. Response Time",
        value: "4m 32s",
        change: "-21.4%",
        icon: Clock3,
      },
      {
        label: "SLA At Risk",
        value: String(slaAtRisk),
        change: "-8.3%",
        icon: AlertTriangle,
      },
    ];
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    if (!query) {
      return tickets;
    }

    return tickets.filter((ticket) => {
      return (
        ticket.id
          ?.toLowerCase()
          .includes(query) ||
        ticket.subject
          ?.toLowerCase()
          .includes(query) ||
        ticket.customer
          ?.toLowerCase()
          .includes(query) ||
        ticket.category
          ?.toLowerCase()
          .includes(query) ||
        ticket.priority
          ?.toLowerCase()
          .includes(query) ||
        ticket.status
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [tickets, searchQuery]);

  const submitTicket = async (event) => {
    event.preventDefault();

    const trimmedTicket =
      ticketText.trim();

    if (!trimmedTicket) {
      return;
    }

    setLoading(true);
    setTicketResult(null);

    try {
      const response = await axios.post(
        N8N_WEBHOOK_URL,
        {
          ticket: trimmedTicket,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = response.data;

      setTicketResult(result);

      const classification =
        result.classification || {};

      const nextId =
        getNextTicketId(tickets);

      const newTicket = {
        id: nextId,

        subject:
          trimmedTicket.length > 70
            ? `${trimmedTicket.substring(
                0,
                70
              )}...`
            : trimmedTicket,

        customer: "New Customer",

        category: formatCategory(
          classification.category
        ),

        priority: formatCategory(
          classification.priority
        ),

        sentiment: formatCategory(
          classification.sentiment
        ),

        status:
          classification.requires_human === true
            ? "Needs Agent"
            : "AI Resolved",

        requiresHuman:
          classification.requires_human ===
          true,

        description: trimmedTicket,

        answer:
          result.answer ||
          "No AI response was returned.",

        sources:
          Array.isArray(result.sources)
            ? result.sources
            : [],

        retrievedDocuments:
          Array.isArray(
            result.retrievedDocuments
          )
            ? result.retrievedDocuments
            : [],

        createdAt:
          new Date().toISOString(),
      };

      setTickets((currentTickets) => [
        newTicket,
        ...currentTickets,
      ]);

      setTicketText("");
    } catch (error) {
      console.error(
        "Ticket submission failed:",
        error
      );

      setTicketResult({
        success: false,
        error:
          error.response?.data?.message ||
          error.response?.data?.error ||
          "Unable to process the ticket. Please check that the backend, ChromaDB, Cloudflare tunnel and n8n workflow are running.",
      });
    } finally {
      setLoading(false);
    }
  };

  const closeTicketForm = () => {
    if (loading) {
      return;
    }

    setShowTicketForm(false);
    setTicketResult(null);
    setTicketText("");
  };

  const openNewTicket = () => {
    setTicketResult(null);
    setTicketText("");
    setShowTicketForm(true);
  };

  const navigateTo = (page) => {
    setActivePage(page);
    setSelectedTicket(null);
  };

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setActivePage("Tickets");
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            T
          </div>

          <div>
            <h1>TicketPilot</h1>
            <span>
              AI Support Platform
            </span>
          </div>
        </div>

        <nav className="navigation">
          <div className="nav-section-title">
            WORKSPACE
          </div>

          {navigation.map(
            ({ label, icon: Icon }) => (
              <button
                key={label}
                className={`nav-item ${
                  activePage === label &&
                  !selectedTicket
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  navigateTo(label)
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            )
          )}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${
              activePage === "Settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              navigateTo("Settings")
            }
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>

          <div className="agent-card">
            <div className="avatar">
              SK
            </div>

            <div className="agent-info">
              <strong>
                Support Admin
              </strong>

              <span>
                Administrator
              </span>
            </div>

            <div className="online-dot" />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace / {activePage}
            </div>

            <h2>
              {activePage === "Dashboard"
                ? "Good morning, Support Team"
                : activePage}
            </h2>

            <p>
              {activePage === "Dashboard"
                ? "Here's what's happening with your support operation today."
                : getPageDescription(
                    activePage
                  )}
            </p>
          </div>

          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />

              <input
                placeholder="Search tickets..."
                type="text"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                onFocus={() => {
                  if (
                    activePage !==
                    "Tickets"
                  ) {
                    setActivePage(
                      "Tickets"
                    );
                  }
                }}
              />

              <span>⌘ K</span>
            </div>

            <button className="icon-button">
              <Bell size={19} />
              <i />
            </button>

            <button
              className="new-ticket-button"
              onClick={openNewTicket}
            >
              <Plus size={18} />
              New Ticket
            </button>
          </div>
        </header>

        {activePage === "Dashboard" && (
          <DashboardPage
            tickets={tickets}
            stats={stats}
            onOpenTicket={openTicket}
            onOpenTickets={() =>
              navigateTo("Tickets")
            }
            onNewTicket={openNewTicket}
          />
        )}

        {activePage === "Tickets" && (
          <TicketsPage
            tickets={filteredTickets}
            totalTickets={tickets.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenTicket={openTicket}
            onNewTicket={openNewTicket}
          />
        )}

        {activePage !== "Dashboard" &&
          activePage !== "Tickets" && (
            <PlaceholderPage
              page={activePage}
              tickets={tickets}
              onNewTicket={openNewTicket}
            />
          )}
      </main>

      {selectedTicket && (
        <TicketDetails
          ticket={selectedTicket}
          onClose={() =>
            setSelectedTicket(null)
          }
          onBack={() =>
            setSelectedTicket(null)
          }
        />
      )}

      {showTicketForm && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeTicketForm();
            }
          }}
        >
          <div className="ticket-modal">
            <div className="modal-header">
              <div>
                <h3>
                  Create Support Ticket
                </h3>

                <p>
                  Submit a customer issue to
                  the TicketPilot AI pipeline.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={closeTicketForm}
                disabled={loading}
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={submitTicket}
            >
              <label htmlFor="ticket-description">
                Customer issue
              </label>

              <textarea
                id="ticket-description"
                value={ticketText}
                onChange={(event) =>
                  setTicketText(
                    event.target.value
                  )
                }
                placeholder="Example: I bought a product 3 days ago and want a refund. What information do I need?"
                rows={7}
                disabled={loading}
                autoFocus
              />

              <div className="modal-hint">
                AI will classify the ticket,
                retrieve relevant knowledge,
                and generate a grounded
                response.
              </div>

              {ticketResult && (
                <div
                  className={`ticket-result ${
                    ticketResult.success
                      ? "success"
                      : "error"
                  }`}
                >
                  {ticketResult.success ? (
                    <>
                      <div className="result-header">
                        <CheckCircle2
                          size={18}
                        />

                        <strong>
                          Ticket processed
                          successfully
                        </strong>
                      </div>

                      <div className="result-grid">
                        <div>
                          <span>
                            Category
                          </span>

                          <strong>
                            {formatCategory(
                              ticketResult
                                .classification
                                ?.category
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Priority
                          </span>

                          <strong>
                            {formatCategory(
                              ticketResult
                                .classification
                                ?.priority
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Sentiment
                          </span>

                          <strong>
                            {formatCategory(
                              ticketResult
                                .classification
                                ?.sentiment
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Human Required
                          </span>

                          <strong>
                            {ticketResult
                              .classification
                              ?.requires_human
                              ? "Yes"
                              : "No"}
                          </strong>
                        </div>
                      </div>

                      <div className="result-answer">
                        <span>
                          AI Response
                        </span>

                        <p>
                          {ticketResult.answer}
                        </p>
                      </div>

                      {ticketResult.sources
                        ?.length > 0 && (
                        <div className="result-sources">
                          <span>
                            Knowledge Sources
                          </span>

                          <div>
                            {ticketResult.sources.map(
                              (source) => (
                                <span
                                  key={
                                    source
                                  }
                                >
                                  {source}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="result-header">
                        <AlertTriangle
                          size={18}
                        />

                        <strong>
                          Ticket processing
                          failed
                        </strong>
                      </div>

                      <p>
                        {ticketResult.error}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeTicketForm
                  }
                  disabled={loading}
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="submit-ticket-button"
                  disabled={
                    loading ||
                    !ticketText.trim()
                  }
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={17}
                        className="spin"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send size={17} />
                      Process with AI
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardPage({
  tickets,
  stats,
  onOpenTicket,
  onOpenTickets,
  onNewTicket,
}) {
  const recentTickets =
    tickets.slice(0, 5);

  return (
    <>
      <section className="stats-grid">
        {stats.map(
          ({
            label,
            value,
            change,
            icon: Icon,
          }) => (
            <div
              className="stat-card"
              key={label}
            >
              <div className="stat-top">
                <div className="stat-icon">
                  <Icon size={19} />
                </div>

                <span className="stat-change">
                  {change}
                </span>
              </div>

              <div className="stat-value">
                {value}
              </div>

              <div className="stat-label">
                {label}
              </div>
            </div>
          )
        )}
      </section>

      <section className="content-grid">
        <div className="panel tickets-panel">
          <div className="panel-header">
            <div>
              <h3>
                Recent Tickets
              </h3>

              <p>
                Latest customer conversations
                and AI actions
              </p>
            </div>

            <button
              className="text-button"
              onClick={onOpenTickets}
            >
              View all
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Customer</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentTickets.map(
                  (ticket) => (
                    <TicketRow
                      key={ticket.id}
                      ticket={ticket}
                      onClick={() =>
                        onOpenTicket(
                          ticket
                        )
                      }
                    />
                  )
                )}
              </tbody>
            </table>

            {recentTickets.length ===
              0 && (
              <EmptyState
                title="No tickets yet"
                description="Create your first support ticket to start the AI pipeline."
                action="Create Ticket"
                onAction={onNewTicket}
              />
            )}
          </div>
        </div>

        <div className="side-panels">
          <div className="panel ai-panel">
            <div className="panel-header">
              <div>
                <h3>
                  AI Copilot
                </h3>

                <p>
                  Live AI activity
                </p>
              </div>

              <div className="ai-status">
                <span />
                Online
              </div>
            </div>

            <div className="ai-metric">
              <div className="ai-metric-icon">
                <Bot size={18} />
              </div>

              <div>
                <strong>
                  94.7%
                </strong>

                <span>
                  Classification
                  accuracy
                </span>
              </div>
            </div>

            <div className="ai-metric">
              <div className="ai-metric-icon">
                <BookOpen
                  size={18}
                />
              </div>

              <div>
                <strong>
                  {getKnowledgeChunkCount(
                    tickets
                  )}
                </strong>

                <span>
                  Knowledge chunks
                  indexed
                </span>
              </div>
            </div>

            <div className="ai-metric">
              <div className="ai-metric-icon">
                <CheckCircle2
                  size={18}
                />
              </div>

              <div>
                <strong>
                  {
                    tickets.filter(
                      (ticket) =>
                        ticket.status ===
                        "AI Resolved"
                    ).length
                  }
                </strong>

                <span>
                  Tickets resolved
                  by AI
                </span>
              </div>
            </div>

            <button
              className="secondary-button"
              onClick={() => {}}
            >
              Open AI Copilot
              <ArrowUpRight size={15} />
            </button>
          </div>

          <div className="panel workflow-panel">
            <div className="panel-header">
              <div>
                <h3>
                  Automation
                </h3>

                <p>
                  n8n workflow status
                </p>
              </div>

              <Workflow size={19} />
            </div>

            <div className="workflow-status">
              <div className="workflow-icon">
                <CheckCircle2
                  size={20}
                />
              </div>

              <div>
                <strong>
                  AI Ticket Processing
                </strong>

                <span>
                  Running normally
                </span>
              </div>
            </div>

            <div className="workflow-stats">
              <div>
                <strong>
                  {tickets.length}
                </strong>

                <span>
                  Tickets processed
                </span>
              </div>

              <div>
                <strong>
                  99.3%
                </strong>

                <span>
                  Success rate
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function TicketsPage({
  tickets,
  totalTickets,
  searchQuery,
  onSearchChange,
  onOpenTicket,
  onNewTicket,
}) {
  return (
    <section className="tickets-page">
      <div className="tickets-toolbar">
        <div>
          <h3>
            All Tickets
          </h3>

          <p>
            {totalTickets} total support
            {totalTickets === 1
              ? " ticket"
              : " tickets"}{" "}
            in TicketPilot
          </p>
        </div>

        <div className="tickets-toolbar-actions">
          <div className="ticket-page-search">
            <Search size={16} />

            <input
              value={searchQuery}
              onChange={(event) =>
                onSearchChange(
                  event.target.value
                )
              }
              placeholder="Filter tickets..."
            />
          </div>

          <button
            className="new-ticket-button"
            onClick={onNewTicket}
          >
            <Plus size={17} />
            New Ticket
          </button>
        </div>
      </div>

      <div className="panel tickets-full-panel">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Sentiment</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {tickets.map(
                (ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    detailed
                    onClick={() =>
                      onOpenTicket(
                        ticket
                      )
                    }
                  />
                )
              )}
            </tbody>
          </table>

          {tickets.length === 0 && (
            <EmptyState
              title={
                searchQuery
                  ? "No matching tickets"
                  : "No tickets yet"
              }
              description={
                searchQuery
                  ? "Try a different search term."
                  : "Create a ticket to populate your support queue."
              }
              action={
                searchQuery
                  ? null
                  : "Create Ticket"
              }
              onAction={
                searchQuery
                  ? null
                  : onNewTicket
              }
            />
          )}
        </div>
      </div>
    </section>
  );
}

function TicketRow({
  ticket,
  onClick,
  detailed = false,
}) {
  return (
    <tr
      className="clickable-row"
      onClick={onClick}
    >
      <td>
        <div className="ticket-cell">
          <strong>
            {ticket.id}
          </strong>

          <span>
            {ticket.subject}
          </span>
        </div>
      </td>

      <td>
        {ticket.customer}
      </td>

      <td>
        <span className="category">
          {ticket.category}
        </span>
      </td>

      <td>
        <span
          className={`priority ${String(
            ticket.priority
          ).toLowerCase()}`}
        >
          {ticket.priority}
        </span>
      </td>

      {detailed && (
        <td>
          <span className="category">
            {ticket.sentiment ||
              "Neutral"}
          </span>
        </td>
      )}

      <td>
        <span
          className={`status ${String(
            ticket.status
          )
            .toLowerCase()
            .replaceAll(
              " ",
              "-"
            )}`}
        >
          <span className="status-dot" />
          {ticket.status}
        </span>
      </td>

      {detailed && (
        <td>
          <ChevronRight
            size={17}
          />
        </td>
      )}
    </tr>
  );
}

function TicketDetails({
  ticket,
  onClose,
}) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="ticket-details-modal">
        <div className="modal-header">
          <div>
            <div className="detail-ticket-id">
              {ticket.id}
            </div>

            <h3>
              {ticket.subject}
            </h3>

            <p>
              Created{" "}
              {formatDate(
                ticket.createdAt
              )}
            </p>
          </div>

          <button
            className="modal-close"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="ticket-details-body">
          <div className="detail-summary-grid">
            <DetailCard
              icon={Ticket}
              label="Category"
              value={
                ticket.category
              }
            />

            <DetailCard
              icon={AlertTriangle}
              label="Priority"
              value={
                ticket.priority
              }
            />

            <DetailCard
              icon={MessageSquare}
              label="Sentiment"
              value={
                ticket.sentiment ||
                "Neutral"
              }
            />

            <DetailCard
              icon={UserRound}
              label="Human Required"
              value={
                ticket.requiresHuman
                  ? "Yes"
                  : "No"
              }
            />
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <MessageSquare
                size={17}
              />
              Customer Issue
            </div>

            <div className="detail-box">
              {ticket.description}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <Bot size={17} />
              AI Response
            </div>

            <div className="detail-box ai-response-box">
              {ticket.answer ||
                "No AI response available."}
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-title">
              <Database
                size={17}
              />
              RAG Retrieval
            </div>

            {ticket.sources
              ?.length > 0 ? (
              <div className="source-list">
                {ticket.sources.map(
                  (source) => (
                    <div
                      className="source-item"
                      key={source}
                    >
                      <FileText
                        size={16}
                      />

                      <span>
                        {source}
                      </span>

                      <ShieldCheck
                        size={15}
                      />
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="no-source">
                No relevant knowledge
                source was retrieved.
              </div>
            )}
          </div>

          {ticket.retrievedDocuments
            ?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">
                Retrieved Documents
              </div>

              <div className="retrieval-list">
                {ticket.retrievedDocuments.map(
                  (
                    document,
                    index
                  ) => (
                    <div
                      className="retrieval-item"
                      key={`${document.source}-${index}`}
                    >
                      <div>
                        <strong>
                          {document.source ||
                            "Unknown source"}
                        </strong>

                        <span>
                          Chunk{" "}
                          {document.chunk ??
                            index}
                        </span>
                      </div>

                      {document.distance !==
                        null &&
                        document.distance !==
                          undefined && (
                          <span>
                            Distance:{" "}
                            {Number(
                              document.distance
                            ).toFixed(
                              3
                            )}
                          </span>
                        )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className="detail-footer">
          <span
            className={`status ${String(
              ticket.status
            )
              .toLowerCase()
              .replaceAll(
                " ",
                "-"
              )}`}
          >
            <span className="status-dot" />
            {ticket.status}
          </span>

          <button
            className="cancel-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="detail-card">
      <div className="detail-card-icon">
        <Icon size={17} />
      </div>

      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
  onAction,
}) {
  return (
    <div className="empty-state">
      <Ticket size={30} />

      <h4>
        {title}
      </h4>

      <p>
        {description}
      </p>

      {action && (
        <button
          className="secondary-button"
          onClick={onAction}
        >
          <Plus size={16} />
          {action}
        </button>
      )}
    </div>
  );
}

function PlaceholderPage({
  page,
  tickets,
  onNewTicket,
}) {
  const pageInfo = {
    "AI Copilot": {
      icon: Bot,
      title: "AI Copilot",
      text:
        "AI-assisted ticket analysis and response generation will appear here.",
    },

    "Knowledge Base": {
      icon: BookOpen,
      title: "Knowledge Base",
      text:
        "Manage documents, chunks, embeddings and retrieval sources.",
    },

    Workflows: {
      icon: Workflow,
      title: "Workflows",
      text:
        "Monitor the n8n automation pipeline and execution activity.",
    },

    Analytics: {
      icon: BarChart3,
      title: "Analytics",
      text:
        "Support performance, AI resolution and SLA analytics will appear here.",
    },

    Agents: {
      icon: Users,
      title: "Agents",
      text:
        "Manage support agents, routing and workload distribution.",
    },

    Settings: {
      icon: Settings,
      title: "Settings",
      text:
        "Configure TicketPilot platform settings.",
    },
  };

  const info =
    pageInfo[page] ||
    pageInfo["AI Copilot"];

  const Icon = info.icon;

  return (
    <section className="placeholder-page">
      <div className="placeholder-card">
        <div className="placeholder-icon">
          <Icon size={28} />
        </div>

        <h3>
          {info.title}
        </h3>

        <p>
          {info.text}
        </p>

        <div className="placeholder-meta">
          <span>
            <CheckCircle2
              size={15}
            />
            Connected
          </span>

          <span>
            <Database
              size={15}
            />
            {tickets.length} tickets
          </span>
        </div>

        <button
          className="secondary-button"
          onClick={onNewTicket}
        >
          <Plus size={16} />
          Create Support Ticket
        </button>
      </div>
    </section>
  );
}

function getNextTicketId(tickets) {
  let highest = 1042;

  tickets.forEach((ticket) => {
    const match =
      String(ticket.id).match(
        /TK-(\d+)/
      );

    if (match) {
      highest = Math.max(
        highest,
        Number(match[1])
      );
    }
  });

  return `#TK-${highest + 1}`;
}

function getKnowledgeChunkCount(
  tickets
) {
  const total = tickets.reduce(
    (sum, ticket) => {
      return (
        sum +
        (ticket.retrievedDocuments
          ?.length || 0)
      );
    },
    0
  );

  if (total === 0) {
    return "3,842";
  }

  return String(
    3842 + total
  );
}

function getPageDescription(page) {
  const descriptions = {
    Tickets:
      "Review, search and manage customer support tickets.",
    "AI Copilot":
      "AI-assisted support operations and grounded response generation.",
    "Knowledge Base":
      "Manage the knowledge used by TicketPilot's RAG pipeline.",
    Workflows:
      "Monitor automated ticket processing and routing.",
    Analytics:
      "Track support performance and AI effectiveness.",
    Agents:
      "Manage support agents and ticket assignment.",
    Settings:
      "Configure your TicketPilot workspace.",
  };

  return (
    descriptions[page] ||
    "Manage your TicketPilot workspace."
  );
}

function formatCategory(value) {
  if (!value) {
    return "Unknown";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(value) {
  if (!value) {
    return "recently";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "recently";
  }

  return date.toLocaleString(
    [],
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

export default App;