import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================================
   JPR COLLEGE BUS PASS
   Roles: Student (register + login), Alumni (register + ID-only login),
   Parent/Guardian (no login — register once, view ward's pass).
   Data persists in shared storage so records outlive a single session.
   ========================================================================= */

const STORAGE_KEY = "jpr-bus-directory-v1";

const ROUTES = [
  {
    number: "R-03",
    name: "Velachery – College Route",
    start: "Velachery",
    destination: "College Campus",
    stops: ["Velachery", "Guindy", "Saidapet", "College Campus"],
    departure: "7:00 AM",
    arrival: "7:50 AM",
    bus: { number: "TN-09-CY-2210", label: "3" },
  },
  {
    number: "R-05",
    name: "Tambaram – College Express",
    start: "Tambaram",
    destination: "College Campus",
    stops: ["Tambaram", "Chromepet", "Pallavaram", "College Campus"],
    departure: "6:45 AM",
    arrival: "7:55 AM",
    bus: { number: "TN-11-AZ-8802", label: "5" },
  },
  {
    number: "R-08",
    name: "Porur – College Shuttle",
    start: "Porur",
    destination: "College Campus",
    stops: ["Porur", "Mugalivakkam", "Ramapuram", "College Campus"],
    departure: "7:20 AM",
    arrival: "8:05 AM",
    bus: { number: "TN-22-DK-1190", label: "8" },
  },
  {
    number: "R-12",
    name: "Anna Nagar – College Loop",
    start: "Anna Nagar West",
    destination: "College Campus",
    stops: ["Anna Nagar West", "Koyambedu", "Thirumangalam", "Vadapalani", "College Campus"],
    departure: "7:15 AM",
    arrival: "8:10 AM",
    bus: { number: "TN-07-BX-4471", label: "12" },
  },
];

const DEPARTMENTS = [
  "Computer Science",
  "Mechanical Engg.",
  "Electronics & Comm.",
  "Civil Engineering",
  "Information Tech.",
  "Commerce",
  "Arts & Science",
];

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

function routeByNumber(num) {
  return ROUTES.find((r) => r.number === num) || ROUTES[0];
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function seedDirectory() {
  return {
    students: [
      {
        id: "STU2041",
        password: "anna123",
        name: "Ariana Fonseca",
        department: "Computer Science",
        year: "3rd Year",
        routeNumber: "R-12",
        pickupStop: "Thirumangalam",
        feesPaid: true,
        feesDueDate: "30 Jun 2026",
        validFrom: "01 Jun 2026",
        validUntil: "31 May 2027",
        expired: false,
        parent: { name: "Suresh Fonseca", phone: "98400 11122", registeredAt: "12 Jun 2026" },
        registeredAt: "28 May 2026",
      },
      {
        id: "STU2078",
        password: "karthik22",
        name: "Karthik Subramaniam",
        department: "Mechanical Engg.",
        year: "2nd Year",
        routeNumber: "R-05",
        pickupStop: "Chromepet",
        feesPaid: false,
        feesDueDate: "20 Sep 2026",
        validFrom: null,
        validUntil: null,
        expired: false,
        parent: null,
        registeredAt: "02 Sep 2026",
      },
      {
        id: "STU2033",
        password: "divya456",
        name: "Divya Nair",
        department: "Information Tech.",
        year: "4th Year",
        routeNumber: "R-03",
        pickupStop: "Guindy",
        feesPaid: true,
        feesDueDate: "30 Jun 2025",
        validFrom: "01 Jun 2025",
        validUntil: "31 May 2026",
        expired: true,
        parent: null,
        registeredAt: "20 May 2025",
      },
    ],
    alumni: [
      {
        id: "ALM1123",
        name: "Meera Pillai",
        gradYear: "2025",
        routeNumber: "R-03",
        pickupStop: "Guindy",
        registeredAt: "05 Jul 2025",
      },
    ],
  };
}

async function loadDirectory() {
  try {
    const res = await window.storage.get(STORAGE_KEY, true);
    return res ? JSON.parse(res.value) : null;
  } catch (e) {
    return null;
  }
}

async function saveDirectory(dir) {
  try {
    const res = await window.storage.set(STORAGE_KEY, JSON.stringify(dir), true);
    return !!res;
  } catch (e) {
    return false;
  }
}

/* ---------------------------- shared visuals ---------------------------- */

const COLORS = {
  navy: "#14213D",
  paper: "#F3F5F2",
  card: "#FFFFFF",
  line: "#E1E4E1",
  amber: "#E3A008",
  teal: "#1F7A6C",
  rust: "#B3392F",
  inkSoft: "#6B7078",
  ink: "#1B1F23",
};

const STATUS_STYLE = {
  Active: { bg: "#E4F1EC", fg: "#1F7A6C", dot: "#1F7A6C" },
  "Fees Pending": { bg: "#FBF0DA", fg: "#9A6A0C", dot: "#E3A008" },
  Expired: { bg: "#F1E9E7", fg: "#8A4A42", dot: "#8A4A42" },
};

const BUS_HUES = { "3": "#8A4A42", "5": "#2C5F8A", "8": "#5B4A8A", "12": "#1F7A6C" };

function computeStatus(s) {
  if (!s.feesPaid) return "Fees Pending";
  if (s.expired) return "Expired";
  return "Active";
}

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE["Fees Pending"];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: s.bg,
        color: s.fg,
        padding: "5px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot }} />
      {status}
    </span>
  );
}

