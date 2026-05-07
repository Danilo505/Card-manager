import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  Search,
  Trash2,
  Pencil,
  Wallet,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  X,
  CalendarDays,
  Clock3,
  ShieldAlert,
  LayoutDashboard,
  ListChecks,
  BarChart3,
  UserRound,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

function Card({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ className = "", children }) {
  return <div className={className}>{children}</div>;
}

function Button({
  className = "",
  children,
  type = "button",
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const STORAGE_KEY = "organizador-cartoes-v1";

const CHART_COLORS = [
  "#2563eb",
  "#22c55e",
  "#f97316",
  "#a855f7",
  "#ef4444",
  "#06b6d4",
  "#eab308",
  "#ec4899",
];

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(dateString, amount) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, day);
  return toISODate(date);
}

function monthKey(dateString) {
  return dateString.slice(0, 7);
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatDateBR(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function getNextDueDate(card) {
  if (card.dueDate) return card.dueDate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let year = today.getFullYear();
  let month = today.getMonth();

  let day = Math.min(Number(card.dueDay || 1), daysInMonth(year, month));
  let dueDate = new Date(year, month, day);

  if (dueDate < today) {
    month += 1;

    if (month > 11) {
      month = 0;
      year += 1;
    }

    day = Math.min(Number(card.dueDay || 1), daysInMonth(year, month));
    dueDate = new Date(year, month, day);
  }

  return toISODate(dueDate);
}

function daysUntil(dateString) {
  if (!dateString) return 0;

  const [year, month, day] = dateString.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function sumBy(items, getKey) {
  const map = new Map();

  for (const item of items) {
    const key = getKey(item) || "Sem informação";
    map.set(key, (map.get(key) || 0) + Number(item.amount || 0));
  }

  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }))
    .sort((a, b) => b.value - a.value);
}

const initialData = readStorage() || {
  cards: [
    {
      id: uid(),
      name: "Nubank",
      limit: 5000,
      color: "from-violet-500 to-fuchsia-500",
      dueDay: 7,
      dueDate: "",
    },
    {
      id: uid(),
      name: "Inter",
      limit: 3000,
      color: "from-orange-500 to-amber-400",
      dueDay: 10,
      dueDate: "",
    },
  ],
  transactions: [],
};

const categories = [
  "Mercado",
  "Transporte",
  "Restaurante",
  "Assinatura",
  "Casa",
  "Estudo",
  "Saúde",
  "Lazer",
  "Outros",
];

const cardGradients = [
  "from-violet-500 to-fuchsia-500",
  "from-blue-500 to-cyan-400",
  "from-emerald-500 to-teal-400",
  "from-orange-500 to-amber-400",
  "from-rose-500 to-red-400",
  "from-slate-600 to-slate-400",
];

