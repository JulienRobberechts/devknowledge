import { useEffect } from "react";

const FONTS: {
  name: string;
  family: string;
  weight: number;
  category: string;
}[] = [
  // Geometric — proches du logo
  {
    name: "Montserrat 600",
    family: "Montserrat",
    weight: 600,
    category: "Geometric",
  },
  {
    name: "Montserrat 700",
    family: "Montserrat",
    weight: 700,
    category: "Geometric",
  },
  {
    name: "Raleway 600",
    family: "Raleway",
    weight: 600,
    category: "Geometric",
  },
  {
    name: "Raleway 700",
    family: "Raleway",
    weight: 700,
    category: "Geometric",
  },
  {
    name: "Josefin Sans",
    family: "Josefin Sans",
    weight: 600,
    category: "Geometric",
  },
  {
    name: "Poppins 600",
    family: "Poppins",
    weight: 600,
    category: "Geometric",
  },
  {
    name: "Outfit 600",
    family: "Outfit",
    weight: 600,
    category: "Geometric",
  },
  {
    name: "Outfit 700",
    family: "Outfit",
    weight: 700,
    category: "Geometric",
  },
  { name: "Syne 700", family: "Syne", weight: 700, category: "Geometric" },
  { name: "Syne 800", family: "Syne", weight: 800, category: "Geometric" },
  {
    name: "Space Grotesk",
    family: "Space Grotesk",
    weight: 700,
    category: "Geometric",
  },
  {
    name: "Plus Jakarta Sans",
    family: "Plus Jakarta Sans",
    weight: 700,
    category: "Geometric",
  },
  {
    name: "DM Sans 700",
    family: "DM Sans",
    weight: 700,
    category: "Geometric",
  },
  {
    name: "Nunito 700",
    family: "Nunito",
    weight: 700,
    category: "Geometric",
  },
  // Tech / futuriste
  { name: "Orbitron 700", family: "Orbitron", weight: 700, category: "Tech" },
  { name: "Oxanium 600", family: "Oxanium", weight: 600, category: "Tech" },
  { name: "Audiowide", family: "Audiowide", weight: 400, category: "Tech" },
  { name: "Exo 2 — 600", family: "Exo 2", weight: 600, category: "Tech" },
  { name: "Rajdhani 600", family: "Rajdhani", weight: 600, category: "Tech" },
  { name: "Saira 600", family: "Saira", weight: 600, category: "Tech" },
  { name: "Teko 500", family: "Teko", weight: 500, category: "Tech" },
  // Elegant / serif
  { name: "Cinzel 600", family: "Cinzel", weight: 600, category: "Elegant" },
  { name: "Cinzel 700", family: "Cinzel", weight: 700, category: "Elegant" },
  {
    name: "Cormorant 700",
    family: "Cormorant",
    weight: 700,
    category: "Elegant",
  },
  {
    name: "Playfair Display",
    family: "Playfair Display",
    weight: 700,
    category: "Elegant",
  },
  // Display / Impact
  {
    name: "Bebas Neue",
    family: "Bebas Neue",
    weight: 400,
    category: "Display",
  },
  {
    name: "Big Shoulders Display",
    family: "Big Shoulders Display",
    weight: 700,
    category: "Display",
  },
  { name: "Barlow 700", family: "Barlow", weight: 700, category: "Display" },
  { name: "Inter 700", family: "Inter", weight: 700, category: "Display" },
];

function buildGoogleFontsUrl(fonts: typeof FONTS) {
  const families = new Map<string, Set<number>>();
  for (const f of fonts) {
    if (!families.has(f.family)) families.set(f.family, new Set());
    families.get(f.family)?.add(f.weight);
  }
  const params = [...families.entries()]
    .map(([family, weights]) => {
      const w = [...weights].sort().join(";");
      const encoded = family.replace(/ /g, "+");
      return `family=${encoded}:wght@${w}`;
    })
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

const CATEGORIES = [...new Set(FONTS.map((f) => f.category))];

const CATEGORY_COLORS: Record<string, string> = {
  Geometric: "bg-yellow-100 text-yellow-700",
  Tech: "bg-slate-200 text-slate-700",
  Elegant: "bg-amber-100 text-amber-700",
  Display: "bg-amber-200 text-amber-800",
};

export default function FontPreviewPage() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = buildGoogleFontsUrl(FONTS);
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-audiowide">
            Aperçu des polices — ARGOS
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Page cachée accessible via{" "}
            <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">
              /font-preview
            </code>{" "}
            — choisir la police la plus proche du logo.
          </p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {CATEGORIES.map((cat) => (
              <span
                key={cat}
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat]}`}
              >
                {cat} ({FONTS.filter((f) => f.category === cat).length})
              </span>
            ))}
          </div>
        </div>

        {/* Grid par catégorie */}
        {CATEGORIES.map((cat) => (
          <div key={cat}>
            <h2
              className={`text-xs font-semibold uppercase tracking-widest mb-3 px-1 ${CATEGORY_COLORS[cat].split(" ")[1]}`}
            >
              {cat}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {FONTS.filter((f) => f.category === cat).map((font) => (
                <div
                  key={font.name}
                  className="rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white"
                >
                  {/* Preview dark */}
                  <div
                    className="flex flex-col items-center justify-center gap-3 py-5 px-3"
                    style={{
                      background:
                        "linear-gradient(135deg, #0c1a2e 0%, #0d2d5e 60%, #0c3875 100%)",
                    }}
                  >
                    <img
                      src="/logo-argos.jpg"
                      alt="Argos"
                      className="h-12 w-auto rounded-lg"
                    />
                    <span
                      style={{
                        fontFamily: `'${font.family}', sans-serif`,
                        fontWeight: font.weight,
                        letterSpacing: "0.15em",
                        fontSize: "1.35rem",
                        background:
                          "linear-gradient(90deg, #92400e 0%, #d97706 50%, #fcd34d 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      ARGOS
                    </span>
                  </div>
                  {/* Label */}
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 truncate">
                      {font.family}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                      {font.weight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