function BusBadge({ label }) {
  const hue = BUS_HUES[label] || "#8B8F94";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: hue,
        color: "#fff",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        fontSize: 15,
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function RouteStripe({ route, pickupStop }) {
  const total = route.stops.length;
  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 12,
          color: COLORS.inkSoft,
          marginBottom: 8,
        }}
      >
        <span>{route.start}</span>
        <span>{route.destination}</span>
      </div>
      <div style={{ position: "relative", height: 20 }}>
        <div style={{ position: "absolute", top: 9, left: 0, right: 0, height: 2, background: "#D8DCD9" }} />
        {route.stops.map((stop, i) => {
          const left = (i / (total - 1)) * 100;
          const isPickup = stop === pickupStop;
          return (
            <div
              key={stop}
              title={stop}
              style={{ position: "absolute", top: 0, left: `${left}%`, transform: "translateX(-50%)" }}
            >
              <div
                style={{
                  width: isPickup ? 14 : 9,
                  height: isPickup ? 14 : 9,
                  borderRadius: "50%",
                  background: isPickup ? COLORS.teal : "#fff",
                  border: `2px solid ${isPickup ? COLORS.teal : "#B7BCB8"}`,
                  marginTop: isPickup ? 2 : 4,
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.teal, fontWeight: 600, marginTop: 6 }}>
        Pickup stop · {pickupStop}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft, marginBottom: 5 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: 4,
  border: `1px solid ${COLORS.line}`,
  fontSize: 14,
  fontFamily: "'IBM Plex Sans', sans-serif",
  background: "#fff",
  color: COLORS.ink,
};

function TextInput(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={onChange} style={{ ...inputStyle, appearance: "none" }}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function PrimaryButton({ children, onClick, disabled, style }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#9AA3AE" : COLORS.navy,
        color: "#fff",
        border: "none",
        borderRadius: 4,
        padding: "11px 20px",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 600,
        fontSize: 14,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        color: COLORS.navy,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 4,
        padding: "10px 16px",
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 600,
        fontSize: 13,
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function ErrorText({ children }) {
  if (!children) return null;
  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 13,
        color: COLORS.rust,
        background: "#F6E4E2",
        border: "1px solid #E9C4BF",
        borderRadius: 4,
        padding: "9px 12px",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 4,
        padding: 24,
        boxShadow: "0 1px 0 rgba(20,33,61,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------ pass card -------------------------------- */

function PassCard({ person, mode }) {
  // mode: "student" (full detail + fee banner) | "alumni" (route+bus only) | "parent" (full, read-only)
  const route = routeByNumber(person.routeNumber);
  const status = mode === "alumni" ? null : computeStatus(person);

  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, borderRadius: 4, overflow: "hidden" }}>
      <div
        style={{
          background: COLORS.navy,
          color: "#fff",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, opacity: 0.75 }}>
            {mode === "alumni" ? "Alumni Travel Card" : "JPR Bus Pass"}
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>{person.id}</div>
        </div>
        {status && <StatusPill status={status} />}
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#EFF2F0",
              color: COLORS.navy,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {initials(person.name)}
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 17, color: COLORS.ink }}>
              {person.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>
              {person.id}
              {mode !== "alumni" && ` · ${person.department} · ${person.year}`}
              {mode === "alumni" && ` · Class of ${person.gradYear}`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 22, paddingTop: 18, borderTop: `1px dashed ${COLORS.line}` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <BusBadge label={route.bus.label} />
            <div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: COLORS.inkSoft }}>Bus number</div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
                {route.bus.number}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: COLORS.inkSoft }}>Route</div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, fontWeight: 600, color: COLORS.ink }}>
              {route.number} · {route.name}
            </div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 2 }}>
              Departs {route.departure} · Arrives {route.arrival}
            </div>
          </div>
        </div>

        <RouteStripe route={route} pickupStop={person.pickupStop} />

        {mode !== "alumni" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 22,
              paddingTop: 18,
              borderTop: `1px dashed ${COLORS.line}`,
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: COLORS.inkSoft }}>Valid from</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{person.validFrom || "—"}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: COLORS.inkSoft }}>Valid until</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.ink }}>{person.validUntil || "—"}</div>
            </div>
          </div>
        )}
      </div>

      {mode !== "alumni" && !person.feesPaid && (
        <div
          style={{
            padding: "14px 24px",
            background: "#FBF0DA",
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13,
            color: "#9A6A0C",
          }}
        >
          Bus fees not yet paid. This pass will not be valid for travel until fees are paid, due by{" "}
          <strong>{person.feesDueDate}</strong>.
        </div>
      )}
    </div>
  );
}