export default function App() {
  const [cards, setCards] = useState(() =>
    initialData.cards.map((card) => ({
      ...card,
      dueDay: card.dueDay || 1,
      dueDate: card.dueDate || "",
    }))
  );

  const [transactions, setTransactions] = useState(() =>
    initialData.transactions.map((transaction) => ({
      ...transaction,
      purchaseDate: transaction.purchaseDate || transaction.dueDate || "",
      responsible: transaction.responsible || "",
    }))
  );

  const [selectedMonth, setSelectedMonth] = useState(() =>
    toISODate(new Date()).slice(0, 7)
  );
  const [query, setQuery] = useState("");
  const [cardFilter, setCardFilter] = useState("all");
  const [responsibleFilter, setResponsibleFilter] = useState("all");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");

  function persist(nextCards, nextTransactions) {
    writeStorage({ cards: nextCards, transactions: nextTransactions });
  }

  function updateTransactions(nextTransactions) {
    setTransactions(nextTransactions);
    persist(cards, nextTransactions);
  }

  function updateCards(nextCards) {
    setCards(nextCards);
    persist(nextCards, transactions);
  }

  const monthOptions = useMemo(() => {
    const keys = new Set([selectedMonth, toISODate(new Date()).slice(0, 7)]);

    for (const item of transactions) {
      keys.add(monthKey(item.dueDate));
    }

    return [...keys].sort();
  }, [transactions, selectedMonth]);

  const responsibleOptions = useMemo(() => {
    const names = new Set();

    for (const item of transactions) {
      if (item.responsible?.trim()) {
        names.add(item.responsible.trim());
      }
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((item) => monthKey(item.dueDate) === selectedMonth)
      .filter((item) => cardFilter === "all" || item.cardId === cardFilter)
      .filter(
        (item) =>
          responsibleFilter === "all" ||
          (item.responsible || "Sem responsável") === responsibleFilter
      )
      .filter((item) => {
        const text = `${item.description} ${item.category} ${item.responsible}`.toLowerCase();
        return text.includes(query.toLowerCase());
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [transactions, selectedMonth, cardFilter, responsibleFilter, query]);

  const summary = useMemo(() => {
    const monthTransactions = transactions.filter(
      (item) => monthKey(item.dueDate) === selectedMonth
    );

    const total = monthTransactions.reduce(
      (acc, item) => acc + Number(item.amount),
      0
    );

    const paid = monthTransactions
      .filter((item) => item.status === "paid")
      .reduce((acc, item) => acc + Number(item.amount), 0);

    const open = total - paid;

    const installmentGroups = new Set(
      monthTransactions
        .filter((item) => item.groupId)
        .map((item) => item.groupId)
    ).size;

    return {
      total,
      paid,
      open,
      count: monthTransactions.length,
      installmentGroups,
    };
  }, [transactions, selectedMonth]);

  const cardUsage = useMemo(() => {
    return cards.map((card) => {
      const invoiceTotal = transactions
        .filter(
          (item) =>
            item.cardId === card.id && monthKey(item.dueDate) === selectedMonth
        )
        .reduce((acc, item) => acc + Number(item.amount), 0);

      const usedLimit = transactions
        .filter((item) => item.cardId === card.id && item.status !== "paid")
        .reduce((acc, item) => acc + Number(item.amount), 0);

      const availableLimit = Math.max(Number(card.limit || 0) - usedLimit, 0);

      const usagePercent =
        Number(card.limit || 0) > 0
          ? Math.min(100, (usedLimit / Number(card.limit || 0)) * 100)
          : 0;

      const nextDueDate = getNextDueDate(card);

      const openTransactions = transactions.filter(
        (item) => item.cardId === card.id && item.status !== "paid"
      ).length;

      const isOverLimit = usedLimit > Number(card.limit || 0);

      return {
        ...card,
        invoiceTotal,
        usedLimit,
        availableLimit,
        usagePercent,
        nextDueDate,
        daysToDue: daysUntil(nextDueDate),
        openTransactions,
        isOverLimit,
      };
    });
  }, [cards, transactions, selectedMonth]);

  const dueDashboard = useMemo(() => {
    return cardUsage
      .slice()
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  }, [cardUsage]);

  const chartData = useMemo(() => {
    const monthTransactions = transactions.filter(
      (item) => monthKey(item.dueDate) === selectedMonth
    );

    const byResponsible = sumBy(
      monthTransactions,
      (item) => item.responsible || "Sem responsável"
    );

    const byCategory = sumBy(monthTransactions, (item) => item.category);

    const byCard = sumBy(monthTransactions, (item) => {
      const card = cards.find((card) => card.id === item.cardId);
      return card?.name || "Cartão removido";
    });

    const monthlyMap = new Map();

    for (const item of transactions) {
      const key = monthKey(item.dueDate);
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(item.amount || 0));
    }

    const monthlyEvolution = [...monthlyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, value]) => ({
        month,
        name: monthLabel(month).replace(" de ", "/"),
        value: Math.round(value * 100) / 100,
      }));

    return {
      byResponsible,
      byCategory,
      byCard,
      monthlyEvolution,
    };
  }, [transactions, selectedMonth, cards]);

  function saveTransaction(form) {
    const amount = Number(form.amount);
    const installments = Math.max(1, Number(form.installments));
    const perInstallment = Math.round((amount / installments) * 100) / 100;

    if (editingTransaction) {
      const next = transactions.map((item) =>
        item.id === editingTransaction.id
          ? {
              ...item,
              description: form.description,
              responsible: form.responsible,
              amount: Number(form.amount),
              cardId: form.cardId,
              category: form.category,
              dueDate: form.dueDate,
              purchaseDate: form.purchaseDate,
              status: form.status,
              notes: form.notes,
            }
          : item
      );

      updateTransactions(next);
      setEditingTransaction(null);
      setShowTransactionModal(false);
      return;
    }

    const selectedCard = cards.find((card) => card.id === form.cardId);

    const firstInstallmentDate = selectedCard
      ? getNextDueDate(selectedCard)
      : form.purchaseDate || toISODate(new Date());

    const groupId = installments > 1 ? uid() : null;

    const created = Array.from({ length: installments }).map((_, index) => ({
      id: uid(),
      groupId,
      description: form.description,
      responsible: form.responsible,
      amount:
        index === installments - 1
          ? Math.round((amount - perInstallment * (installments - 1)) * 100) /
            100
          : perInstallment,
      cardId: form.cardId,
      category: form.category,
      dueDate: addMonths(firstInstallmentDate, index),
      purchaseDate: form.purchaseDate,
      installmentNumber: index + 1,
      installments,
      status: "open",
      notes: form.notes,
      createdAt: new Date().toISOString(),
    }));

    updateTransactions([...transactions, ...created]);
    setShowTransactionModal(false);
  }

  function saveCard(form) {
    const normalizedDueDay = Math.min(
      31,
      Math.max(1, Number(form.dueDay || 1))
    );

    const normalizedDueDate = form.dueDate || "";

    if (editingCard) {
      const next = cards.map((card) =>
        card.id === editingCard.id
          ? {
              ...card,
              name: form.name,
              limit: Number(form.limit || 0),
              color: form.color,
              dueDay: normalizedDueDay,
              dueDate: normalizedDueDate,
            }
          : card
      );

      updateCards(next);
      setEditingCard(null);
      setShowCardModal(false);
      return;
    }

    const next = [
      ...cards,
      {
        id: uid(),
        name: form.name,
        limit: Number(form.limit || 0),
        color: form.color,
        dueDay: normalizedDueDay,
        dueDate: normalizedDueDate,
      },
    ];

    updateCards(next);
    setShowCardModal(false);
  }

  function removeCard(cardId) {
    const hasTransactions = transactions.some((item) => item.cardId === cardId);

    if (hasTransactions) {
      alert(
        "Este cartão possui compras cadastradas. Exclua ou edite essas compras antes de remover o cartão."
      );
      return;
    }

    updateCards(cards.filter((card) => card.id !== cardId));
  }

  function removeTransaction(id) {
    updateTransactions(transactions.filter((item) => item.id !== id));
  }

  function togglePaid(id) {
    updateTransactions(
      transactions.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "paid" ? "open" : "paid" }
          : item
      )
    );
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ cards, transactions }, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "organizador-cartoes.json";
    a.click();

    URL.revokeObjectURL(url);
  }

  function importJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));

        if (!Array.isArray(data.cards) || !Array.isArray(data.transactions)) {
          return;
        }

        const normalizedCards = data.cards.map((card) => ({
          ...card,
          dueDay: card.dueDay || 1,
          dueDate: card.dueDate || "",
        }));

        const normalizedTransactions = data.transactions.map((transaction) => ({
          ...transaction,
          purchaseDate: transaction.purchaseDate || transaction.dueDate || "",
          responsible: transaction.responsible || "",
        }));

        setCards(normalizedCards);
        setTransactions(normalizedTransactions);
        writeStorage({
          cards: normalizedCards,
          transactions: normalizedTransactions,
        });
      } catch {
        return;
      }
    };

    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/3 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute top-64 -left-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 backdrop-blur">
                <CreditCard className="h-4 w-4" />
                Controle moderno de cartões
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Organizador de Cartões
              </h1>

              <p className="mt-3 max-w-2xl text-slate-400">
                Cadastre compras à vista ou parceladas. O sistema cria as
                parcelas automaticamente com base no vencimento do cartão.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setEditingCard(null);
                  setShowCardModal(true);
                }}
                className="rounded-2xl bg-white/10 hover:bg-white/15"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Novo cartão
              </Button>

              <Button
                onClick={() => setShowTransactionModal(true)}
                className="rounded-2xl bg-blue-600 hover:bg-blue-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova compra
              </Button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur">
            <NavButton
              active={activeView === "dashboard"}
              onClick={() => setActiveView("dashboard")}
              icon={LayoutDashboard}
              label="Dashboard"
            />

            <NavButton
              active={activeView === "cards"}
              onClick={() => setActiveView("cards")}
              icon={CreditCard}
              label="Cartões"
            />

            <NavButton
              active={activeView === "transactions"}
              onClick={() => setActiveView("transactions")}
              icon={ListChecks}
              label="Compras"
            />

            <NavButton
              active={activeView === "charts"}
              onClick={() => setActiveView("charts")}
              icon={BarChart3}
              label="Gráficos"
            />
          </nav>
        </header>

        <AnimatePresence mode="wait">
          {activeView === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              <SummarySection summary={summary} />

              <DashboardSection
                dueDashboard={dueDashboard}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
              />
            </motion.div>
          )}

          {activeView === "cards" && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              <SectionHeader
                badge="Cartões"
                title="Meus cartões"
                description="Veja limite usado, limite disponível, vencimento e fatura mensal de cada cartão."
                icon={CreditCard}
              />

              <CardsSection
                cardUsage={cardUsage}
                setEditingCard={setEditingCard}
                setShowCardModal={setShowCardModal}
                removeCard={removeCard}
              />
            </motion.div>
          )}

          {activeView === "transactions" && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              <TransactionsSection
                query={query}
                setQuery={setQuery}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                monthOptions={monthOptions}
                cardFilter={cardFilter}
                setCardFilter={setCardFilter}
                responsibleFilter={responsibleFilter}
                setResponsibleFilter={setResponsibleFilter}
                responsibleOptions={responsibleOptions}
                cards={cards}
                filteredTransactions={filteredTransactions}
                togglePaid={togglePaid}
                removeTransaction={removeTransaction}
                setEditingTransaction={setEditingTransaction}
                setShowTransactionModal={setShowTransactionModal}
                exportJSON={exportJSON}
                importJSON={importJSON}
              />
            </motion.div>
          )}

          {activeView === "charts" && (
            <motion.div
              key="charts"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
            >
              <ChartsSection
                chartData={chartData}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showTransactionModal && (
          <TransactionModal
            cards={cards}
            transaction={editingTransaction}
            onClose={() => {
              setShowTransactionModal(false);
              setEditingTransaction(null);
            }}
            onSave={saveTransaction}
          />
        )}

        {showCardModal && (
          <CardModal
            card={editingCard}
            onClose={() => {
              setShowCardModal(false);
              setEditingCard(null);
            }}
            onSave={saveCard}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function SectionHeader({ badge, title, description, icon: Icon }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur md:p-6">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
        <Icon className="h-4 w-4" />
        {badge}
      </div>

      <h2 className="text-2xl font-bold">{title}</h2>

      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </section>
  );
}

function SummarySection({ summary }) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <MetricCard
        icon={Wallet}
        title="Fatura do mês"
        value={BRL.format(summary.total)}
        subtitle={`${summary.count} lançamentos`}
      />

      <MetricCard
        icon={AlertCircle}
        title="Em aberto"
        value={BRL.format(summary.open)}
        subtitle="Ainda não pago"
      />

      <MetricCard
        icon={CheckCircle2}
        title="Pago"
        value={BRL.format(summary.paid)}
        subtitle="Baixado no mês"
      />

      <MetricCard
        icon={Receipt}
        title="Parcelamentos"
        value={summary.installmentGroups}
        subtitle="Compras parceladas ativas"
      />
    </section>
  );
}

