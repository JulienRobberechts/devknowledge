import { useEffect, useRef } from "react";
import { type Step } from "./steps-data";

function SectionTitle({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div
        className="w-0.5 h-3 rounded-sm flex-shrink-0"
        style={{ background: color }}
      />
      <h3 className="text-[0.65rem] uppercase tracking-widest font-bold text-slate-500">
        {children}
      </h3>
    </div>
  );
}

function Annotation({ children }: { children: string }) {
  return (
    <div className="bg-amber-950/30 border border-amber-700/20 rounded-lg p-3 text-[0.78rem] leading-relaxed text-amber-300/90">
      {children}
    </div>
  );
}

function Formula({ children }: { children: string }) {
  return (
    <pre className="bg-[#010409] border border-purple-800/20 rounded-lg p-3 font-mono text-[0.72rem] text-purple-300 leading-relaxed whitespace-pre-wrap overflow-x-auto">
      {children}
    </pre>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-[#010409] border border-slate-800 rounded-lg p-3 font-mono text-[0.68rem] leading-relaxed overflow-x-auto whitespace-pre text-slate-300">
      {code}
    </pre>
  );
}

// ── Extras ────────────────────────────────────────────────────

function VectorChart({ phase }: { phase: "ing" | "q" | "gen" | "eval" }) {
  const accent = phase === "ing" ? "#58a6ff" : "#3fb950";
  const dims = Array.from({ length: 40 }, () => Math.random() * 2 - 1);
  return (
    <div>
      <div className="flex gap-0.5 items-end h-12">
        {dims.map((v, i) => (
          <div
            key={i}
            className="flex-1 min-w-[4px] max-w-[10px] rounded-sm"
            style={{
              height: `${Math.abs(v) * 100}%`,
              background: v >= 0 ? accent : "#f78166",
              alignSelf: v >= 0 ? "flex-end" : "flex-start",
            }}
          />
        ))}
      </div>
      <p className="text-[0.65rem] text-slate-500 mt-2 font-mono">
        <span style={{ color: accent }}>■</span> positif &nbsp;
        <span className="text-[#f78166]">■</span> négatif &nbsp;&nbsp; 1536
        dimensions au total
      </p>
    </div>
  );
}

function ChunkDiagram() {
  const text =
    "La recherche vectorielle utilise des embeddings de haute dimension pour capturer la sémantique des documents et des requêtes permettant de trouver des passages pertinents.";
  const words = text.split(" ");
  const colors = ["#58a6ff", "#3fb950", "#bc8cff"];
  const chunks = [
    words.slice(0, 12).join(" "),
    words.slice(8, 20).join(" "),
    words.slice(16, 28).join(" "),
  ];
  return (
    <div>
      <div className="relative h-20">
        {chunks.map((c, i) => (
          <div
            key={i}
            className="absolute h-5 rounded flex items-center px-2 font-mono text-[0.62rem] overflow-hidden whitespace-nowrap"
            style={{
              top: `${i * 26}px`,
              left: `${i * 14}px`,
              right: 0,
              background: `${colors[i]}18`,
              border: `1px solid ${colors[i]}40`,
              color: colors[i],
            }}
          >
            {c.slice(0, 55)}…
          </div>
        ))}
      </div>
      <p className="text-[0.65rem] text-slate-500 mt-2">
        Chaque chunk partage ~50 tokens avec le suivant → continuité
        contextuelle
      </p>
    </div>
  );
}

function RrfVisual() {
  const topHit = "border-purple-500/50 text-purple-300";
  const normal = "border-slate-700 text-slate-400";
  const Row = ({
    name,
    score,
    top,
  }: {
    name: string;
    score: string;
    top?: boolean;
  }) => (
    <div
      className={`flex justify-between items-center px-2 py-1 rounded border mb-1 text-[0.68rem] font-mono ${top ? topHit : normal}`}
      style={{
        background: top ? "rgba(188,140,255,0.06)" : "rgba(255,255,255,0.02)",
      }}
    >
      <span>{name}</span>
      <span className="text-slate-500 text-[0.62rem]">{score}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_20px_1fr] gap-2 items-start font-mono text-[0.68rem]">
        <div>
          <p className="text-[0.62rem] text-slate-600 uppercase tracking-wide mb-1.5">
            Vecteur top-5
          </p>
          <Row name="Chunk A" score="rank 1 → 0.0161" top />
          <Row name="Chunk C" score="rank 2 → 0.0159" />
          <Row name="Chunk B" score="rank 3 → 0.0156" />
          <Row name="Chunk E" score="rank 4 → 0.0154" />
          <Row name="Chunk D" score="rank 5 → 0.0152" />
        </div>
        <div className="flex items-center justify-center text-purple-400 text-lg pt-6">
          ⊕
        </div>
        <div>
          <p className="text-[0.62rem] text-slate-600 uppercase tracking-wide mb-1.5">
            BM25 top-5
          </p>
          <Row name="Chunk B" score="rank 1 → 0.0161" />
          <Row name="Chunk A" score="rank 2 → 0.0159" top />
          <Row name="Chunk F" score="rank 3 → 0.0156" />
          <Row name="Chunk D" score="rank 4 → 0.0154" />
          <Row name="Chunk C" score="rank 5 → 0.0152" />
        </div>
      </div>
      <div>
        <p className="text-[0.62rem] text-slate-600 uppercase tracking-wide mb-1.5 font-mono">
          RRF fusionné
        </p>
        <Row name="Chunk A" score="0.0161+0.0159 = 0.0320 🥇" top />
        <Row name="Chunk B" score="0.0156+0.0161 = 0.0317 🥈" />
        <Row name="Chunk C" score="0.0159+0.0152 = 0.0311 🥉" />
      </div>
    </div>
  );
}

