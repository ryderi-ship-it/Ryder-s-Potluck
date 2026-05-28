import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jpgzfrmitflhcefjjzda.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ3pmcm1pdGZsaGNlZmpqemRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5ODA0OTIsImV4cCI6MjA5NTU1NjQ5Mn0.h2ZPKJ2tdl1JCbWFMBm99qIcipbFmxKbrJkkMTvpJDw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
realtime: { params: { eventsPerSecond: 10 } },
});

const CATEGORIES = [
{
id: "apps", label: "Appetizers & Snacks", emoji: "🧀",
slots: [
{ id: "a1", item: "Cheese & Charcuterie Board" },
{ id: "a2", item: "Dips & Chips" },
{ id: "a3", item: "Bruschetta / Crostini" },
{ id: "a4", item: "Veggie Platter" },
],
},
{
id: "mains", label: "Mains & Sides", emoji: "🍲",
slots: [
{ id: "m1", item: "Main Dish (Meat)" },
{ id: "m2", item: "Main Dish (Veggie)" },
{ id: "m3", item: "Salad" },
{ id: "m4", item: "Bread / Rolls" },
{ id: "m5", item: "Side Dish" },
],
},
{
id: "desserts", label: "Desserts", emoji: "🍰",
slots: [
{ id: "d1", item: "Cake or Pie" },
{ id: "d2", item: "Cookies / Brownies" },
{ id: "d3", item: "Fruit Dish" },
],
},
{
id: "drinks", label: "Drinks & Alcohol", emoji: "🍷",
slots: [
{ id: "dr1", item: "Red Wine" },
{ id: "dr2", item: "White Wine / Rosé" },
{ id: "dr3", item: "Beer / Cider (6-pack+)" },
{ id: "dr4", item: "Spirits / Cocktail Mixer" },
{ id: "dr5", item: "Non-Alcoholic Beverages" },
{ id: "dr6", item: "Sparkling / Soda / Mixer" },
],
},
];

const ACCENT: Record<string, string> = {
apps: "#e8a87c",
mains: "#7bbfa8",
desserts: "#d98fa3",
drinks: "#9b8fc7",
};

type Signup = { name: string; note: string };