/* -------------------------------- screens -------------------------------- */

function Header({ onHome, subtitle }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        onClick={onHome}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13,
          color: COLORS.teal,
          fontWeight: 700,
          letterSpacing: "0.02em",
          cursor: onHome ? "pointer" : "default",
          display: "inline-block",
        }}
      >
        JPR College Transport Office
      </div>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.navy, margin: "4px 0 0" }}>
        JPR Bus Pass
      </h1>
      {subtitle && <p style={{ color: COLORS.inkSoft, fontSize: 14, margin: "6px 0 0" }}>{subtitle}</p>}
    </div>
  );
}

function RoleTile({ number, title, description, onClick }) {
  return (
    <div
      onClick={onClick}
      className="role-tile"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: COLORS.card,
        border: `1px solid ${COLORS.line}`,
        borderRadius: 4,
        padding: "20px 20px",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 4,
          background: COLORS.navy,
          color: COLORS.amber,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          flexShrink: 0,
        }}
      >
        {number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.navy }}>
          {title}
        </div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: COLORS.inkSoft, marginTop: 2 }}>
          {description}
        </div>
      </div>
      <div style={{ color: COLORS.inkSoft, fontSize: 18 }}>›</div>
    </div>
  );
}

function HomeScreen({ onSelect }) {
  return (
    <div>
      <Header />
      <div
        style={{
          background: COLORS.navy,
          borderRadius: 4,
          padding: "18px 20px",
          marginBottom: 20,
          fontFamily: "'IBM Plex Sans', sans-serif",
          color: "#D8DCD9",
          fontSize: 13,
        }}
      >
        Choose how you'd like to continue. Students and alumni register their bus pass once, then log in for every
        later visit. Parents and guardians register to view their ward's pass — no login needed.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <RoleTile
          number="1"
          title="Student"
          description="Register your bus pass, or log in with your ID and password"
          onClick={() => onSelect("student")}
        />
        <RoleTile
          number="2"
          title="Alumni"
          description="Log in with your ID to view your route and bus number"
          onClick={() => onSelect("alumni")}
        />
        <RoleTile
          number="3"
          title="Parent / Guardian"
          description="Register once to view your ward's pass status and route"
          onClick={() => onSelect("parent")}
        />
      </div>
      <div style={{ marginTop: 24, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft }}>
        Student and alumni records are retained by the transport office for a minimum of two years.
      </div>
    </div>
  );
}

/* --------------------------------- student -------------------------------- */

