import { useEffect, useMemo, useRef, useState } from "react";

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
  Sparkles,
  Activity,
  CircleAlert,
  Zap,
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
    createdAt: new Date(
      Date.now() - 1000 * 60 * 18
    ).toISOString(),
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
    createdAt: new Date(
      Date.now() - 1000 * 60 * 32
    ).toISOString(),
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
    createdAt: new Date(
      Date.now() - 1000 * 60 * 47
    ).toISOString(),
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
    createdAt: new Date(
      Date.now() - 1000 * 60 * 65
    ).toISOString(),
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
  const [activePage, setActivePage] =
    useState("Dashboard");

  const [ticketText, setTicketText] =
    useState("");

  const [inputMode, setInputMode] =
    useState("single");

  const [bulkText, setBulkText] =
    useState("");

  const [bulkTickets, setBulkTickets] =
    useState([]);

  const [bulkProgress, setBulkProgress] =
    useState({
      current: 0,
      total: 0,
    });

  const [bulkProcessing, setBulkProcessing] =
    useState(false);

  const [bulkMessage, setBulkMessage] =
    useState("");

  const [bulkResults, setBulkResults] =
    useState([]);

  const bulkFileInputRef = useRef(null);

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

    const resolutionRate =
      tickets.length > 0
        ? Math.round(
            (aiResolved / tickets.length) * 100
          )
        : 0;

    return [
      {
        label: "Open Tickets",
        value: String(openTickets),
        change: `${openTickets} need attention`,
        icon: Ticket,
        tone: "blue",
      },
      {
        label: "AI Resolved",
        value: String(aiResolved),
        change: `${resolutionRate}% resolution`,
        icon: Bot,
        tone: "green",
      },
      {
        label: "Avg. Response Time",
        value: "4m 32s",
        change: "Demo metric",
        icon: Clock3,
        tone: "purple",
      },
      {
        label: "SLA At Risk",
        value: String(slaAtRisk),
        change:
          slaAtRisk > 0
            ? "Needs attention"
            : "All clear",
        icon: AlertTriangle,
        tone: "amber",
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
          classification.requires_human ===
          true
            ? "Needs Agent"
            : "AI Resolved",

        requiresHuman:
          classification.requires_human ===
          true,

        description: trimmedTicket,

        answer:
          result.answer ||
          "No AI response was returned.",

        sources: Array.isArray(
          result.sources
        )
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
          "Unable to process the ticket. Please verify that the n8n workflow is active and the Render backend is available.",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseBulkTickets = (text) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 100);
  };

  const handleBulkTextChange = (event) => {
    const value = event.target.value;
    setBulkText(value);
    setBulkTickets(parseBulkTickets(value));
    setBulkResults([]);
    setBulkMessage("");
  };

  const handleBulkFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      const ticketColumnCandidates = [
        "ticket",
        "issue",
        "problem",
        "description",
        "customer issue",
        "customer_issue",
        "query",
        "request",
      ];

      const getColumnValue = (row) => {
        const keys = Object.keys(row);
        const matchedKey = keys.find((key) =>
          ticketColumnCandidates.includes(
            key.trim().toLowerCase()
          )
        );

        if (matchedKey) {
          return String(row[matchedKey] ?? "").trim();
        }

        const firstValue = keys
          .map((key) => row[key])
          .find((value) => String(value ?? "").trim());

        return String(firstValue ?? "").trim();
      };

      const importedTickets = rows
        .map(getColumnValue)
        .filter(Boolean)
        .slice(0, 100);

      setBulkText(importedTickets.join("\n"));
      setBulkTickets(importedTickets);
      setBulkResults([]);
      setBulkMessage(
        importedTickets.length
          ? `${importedTickets.length} ticket${importedTickets.length === 1 ? "" : "s"} loaded from ${file.name}.`
          : "No ticket issues were found in the selected file."
      );
    } catch (error) {
      console.error("Bulk file import failed:", error);
      setBulkMessage(
        "Unable to read this file. Please use a CSV, XLSX or XLS file with one ticket issue per row."
      );
      setBulkTickets([]);
      setBulkText("");
    } finally {
      event.target.value = "";
    }
  };

  const loadBulkSample = () => {
    const sampleTickets = [
      "My payment was deducted but my train ticket was not booked.",
      "I want to request a refund for my cancelled booking.",
      "My account password is not working.",
      "I was charged twice for the same booking.",
      "How can I update my delivery address?",
    ];

    setBulkText(sampleTickets.join("\n"));
    setBulkTickets(sampleTickets);
    setBulkResults([]);
    setBulkMessage("Sample tickets loaded.");
  };

  const processBulkTickets = async () => {
    const ticketsToProcess = bulkTickets.length
      ? bulkTickets
      : parseBulkTickets(bulkText);

    if (!ticketsToProcess.length || bulkProcessing) {
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({
      current: 0,
      total: ticketsToProcess.length,
    });
    setBulkResults([]);
    setBulkMessage("");

    const results = [];
    let workingTickets = [...tickets];

    for (let index = 0; index < ticketsToProcess.length; index += 1) {
      const currentTicketText = ticketsToProcess[index];
      setBulkProgress({
        current: index + 1,
        total: ticketsToProcess.length,
      });

      try {
        const response = await axios.post(
          N8N_WEBHOOK_URL,
          {
            ticket: currentTicketText,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const result = response.data;
        const classification = result.classification || {};
        const nextId = getNextTicketId(workingTickets);

        const newTicket = {
          id: nextId,
          subject:
            currentTicketText.length > 70
              ? `${currentTicketText.substring(0, 70)}...`
              : currentTicketText,
          customer: "Bulk Import",
          category: formatCategory(classification.category),
          priority: formatCategory(classification.priority),
          sentiment: formatCategory(classification.sentiment),
          status:
            classification.requires_human === true
              ? "Needs Agent"
              : "AI Resolved",
          requiresHuman: classification.requires_human === true,
          description: currentTicketText,
          answer: result.answer || "No AI response was returned.",
          sources: Array.isArray(result.sources) ? result.sources : [],
          retrievedDocuments: Array.isArray(result.retrievedDocuments)
            ? result.retrievedDocuments
            : [],
          createdAt: new Date().toISOString(),
        };

        workingTickets = [newTicket, ...workingTickets];
        setTickets(workingTickets);

        results.push({
          ticket: currentTicketText,
          status: "success",
          category: formatCategory(classification.category),
          priority: formatCategory(classification.priority),
          requiresHuman: classification.requires_human === true,
          answer: result.answer || "No AI response was returned.",
        });
      } catch (error) {
        console.error("Bulk ticket processing failed:", error);

        results.push({
          ticket: currentTicketText,
          status: "failed",
          error:
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Unable to process this ticket.",
        });
      }

      setBulkResults([...results]);
    }

    setBulkProcessing(false);
    setBulkMessage(
      `Completed ${results.length} of ${ticketsToProcess.length} ticket${ticketsToProcess.length === 1 ? "" : "s"}.`
    );
  };

  const closeTicketForm = () => {
    if (loading || bulkProcessing) {
      return;
    }

    setShowTicketForm(false);
    setTicketResult(null);
    setTicketText("");
    setInputMode("single");
    setBulkText("");
    setBulkTickets([]);
    setBulkProgress({ current: 0, total: 0 });
    setBulkProcessing(false);
    setBulkMessage("");
    setBulkResults([]);
  };

  const openNewTicket = () => {
    setTicketResult(null);
    setTicketText("");
    setInputMode("single");
    setBulkText("");
    setBulkTickets([]);
    setBulkProgress({ current: 0, total: 0 });
    setBulkProcessing(false);
    setBulkMessage("");
    setBulkResults([]);
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

  const updateTicket = (ticketId, updates) => {
    setTickets((currentTickets) => {
      const updatedTickets = currentTickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, ...updates }
          : ticket
      );

      const updatedTicket = updatedTickets.find(
        (ticket) => ticket.id === ticketId
      );

      setSelectedTicket(updatedTicket || null);
      return updatedTickets;
    });
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
              AI SUPPORT PLATFORM
            </span>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">
            S
          </div>

          <div>
            <strong>
              Support Workspace
            </strong>

            <span>
              Production
            </span>
          </div>

          <ChevronRight size={17} />
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

                {label === "Tickets" && (
                  <span className="nav-count">
                    {tickets.length}
                  </span>
                )}
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
          <div className="topbar-heading">
            <div className="breadcrumb">
              Workspace
              <ChevronRight size={13} />
              {activePage}
            </div>

            <h2>
              {activePage ===
              "Dashboard"
                ? "Good morning, Support Team"
                : activePage}
            </h2>

            <p>
              {activePage ===
              "Dashboard"
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

        {activePage ===
          "Dashboard" && (
          <DashboardPage
            tickets={tickets}
            stats={stats}
            onOpenTicket={openTicket}
            onOpenTickets={() =>
              navigateTo("Tickets")
            }
            onOpenCopilot={() =>
              navigateTo("AI Copilot")
            }
            onNewTicket={openNewTicket}
          />
        )}

        {activePage ===
          "Tickets" && (
          <TicketsPage
            tickets={filteredTickets}
            totalTickets={tickets.length}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenTicket={openTicket}
            onNewTicket={openNewTicket}
          />
        )}

        {activePage ===
          "AI Copilot" && (
          <AICopilotPage
            tickets={tickets}
            onNewTicket={openNewTicket}
          />
        )}

        {activePage !==
          "Dashboard" &&
          activePage !== "Tickets" &&
          activePage !==
            "AI Copilot" && (
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
          onUpdateTicket={updateTicket}
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
              <div className="modal-title-area">
                <div className="modal-icon">
                  <MessageSquare
                    size={19}
                  />
                </div>

                <div>
                  <h3>
                    Create support ticket
                  </h3>

                  <p>
                    Let TicketPilot classify
                    and resolve the request
                    using your knowledge base.
                  </p>
                </div>
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
              {!ticketResult && (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      padding: "4px 0 20px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setInputMode("single")}
                      disabled={loading || bulkProcessing}
                      style={{
                        border: inputMode === "single" ? "1px solid #172033" : "1px solid #e8ebf1",
                        background: inputMode === "single" ? "#172033" : "#fff",
                        color: inputMode === "single" ? "#fff" : "#6f7f98",
                        borderRadius: "10px",
                        padding: "11px 14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Single Ticket
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInputMode("bulk");
                        setTicketResult(null);
                      }}
                      disabled={loading || bulkProcessing}
                      style={{
                        border: inputMode === "bulk" ? "1px solid #172033" : "1px solid #e8ebf1",
                        background: inputMode === "bulk" ? "#172033" : "#fff",
                        color: inputMode === "bulk" ? "#fff" : "#6f7f98",
                        borderRadius: "10px",
                        padding: "11px 14px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Bulk Import
                    </button>
                  </div>

                  {inputMode === "single" ? (
                    <>
                      <div className="form-label-row">
                        <label htmlFor="ticket-description">
                          Customer issue
                        </label>

                        <span>
                          {ticketText.length} characters
                        </span>
                      </div>

                      <textarea
                        id="ticket-description"
                        value={ticketText}
                        onChange={(event) =>
                          setTicketText(event.target.value)
                        }
                        placeholder="Example: My payment was deducted but my train ticket was not booked."
                        rows={7}
                        disabled={loading}
                        autoFocus
                      />

                      <div className="example-chips">
                        <button
                          type="button"
                          onClick={() =>
                            setTicketText(
                              "My payment was deducted but my train ticket was not booked."
                            )
                          }
                          disabled={loading}
                        >
                          Payment issue
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setTicketText(
                              "I want to request a refund for my recent purchase."
                            )
                          }
                          disabled={loading}
                        >
                          Refund request
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setTicketText(
                              "I cannot update my delivery address."
                            )
                          }
                          disabled={loading}
                        >
                          Account issue
                        </button>
                      </div>

                      <div className="pipeline-preview">
                        <div>
                          <Bot size={16} />
                          <span>Classify</span>
                        </div>

                        <ChevronRight size={14} />

                        <div>
                          <Database size={16} />
                          <span>Retrieve</span>
                        </div>

                        <ChevronRight size={14} />

                        <div>
                          <Sparkles size={16} />
                          <span>Generate</span>
                        </div>

                        <ChevronRight size={14} />

                        <div>
                          <ShieldCheck size={16} />
                          <span>Route</span>
                        </div>
                      </div>

                      <div className="modal-hint">
                        TicketPilot uses the n8n workflow to classify the request, retrieve relevant knowledge and generate a grounded response.
                      </div>
                    </>
                  ) : (
                    <div>
                      <div className="form-label-row">
                        <label htmlFor="bulk-ticket-description">
                          Customer issues
                        </label>

                        <span>
                          {bulkTickets.length}/100 tickets
                        </span>
                      </div>

                      <textarea
                        id="bulk-ticket-description"
                        value={bulkText}
                        onChange={handleBulkTextChange}
                        placeholder={
                          "Paste one customer issue per line...\n\nExample: My payment was deducted but my train ticket was not booked.\nI want to request a refund for my cancelled booking."
                        }
                        rows={8}
                        disabled={bulkProcessing}
                        autoFocus
                      />

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginTop: "12px",
                        }}
                      >
                        <input
                          ref={bulkFileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleBulkFile}
                          style={{ display: "none" }}
                        />

                        <button
                          type="button"
                          className="cancel-button"
                          onClick={() => bulkFileInputRef.current?.click()}
                          disabled={bulkProcessing}
                        >
                          <FileText size={16} />
                          Upload CSV / XLSX
                        </button>

                        <button
                          type="button"
                          className="cancel-button"
                          onClick={loadBulkSample}
                          disabled={bulkProcessing}
                        >
                          <Zap size={16} />
                          Load Sample
                        </button>
                      </div>

                      <div className="modal-hint" style={{ marginTop: "12px" }}>
                        Upload a CSV/XLSX file with one customer issue per row, or paste multiple issues above. Maximum 100 tickets per batch.
                      </div>

                      {bulkMessage && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "11px 13px",
                            borderRadius: "10px",
                            background: "#f5f7fb",
                            color: "#687994",
                            fontSize: "13px",
                          }}
                        >
                          {bulkMessage}
                        </div>
                      )}

                      {bulkTickets.length > 0 && (
                        <div
                          style={{
                            marginTop: "14px",
                            padding: "12px 14px",
                            border: "1px solid #e8ebf1",
                            borderRadius: "10px",
                            color: "#172033",
                            fontSize: "13px",
                          }}
                        >
                          <strong>{bulkTickets.length} tickets ready</strong>
                          <span style={{ color: "#8795aa", marginLeft: "8px" }}>
                            They will use the same AI + RAG pipeline as a single ticket.
                          </span>
                        </div>
                      )}

                      {bulkProcessing && bulkProgress.total > 0 && (
                        <div style={{ marginTop: "16px" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                              color: "#687994",
                              marginBottom: "7px",
                            }}
                          >
                            <span>Processing tickets</span>
                            <span>
                              {bulkProgress.current} / {bulkProgress.total}
                            </span>
                          </div>

                          <div
                            style={{
                              height: "7px",
                              borderRadius: "999px",
                              background: "#edf0f5",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%`,
                                height: "100%",
                                background: "#172033",
                                transition: "width 0.2s ease",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {bulkResults.length > 0 && (
                        <div style={{ marginTop: "16px" }}>
                          <div className="form-label-row">
                            <label>Batch results</label>
                            <span>{bulkResults.length} processed</span>
                          </div>

                          <div
                            style={{
                              maxHeight: "180px",
                              overflowY: "auto",
                              display: "grid",
                              gap: "8px",
                            }}
                          >
                            {bulkResults.map((item, index) => (
                              <div
                                key={`${item.ticket}-${index}`}
                                style={{
                                  padding: "10px 12px",
                                  border: "1px solid #e8ebf1",
                                  borderRadius: "10px",
                                  background: "#fff",
                                  fontSize: "12px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                  }}
                                >
                                  <strong style={{ color: "#172033" }}>
                                    {item.ticket.length > 70
                                      ? `${item.ticket.substring(0, 70)}...`
                                      : item.ticket}
                                  </strong>
                                  <span
                                    style={{
                                      color: item.status === "success" ? "#3f8f69" : "#b15d5d",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {item.status === "success" ? "Processed" : "Failed"}
                                  </span>
                                </div>

                                {item.status === "success" && (
                                  <div style={{ marginTop: "5px", color: "#71809a" }}>
                                    {item.category || "Unclassified"} · {item.priority || "Normal"}
                                    {item.requiresHuman ? " · Human review" : " · AI resolved"}
                                  </div>
                                )}

                                {item.status === "failed" && (
                                  <div style={{ marginTop: "5px", color: "#a05d5d" }}>
                                    {item.error}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {loading && (
                <div className="processing-state">
                  <div className="processing-icon">
                    <Loader2 size={24} className="spin" />
                  </div>

                  <h3>Processing ticket</h3>

                  <p>
                    TicketPilot is running classification, retrieval and response generation.
                  </p>

                  <div className="processing-steps">
                    <span className="processing-active">Classifying</span>
                    <span>Retrieving knowledge</span>
                    <span>Generating response</span>
                  </div>
                </div>
              )}

              {ticketResult && !loading && (
                <TicketResult result={ticketResult} />
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeTicketForm}
                  disabled={loading || bulkProcessing}
                >
                  Close
                </button>

                {!ticketResult && inputMode === "single" && (
                  <button
                    type="submit"
                    className="submit-ticket-button"
                    disabled={loading || !ticketText.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 size={17} className="spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        Process with AI
                      </>
                    )}
                  </button>
                )}

                {!ticketResult && inputMode === "bulk" && (
                  <button
                    type="button"
                    className="submit-ticket-button"
                    onClick={processBulkTickets}
                    disabled={bulkProcessing || bulkTickets.length === 0}
                  >
                    {bulkProcessing ? (
                      <>
                        <Loader2 size={17} className="spin" />
                        Processing {bulkProgress.current}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <Send size={17} />
                        Process Bulk Tickets
                      </>
                    )}
                  </button>
                )}

                {ticketResult && !loading && (
                  <button
                    type="button"
                    className="submit-ticket-button"
                    onClick={closeTicketForm}
                  >
                    Done
                    <CheckCircle2 size={17} />
                  </button>
                )}
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
  onOpenCopilot,
  onNewTicket,
}) {
  const recentTickets =
    tickets.slice(0, 5);

  const aiResolved =
    tickets.filter(
      (ticket) =>
        ticket.status ===
        "AI Resolved"
    ).length;

  const resolutionRate =
    tickets.length > 0
      ? Math.round(
          (aiResolved /
            tickets.length) *
            100
        )
      : 0;

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-icon">
            <Sparkles size={21} />
          </div>

          <div>
            <span className="eyebrow">
              AI SUPPORT OPERATIONS
            </span>

            <h1>
              Resolve customer issues
              faster.
            </h1>

            <p>
              TicketPilot classifies incoming
              tickets, retrieves relevant
              knowledge and generates
              grounded responses automatically.
            </p>
          </div>
        </div>

        <button
          className="hero-button"
          onClick={onNewTicket}
        >
          <Plus size={17} />
          Create ticket
          <ArrowUpRight size={16} />
        </button>
      </div>

      <div className="stats-grid">
        {stats.map(
          ({
            label,
            value,
            change,
            icon: Icon,
            tone,
          }) => (
            <div
              className={`stat-card ${tone}`}
              key={label}
            >
              <div className="stat-top">
                <div className="stat-icon">
                  <Icon size={19} />
                </div>

                <span className="stat-context">
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
      </div>

      <div className="dashboard-grid">
        <div className="panel tickets-panel">
          <div className="panel-header">
            <div>
              <div className="panel-title-row">
                <h3>
                  Recent tickets
                </h3>

                <span className="count-badge">
                  {tickets.length}
                </span>
              </div>

              <p>
                Latest customer support activity
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

        <div className="dashboard-side">
          <div className="panel ai-overview-card">
            <div className="panel-header">
              <div>
                <div className="panel-title-row">
                  <h3>
                    AI Copilot
                  </h3>

                  <span className="live-badge">
                    <span className="live-dot" />
                    Live
                  </span>
                </div>

                <p>
                  Current AI performance
                </p>
              </div>
            </div>

            <div className="ai-overview-score">
              <div className="score-ring">
                <div>
                  <strong>
                    {resolutionRate}%
                  </strong>
                  <span>
                    AI resolution
                  </span>
                </div>
              </div>

              <div className="score-copy">
                <strong>
                  {aiResolved} tickets
                </strong>

                <span>
                  resolved without human
                  intervention
                </span>
              </div>
            </div>

            <button
              className="secondary-button"
              onClick={onOpenCopilot}
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
                  n8n processing pipeline
                </p>
              </div>

              <Workflow size={19} />
            </div>

            <div className="workflow-status">
              <div className="workflow-icon">
                <CheckCircle2
                  size={18}
                />
              </div>

              <div>
                <strong>
                  AI Ticket Processing
                </strong>

                <span>
                  Workflow configured
                </span>
              </div>

              <span className="workflow-live">
                Online
              </span>
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
                  {aiResolved}
                </strong>

                <span>
                  AI resolved
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AICopilotPage({
  tickets,
  onNewTicket,
}) {
  const total = tickets.length;

  const aiResolved =
    tickets.filter(
      (ticket) =>
        ticket.status ===
        "AI Resolved"
    ).length;

  const escalated =
    tickets.filter(
      (ticket) =>
        ticket.requiresHuman === true
    ).length;

  const grounded =
    tickets.filter(
      (ticket) =>
        Array.isArray(
          ticket.sources
        ) &&
        ticket.sources.length > 0
    ).length;

  const resolutionRate =
    total > 0
      ? Math.round(
          (aiResolved / total) * 100
        )
      : 0;

  return (
    <section className="copilot-page">
      <div className="copilot-header">
        <div>
          <span className="eyebrow">
            AI OPERATIONS
          </span>

          <h1>
            AI Copilot
          </h1>

          <p>
            Review how TicketPilot
            classifies, retrieves,
            grounds and routes customer
            requests.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={onNewTicket}
        >
          <Plus size={17} />
          Test AI pipeline
        </button>
      </div>

      <div className="copilot-status">
        <div className="status-icon">
          <CheckCircle2 size={20} />
        </div>

        <div>
          <strong>
            AI pipeline operational
          </strong>

          <span>
            Classification, RAG retrieval
            and response generation are
            connected.
          </span>
        </div>

        <span className="live-badge">
          <span className="live-dot" />
          Live
        </span>
      </div>

      <div className="copilot-stats">
        <div className="copilot-stat">
          <div className="copilot-stat-icon">
            <Bot size={18} />
          </div>

          <span>
            AI resolved
          </span>

          <strong>
            {aiResolved}
          </strong>

          <small>
            {resolutionRate}% of current
            tickets
          </small>
        </div>

        <div className="copilot-stat">
          <div className="copilot-stat-icon">
            <Database size={18} />
          </div>

          <span>
            Grounded tickets
          </span>

          <strong>
            {grounded}
          </strong>

          <small>
            Knowledge-backed responses
          </small>
        </div>

        <div className="copilot-stat">
          <div className="copilot-stat-icon">
            <Users size={18} />
          </div>

          <span>
            Human escalations
          </span>

          <strong>
            {escalated}
          </strong>

          <small>
            Requires agent attention
          </small>
        </div>

        <div className="copilot-stat">
          <div className="copilot-stat-icon">
            <Workflow size={18} />
          </div>

          <span>
            Tickets processed
          </span>

          <strong>
            {total}
          </strong>

          <small>
            Current workspace
          </small>
        </div>
      </div>

      <div className="copilot-grid">
        <div className="copilot-card pipeline-card">
          <div className="copilot-card-header">
            <div>
              <h3>
                AI processing pipeline
              </h3>

              <p>
                Each ticket passes through
                controlled processing stages.
              </p>
            </div>

            <span className="connected-label">
              <CheckCircle2 size={15} />
              Operational
            </span>
          </div>

          <div className="pipeline-flow">
            <PipelineStep
              number="01"
              icon={Bot}
              title="Classify"
              text="Category, priority and sentiment"
            />

            <div className="pipeline-line" />

            <PipelineStep
              number="02"
              icon={Database}
              title="Retrieve"
              text="Search relevant knowledge"
            />

            <div className="pipeline-line" />

            <PipelineStep
              number="03"
              icon={Sparkles}
              title="Generate"
              text="Create a grounded response"
            />

            <div className="pipeline-line" />

            <PipelineStep
              number="04"
              icon={ShieldCheck}
              title="Route"
              text="Resolve or escalate"
            />
          </div>
        </div>

        <div className="copilot-card">
          <div className="copilot-card-header">
            <div>
              <h3>
                AI guardrails
              </h3>

              <p>
                Controls around AI-generated
                support responses.
              </p>
            </div>

            <ShieldCheck size={19} />
          </div>

          <div className="guardrail-list">
            <Guardrail
              title="Knowledge-grounded"
              text="Responses use retrieved knowledge rather than unrestricted generation."
            />

            <Guardrail
              title="Relevance filtering"
              text="Retrieved content is selected before response generation."
            />

            <Guardrail
              title="Human fallback"
              text="Requests requiring support can be escalated to an agent."
            />
          </div>
        </div>
      </div>

      <div className="copilot-card recent-ai-card">
        <div className="copilot-card-header">
          <div>
            <h3>
              Recent AI decisions
            </h3>

            <p>
              Latest classification and
              routing activity.
            </p>
          </div>

          <Activity size={19} />
        </div>

        <div className="ai-decision-list">
          {tickets
            .slice(0, 6)
            .map((ticket) => (
              <div
                className="ai-decision"
                key={ticket.id}
              >
                <div className="decision-ticket">
                  <strong>
                    {ticket.id}
                  </strong>

                  <span>
                    {ticket.subject}
                  </span>
                </div>

                <span className="decision-category">
                  {ticket.category}
                </span>

                <span
                  className={
                    ticket.status ===
                    "AI Resolved"
                      ? "decision-status resolved"
                      : "decision-status escalated"
                  }
                >
                  {ticket.status ===
                  "AI Resolved"
                    ? "AI Resolved"
                    : "Needs Agent"}
                </span>
              </div>
            ))}

          {tickets.length ===
            0 && (
            <div className="empty-copilot">
              No AI decisions yet.
              Create a ticket to start
              the pipeline.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PipelineStep({
  number,
  icon: Icon,
  title,
  text,
}) {
  return (
    <div className="pipeline-step">
      <div className="pipeline-number">
        {number}
      </div>

      <div className="pipeline-step-icon">
        <Icon size={17} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function Guardrail({
  title,
  text,
}) {
  return (
    <div className="guardrail-item">
      <CheckCircle2 size={17} />

      <div>
        <strong>
          {title}
        </strong>

        <span>
          {text}
        </span>
      </div>
    </div>
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
      <div className="page-toolbar">
        <div>
          <span className="eyebrow">
            SUPPORT QUEUE
          </span>

          <h1>
            All Tickets
          </h1>

          <p>
            Review, search and manage
            customer support requests.
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

      <div className="queue-summary">
        <div>
          <span>Total</span>
          <strong>
            {totalTickets}
          </strong>
        </div>

        <div>
          <span>Showing</span>
          <strong>
            {tickets.length}
          </strong>
        </div>

        <div>
          <span>Needs Agent</span>
          <strong>
            {
              tickets.filter(
                (ticket) =>
                  ticket.status !==
                  "AI Resolved"
              ).length
            }
          </strong>
        </div>

        <div>
          <span>AI Resolved</span>
          <strong>
            {
              tickets.filter(
                (ticket) =>
                  ticket.status ===
                  "AI Resolved"
              ).length
            }
          </strong>
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

          {tickets.length ===
            0 && (
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
  const priorityClass =
    String(
      ticket.priority || ""
    ).toLowerCase();

  const statusClass =
    String(
      ticket.status || ""
    )
      .toLowerCase()
      .replaceAll(" ", "-");

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
          className={`priority ${priorityClass}`}
        >
          {ticket.priority}
        </span>
      </td>

      {detailed && (
        <td>
          <span className="sentiment">
            {ticket.sentiment ||
              "Neutral"}
          </span>
        </td>
      )}

      <td>
        <span
          className={`status ${statusClass}`}
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

function TicketResult({
  result,
}) {
  if (!result.success) {
    return (
      <div className="ticket-result error">
        <div className="result-state-icon error">
          <CircleAlert size={24} />
        </div>

        <span className="result-eyebrow">
          PROCESSING FAILED
        </span>

        <h3>
          Ticket could not be
          processed
        </h3>

        <p>
          {result.error}
        </p>

        <div className="result-error-note">
          <AlertTriangle size={15} />
          Verify that the n8n workflow
          is active and the Render
          backend is available.
        </div>
      </div>
    );
  }

  const classification =
    result.classification || {};

  const requiresHuman =
    classification.requires_human ===
    true;

  return (
    <div className="ticket-result success">
      <div
        className={`result-hero ${
          requiresHuman
            ? "escalated"
            : "resolved"
        }`}
      >
        <div className="result-state-icon">
          {requiresHuman ? (
            <Users size={24} />
          ) : (
            <CheckCircle2 size={24} />
          )}
        </div>

        <span className="result-eyebrow">
          {requiresHuman
            ? "HUMAN ESCALATION"
            : "AI RESOLUTION"}
        </span>

        <h3>
          {requiresHuman
            ? "Ticket routed to an agent"
            : "Ticket resolved by AI"}
        </h3>

        <p>
          {requiresHuman
            ? "The AI identified this request as requiring human support."
            : "The request was classified and answered using the TicketPilot knowledge pipeline."}
        </p>
      </div>

      <div className="result-grid">
        <ResultMetric
          label="Category"
          value={formatCategory(
            classification.category
          )}
        />

        <ResultMetric
          label="Priority"
          value={formatCategory(
            classification.priority
          )}
        />

        <ResultMetric
          label="Sentiment"
          value={formatCategory(
            classification.sentiment
          )}
        />

        <ResultMetric
          label="Human Required"
          value={
            requiresHuman
              ? "Yes"
              : "No"
          }
        />
      </div>

      <div className="result-answer">
        <div className="result-section-heading">
          <Sparkles size={16} />
          <span>
            AI response
          </span>

          <span className="grounded-badge">
            <ShieldCheck size={14} />
            Grounded
          </span>
        </div>

        <p>
          {result.answer ||
            "No AI response was returned."}
        </p>
      </div>

      {result.sources?.length >
        0 && (
        <div className="result-sources">
          <div className="result-section-heading">
            <Database size={16} />
            <span>
              Knowledge sources
            </span>
          </div>

          <div className="source-chips">
            {result.sources.map(
              (source) => (
                <span
                  key={source}
                >
                  <FileText
                    size={14}
                  />
                  {source}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultMetric({
  label,
  value,
}) {
  return (
    <div className="result-metric">
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function TicketDetails({
  ticket,
  onClose,
  onUpdateTicket,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftAnswer, setDraftAnswer] = useState(ticket.answer || "");

  const [sendingResponse, setSendingResponse] = useState(false);

  const handleApprove = async () => {
    if (sendingResponse) {
      return;
    }

    setSendingResponse(true);

    try {
      const response = await axios.post(
        "https://saish2005.app.n8n.cloud/webhook/ticketpilot/send-response",
        {
          ticketId: ticket.id,
          customerIssue: ticket.description,
          response: ticket.answer,
          action: "approve",
        }
      );

      if (!response.data?.success) {
        throw new Error("Customer response was not accepted by n8n.");
      }

      onUpdateTicket(ticket.id, {
        status: "Resolved",
        requiresHuman: false,
        reviewAction: "Approved AI response",
        reviewedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to send approved response:", error);
      alert("Failed to send the customer response. Please try again.");
    } finally {
      setSendingResponse(false);
    }
  };

  const handleEditAndSend = async () => {
    const trimmedAnswer = draftAnswer.trim();

    if (!trimmedAnswer || sendingResponse) {
      return;
    }

    setSendingResponse(true);

    try {
      const response = await axios.post(
        "https://saish2005.app.n8n.cloud/webhook/ticketpilot/send-response",
        {
          ticketId: ticket.id,
          customerIssue: ticket.description,
          response: trimmedAnswer,
          action: "edit",
        }
      );

      if (!response.data?.success) {
        throw new Error("Customer response was not accepted by n8n.");
      }

      onUpdateTicket(ticket.id, {
        answer: trimmedAnswer,
        status: "Resolved",
        requiresHuman: false,
        reviewAction: "Edited and approved response",
        reviewedAt: new Date().toISOString(),
      });

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to send edited response:", error);
      alert("Failed to send the customer response. Please try again.");
    } finally {
      setSendingResponse(false);
    }
  };

  const handleTakeOver = () => {
    onUpdateTicket(ticket.id, {
      status: "In Progress",
      requiresHuman: true,
      reviewAction: "Agent takeover",
      reviewedAt: new Date().toISOString(),
    });
  };

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
              icon={
                AlertTriangle
              }
              label="Priority"
              value={
                ticket.priority
              }
            />

            <DetailCard
              icon={
                MessageSquare
              }
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

            {isEditing ? (
              <div>
                <textarea
                  value={draftAnswer}
                  onChange={(event) =>
                    setDraftAnswer(event.target.value)
                  }
                  rows={7}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid #dce2eb",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    lineHeight: 1.6,
                    resize: "vertical",
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    className="cancel-button"
                    onClick={() => {
                      setDraftAnswer(ticket.answer || "");
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    onClick={handleEditAndSend}
                    disabled={!draftAnswer.trim()}
                  >
                    <Send size={15} />
                    Edit & Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="detail-box ai-response-box">
                {ticket.answer ||
                  "No AI response available."}
              </div>
            )}
          </div>

          {ticket.requiresHuman && !isEditing && (
            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                border: "1px solid #e8ebf1",
                borderRadius: "12px",
                background: "#fafbfc",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: 700,
                  color: "#172033",
                  marginBottom: "6px",
                }}
              >
                <UserRound size={16} />
                Human Review Required
              </div>

              <p
                style={{
                  margin: 0,
                  color: "#71809a",
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                Review the AI-generated response before resolving this ticket.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginTop: "12px",
                }}
              >
                <button
                  className="primary-button"
                  onClick={handleApprove}
                >
                  <CheckCircle2 size={15} />
                  Approve & Send
                </button>

                <button
                  className="secondary-button"
                  onClick={() => {
                    setDraftAnswer(ticket.answer || "");
                    setIsEditing(true);
                  }}
                >
                  <MessageSquare size={15} />
                  Edit Response
                </button>

                <button
                  className="cancel-button"
                  onClick={handleTakeOver}
                >
                  <UserRound size={15} />
                  Take Over Manually
                </button>
              </div>
            </div>
          )}

          {ticket.reviewAction && (
            <div
              style={{
                marginTop: "12px",
                color: "#71809a",
                fontSize: "12px",
              }}
            >
              Review action: <strong>{ticket.reviewAction}</strong>
              {ticket.reviewedAt
                ? ` · ${formatDate(ticket.reviewedAt)}`
                : ""}
            </div>
          )}

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

          {ticket
            .retrievedDocuments
            ?.length > 0 && (
            <div className="detail-section">
              <div className="detail-section-title">
                <Database
                  size={17}
                />
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
      <div className="empty-icon">
        <Ticket size={24} />
      </div>

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
        "Support performance, AI resolution and SLA analytics.",
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
        "Configure your TicketPilot workspace.",
    },
  };

  const info =
    pageInfo[page] || {
      icon: Settings,
      title: page,
      text:
        "Manage your TicketPilot workspace.",
    };

  const Icon = info.icon;

  return (
    <section className="placeholder-page">
      <div className="placeholder-card">
        <div className="placeholder-icon">
          <Icon size={28} />
        </div>

        <span className="eyebrow">
          WORKSPACE MODULE
        </span>

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
            <Database size={15} />
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

function getNextTicketId(
  tickets
) {
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

function getPageDescription(
  page
) {
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

function formatCategory(
  value
) {
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