function DashboardSection({ dueDashboard, selectedMonth, setSelectedMonth }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <CalendarDays className="h-4 w-4" />
            Agenda financeira
          </div>

          <h2 className="text-xl font-bold">Dashboard de vencimentos</h2>

          <p className="text-sm text-slate-400">
            Veja os próximos vencimentos, a fatura do mês e o limite disponível
            de cada cartão.
          </p>
        </div>

        <MonthPicker
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {dueDashboard.map((card) => (
          <Card
            key={`due-${card.id}`}
            className="rounded-3xl border border-white/10 bg-white/[0.03] text-white shadow-xl"
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{card.name}</p>
                  <p className="text-sm text-slate-400">
                    {card.dueDate
                      ? "Data definida manualmente"
                      : `Vencimento todo dia ${String(
                          card.dueDay || 1
                        ).padStart(2, "0")}`}
                  </p>
                </div>

                <DueBadge days={card.daysToDue} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <InfoBox
                  title="Próximo vencimento"
                  value={formatDateBR(card.nextDueDate)}
                />

                <InfoBox
                  title="Fatura do mês"
                  value={BRL.format(card.invoiceTotal)}
                />

                <InfoBox
                  title="Limite disponível"
                  value={BRL.format(card.availableLimit)}
                  valueClassName={
                    card.availableLimit <= 0
                      ? "text-red-300"
                      : "text-emerald-300"
                  }
                />

                <InfoBox title="Itens em aberto" value={card.openTransactions} />
              </div>

              {card.isOverLimit && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <ShieldAlert className="h-4 w-4" />
                  Este cartão ultrapassou o limite cadastrado.
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function MonthPicker({ selectedMonth, setSelectedMonth }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <p className="mb-2 text-xs text-slate-500">Mês selecionado</p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setSelectedMonth(addMonths(`${selectedMonth}-01`, -1).slice(0, 7))
          }
          className="h-10 rounded-xl bg-white/10 px-3 text-sm hover:bg-white/15"
        >
          ←
        </button>

        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-black/30 px-3 text-sm font-semibold text-white outline-none ring-blue-500/40 focus:ring-2"
        />

        <button
          type="button"
          onClick={() =>
            setSelectedMonth(addMonths(`${selectedMonth}-01`, 1).slice(0, 7))
          }
          className="h-10 rounded-xl bg-white/10 px-3 text-sm hover:bg-white/15"
        >
          →
        </button>
      </div>
    </div>
  );
}

function CardsSection({
  cardUsage,
  setEditingCard,
  setShowCardModal,
  removeCard,
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {cardUsage.map((card) => (
        <motion.div key={card.id} layout>
          <Card className="overflow-hidden rounded-3xl border-white/10 bg-white/[0.04] text-white shadow-2xl backdrop-blur">
            <CardContent className="p-5">
              <div
                className={`mb-5 rounded-3xl bg-gradient-to-br ${card.color} p-5 shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <CreditCard className="h-7 w-7" />
                  <span className="text-sm opacity-80">Crédito</span>
                </div>

                <div className="mt-8 text-xl font-semibold">{card.name}</div>

                <div className="mt-1 text-sm opacity-80">
                  Limite {BRL.format(card.limit)}
                </div>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-400">Limite usado</p>

                  <p className="text-2xl font-bold">
                    {BRL.format(card.usedLimit)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Fatura do mês: {BRL.format(card.invoiceTotal)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Disponível
                  </p>

                  <p
                    className={`text-lg font-semibold ${
                      card.availableLimit <= 0
                        ? "text-red-300"
                        : "text-emerald-300"
                    }`}
                  >
                    {BRL.format(card.availableLimit)}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className={`h-2 rounded-full ${
                    card.isOverLimit ? "bg-red-300" : "bg-white"
                  }`}
                  style={{ width: `${card.usagePercent}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Usado {BRL.format(card.usedLimit)}</span>
                <span>Total {BRL.format(card.limit)}</span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-slate-300">
                  <Clock3 className="h-3.5 w-3.5" />
                  Vence em {formatDateBR(card.nextDueDate)}
                </span>

                <span className="text-slate-400">
                  {card.daysToDue === 0
                    ? "vence hoje"
                    : card.daysToDue < 0
                    ? `${Math.abs(card.daysToDue)} dias atrasado`
                    : `${card.daysToDue} dias`}
                </span>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  onClick={() => {
                    setEditingCard(card);
                    setShowCardModal(true);
                  }}
                  className="flex-1 rounded-2xl bg-white/10 text-white hover:bg-white/15"
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>

                <Button
                  onClick={() => removeCard(card.id)}
                  className="rounded-2xl bg-red-500/10 text-red-300 hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </section>
  );
}

function TransactionsSection({
  query,
  setQuery,
  selectedMonth,
  setSelectedMonth,
  monthOptions,
  cardFilter,
  setCardFilter,
  responsibleFilter,
  setResponsibleFilter,
  responsibleOptions,
  cards,
  filteredTransactions,
  togglePaid,
  removeTransaction,
  setEditingTransaction,
  setShowTransactionModal,
  exportJSON,
  importJSON,
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur md:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
            <ListChecks className="h-4 w-4" />
            Compras
          </div>

          <h2 className="text-xl font-bold">Compras e parcelas</h2>

          <p className="text-sm text-slate-400">
            Visualize a fatura por mês, cartão, categoria, descrição ou responsável.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar compra..."
              className="h-11 rounded-2xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm outline-none ring-blue-500/40 focus:ring-2"
            />
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm outline-none ring-blue-500/40 focus:ring-2"
          >
            {monthOptions.map((key) => (
              <option key={key} value={key} className="bg-slate-950">
                {monthLabel(key)}
              </option>
            ))}
          </select>

          <select
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm outline-none ring-blue-500/40 focus:ring-2"
          >
            <option value="all" className="bg-slate-950">
              Todos os cartões
            </option>

            {cards.map((card) => (
              <option key={card.id} value={card.id} className="bg-slate-950">
                {card.name}
              </option>
            ))}
          </select>

          <select
            value={responsibleFilter}
            onChange={(e) => setResponsibleFilter(e.target.value)}
            className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm outline-none ring-blue-500/40 focus:ring-2"
          >
            <option value="all" className="bg-slate-950">
              Todos responsáveis
            </option>

            {responsibleOptions.map((name) => (
              <option key={name} value={name} className="bg-slate-950">
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Button
          onClick={exportJSON}
          className="rounded-2xl bg-white/10 text-white hover:bg-white/15"
        >
          <Download className="mr-2 h-4 w-4" />
          Exportar
        </Button>

        <label className="inline-flex h-10 cursor-pointer items-center rounded-2xl bg-white/10 px-4 text-sm font-medium hover:bg-white/15">
          <Upload className="mr-2 h-4 w-4" />
          Importar

          <input
            type="file"
            accept="application/json"
            onChange={importJSON}
            className="hidden"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3">Compra</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Responsável</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Cartão</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Parcela</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>

          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan="10"
                  className="px-4 py-12 text-center text-slate-400"
                >
                  Nenhuma compra encontrada para este mês.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((item) => {
                const card = cards.find((card) => card.id === item.cardId);

                return (
                  <tr
                    key={item.id}
                    className="border-t border-white/10 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-slate-300">
                      {formatDateBR(item.purchaseDate || item.dueDate)}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {formatDateBR(item.dueDate)}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                        <UserRound className="h-3.5 w-3.5" />
                        {item.responsible || "Sem responsável"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{item.description}</div>

                      {item.notes && (
                        <div className="text-xs text-slate-500">
                          {item.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {card?.name || "Removido"}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {item.category}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {item.installments > 1
                        ? `${item.installmentNumber}/${item.installments}`
                        : "À vista"}
                    </td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {BRL.format(item.amount)}
                    </td>

                    <td className="px-4 py-3">
                      <button
                        onClick={() => togglePaid(item.id)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.status === "paid"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {item.status === "paid" ? "Pago" : "Aberto"}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingTransaction(item);
                            setShowTransactionModal(true);
                          }}
                          className="rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => removeTransaction(item.id)}
                          className="rounded-xl p-2 text-slate-300 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ChartsSection({ chartData, selectedMonth, setSelectedMonth }) {
  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              <BarChart3 className="h-4 w-4" />
              Gráficos
            </div>

            <h2 className="text-2xl font-bold">Análise dos gastos</h2>

            <p className="mt-1 text-sm text-slate-400">
              Veja os gastos por responsável, cartão, categoria e evolução mensal.
            </p>
          </div>

          <MonthPicker
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Gastos por responsável" description="Baseado no mês selecionado.">
          <BarChartBlock data={chartData.byResponsible} />
        </ChartCard>

        <ChartCard title="Gastos por cartão" description="Baseado no mês selecionado.">
          <BarChartBlock data={chartData.byCard} />
        </ChartCard>

        <ChartCard title="Gastos por categoria" description="Baseado no mês selecionado.">
          <PieChartBlock data={chartData.byCategory} />
        </ChartCard>

        <ChartCard title="Evolução mensal" description="Últimos meses com compras cadastradas.">
          <LineChartBlock data={chartData.monthlyEvolution} />
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <Card className="rounded-3xl border border-white/10 bg-white/[0.04] text-white shadow-2xl backdrop-blur">
      <CardContent className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-500">
      Sem dados para exibir.
    </div>
  );
}

function BarChartBlock({ data }) {
  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              background: "#0B1020",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              color: "#fff",
            }}
            formatter={(value) => BRL.format(value)}
          />
          <Bar dataKey="value" radius={[12, 12, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PieChartBlock({ data }) {
  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={3}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "#0B1020",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              color: "#fff",
            }}
            formatter={(value) => BRL.format(value)}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function LineChartBlock({ data }) {
  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: "#0B1020",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              color: "#fff",
            }}
            formatter={(value) => BRL.format(value)}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, subtitle }) {
  return (
    <Card className="rounded-3xl border-white/10 bg-white/[0.04] text-white shadow-2xl backdrop-blur">
      <CardContent className="p-5">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
          <Icon className="h-5 w-5" />
        </div>

        <p className="text-sm text-slate-400">{title}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function InfoBox({ title, value, valueClassName = "" }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <p className="text-xs text-slate-500">{title}</p>
      <p className={`mt-1 text-lg font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function DueBadge({ days }) {
  let className = "bg-blue-500/10 text-blue-300";
  let label = `${days} dias`;

  if (days < 0) {
    className = "bg-red-500/10 text-red-300";
    label = `${Math.abs(days)} dias atrasado`;
  } else if (days === 0) {
    className = "bg-red-500/10 text-red-300";
    label = "vence hoje";
  } else if (days <= 3) {
    className = "bg-red-500/10 text-red-300";
  } else if (days <= 7) {
    className = "bg-amber-500/10 text-amber-300";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${className}`}
    >
      <Clock3 className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function TransactionModal({ cards, transaction, onClose, onSave }) {
  const [form, setForm] = useState({
    description: transaction?.description || "",
    responsible: transaction?.responsible || "",
    amount: transaction?.amount || "",
    cardId: transaction?.cardId || cards[0]?.id || "",
    category: transaction?.category || "Outros",
    dueDate: transaction?.dueDate || "",
    purchaseDate:
      transaction?.purchaseDate || transaction?.dueDate || toISODate(new Date()),
    installments: transaction?.installments || 1,
    status: transaction?.status || "open",
    notes: transaction?.notes || "",
  });

  const selectedCard = cards.find((card) => card.id === form.cardId);
  const automaticDueDate = selectedCard ? getNextDueDate(selectedCard) : "";

  function submit(event) {
    event.preventDefault();

    if (!form.description.trim() || !Number(form.amount) || !form.cardId) {
      return;
    }

    if (transaction && !form.dueDate) {
      return;
    }

    onSave(form);
  }

  return (
    <ModalShell
      title={transaction ? "Editar parcela" : "Nova compra"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Descrição"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
            placeholder="Ex: Amazon - Monitor"
          />

          <Input
            label="Responsável"
            value={form.responsible}
            onChange={(value) => setForm({ ...form, responsible: value })}
            placeholder="Ex: Pai, Sogra, Eu"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={transaction ? "Valor da parcela" : "Valor total"}
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(value) => setForm({ ...form, amount: value })}
            placeholder="1200,00"
          />

          <Input
            label="Data da compra"
            type="date"
            value={form.purchaseDate}
            onChange={(value) => setForm({ ...form, purchaseDate: value })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Cartão"
            value={form.cardId}
            onChange={(value) => setForm({ ...form, cardId: value })}
          >
            {cards.map((card) => (
              <option key={card.id} value={card.id} className="bg-slate-950">
                {card.name}
              </option>
            ))}
          </Select>

          <Select
            label="Categoria"
            value={form.category}
            onChange={(value) => setForm({ ...form, category: value })}
          >
            {categories.map((category) => (
              <option key={category} value={category} className="bg-slate-950">
                {category}
              </option>
            ))}
          </Select>
        </div>

        {!transaction && (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            <p className="font-medium">Vencimento calculado automaticamente</p>
            <p className="mt-1 text-blue-200/80">
              A primeira parcela será lançada em{" "}
              <strong>{formatDateBR(automaticDueDate)}</strong>, usando o
              vencimento definido no cartão selecionado.
            </p>
          </div>
        )}

        {transaction && (
          <Input
            label="Data de vencimento da parcela"
            type="date"
            value={form.dueDate}
            onChange={(value) => setForm({ ...form, dueDate: value })}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Número de parcelas"
            type="number"
            min="1"
            disabled={Boolean(transaction)}
            value={form.installments}
            onChange={(value) => setForm({ ...form, installments: value })}
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(value) => setForm({ ...form, status: value })}
          >
            <option value="open" className="bg-slate-950">
              Aberto
            </option>
            <option value="paid" className="bg-slate-950">
              Pago
            </option>
          </Select>
        </div>

        <Input
          label="Observações"
          value={form.notes}
          onChange={(value) => setForm({ ...form, notes: value })}
          placeholder="Opcional"
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-white/10 text-white hover:bg-white/15"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            className="rounded-2xl bg-blue-600 hover:bg-blue-500"
          >
            Salvar
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function CardModal({ card, onClose, onSave }) {
  const [form, setForm] = useState({
    name: card?.name || "",
    limit: card?.limit || "",
    color: card?.color || cardGradients[0],
    dueDay: card?.dueDay || 1,
    dueDate: card?.dueDate || "",
  });

  function submit(event) {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    onSave(form);
  }

  return (
    <ModalShell title={card ? "Editar cartão" : "Novo cartão"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Nome do cartão"
          value={form.name}
          onChange={(value) => setForm({ ...form, name: value })}
          placeholder="Ex: Itaú Click"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Limite"
            type="number"
            step="0.01"
            value={form.limit}
            onChange={(value) => setForm({ ...form, limit: value })}
            placeholder="5000"
          />

          <Input
            label="Data do próximo vencimento"
            type="date"
            value={form.dueDate}
            onChange={(value) => {
              const day = value ? Number(value.split("-")[2]) : form.dueDay;
              setForm({
                ...form,
                dueDate: value,
                dueDay: day,
              });
            }}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-slate-300">
            Como funciona o vencimento
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Ao cadastrar uma compra, o sistema usa esta data para calcular
            automaticamente a primeira parcela. As próximas parcelas são lançadas
            nos meses seguintes.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-300">Cor</label>

          <div className="grid grid-cols-3 gap-3">
            {cardGradients.map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setForm({ ...form, color })}
                className={`h-12 rounded-2xl bg-gradient-to-br ${color} ${
                  form.color === color ? "ring-2 ring-white" : ""
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-white/10 text-white hover:bg-white/15"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            className="rounded-2xl bg-blue-600 hover:bg-blue-500"
          >
            {card ? "Salvar alterações" : "Criar cartão"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.96, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 20, opacity: 0 }}
        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0B1020] p-5 text-white shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {children}
      </motion.div>
    </motion.div>
  );
}

function Input({ label, value, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm outline-none ring-blue-500/40 placeholder:text-slate-600 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
        {...props}
      />
    </label>
  );
}

function Select({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-slate-300">{label}</span>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm outline-none ring-blue-500/40 focus:ring-2"
      >
        {children}
      </select>
    </label>
  );
}