function StudentAuth({ directory, onRegistered, onLoggedIn, onHome }) {
  const [tab, setTab] = useState("login");
  return (
    <div>
      <Header onHome={onHome} subtitle="Student bus pass" />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <GhostButton
          onClick={() => setTab("login")}
          style={tab === "login" ? { background: COLORS.navy, color: "#fff", borderColor: COLORS.navy } : {}}
        >
          Log in
        </GhostButton>
        <GhostButton
          onClick={() => setTab("register")}
          style={tab === "register" ? { background: COLORS.navy, color: "#fff", borderColor: COLORS.navy } : {}}
        >
          Register new pass
        </GhostButton>
      </div>
      {tab === "login" ? (
        <StudentLogin directory={directory} onLoggedIn={onLoggedIn} />
      ) : (
        <StudentRegister directory={directory} onRegistered={onRegistered} />
      )}
    </div>
  );
}

function StudentLogin({ directory, onLoggedIn }) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const cleanId = id.trim().toUpperCase();
    const student = directory.students.find((s) => s.id.toUpperCase() === cleanId);
    if (!student) {
      setError("No student found with that ID. Register a new pass first.");
      return;
    }
    if (student.password !== password) {
      setError("Incorrect password. Please try again.");
      return;
    }
    setError("");
    onLoggedIn(student.id);
  };

  return (
    <Card style={{ maxWidth: 420 }}>
      <ErrorText>{error}</ErrorText>
      <Field label="Student ID number">
        <TextInput value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. STU2041" />
      </Field>
      <Field label="Password">
        <TextInput
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Your pass password"
        />
      </Field>
      <PrimaryButton onClick={handleSubmit}>Log in</PrimaryButton>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 14 }}>
        Try the demo: STU2041 / anna123
      </div>
    </Card>
  );
}

function StudentRegister({ directory, onRegistered }) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    department: "",
    year: "",
    routeNumber: "",
    pickupStop: "",
    password: "",
    confirmPassword: "",
    parentName: "",
    parentPhone: "",
  });
  const [error, setError] = useState("");

  const route = form.routeNumber ? routeByNumber(form.routeNumber) : null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value, ...(key === "routeNumber" ? { pickupStop: "" } : {}) }));

  const handleSubmit = () => {
    const cleanId = form.id.trim().toUpperCase();
    if (!cleanId || !form.name.trim() || !form.department || !form.year || !form.routeNumber || !form.pickupStop) {
      setError("Please fill in every field before continuing.");
      return;
    }
    if (form.password.length < 4) {
      setError("Choose a password at least 4 characters long.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (directory.students.some((s) => s.id.toUpperCase() === cleanId)) {
      setError("A pass is already registered for this Student ID. Try logging in instead.");
      return;
    }

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 14);
    const dueDateLabel = dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const todayLabel = today.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const newStudent = {
      id: cleanId,
      password: form.password,
      name: form.name.trim(),
      department: form.department,
      year: form.year,
      routeNumber: form.routeNumber,
      pickupStop: form.pickupStop,
      feesPaid: false,
      feesDueDate: dueDateLabel,
      validFrom: null,
      validUntil: null,
      expired: false,
      parent:
        form.parentName.trim() && form.parentPhone.trim()
          ? { name: form.parentName.trim(), phone: form.parentPhone.trim(), registeredAt: todayLabel }
          : null,
      registeredAt: todayLabel,
    };

    setError("");
    onRegistered(newStudent);
  };

  return (
    <Card style={{ maxWidth: 460 }}>
      <ErrorText>{error}</ErrorText>
      <Field label="Student ID number">
        <TextInput value={form.id} onChange={set("id")} placeholder="e.g. STU2201" />
      </Field>
      <Field label="Full name">
        <TextInput value={form.name} onChange={set("name")} placeholder="As per college records" />
      </Field>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="Department">
            <Select value={form.department} onChange={set("department")} options={DEPARTMENTS} placeholder="Select" />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Year">
            <Select value={form.year} onChange={set("year")} options={YEARS} placeholder="Select" />
          </Field>
        </div>
      </div>
      <Field label="Bus route">
        <select value={form.routeNumber} onChange={set("routeNumber")} style={{ ...inputStyle, appearance: "none" }}>
          <option value="">Select a route</option>
          {ROUTES.map((r) => (
            <option key={r.number} value={r.number}>
              {r.number} — {r.name}
            </option>
          ))}
        </select>
      </Field>
      {route && (
        <Field label="Pickup stop">
          <Select value={form.pickupStop} onChange={set("pickupStop")} options={route.stops} placeholder="Select your stop" />
        </Field>
      )}
      <Field label="Choose a password">
        <TextInput type="password" value={form.password} onChange={set("password")} placeholder="At least 4 characters" />
      </Field>
      <Field label="Confirm password">
        <TextInput type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Re-enter password" />
      </Field>
      <div style={{ borderTop: `1px dashed ${COLORS.line}`, paddingTop: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft, marginBottom: 10 }}>
          Parent / guardian details (optional — can also be added later by your parent)
        </div>
        <Field label="Parent / guardian name">
          <TextInput value={form.parentName} onChange={set("parentName")} placeholder="Optional" />
        </Field>
        <Field label="Parent / guardian phone">
          <TextInput value={form.parentPhone} onChange={set("parentPhone")} placeholder="Optional" />
        </Field>
      </div>
      <PrimaryButton onClick={handleSubmit}>Register bus pass</PrimaryButton>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 14 }}>
        Your pass stays inactive for travel until the transport office confirms your bus fees payment.
      </div>
    </Card>
  );
}