export default function PotluckSignup() {
const [signups, setSignups] = useState<Record<string, Signup>>({});
const [activeSlot, setActiveSlot] = useState<string | null>(null);
const [nameInput, setNameInput] = useState("");
const [noteInput, setNoteInput] = useState("");
const [loading, setLoading] = useState(true);
const [status, setStatus] = useState("connecting...");

const fetchSignups = useCallback(async () => {
const { data, error } = await supabase.from("signups").select("*");
if (error) { console.error("Fetch error:", error); return; }
if (data) {
const map: Record<string, Signup> = {};
data.forEach((row: any) => {
map[row.slot_id] = { name: row.name, note: row.note };
});
setSignups(map);
}
setLoading(false);
}, []);

useEffect(() => {
fetchSignups();
const channel = supabase
.channel("signups-changes", { config: { broadcast: { self: true } } })
.on("postgres_changes", { event: "*", schema: "public", table: "signups" },
() => { fetchSignups(); }
)
.subscribe((s) => {
setStatus(s === "SUBSCRIBED" ? "live" : s);
});
return () => { supabase.removeChannel(channel); };
}, [fetchSignups]);

function openModal(slotId: string) {
setActiveSlot(slotId);
setNameInput("");
setNoteInput("");
}

function closeModal() { setActiveSlot(null); }

async function handleClaim() {
if (!nameInput.trim() || !activeSlot) return;
const { error } = await supabase.from("signups").upsert({
slot_id: activeSlot,
name: nameInput.trim(),
note: noteInput.trim(),
}, { onConflict: "slot_id" });
if (error) { console.error("Claim error:", error); return; }
await fetchSignups();
closeModal();
}

async function handleUnclaim(slotId: string) {
const { error } = await supabase.from("signups").delete().eq("slot_id", slotId);
if (error) { console.error("Unclaim error:", error); return; }
await fetchSignups();
}

const totalSlots = CATEGORIES.flatMap((c) => c.slots).length;
const claimed = Object.keys(signups).length;
const activeSlotData = activeSlot
? CATEGORIES.flatMap((c) => c.slots).find((s) => s.id === activeSlot)
: null;

return (
<div style={styles.root}>
<div style={styles.grain} />
<header style={styles.header}>
<div style={styles.headerTag}>POTLUCK</div>
<h1 style={styles.title}>What Are You Bringing?</h1>
<p style={styles.subtitle}>Claim a slot, bring the goods.</p>
<div style={styles.progressBar}>
<div style={{ ...styles.progressFill, width: `${(claimed / totalSlots) * 100}%` }} />
</div>
<div style={styles.progressLabel}>
{loading ? "Loading..." : `${claimed} of ${totalSlots} slots filled`}
</div>
<div style={styles.statusDot}>
<span style={{ ...styles.dot, background: status === "live" ? "#7bbfa8" : "#888" }} />
<span style={styles.statusText}>{status}</span>
</div>
</header>

<main style={styles.main}>
{CATEGORIES.map((cat) => (
<section key={cat.id} style={styles.section}>
<div style={styles.sectionHeader}>
<span style={styles.sectionEmoji}>{cat.emoji}</span>
<h2 style={{ ...styles.sectionTitle, color: ACCENT[cat.id] }}>{cat.label}</h2>
<div style={{ ...styles.sectionLine, background: ACCENT[cat.id] }} />
</div>
<div style={styles.grid}>
{cat.slots.map((slot) => {
const claim = signups[slot.id];
return (
<div
key={slot.id}
style={{
...styles.card,
...(claim ? styles.cardClaimed : styles.cardOpen),
borderColor: claim ? ACCENT[cat.id] : "rgba(255,255,255,0.08)",
}}
>
<div style={styles.cardItem}>{slot.item}</div>
{claim ? (
<div style={styles.claimedBlock}>
<div style={styles.claimedName}>✓ {claim.name}</div>
{claim.note && <div style={styles.claimedNote}>"{claim.note}"</div>}
<button style={styles.unclaimBtn} onClick={() => handleUnclaim(slot.id)}>
release
</button>
</div>
) : (
<button
style={{ ...styles.claimBtn, background: ACCENT[cat.id] }}
onClick={() => openModal(slot.id)}
>
I've got this
</button>
)}
</div>
);
})}
</div>
</section>
))}
</main>

{activeSlot && activeSlotData && (
<div style={styles.overlay} onClick={closeModal}>
<div style={styles.modal} onClick={(e) => e.stopPropagation()}>
<div style={styles.modalLabel}>SIGNING UP FOR</div>
<div style={styles.modalItem}>{activeSlotData.item}</div>
<input
style={styles.input}
placeholder="Your name *"
value={nameInput}
onChange={(e) => setNameInput(e.target.value)}
onKeyDown={(e) => e.key === "Enter" && handleClaim()}
autoFocus
/>
<input
style={styles.input}
placeholder="Note (optional — brand, quantity, dietary...)"
value={noteInput}
onChange={(e) => setNoteInput(e.target.value)}
onKeyDown={(e) => e.key === "Enter" && handleClaim()}
/>
<div style={styles.modalButtons}>
<button style={styles.cancelBtn} onClick={closeModal}>cancel</button>
<button
style={{
...styles.confirmBtn,
opacity: nameInput.trim() ? 1 : 0.45,
cursor: nameInput.trim() ? "pointer" : "default",
}}
onClick={handleClaim}
>
Claim it →
</button>
</div>
</div>
</div>
)}

<footer style={styles.footer}>
<div style={styles.footerSmall}>Eat well. Drink good. Show up on time.</div>
</footer>
</div>
);
}

