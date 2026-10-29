import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Cloud,
  Coffee,
  Heart,
  Leaf,
  LockKeyhole,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Wind,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { auth, db, firebaseEnabled } from "./firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const MOODS = [
  { key: "great", label: "Great", emoji: "😄", score: 5, color: "#b7cc9d" },
  { key: "good", label: "Good", emoji: "🙂", score: 4, color: "#c9d6ad" },
  { key: "okay", label: "Okay", emoji: "😐", score: 3, color: "#e8d69c" },
  { key: "low", label: "Low", emoji: "😔", score: 2, color: "#e8b897" },
  { key: "tough", label: "Tough", emoji: "😣", score: 1, color: "#dca6a0" },
];
const PROMPTS = [
  "What felt like a small win today?",
  "What has been taking up space in your mind?",
  "What would you like to give yourself credit for?",
  "What is one thing you want to make room for tomorrow?",
];
const starterEntries = [
  {
    id: "demo-1",
    title: "A slower start",
    body: "I gave myself time to make breakfast and sit by the window before checking my messages. It felt good to begin the day without rushing.",
    mood: "good",
    tags: ["rest", "routines"],
    date: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "demo-2",
    title: "Finding my rhythm",
    body: "The afternoon felt scattered, but a short walk helped me reset. I do not have to solve everything at once.",
    mood: "okay",
    tags: ["movement", "studies"],
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];
const storageKey = "mindmate-data-v1";
const formatDate = (date, options = { month: "short", day: "numeric" }) =>
  new Intl.DateTimeFormat("en", options).format(new Date(date));
const getMood = (key) => MOODS.find((mood) => mood.key === key);

function loadDemoData() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    if (parsed && Array.isArray(parsed.entries) && Array.isArray(parsed.moods))
      return parsed;
  } catch {
    /* use a clean demo state */
  }
  return { entries: starterEntries, moods: [] };
}