function StudentDashboard({ student, onPayFees, onLogout }) {
  const status = computeStatus(student);
  return (
    <div>
      <Header onHome={onLogout} subtitle="Student dashboard" />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <GhostButton onClick={onLogout}>Log out</GhostButton>
      </div>
      <div style={{ maxWidth: 520 }}>
        <PassCard person={student} mode="student" />
        {!student.feesPaid && (
          <div style={{ marginTop: 16 }}>
            <PrimaryButton onClick={() => onPayFees(student.id)}>Mark fees as paid (simulate payment)</PrimaryButton>
          </div>
        )}
        {status === "Expired" && (
          <div style={{ marginTop: 16 }}>
            <PrimaryButton onClick={() => onPayFees(student.id, true)}>Renew pass for this academic year</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- alumni --------------------------------- */

function AlumniAuth({ directory, onRegistered, onLoggedIn, onHome }) {
  const [tab, setTab] = useState("login");
  return (
    <div>
      <Header onHome={onHome} subtitle="Alumni travel card" />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <GhostButton
          onClick={() => setTab("login")}
          style={tab === "login" ? { background: COLORS.navy, color: "#fff", borderColor: COLORS.navy } : {}}
        >
          Log in with ID
        </GhostButton>
        <GhostButton
          onClick={() => setTab("register")}
          style={tab === "register" ? { background: COLORS.navy, color: "#fff", borderColor: COLORS.navy } : {}}
        >
          Register
        </GhostButton>
      </div>
      {tab === "login" ? (
        <AlumniLogin directory={directory} onLoggedIn={onLoggedIn} />
      ) : (
        <AlumniRegister directory={directory} onRegistered={onRegistered} />
      )}
    </div>
  );
}

function AlumniLogin({ directory, onLoggedIn }) {
  const [id, setId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const cleanId = id.trim().toUpperCase();
    const alum = directory.alumni.find((a) => a.id.toUpperCase() === cleanId);
    if (!alum) {
      setError("No alumni record found with that ID. Register first.");
      return;
    }
    setError("");
    onLoggedIn(alum.id);
  };

  return (
    <Card style={{ maxWidth: 420 }}>
      <ErrorText>{error}</ErrorText>
      <Field label="Alumni ID number">
        <TextInput
          value={id}
          onChange={(e) => setId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. ALM1123"
        />
      </Field>
      <PrimaryButton onClick={handleSubmit}>View my travel card</PrimaryButton>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 14 }}>
        Alumni log in with their ID number only — no password needed. Try the demo: ALM1123
      </div>
    </Card>
  );
}

function AlumniRegister({ directory, onRegistered }) {
  const [form, setForm] = useState({ id: "", name: "", gradYear: "", routeNumber: "", pickupStop: "" });
  const [error, setError] = useState("");
  const route = form.routeNumber ? routeByNumber(form.routeNumber) : null;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value, ...(key === "routeNumber" ? { pickupStop: "" } : {}) }));

  const handleSubmit = () => {
    const cleanId = form.id.trim().toUpperCase();
    if (!cleanId || !form.name.trim() || !form.gradYear.trim() || !form.routeNumber || !form.pickupStop) {
      setError("Please fill in every field before continuing.");
      return;
    }
    if (directory.alumni.some((a) => a.id.toUpperCase() === cleanId)) {
      setError("An alumni record already exists for this ID. Try logging in instead.");
      return;
    }
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    onRegistered({
      id: cleanId,
      name: form.name.trim(),
      gradYear: form.gradYear.trim(),
      routeNumber: form.routeNumber,
      pickupStop: form.pickupStop,
      registeredAt: today,
    });
    setError("");
  };

  return (
    <Card style={{ maxWidth: 420 }}>
      <ErrorText>{error}</ErrorText>
      <Field label="Alumni ID number">
        <TextInput value={form.id} onChange={set("id")} placeholder="e.g. ALM1187" />
      </Field>
      <Field label="Full name">
        <TextInput value={form.name} onChange={set("name")} />
      </Field>
      <Field label="Graduation year">
        <TextInput value={form.gradYear} onChange={set("gradYear")} placeholder="e.g. 2024" />
      </Field>
      <Field label="Bus route">
        <select
          value={form.routeNumber}
          onChange={set("routeNumber")}
          style={{ ...inputStyle, appearance: "none" }}
        >
          <option value="">Select a route</option>
          {ROUTES.map((r) => (
            <option key={r.number} value={r.number}>
              {r.number} — {r.name}
            </option>
          ))}
        </select>
      </Field>
      {route && (
        <Field label="Pickup stop">
          <Select value={form.pickupStop} onChange={set("pickupStop")} options={route.stops} placeholder="Select your stop" />
        </Field>
      )}
      <PrimaryButton onClick={handleSubmit}>Register</PrimaryButton>
    </Card>
  );
}