const styles: Record<string, React.CSSProperties> = {
root: { minHeight: "100vh", background: "#111010", fontFamily: "'Georgia', 'Times New Roman', serif", color: "#f0ebe3", position: "relative", overflowX: "hidden" },
grain: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", backgroundSize: "200px 200px", pointerEvents: "none", zIndex: 0, opacity: 0.6 },
header: { textAlign: "center", padding: "60px 24px 36px", position: "relative", zIndex: 1 },
headerTag: { display: "inline-block", fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "0.3em", color: "#888", border: "1px solid #333", padding: "4px 14px", marginBottom: "20px" },
title: { fontSize: "clamp(32px, 6vw, 64px)", fontWeight: "normal", fontStyle: "italic", margin: "0 0 10px", letterSpacing: "-0.01em", lineHeight: 1.1 },
subtitle: { fontFamily: "'Courier New', monospace", fontSize: "13px", color: "#666", letterSpacing: "0.15em", margin: "0 0 28px" },
progressBar: { width: "240px", height: "3px", background: "#222", margin: "0 auto 10px", borderRadius: "2px", overflow: "hidden" },
progressFill: { height: "100%", background: "linear-gradient(90deg, #e8a87c, #d98fa3)", transition: "width 0.5s ease", borderRadius: "2px" },
progressLabel: { fontFamily: "'Courier New', monospace", fontSize: "11px", color: "#555", letterSpacing: "0.1em" },
statusDot: { display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "8px" },
dot: { width: "6px", height: "6px", borderRadius: "50%", display: "inline-block" },
statusText: { fontFamily: "'Courier New', monospace", fontSize: "10px", color: "#555", letterSpacing: "0.1em" },
main: { maxWidth: "900px", margin: "0 auto", padding: "0 20px 60px", position: "relative", zIndex: 1 },
section: { marginBottom: "52px" },
sectionHeader: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" },
sectionEmoji: { fontSize: "22px" },
sectionTitle: { fontSize: "13px", fontFamily: "'Courier New', monospace", letterSpacing: "0.25em", textTransform: "uppercase", margin: 0, fontWeight: "normal" },
sectionLine: { flex: 1, height: "1px", opacity: 0.25 },
grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" },
card: { borderRadius: "4px", border: "1px solid", padding: "16px 18px", transition: "border-color 0.2s", display: "flex", flexDirection: "column", gap: "12px" },
cardOpen: { background: "rgba(255,255,255,0.03)" },
cardClaimed: { background: "rgba(255,255,255,0.05)" },
cardItem: { fontSize: "15px", lineHeight: 1.4, fontStyle: "italic", color: "#ddd" },
claimedBlock: { display: "flex", flexDirection: "column", gap: "4px" },
claimedName: { fontFamily: "'Courier New', monospace", fontSize: "12px", color: "#aaa", letterSpacing: "0.05em" },
claimedNote: { fontSize: "11px", color: "#666", fontStyle: "italic" },
unclaimBtn: { background: "none", border: "none", color: "#444", fontFamily: "'Courier New', monospace", fontSize: "10px", cursor: "pointer", padding: 0, letterSpacing: "0.1em", textDecoration: "underline", marginTop: "4px", textAlign: "left" },
claimBtn: { border: "none", borderRadius: "2px", padding: "8px 14px", fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer", color: "#111", fontWeight: "bold", transition: "opacity 0.15s", alignSelf: "flex-start" },
overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
modal: { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: "6px", padding: "32px", width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "16px" },
modalLabel: { fontFamily: "'Courier New', monospace", fontSize: "10px", letterSpacing: "0.3em", color: "#555" },
modalItem: { fontSize: "22px", fontStyle: "italic", color: "#f0ebe3", lineHeight: 1.3 },
input: { background: "#111", border: "1px solid #2d2d2d", borderRadius: "3px", padding: "12px 14px", color: "#f0ebe3", fontSize: "14px", fontFamily: "'Georgia', serif", outline: "none", width: "100%", boxSizing: "border-box" },
modalButtons: { display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "4px" },
cancelBtn: { background: "none", border: "1px solid #333", borderRadius: "2px", padding: "9px 18px", color: "#555", fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "0.1em", cursor: "pointer" },
confirmBtn: { background: "#e8a87c", border: "none", borderRadius: "2px", padding: "9px 20px", color: "#111", fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "0.1em", fontWeight: "bold", transition: "opacity 0.15s" },
footer: { textAlign: "center", padding: "0 20px 48px", position: "relative", zIndex: 1 },
footerSmall: { fontStyle: "italic", fontSize: "13px", color: "#333" },
};