function TokenStream() {
  const text =
    "La recherche hybride combine deux approches complémentaires : la recherche vectorielle (similarité sémantique) et BM25 (correspondance lexicale). La fusion via RRF...";
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = "";
    text.split("").forEach((char, i) => {
      const span = document.createElement("span");
      span.textContent = char;
      span.style.opacity = "0";
      span.style.animation = `tokenAppear 0.05s ease ${i * 20}ms forwards`;
      el.appendChild(span);
    });
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-[#010409] border border-slate-800 rounded-lg p-3 font-mono text-[0.73rem] leading-relaxed text-slate-300 min-h-[56px]"
    />
  );
}

// ── Main component ────────────────────────────────────────────
export default function DetailPanel({ step }: { step: Step | null }) {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-[0.82rem] text-center px-4">
        <span className="text-3xl mb-3">👆</span>
        Cliquez sur une étape ou lancez
        <br />
        la lecture pour voir les détails
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Annotation */}
      <div>
        <SectionTitle color="#e3b341">Contexte</SectionTitle>
        <Annotation>{step.annotation}</Annotation>
      </div>

      {/* Formula */}
      {step.formula && (
        <div>
          <SectionTitle color="#bc8cff">Formule / Requête clé</SectionTitle>
          <Formula>{step.formula}</Formula>
        </div>
      )}

      {/* Extras */}
      {(step.extra === "vector-chart" || step.extra === "vector-chart-q") && (
        <div>
          <SectionTitle color="#3fb950">
            Visualisation du vecteur (40 dims / 1536)
          </SectionTitle>
          <VectorChart phase={step.phase} />
        </div>
      )}

      {step.extra === "chunk-diagram" && (
        <div>
          <SectionTitle color="#3fb950">
            Overlap entre chunks (fenêtre glissante)
          </SectionTitle>
          <ChunkDiagram />
        </div>
      )}

      {step.extra === "rrf-visual" && (
        <div>
          <SectionTitle color="#3fb950">Fusion RRF — Exemple</SectionTitle>
          <RrfVisual />
        </div>
      )}

      {step.extra === "token-stream" && (
        <div>
          <SectionTitle color="#3fb950">
            Streaming de tokens (simulé)
          </SectionTitle>
          <TokenStream />
        </div>
      )}

      {/* Code */}
      <div>
        <SectionTitle color="#58a6ff">Code — {step.label}</SectionTitle>
        <CodeBlock code={step.code} />
      </div>
    </div>
  );
}