function AlumniDashboard({ alum, onLogout }) {
  return (
    <div>
      <Header onHome={onLogout} subtitle="Alumni dashboard" />
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <GhostButton onClick={onLogout}>Log out</GhostButton>
      </div>
      <div style={{ maxWidth: 520 }}>
        <PassCard person={alum} mode="alumni" />
      </div>
    </div>
  );
}

/* --------------------------------- parent ---------------------------------- */

function ParentFlow({ directory, onLinkParent, onHome }) {
  const [wardId, setWardId] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [error, setError] = useState("");
  const [linkedStudentId, setLinkedStudentId] = useState(null);

  const linkedStudent = linkedStudentId ? directory.students.find((s) => s.id === linkedStudentId) : null;

  const handleSubmit = () => {
    const cleanId = wardId.trim().toUpperCase();
    if (!cleanId || !parentName.trim() || !parentPhone.trim()) {
      setError("Please fill in your ward's Student ID, your name, and your phone number.");
      return;
    }
    const student = directory.students.find((s) => s.id.toUpperCase() === cleanId);
    if (!student) {
      setError("No student found with that ID. Please check the ID with your ward or the transport office.");
      return;
    }
    setError("");
    onLinkParent(student.id, { name: parentName.trim(), phone: parentPhone.trim() });
    setLinkedStudentId(student.id);
  };

  if (linkedStudent) {
    return (
      <div>
        <Header onHome={onHome} subtitle="Parent / guardian view" />
        <div
          style={{
            background: "#E4F1EC",
            color: COLORS.teal,
            borderRadius: 4,
            padding: "10px 14px",
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 13,
            marginBottom: 16,
            maxWidth: 520,
          }}
        >
          You're now registered as the parent/guardian contact for {linkedStudent.name}.
        </div>
        <div style={{ maxWidth: 520 }}>
          <PassCard person={linkedStudent} mode="parent" />
        </div>
        <div style={{ marginTop: 16 }}>
          <GhostButton onClick={() => setLinkedStudentId(null)}>Register another ward</GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header onHome={onHome} subtitle="Parent / guardian registration" />
      <Card style={{ maxWidth: 420 }}>
        <ErrorText>{error}</ErrorText>
        <Field label="Ward's Student ID number">
          <TextInput value={wardId} onChange={(e) => setWardId(e.target.value)} placeholder="e.g. STU2041" />
        </Field>
        <Field label="Your name">
          <TextInput value={parentName} onChange={(e) => setParentName(e.target.value)} />
        </Field>
        <Field label="Your phone number">
          <TextInput
            value={parentPhone}
            onChange={(e) => setParentPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </Field>
        <PrimaryButton onClick={handleSubmit}>Register &amp; view pass</PrimaryButton>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: COLORS.inkSoft, marginTop: 14 }}>
          Parents don't need a separate login — register once to see your ward's pass status, route, and bus number.
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------- root app -------------------------------- */

export default function JPRBusApp() {
  const [directory, setDirectory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [screen, setScreen] = useState("home"); // home | student | alumni | parent
  const [studentSessionId, setStudentSessionId] = useState(null);
  const [alumniSessionId, setAlumniSessionId] = useState(null);

  useEffect(() => {
    (async () => {
      const existing = await loadDirectory();
      if (existing) {
        setDirectory(existing);
      } else {
        const seeded = seedDirectory();
        setDirectory(seeded);
        await saveDirectory(seeded);
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setDirectory(next);
    const ok = await saveDirectory(next);
    if (!ok) setSaveError("Your change was saved for this visit, but couldn't be stored permanently. Please try again.");
    else setSaveError("");
  }, []);

  const goHome = () => {
    setScreen("home");
    setStudentSessionId(null);
    setAlumniSessionId(null);
  };

  const handleStudentRegistered = (newStudent) => {
    const next = { ...directory, students: [...directory.students, newStudent] };
    persist(next);
    setStudentSessionId(newStudent.id);
  };

  const handleAlumniRegistered = (newAlum) => {
    const next = { ...directory, alumni: [...directory.alumni, newAlum] };
    persist(next);
    setAlumniSessionId(newAlum.id);
  };

  const handlePayFees = (studentId, renew) => {
    const today = new Date();
    const validUntil = new Date(today);
    validUntil.setFullYear(validUntil.getFullYear() + 1);
    const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const next = {
      ...directory,
      students: directory.students.map((s) =>
        s.id === studentId
          ? { ...s, feesPaid: true, expired: false, validFrom: fmt(today), validUntil: fmt(validUntil) }
          : s
      ),
    };
    persist(next);
  };

  const handleLinkParent = (studentId, parentInfo) => {
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const next = {
      ...directory,
      students: directory.students.map((s) =>
        s.id === studentId ? { ...s, parent: { ...parentInfo, registeredAt: today } } : s
      ),
    };
    persist(next);
  };

  if (loading || !directory) {
    return (
      <div style={{ minHeight: "100%", background: COLORS.paper, padding: "60px 20px", textAlign: "center" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');`}</style>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", color: COLORS.inkSoft }}>Loading transport office records…</div>
      </div>
    );
  }

  const currentStudent = studentSessionId ? directory.students.find((s) => s.id === studentSessionId) : null;
  const currentAlum = alumniSessionId ? directory.alumni.find((a) => a.id === alumniSessionId) : null;

  return (
    <div style={{ minHeight: "100%", background: COLORS.paper, padding: "28px 20px", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .role-tile { transition: background 120ms ease, border-color 120ms ease; }
        .role-tile:hover { background: #EAEDEA; border-color: #C7CBC8; }
        input:focus, select:focus { outline: 2px solid #1F7A6C; outline-offset: 1px; }
      `}</style>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {saveError && (
          <div
            style={{
              background: "#FBF0DA",
              color: "#9A6A0C",
              padding: "10px 14px",
              borderRadius: 4,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {saveError}
          </div>
        )}

        {screen === "home" && <HomeScreen onSelect={setScreen} />}

        {screen === "student" &&
          (currentStudent ? (
            <StudentDashboard student={currentStudent} onPayFees={handlePayFees} onLogout={goHome} />
          ) : (
            <StudentAuth
              directory={directory}
              onRegistered={handleStudentRegistered}
              onLoggedIn={setStudentSessionId}
              onHome={goHome}
            />
          ))}

        {screen === "alumni" &&
          (currentAlum ? (
            <AlumniDashboard alum={currentAlum} onLogout={goHome} />
          ) : (
            <AlumniAuth
              directory={directory}
              onRegistered={handleAlumniRegistered}
              onLoggedIn={setAlumniSessionId}
              onHome={goHome}
            />
          ))}

        {screen === "parent" && <ParentFlow directory={directory} onLinkParent={handleLinkParent} onHome={goHome} />}
      </div>
    </div>
  );
}