function App() {
  const [data, setData] = useState(loadDemoData);
  const [user, setUser] = useState(null);
  const [authDialog, setAuthDialog] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = !firebaseEnabled || !user;

  useEffect(() => {
    if (!user) localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, user]);
  useEffect(() => {
    if (!firebaseEnabled) return undefined;
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const [entriesSnapshot, moodsSnapshot] = await Promise.all([
            getDocs(
              query(
                collection(db, "users", currentUser.uid, "entries"),
                orderBy("date", "desc"),
              ),
            ),
            getDocs(
              query(
                collection(db, "users", currentUser.uid, "moods"),
                orderBy("date", "desc"),
              ),
            ),
          ]);
          setData({
            entries: entriesSnapshot.docs.map((entry) => ({
              id: entry.id,
              ...entry.data(),
            })),
            moods: moodsSnapshot.docs.map((mood) => ({
              id: mood.id,
              ...mood.data(),
            })),
          });
        } catch {
          notify(
            "Could not load your saved entries. Check your connection and Firebase rules.",
          );
        }
      } else setData({ entries: starterEntries, moods: [] });
    });
  }, []);
  useEffect(() => {
    setMobileMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  function notify(message) {
    setToast(message);
  }

  async function saveRecord(kind, record) {
    const list = kind === "entries" ? "entries" : "moods";
    if (user) {
      const recordRef = await addDoc(collection(db, "users", user.uid, list), {
        ...record,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setData((current) => ({
        ...current,
        [list]: [{ ...record, id: recordRef.id }, ...current[list]],
      }));
    } else
      setData((current) => ({
        ...current,
        [list]: [{ ...record, id: crypto.randomUUID() }, ...current[list]],
      }));
  }
  async function updateEntry(entry) {
    if (user && !entry.id.startsWith("demo-"))
      await updateDoc(doc(db, "users", user.uid, "entries", entry.id), {
        ...entry,
        userId: user.uid,
      });
    setData((current) => ({
      ...current,
      entries: current.entries.map((item) =>
        item.id === entry.id ? entry : item,
      ),
    }));
  }
  async function deleteEntry(id) {
    if (user && !id.startsWith("demo-"))
      await deleteDoc(doc(db, "users", user.uid, "entries", id));
    setData((current) => ({
      ...current,
      entries: current.entries.filter((item) => item.id !== id),
    }));
  }
  async function saveMood(mood) {
    const record = { ...mood, date: new Date().toISOString() };
    if (user) {
      const ref = await addDoc(collection(db, "users", user.uid, "moods"), {
        ...record,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      setData((current) => ({
        ...current,
        moods: [{ ...record, id: ref.id }, ...current.moods],
      }));
    } else
      setData((current) => ({
        ...current,
        moods: [{ ...record, id: crypto.randomUUID() }, ...current.moods],
      }));
  }
  async function updateMood(record) {
    if (user && !record.id.startsWith("demo-"))
      await updateDoc(doc(db, "users", user.uid, "moods", record.id), {
        ...record,
        userId: user.uid,
      });
    setData((current) => ({
      ...current,
      moods: current.moods.map((item) =>
        item.id === record.id ? record : item,
      ),
    }));
  }
  async function deleteMood(id) {
    if (user && !id.startsWith("demo-"))
      await deleteDoc(doc(db, "users", user.uid, "moods", id));
    setData((current) => ({
      ...current,
      moods: current.moods.filter((item) => item.id !== id),
    }));
  }
  async function handleAuth(mode, email, password) {
    if (!firebaseEnabled) {
      notify("Add Firebase settings in .env to enable a private account.");
      return;
    }
    if (mode === "signup")
      await createUserWithEmailAndPassword(auth, email, password);
    else if (mode === "reset") {
      await sendPasswordResetEmail(auth, email);
      notify("Password reset email sent.");
      return;
    } else await signInWithEmailAndPassword(auth, email, password);
    setAuthDialog(false);
  }
  async function deleteAccount() {
    try {
      const token = await user.getIdToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/account`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await signOut(auth);
      setData({ entries: [], moods: [] });
      notify("Your account and records were deleted.");
    } catch (error) {
      notify(
        error.message ||
          "Account deletion failed. Contact support before trying again.",
      );
    }
  }

  const pageTitles = {
    "/": [
      "A little room to reflect",
      "Your space to check in, write things down, and notice what matters.",
    ],
    "/journal": [
      "Your journal",
      "A private place for the things you want to remember.",
    ],
    "/mood": [
      "Mood check-in",
      "No right answer. Just notice how today feels for you.",
    ],
    "/insights": [
      "Your patterns, gently",
      "A view of what you have chosen to record. Nothing more.",
    ],
    "/care": [
      "A moment for yourself",
      "Small pauses count. Choose what feels manageable today.",
    ],
    "/habits": [
      "Small routines",
      "A gentle way to notice the care you make time for.",
    ],
    "/settings": ["Your space, your choices", "Privacy and account settings."],
  };
  const [title, subtitle] = pageTitles[location.pathname] || pageTitles["/"];
  const navItems = [
    { to: "/", label: "Today", icon: Sun, end: true },
    { to: "/journal", label: "Journal", icon: BookOpen },
    { to: "/mood", label: "Mood check-in", icon: Heart },
    { to: "/insights", label: "Insights", icon: BarChart3 },
    { to: "/care", label: "Self-care", icon: Leaf },
    { to: "/habits", label: "Habits", icon: Check },
  ];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Leaf size={19} />
          </span>
          <span>
            mindmate<span className="brand-period">.</span>
          </span>
        </Link>
        <div className="workspace-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Journal" && (
                <span className="nav-count">{data.entries.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="note-icon">
              <Cloud size={17} />
            </div>
            <div>
              <strong>{isDemo ? "Demo space" : "Private account"}</strong>
              <span>{isDemo ? "Saved on this device" : user?.email}</span>
            </div>
          </div>
          <Link to="/settings" className="nav-link settings-link">
            <Settings size={18} />
            <span>Settings & privacy</span>
          </Link>
          <div className="safety-note">
            <Shield size={15} />
            <span>
              MindMate is for reflection, not a substitute for professional
              care.
            </span>
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>MindMate</span>
            <span className="crumb-slash">/</span>
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <span className={`mode-pill ${isDemo ? "" : "connected"}`}>
              <span className="status-dot" />
              {isDemo ? "Local demo" : "Private account"}
            </span>
            <button
              className="avatar-button"
              title={user?.email || "Open account"}
              onClick={() => setAuthDialog(true)}
            >
              {user?.email?.[0]?.toUpperCase() || "M"}
            </button>
          </div>
        </header>
        <div className="page-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {formatDate(new Date(), {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <div className="page-heading-actions">
              {location.pathname === "/settings" && user && (
                <button
                  className="button button-danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Permanently delete your account and all MindMate records? This cannot be undone.",
                      )
                    )
                      deleteAccount();
                  }}
                >
                  Delete account
                </button>
              )}
              <button className="button button-quiet privacy-chip">
                <LockKeyhole size={15} />
                {isDemo ? "Stored on this device" : "Private to your account"}
              </button>
            </div>
          </div>
          <Routes>
            <Route
              path="/"
              element={
                <Dashboard
                  data={data}
                  onSaveMood={saveMood}
                  onNavigate={navigate}
                />
              }
            />
            <Route
              path="/journal"
              element={
                <Journal
                  data={data}
                  onSave={saveRecord}
                  onUpdate={updateEntry}
                  onDelete={deleteEntry}
                  notify={notify}
                />
              }
            />
            <Route
              path="/mood"
              element={
                <>
                  <MoodPage
                    data={data}
                    onSave={saveMood}
                    onUpdate={updateMood}
                    onDelete={deleteMood}
                    notify={notify}
                  />
                  <MoodHistory
                    moods={data.moods}
                    onUpdate={updateMood}
                    onDelete={deleteMood}
                  />
                </>
              }
            />
            <Route path="/insights" element={<Insights data={data} />} />
            <Route path="/care" element={<Care />} />
            <Route path="/habits" element={<HabitTracker />} />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  data={data}
                  user={user}
                  onExport={() => exportData(data)}
                  onDeleteAll={async () => {
                    if (user) {
                      for (const [collectionName, records] of [
                        ["entries", data.entries],
                        ["moods", data.moods],
                      ])
                        await Promise.all(
                          records
                            .filter((record) => !record.id.startsWith("demo-"))
                            .map((record) =>
                              deleteDoc(
                                doc(
                                  db,
                                  "users",
                                  user.uid,
                                  collectionName,
                                  record.id,
                                ),
                              ),
                            ),
                        );
                    }
                    setData({ entries: [], moods: [] });
                    notify("Your entries were deleted.");
                  }}
                  onDeleteAccount={deleteAccount}
                  onSignOut={async () => {
                    await signOut(auth);
                    setAuthDialog(false);
                  }}
                />
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <footer className="page-footer">
            <span>Made for the days you need a little space.</span>
            <a href="mailto:hello@mindmate.local">Report a concern</a>
          </footer>
        </div>
      </main>
      {authDialog && (
        <AuthDialog
          user={user}
          onClose={() => setAuthDialog(false)}
          onAuth={handleAuth}
          onSignOut={async () => {
            if (user) await signOut(auth);
            setAuthDialog(false);
          }}
          notify={notify}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}

function Dashboard({ data, onSaveMood, onNavigate }) {
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [saved, setSaved] = useState(false);
  const recent = data.entries.slice(0, 3);
  const hasMoodToday = data.moods.some(
    (record) =>
      new Date(record.date).toDateString() === new Date().toDateString(),
  );
  const prompt = useMemo(
    () => PROMPTS[Math.floor(new Date().getDate() / 4) % PROMPTS.length],
    [],
  );
  function submitMood() {
    if (!mood) return;
    onSaveMood({ mood, intensity, tags: [], note: "" });
    setSaved(true);
    setMood("");
  }
  return (
    <div className="dashboard-grid">
      <section className="welcome-panel">
        <div className="welcome-copy">
          <span className="panel-kicker">
            <Sun size={15} /> A fresh page
          </span>
          <h2>
            You don’t have to
            <br />
            figure it all out today.
          </h2>
          <p>A few honest words can be enough. Start wherever you are.</p>
          <button
            className="button button-primary"
            onClick={() => onNavigate("/journal")}
          >
            <Plus size={16} /> Write an entry <ArrowRight size={15} />
          </button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="sun-disc" />
          <div className="art-hill hill-back" />
          <div className="art-hill hill-front" />
          <div className="art-stem" />
          <div className="art-leaf leaf-one" />
          <div className="art-leaf leaf-two" />
        </div>
      </section>
      <section className="card mood-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">TODAY, IN A WORD</span>
            <h3>How are you feeling?</h3>
          </div>
          <span className="today-tag">{formatDate(new Date())}</span>
        </div>
        {hasMoodToday || saved ? (
          <div className="success-state">
            <span className="success-check">
              <Check size={18} />
            </span>
            <div>
              <strong>Check-in complete</strong>
              <span>Thanks for pausing with yourself.</span>
            </div>
          </div>
        ) : (
          <>
            <div className="mood-options">
              {MOODS.map((item) => (
                <button
                  key={item.key}
                  aria-label={item.label}
                  aria-pressed={mood === item.key}
                  className={`mood-option ${mood === item.key ? "selected" : ""}`}
                  onClick={() => setMood(item.key)}
                >
                  <span>{item.emoji}</span>
                  <small>{item.label}</small>
                </button>
              ))}
            </div>
            <div className="intensity-row">
              <label htmlFor="intensity">Intensity</label>
              <input
                id="intensity"
                type="range"
                min="1"
                max="5"
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
              />
              <span>{intensity} / 5</span>
            </div>
            <button
              className="button button-primary button-full"
              disabled={!mood}
              onClick={submitMood}
            >
              Save check-in <ArrowRight size={15} />
            </button>
          </>
        )}
      </section>
      <section className="card prompt-card">
        <div className="prompt-icon">
          <MessageCircle size={18} />
        </div>
        <div className="prompt-content">
          <span className="eyebrow">A QUESTION FOR TODAY</span>
          <h3>{prompt}</h3>
          <button
            className="text-button"
            onClick={() => onNavigate("/journal")}
          >
            Write a little about it <ArrowRight size={14} />
          </button>
        </div>
      </section>
      <section className="card recent-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">YOUR RECENT NOTES</span>
            <h3>From your journal</h3>
          </div>
          <button
            className="text-button"
            onClick={() => onNavigate("/journal")}
          >
            View all <ArrowRight size={14} />
          </button>
        </div>
        {recent.length ? (
          <div className="recent-list">
            {recent.map((entry) => (
              <button
                className="recent-entry"
                key={entry.id}
                onClick={() => onNavigate("/journal")}
              >
                <span className="entry-date">
                  {formatDate(entry.date, { month: "short", day: "2-digit" })}
                </span>
                <span className="entry-preview">
                  <strong>{entry.title || entry.body.slice(0, 42)}</strong>
                  <small>
                    {entry.body.slice(0, 78)}
                    {entry.body.length > 78 ? "…" : ""}
                  </small>
                </span>
                <span className="entry-mood">
                  {getMood(entry.mood)?.emoji || "✦"}
                </span>
                <ArrowRight size={15} className="entry-arrow" />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your journal is waiting"
            description="Your entries will show up here when you write them."
            action="Write your first entry"
            onClick={() => onNavigate("/journal")}
          />
        )}
      </section>
      <section className="card week-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">A GENTLE LOOK BACK</span>
            <h3>This week</h3>
          </div>
          <button
            className="round-link"
            onClick={() => onNavigate("/insights")}
            aria-label="View insights"
          >
            <ArrowRight size={16} />
          </button>
        </div>
        <WeekStrip moods={data.moods} />
        <div className="week-foot">
          <span>
            <span className="legend-dot" /> Your check-ins
          </span>
          <strong>
            {
              data.moods.filter(
                (item) =>
                  Date.now() - new Date(item.date).getTime() < 7 * 86400000,
              ).length
            }{" "}
            check-ins
          </strong>
        </div>
      </section>
      <section className="care-banner">
        <div className="care-banner-icon">
          <Wind size={19} />
        </div>
        <div>
          <span className="eyebrow">A SMALL PAUSE</span>
          <strong>Try a one-minute breathing reset</strong>
          <span>Nothing to get right. Just a moment to arrive.</span>
        </div>
        <button
          className="button button-quiet"
          onClick={() => onNavigate("/care")}
        >
          Take a breath <ArrowRight size={15} />
        </button>
      </section>
    </div>
  );
}

function WeekStrip({ moods }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const match = moods.find(
      (item) => new Date(item.date).toDateString() === date.toDateString(),
    );
    return { date, match };
  });
  return (
    <div className="week-strip">
      {days.map(({ date, match }) => (
        <div className="week-day" key={date.toISOString()}>
          <span className="day-name">
            {new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)}
          </span>
          <span
            className={`day-mark ${match ? "has-mood" : ""}`}
            style={
              match ? { background: getMood(match.mood)?.color } : undefined
            }
          >
            {match ? getMood(match.mood)?.emoji : <span />}
          </span>
          <span className="day-num">{date.getDate()}</span>
        </div>
      ))}
    </div>
  );
}

function Journal({ data, onSave, onUpdate, onDelete, notify }) {
  const [queryText, setQueryText] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState(null);
  const [initialPrompt, setInitialPrompt] = useState("");
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(5);
  const filtered = data.entries.filter(
    (entry) =>
      (entry.title + " " + entry.body + " " + (entry.tags || []).join(" "))
        .toLowerCase()
        .includes(queryText.toLowerCase()) &&
      (filter === "all" || entry.mood === filter),
  );
  const visibleEntries = filtered.slice(0, visibleCount);
  useEffect(() => setVisibleCount(5), [filter, queryText]);
  function openEditor(entry = null, prompt = "") {
    setEditing(entry);
    setInitialPrompt(prompt);
    setShowEditor(true);
  }
  async function submit(entry) {
    if (editing) await onUpdate({ ...editing, ...entry });
    else await onSave("entries", { ...entry, date: new Date().toISOString() });
    setShowEditor(false);
    setEditing(null);
    notify(editing ? "Entry updated." : "Entry saved to your journal.");
  }
  return (
    <div className="journal-layout">
      <div className="journal-main">
        <div className="journal-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Search your entries"
              aria-label="Search journal entries"
            />
            <kbd>⌘ K</kbd>
          </div>
          <button
            className="button button-primary"
            onClick={() => openEditor()}
          >
            <Plus size={16} /> New entry
          </button>
        </div>
        <div className="filter-row">
          <span>Filter by mood</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter by mood"
          >
            <option value="all">All moods</option>
            {MOODS.map((item) => (
              <option value={item.key} key={item.key}>
                {item.emoji} {item.label}
              </option>
            ))}
          </select>
          <span className="result-count">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        {filtered.length ? (
          <div className="journal-list">
            {visibleEntries.map((entry) => (
              <article className="journal-entry" key={entry.id}>
                <div className="journal-entry-date">
                  <span>{formatDate(entry.date, { month: "short" })}</span>
                  <strong>{formatDate(entry.date, { day: "2-digit" })}</strong>
                  <small>{formatDate(entry.date, { weekday: "short" })}</small>
                </div>
                <div className="journal-entry-body">
                  <div className="journal-entry-meta">
                    <span>
                      {formatDate(entry.date, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    {entry.mood && (
                      <span className="entry-mood-label">
                        {getMood(entry.mood)?.emoji}{" "}
                        {getMood(entry.mood)?.label}
                      </span>
                    )}
                  </div>
                  <h3>{entry.title || "Untitled entry"}</h3>
                  <p>{entry.body}</p>
                  <div className="tag-row">
                    {(entry.tags || []).map((tag) => (
                      <span className="tag" key={tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="entry-controls">
                  <button
                    className="icon-button"
                    title="Edit entry"
                    onClick={() => openEditor(entry)}
                  >
                    <MoreHorizontal size={19} />
                  </button>
                  <button
                    className="icon-button delete-icon"
                    title="Delete entry"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this journal entry? This cannot be undone.",
                        )
                      )
                        onDelete(entry.id);
                    }}
                  >
                    {" "}
                    <X size={16} />
                  </button>
                </div>
              </article>
            ))}
            {visibleEntries.length < filtered.length && (
            <button
              className="button button-quiet journal-load-more"
              onClick={() => setVisibleCount((count) => count + 5)}
            >
              Load more entries
            </button>
            )}
          </div>
        ) : (
          <EmptyState
            title="No entries found"
            description={
              queryText
                ? "Try another search or clear the mood filter."
                : "Start with one small thing you noticed today."
            }
            action="Write an entry"
            onClick={() => openEditor()}
          />
        )}
      </div>
      <aside className="journal-side">
        <div className="side-card prompt-side">
          <span className="side-icon">
            <Sparkles size={17} />
          </span>
          <span className="eyebrow">A PLACE TO BEGIN</span>
          <h3>Writing does not have to be polished.</h3>
          <p>Follow a prompt, or start with whatever is on your mind.</p>
          <div className="prompt-list">
            {PROMPTS.slice(0, 3).map((prompt) => (
              <button key={prompt} onClick={() => openEditor(null, prompt)}>
                {prompt}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </div>
        <div className="side-card journal-count">
          <span className="eyebrow">YOUR PRACTICE</span>
          <strong>{data.entries.length}</strong>
          <span>notes written</span>
          <div className="count-rule" />
          <small>Every entry is a moment you made space for yourself.</small>
        </div>
      </aside>
      {showEditor && (
        <EntryEditor
          entry={editing}
          onClose={() => {
            setShowEditor(false);
            setEditing(null);
          }}
          onSave={submit}
        />
      )}
    </div>
  );
}

function EntryEditor({ entry, prompt, onClose, onSave }) {
  const [title, setTitle] = useState(entry?.title || "");
  const [body, setBody] = useState(
    entry?.body || (prompt ? `${prompt}\n\n` : ""),
  );
  const [mood, setMood] = useState(entry?.mood || "");
  const [tagsText, setTagsText] = useState((entry?.tags || []).join(", "));
  const [includeAI, setIncludeAI] = useState(false);
  const [reflection, setReflection] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");
  const dirty =
    title !== (entry?.title || "") ||
    body !== (entry?.body || "") ||
    mood !== (entry?.mood || "") ||
    tagsText !== (entry?.tags || []).join(", ");
  async function analyze() {
    if (!includeAI) {
      setError(
        "Please confirm consent before sending this entry for AI reflection.",
      );
      return;
    }
    setAiLoading(true);
    setError("");
    setReflection(null);
    try {
      const token = auth?.currentUser
        ? await auth.currentUser.getIdToken()
        : "";
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/reflect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ journalEntry: body, consent: true }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "The reflection service is not available yet.",
        );
      setReflection(result.reflection);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAiLoading(false);
    }
  }
  function save() {
    if (!body.trim()) return;
    onSave({
      title: title.trim() || body.trim().split("\n")[0].slice(0, 52),
      body: body.trim(),
      mood,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      date: entry?.date || new Date().toISOString(),
    });
  }
  useEffect(() => {
    const handler = (event) => {
      if (
        dirty &&
        !window.confirm("You have unsaved changes. Close without saving?")
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="editor-top">
          <div>
            <span className="eyebrow">
              {entry ? "EDIT YOUR NOTE" : "A NEW PAGE"}
            </span>
            <h2 id="editor-title">Let it be yours.</h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close editor"
          >
            <X size={19} />
          </button>
        </div>
        <div className="editor-date">
          <Clock3 size={14} />{" "}
          {formatDate(entry?.date || new Date(), {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          <span className="unsaved-indicator">
            {dirty ? "Unsaved changes" : "Saved draft"}
          </span>
        </div>
        <input
          className="title-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Give this entry a title (optional)"
          aria-label="Entry title"
        />
        <textarea
          className="journal-textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Start wherever you are…"
          autoFocus
          aria-label="Journal entry"
        />
        <div className="editor-meta">
          <label className="editor-field">
            <span>Mood, if you’d like</span>
            <select
              value={mood}
              onChange={(event) => setMood(event.target.value)}
            >
              <option value="">No mood selected</option>
              {MOODS.map((item) => (
                <option value={item.key} key={item.key}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-field">
            <span>
              Tags <small>comma separated</small>
            </span>
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="study, rest, people"
            />
          </label>
        </div>
        <div className="ai-consent-box">
          <div className="ai-consent-icon">
            <Sparkles size={16} />
          </div>
          <div className="ai-consent-copy">
            <strong>Optional AI reflection</strong>
            <span>
              Your entry only leaves this device if you consent below. It is not
              stored by MindMate’s AI endpoint.
            </span>
            <label className="check-label">
              <input
                type="checkbox"
                checked={includeAI}
                onChange={(event) => setIncludeAI(event.target.checked)}
              />{" "}
              I consent to send this entry to the configured AI service for a
              reflection.
            </label>
          </div>
          <button
            className="button button-quiet ai-button"
            onClick={analyze}
            disabled={aiLoading || !body.trim()}
          >
            {aiLoading ? (
              "Thinking…"
            ) : (
              <>
                <Sparkles size={14} /> Reflect
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {reflection && (
          <div className="reflection-result">
            <span className="eyebrow">A GENTLE REFLECTION</span>
            <p>{reflection.reflection}</p>
            {reflection.possibleEmotions?.length > 0 && (
              <small>
                Possible themes: {reflection.possibleEmotions.join(", ")}
              </small>
            )}
            {reflection.followUpQuestion && (
              <small>{reflection.followUpQuestion}</small>
            )}
            {reflection.suggestedActions?.map((action) => (
              <small key={action}>• {action}</small>
            ))}
            {reflection.supportReminder && (
              <small>{reflection.supportReminder}</small>
            )}
          </div>
        )}
        <div className="editor-actions">
          <span>Private to your account</span>
          <button
            className="button button-primary"
            onClick={save}
            disabled={!body.trim()}
          >
            <Check size={15} /> Save entry
          </button>
        </div>
      </section>
    </div>
  );
}

function MoodPage({ data, onSave, notify }) {
  const [mood, setMood] = useState("");
  const [intensity, setIntensity] = useState(3);
  const [note, setNote] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [saved, setSaved] = useState(false);
  const tags = [
    "Studies",
    "Work",
    "Relationships",
    "Sleep",
    "Health",
    "Personal growth",
  ];
  function toggleTag(tag) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag],
    );
  }
  async function submit() {
    if (!mood) return;
    await onSave({ mood, intensity, note, tags: selectedTags });
    setSaved(true);
    notify("Your check-in is saved.");
  }
  return (
    <div className="mood-page-grid">
      <section className="card mood-form-card">
        <span className="eyebrow">A CHECK-IN, NOT A TEST</span>
        <h2>How does today feel?</h2>
        <p>Choose the closest fit, or skip this if none feels right.</p>
        <div className="mood-choices">
          {MOODS.map((item) => (
            <button
              key={item.key}
              onClick={() => setMood(item.key)}
              className={`mood-choice ${mood === item.key ? "selected" : ""}`}
              aria-pressed={mood === item.key}
            >
              <span className="choice-emoji">{item.emoji}</span>
              <span className="choice-label">{item.label}</span>
            </button>
          ))}
        </div>
        <label className="range-label" htmlFor="mood-intensity">
          <span>How strong does it feel?</span>
          <strong>
            {intensity} <small>of 5</small>
          </strong>
        </label>
        <input
          className="mood-range"
          id="mood-intensity"
          type="range"
          min="1"
          max="5"
          value={intensity}
          onChange={(event) => setIntensity(Number(event.target.value))}
        />
        <div className="range-captions">
          <span>A little</span>
          <span>A lot</span>
        </div>
        <div className="tag-picker">
          <span className="field-label">
            Anything contributing? <small>optional</small>
          </span>
          <div className="tag-options">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`tag-choice ${selectedTags.includes(tag) ? "selected" : ""}`}
              >
                {selectedTags.includes(tag) && <Check size={12} />}
                {tag}
              </button>
            ))}
          </div>
        </div>
        <label className="field-label note-label">
          A note to yourself <small>optional</small>
          <textarea
            maxLength="400"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Anything you want to remember about this moment?"
          />
        </label>
        <div className="mood-form-bottom">
          <span>Self-reported, just for you.</span>
          <button
            className="button button-primary"
            disabled={!mood || saved}
            onClick={submit}
          >
            {saved ? (
              <>
                <Check size={15} /> Saved
              </>
            ) : (
              <>
                Save check-in <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </section>
      <aside className="mood-aside">
        <div className="mood-aside-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-center">✳</div>
        </div>
        <span className="eyebrow">A GENTLE REMINDER</span>
        <h3>Your mood is information, not a verdict.</h3>
        <p>
          There is no need to change what you feel before you write it down.
          Noticing is enough.
        </p>
        <div className="mood-history-mini">
          <div className="section-head">
            <strong>Recent check-ins</strong>
            <span>{data.moods.length} total</span>
          </div>
          {data.moods.slice(0, 4).map((item) => (
            <div className="mini-mood-row" key={item.id}>
              <span>{getMood(item.mood)?.emoji}</span>
              <span>{getMood(item.mood)?.label}</span>
              <small>{formatDate(item.date)}</small>
            </div>
          ))}
          {!data.moods.length && (
            <span className="empty-copy">Your check-ins will appear here.</span>
          )}
        </div>
      </aside>
    </div>
  );
}

function MoodHistory({ moods, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  return (
    <section className="card mood-records">
      <div className="section-head">
        <div>
          <span className="eyebrow">YOUR SAVED RECORDS</span>
          <h3>Recent check-ins</h3>
        </div>
        <span className="today-tag">{moods.length} total</span>
      </div>
      {moods.length ? (
        <div className="mood-record-list">
          {moods.map((record) => (
            <div className="mood-record" key={record.id}>
              {editing === record.id ? (
                <>
                  <select
                    aria-label="Edit mood"
                    value={draft.mood}
                    onChange={(event) =>
                      setDraft({ ...draft, mood: event.target.value })
                    }
                  >
                    {MOODS.map((item) => (
                      <option value={item.key} key={item.key}>
                        {item.emoji} {item.label}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Edit mood intensity"
                    type="number"
                    min="1"
                    max="5"
                    value={draft.intensity || 3}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        intensity: Number(event.target.value),
                      })
                    }
                  />
                  <input
                    aria-label="Edit mood note"
                    value={draft.note || ""}
                    onChange={(event) =>
                      setDraft({ ...draft, note: event.target.value })
                    }
                    placeholder="Optional note"
                  />
                  <button
                    className="button button-quiet"
                    onClick={async () => {
                      await onUpdate({ ...record, ...draft });
                      setEditing(null);
                    }}
                  >
                    Save
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => setEditing(null)}
                    aria-label="Cancel editing"
                  >
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className="record-mood-emoji">
                    {getMood(record.mood)?.emoji}
                  </span>
                  <div className="record-mood-copy">
                    <strong>
                      {getMood(record.mood)?.label} · intensity{" "}
                      {record.intensity || getMood(record.mood)?.score || 3}/5
                    </strong>
                    <small>
                      {formatDate(record.date, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {record.note ? ` · ${record.note}` : ""}
                    </small>
                    {record.tags?.length > 0 && (
                      <small>{record.tags.join(", ")}</small>
                    )}
                  </div>
                  <button
                    className="button button-quiet"
                    onClick={() => {
                      setEditing(record.id);
                      setDraft({
                        mood: record.mood,
                        intensity: record.intensity || 3,
                        note: record.note || "",
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Delete check-in"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Delete this mood check-in? This cannot be undone.",
                        )
                      )
                        onDelete(record.id);
                    }}
                  >
                    <X size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-copy">
          Saved check-ins will appear here. You can edit or remove them whenever
          you need.
        </p>
      )}
    </section>
  );
}

function Insights({ data }) {
  const [period, setPeriod] = useState("week");
  const days = period === "week" ? 7 : 30;
  const rangeStart = Date.now() - days * 86400000;
  const records = data.moods
    .filter((item) => new Date(item.date).getTime() >= rangeStart)
    .slice(0, 200);
  const chartData = Array.from(
    { length: period === "week" ? 7 : 10 },
    (_, index) => {
      const count = period === "week" ? 7 : 3;
      const date = new Date(
        Date.now() -
          (count - 1 - index) * (period === "week" ? 1 : 3) * 86400000,
      );
      const found = records.filter(
        (item) => new Date(item.date).toDateString() === date.toDateString(),
      );
      return {
        day: new Intl.DateTimeFormat("en", {
          weekday: period === "week" ? "short" : undefined,
          month: period === "month" ? "numeric" : undefined,
          day: period === "month" ? "numeric" : undefined,
        }).format(date),
        score: found.length
          ? found.reduce(
              (sum, item) =>
                sum + (item.intensity || getMood(item.mood)?.score || 3),
              0,
            ) / found.length
          : null,
      };
    },
  );
  const distribution = MOODS.map((mood) => ({
    ...mood,
    count: records.filter((item) => item.mood === mood.key).length,
  }));
  const tags = Object.entries(
    records
      .flatMap((item) => item.tags || [])
      .reduce(
        (result, tag) => ({ ...result, [tag]: (result[tag] || 0) + 1 }),
        {},
      ),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const entriesCount = data.entries.filter(
    (item) => new Date(item.date).getTime() >= rangeStart,
  ).length;
  return (
    <div className="insights-page">
      <div className="period-row">
        <span>Showing your self-reported data</span>
        <div className="segmented-control">
          <button
            className={period === "week" ? "active" : ""}
            onClick={() => setPeriod("week")}
          >
            7 days
          </button>
          <button
            className={period === "month" ? "active" : ""}
            onClick={() => setPeriod("month")}
          >
            30 days
          </button>
        </div>
      </div>
      <div className="stats-row">
        <StatCard
          label="Check-ins"
          value={records.length}
          note={`in the last ${days} days`}
          icon={Heart}
        />
        <StatCard
          label="Journal entries"
          value={entriesCount}
          note={`in the last ${days} days`}
          icon={BookOpen}
        />
        <StatCard
          label="Days with a check-in"
          value={
            new Set(records.map((item) => new Date(item.date).toDateString()))
              .size
          }
          note="not a streak to maintain"
          icon={Activity}
        />
      </div>
      <div className="analytics-grid">
        <section className="card chart-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">MOOD INTENSITY</span>
              <h3>What you’ve noted</h3>
            </div>
            <span className="chart-unit">1–5</span>
          </div>
          {records.length ? (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 7, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#738b72"
                        stopOpacity={0.24}
                      />
                      <stop
                        offset="95%"
                        stopColor="#738b72"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e9ece5" vertical={false} />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#858a80", fontSize: 11 }}
                    dy={9}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#858a80", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #e8ebe4",
                      borderRadius: 8,
                      boxShadow: "0 6px 20px #1c27141a",
                    }}
                    formatter={(value) => [
                      value == null ? "No check-in" : Number(value).toFixed(1),
                      "Intensity",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    connectNulls={false}
                    stroke="#667e67"
                    strokeWidth={2.5}
                    fill="url(#moodFill)"
                    activeDot={{ r: 5, stroke: "#fff", strokeWidth: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="Your chart starts with a check-in"
              description="There is not enough saved mood data for a trend yet."
            />
          )}
        </section>
        <section className="card distribution-card">
          <span className="eyebrow">MOOD DISTRIBUTION</span>
          <h3>What showed up</h3>
          {records.length ? (
            <div className="distribution-list">
              {distribution.map((item) => (
                <div className="distribution-row" key={item.key}>
                  <span>{item.emoji}</span>
                  <span className="distribution-label">{item.label}</span>
                  <div className="distribution-track">
                    <i
                      style={{
                        width: `${records.length ? (item.count / records.length) * 100 : 0}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No patterns to show"
              description="A few check-ins will appear here as you log them."
            />
          )}
        </section>
      </div>
      <div className="insight-bottom-grid">
        <section className="card tag-insights">
          <div className="section-head">
            <div>
              <span className="eyebrow">WHAT YOU TAGGED</span>
              <h3>Often on your mind</h3>
            </div>
          </div>
          {tags.length ? (
            tags.map(([tag, count]) => (
              <div className="tag-insight-row" key={tag}>
                <span className="tag">{tag}</span>
                <span>
                  {count} {count === 1 ? "time" : "times"}
                </span>
              </div>
            ))
          ) : (
            <p className="empty-copy">
              Tags you choose will help you find your own notes. They do not
              explain or predict your mood.
            </p>
          )}
        </section>
        <div className="insight-disclaimer">
          <Shield size={16} />
          <div>
            <strong>A note about these insights</strong>
            <p>
              These charts describe only the entries you chose to record. They
              are not clinical assessments, and they cannot tell you what caused
              a change in mood.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
function StatCard({ label, value, note, icon: Icon }) {
  return (
    <div className="card stat-card">
      <span className="stat-icon">
        <Icon size={16} />
      </span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function Care() {
  const [exercise, setExercise] = useState("breathing");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gratitude, setGratitude] = useState("");
  const [saved, setSaved] = useState(false);
  const phases = ["Breathe in", "Hold softly", "Breathe out", "Rest"];
  useEffect(() => {
    if (!running || exercise !== "breathing") return undefined;
    const id = setInterval(() => {
      setSeconds((value) => value + 1);
      setPhase((value) => Math.floor((seconds + 1) / 4) % phases.length);
    }, 1000);
    return () => clearInterval(id);
  }, [running, exercise, seconds]);
  function stopBreathing() {
    setRunning(false);
    setSeconds(0);
    setPhase(0);
  }
  const exercises = [
    { key: "breathing", title: "Breathing space", icon: Wind },
    { key: "grounding", title: "Five senses", icon: Activity },
    { key: "gratitude", title: "Gratitude note", icon: Heart },
  ];
  return (
    <div className="care-page">
      <div className="care-tabs">
        {exercises.map(({ key, title, icon: Icon }) => (
          <button
            className={exercise === key ? "active" : ""}
            key={key}
            onClick={() => {
              setExercise(key);
              stopBreathing();
            }}
          >
            <Icon size={16} />
            {title}
          </button>
        ))}
      </div>
      {exercise === "breathing" && (
        <section className="care-exercise-card breathing-card">
          <div className="breath-copy">
            <span className="eyebrow">A MINUTE TO ARRIVE</span>
            <h2>
              Nothing to fix.
              <br />
              Just one breath.
            </h2>
            <p>Let your breath find its own pace. Stop whenever you like.</p>
            <div className="breath-controls">
              <button
                className="button button-primary"
                onClick={() => setRunning(!running)}
              >
                {running ? "Pause" : seconds ? "Continue" : "Begin breathing"}
              </button>
              {seconds > 0 && (
                <button className="button button-quiet" onClick={stopBreathing}>
                  Reset
                </button>
              )}
            </div>
            <span className="breath-timer">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </span>
          </div>
          <div className={`breath-scene ${running ? "breathing" : ""}`}>
            <div className="breath-ring ring-outer" />
            <div className="breath-ring ring-inner" />
            <div className="breath-orb">
              <span>{running ? phases[phase] : "At your pace"}</span>
            </div>
          </div>
        </section>
      )}
      {exercise === "grounding" && (
        <section className="card grounding-card">
          <span className="eyebrow">A GROUNDING PAUSE</span>
          <h2>Notice what is here.</h2>
          <p>
            Take these one at a time. There is no need to rush or do them all.
          </p>
          <div className="sense-list">
            {[
              [
                "5",
                "things you can see",
                "Look around and name five things, silently or out loud.",
              ],
              [
                "4",
                "things you can feel",
                "Notice the chair beneath you or the air on your skin.",
              ],
              [
                "3",
                "things you can hear",
                "Listen for sounds near you, then sounds farther away.",
              ],
              [
                "2",
                "things you can smell",
                "Notice a scent, or remember one you enjoy.",
              ],
              [
                "1",
                "thing you can taste",
                "Take a sip of water or notice the taste in your mouth.",
              ],
            ].map(([number, label, detail]) => (
              <div className="sense-row" key={number}>
                <span>{number}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </div>
                <Check size={16} />
              </div>
            ))}
          </div>
          <button
            className="button button-quiet"
            onClick={() => setExercise("breathing")}
          >
            Finish exercise
          </button>
        </section>
      )}
      {exercise === "gratitude" && (
        <section className="card gratitude-card">
          <div className="gratitude-art">
            <Coffee size={34} strokeWidth={1.2} />
          </div>
          <span className="eyebrow">A GRATITUDE NOTE</span>
          <h2>
            What felt kind, useful,
            <br />
            or simply okay today?
          </h2>
          <p>It can be something very small. No silver linings required.</p>
          <textarea
            value={gratitude}
            onChange={(event) => {
              setGratitude(event.target.value);
              setSaved(false);
            }}
            maxLength={500}
            placeholder="A warm drink, a message, a quiet moment…"
          />
          <div className="gratitude-footer">
            <span>{gratitude.length}/500</span>
            <button
              className="button button-primary"
              disabled={!gratitude.trim() || saved}
              onClick={() => {
                localStorage.setItem(
                  "mindmate-gratitude-" + new Date().toDateString(),
                  gratitude,
                );
                setSaved(true);
              }}
            >
              {" "}
              {saved ? (
                <>
                  <Check size={15} /> Saved on this device
                </>
              ) : (
                <>
                  Save note <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </section>
      )}
      <div className="care-bottom-note">
        <Heart size={15} />
        <span>
          Choose what feels helpful. You can stop or skip any exercise at any
          time.
        </span>
      </div>
    </div>
  );
}

function HabitTracker() {
  const dateKey = new Date().toISOString().slice(0, 10);
  const storageName = `mindmate-habits-${dateKey}`;
  const [habits, setHabits] = useState(() => {
    try {
      const savedHabits = JSON.parse(localStorage.getItem(storageName));
      return Array.isArray(savedHabits)
        ? savedHabits
        : [
            "Drink a glass of water",
            "Step outside for a few minutes",
            "Make space for a proper break",
          ].map((label) => ({ label, done: false }));
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(storageName, JSON.stringify(habits));
  }, [habits, storageName]);
  function toggleHabit(index) {
    setHabits((current) =>
      current.map((habit, currentIndex) =>
        currentIndex === index ? { ...habit, done: !habit.done } : habit,
      ),
    );
  }
  return (
    <section className="card habits-card">
      <div className="section-head">
        <div>
          <span className="eyebrow">A SMALL, PERSONAL PRACTICE</span>
          <h3>What would feel supportive today?</h3>
        </div>
        <span className="today-tag">{formatDate(new Date())}</span>
      </div>
      <p className="habits-intro">
        These are gentle reminders, not promises. Change them or leave them
        unchecked whenever you need.
      </p>
      <div className="habit-list">
        {habits.map((habit, index) => (
          <label
            className={`habit-row ${habit.done ? "completed" : ""}`}
            key={habit.label}
          >
            <input
              type="checkbox"
              checked={habit.done}
              onChange={() => toggleHabit(index)}
            />
            <span className="habit-check">
              <Check size={14} />
            </span>
            <span>{habit.label}</span>
          </label>
        ))}
      </div>
      <div className="habit-footer">
        <span>
          {habits.filter((habit) => habit.done).length} of {habits.length}{" "}
          checked today
        </span>
        <span>Saved on this device</span>
      </div>
    </section>
  );
}

function SettingsPage({
  data,
  user,
  onExport,
  onDeleteAll,
  onDeleteAccount,
  onSignOut,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="settings-page">
      <section className="settings-section">
        <div className="settings-icon">
          <LockKeyhole size={18} />
        </div>
        <div className="settings-copy">
          <h3>Privacy & data</h3>
          <p>
            {user
              ? "Your records are stored in your private Firebase account."
              : "This is a local demo. Journal records live in this browser’s local storage and are not protected by an account."}
          </p>
          <div className="settings-actions">
            <button className="button button-quiet" onClick={onExport}>
              <ArrowDownToLine size={15} /> Export my data
            </button>
            <button
              className="button button-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete all records
            </button>
          </div>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-icon">
          <Shield size={18} />
        </div>
        <div className="settings-copy">
          <h3>AI & your journal</h3>
          <p>
            AI reflection is optional. Your journal text is sent only after you
            check the consent box in the editor. MindMate does not store text
            sent to the AI endpoint in application logs.
          </p>
          <p className="setting-footnote">
            AI output can be inaccurate and is not therapy, diagnosis, or
            emergency support.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-icon">
          <Cloud size={18} />
        </div>
        <div className="settings-copy">
          <h3>{user ? "Your account" : "Connect a private account"}</h3>
          <p>
            {user
              ? user.email
              : "Set up Firebase to enable email/password sign-in and private cross-device storage."}
          </p>
          {user ? (
            <button className="button button-quiet" onClick={onSignOut}>
              <LogOut size={15} /> Sign out
            </button>
          ) : (
            <span className="inline-setting-status">
              Firebase configuration required
            </span>
          )}
        </div>
      </section>
      <div className="settings-policy">
        <strong>Wellness, not healthcare</strong>
        <p>
          MindMate is not a therapist, medical provider, or emergency service.
          If you feel unsafe or need immediate support, contact someone you
          trust, a qualified professional, or your local emergency service. In
          the U.S. and Canada, call or text 988.
        </p>
      </div>
      {confirmDelete && (
        <div className="modal-backdrop">
          <div className="confirm-modal" role="dialog" aria-modal="true">
            <div className="confirm-icon">
              <X size={20} />
            </div>
            <h2>Delete all your records?</h2>
            <p>
              This permanently removes {data.entries.length} journal entries and{" "}
              {data.moods.length} mood check-ins. Export first if you would like
              a copy.
            </p>
            <div className="confirm-actions">
              <button
                className="button button-quiet"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                onClick={() => {
                  setConfirmDelete(false);
                  onDeleteAll();
                }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthDialog({ user, onClose, onAuth, onSignOut, notify }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onAuth(mode, email, password);
    } catch (authError) {
      setError(authError.message || "Could not complete sign-in.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          className="icon-button auth-close"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <span className="auth-mark">
          <Leaf size={20} />
        </span>
        <span className="eyebrow">MINDMATE ACCOUNT</span>
        <h2 id="auth-title">
          {user
            ? "Your account"
            : mode === "signup"
              ? "Make a little space."
              : mode === "reset"
                ? "Reset your password."
                : "Welcome back."}
        </h2>
        <p>
          {user
            ? "Your entries stay private to your account."
            : firebaseEnabled
              ? "Sign in to keep your journal private and synced."
              : "Add Firebase configuration to enable secure account access."}
        </p>
        {user ? (
          <div className="auth-user">
            <strong>{user.email}</strong>
            <button className="button button-quiet" onClick={onSignOut}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {mode !== "reset" && (
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            )}
            {error && <span className="inline-error">{error}</span>}
            <button
              className="button button-primary button-full"
              disabled={!firebaseEnabled || loading}
            >
              {loading
                ? "One moment…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Sign in"}
            </button>
            <div className="auth-switch">
              {mode === "login" ? (
                <>
                  <button type="button" onClick={() => setMode("signup")}>
                    Create an account
                  </button>
                  <button type="button" onClick={() => setMode("reset")}>
                    Forgot password?
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setMode("login")}>
                  Back to sign in
                </button>
              )}
            </div>
          </form>
        )}
        {!firebaseEnabled && (
          <div className="auth-config-note">
            Authentication is disabled until you copy `.env.example` to `.env`
            and add a Firebase web app configuration.
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState({ title, description, action, onClick }) {
  return (
    <div className="empty-state">
      <span className="empty-illustration">
        <BookOpen size={22} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action && onClick && (
        <button className="text-button" onClick={onClick}>
          {action} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
function NotFound() {
  return (
    <div className="not-found">
      <span className="eyebrow">A SMALL DETOUR</span>
      <h2>This page wandered off.</h2>
      <p>Let’s find our way back to your space.</p>
      <Link className="button button-primary" to="/">
        <ArrowLeft size={15} /> Back to today
      </Link>
    </div>
  );
}
function exportData(data) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          disclaimer:
            "Personal self-reflection data. Not a clinical assessment.",
          ...data,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `mindmate-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default App;
