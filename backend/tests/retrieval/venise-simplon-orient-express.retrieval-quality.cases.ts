// Each case: the question, the keyword that must appear in the retrieved chunk,
// and topK (default 1). topK > 1 means the keyword must appear in any of the
// top-K results — used for questions where the answer is semantically adjacent
// to a larger narrative chunk and exact top-1 precision is harder.
export const RETRIEVAL_CASES: {
  question: string;
  expectedKeyword: string;
  topK?: number;
}[] = [
  {
    question: "Qui a créé le Venise-Simplon-Orient-Express ?",
    expectedKeyword: "Sherwood",
  },
  {
    question: "En quelle année le VSOE a-t-il été créé ?",
    expectedKeyword: "1982",
  },
  {
    question: "Quelle entreprise exploite le VSOE ?",
    expectedKeyword: "Belmond",
  },
  {
    question: "Quel groupe est propriétaire de Belmond depuis fin 2018 ?",
    expectedKeyword: "LVMH",
  },
  {
    question: "Quel chef supervise la carte du restaurant du VSOE ?",
    expectedKeyword: "Imbert",
    topK: 10,
  },
  {
    question: "De combien de voitures est composée la rame du VSOE ?",
    expectedKeyword: "18",
  },
  {
    question: "Quel style artistique caractérise la décoration du train ?",
    expectedKeyword: "Art Déco",
    topK: 5,
  },
  {
    question: "Quel décorateur a travaillé sur la voiture-restaurant Côte d'Azur ?",
    expectedKeyword: "Lalique",
  },
  {
    question: "Pourquoi la desserte de Londres a-t-elle été abandonnée en 2023 ?",
    expectedKeyword: "Brexit",
    topK: 2,
  },
  {
    question: "Où sont effectuées les maintenances des voitures du VSOE ?",
    expectedKeyword: "Clermont-Ferrand",
  },
];
