const PALETTE = {
  name: "Acier & Soleil",
  desc: "Gris acier industriel rehaussé d'un jaune solaire.",
  banner: "linear-gradient(135deg, #111827 0%, #1f2937 60%, #374151 100%)",
  accent: "linear-gradient(90deg, #92400e 0%, #d97706 40%, #fcd34d 100%)",
  border: "#d97706",
  swatches: [
    { label: "Carbone", hex: "#111827", usage: "Fond principal" },
    { label: "Acier", hex: "#1f2937", usage: "Fond secondaire" },
    { label: "Ardoise", hex: "#374151", usage: "Fond tertiaire" },
    { label: "Bronze", hex: "#92400e", usage: "Accent foncé" },
    { label: "Soleil", hex: "#d97706", usage: "Accent principal" },
    { label: "Jaune", hex: "#fcd34d", usage: "Accent clair" },
    { label: "Ciel", hex: "#38bdf8", usage: "Interactif / liens" },
  ],
};

function Swatch({
  hex,
  label,
  usage,
}: {
  hex: string;
  label: string;
  usage: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-xl flex-shrink-0 shadow border border-black/10"
        style={{ background: hex }}
      />
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs font-mono text-slate-400">{hex}</p>
        <p className="text-xs text-slate-400">{usage}</p>
      </div>
    </div>
  );
}

export default function ColorPalettePage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{PALETTE.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{PALETTE.desc}</p>
      </div>

      {/* Aperçu bandeau */}
      <div
        className="rounded-2xl p-6 flex items-center gap-5"
        style={{ background: PALETTE.banner }}
      >
        <div
          className="w-16 h-16 rounded-full bg-white flex-shrink-0"
          style={{ border: `5px solid ${PALETTE.border}` }}
        />
        <div
          style={{ display: "inline-grid", gridTemplateColumns: "max-content" }}
        >
          <span
            style={{
              fontFamily: "'Audiowide', sans-serif",
              fontSize: "2rem",
              lineHeight: 1,
              display: "flex",
              justifyContent: "space-between",
              background: PALETTE.accent,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            {"ARGOS".split("").map((c, i) => (
              <span key={i}>{c}</span>
            ))}
          </span>
          <span
            className="text-xs font-medium"
            style={{
              textAlign: "justify",
              textAlignLast: "justify",
              background: PALETTE.accent,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            Knowledge Intelligence Platform
          </span>
        </div>
      </div>

      {/* Nuancier */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
          Nuancier
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PALETTE.swatches.map((s) => (
            <Swatch key={s.hex} {...s} />
          ))}
        </div>
      </div>

      {/* Dégradés */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
          Dégradés
        </h2>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-1">Fond bandeau</p>
            <div
              className="h-10 rounded-lg"
              style={{ background: PALETTE.banner }}
            />
            <p className="text-[10px] font-mono text-slate-400 mt-1">
              {PALETTE.banner}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Accent texte</p>
            <div
              className="h-10 rounded-lg"
              style={{ background: PALETTE.accent }}
            />
            <p className="text-[10px] font-mono text-slate-400 mt-1">
              {PALETTE.accent}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
