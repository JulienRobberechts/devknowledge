import {
  orientExpress,
  veniseSimplonOrientExpress,
} from "../../../tests/DOCUMENTS/orient-express-texts";
import recursiveOrientExpressSize150 from "./ChunkingStrategies.snapshots/recursive-orient-express-size150";
import recursiveVsoeSize100 from "./ChunkingStrategies.snapshots/recursive-vsoe-size100";
import sentenceOrientExpressSize100Overlap30 from "./ChunkingStrategies.snapshots/sentence-orient-express-size100-overlap30";
import sentenceVsoeSize80Overlap20 from "./ChunkingStrategies.snapshots/sentence-vsoe-size80-overlap20";
import sentenceVsoeSize100Overlap30 from "./ChunkingStrategies.snapshots/sentence-vsoe-size100-overlap30";
import sentenceVsoeSize512Overlap128 from "./ChunkingStrategies.snapshots/sentence-vsoe-size512-overlap128";

export type ChunkCase = {
  text: string;
  size: number;
  overlap?: number;
  expected: string[];
};

export type DocumentChunkCase = {
  name: string;
  text: string;
  size: number;
  overlap?: number;
  expected: string[];
};

export const recursiveCases: ChunkCase[] = [
  {
    text: "",
    size: 10,
    expected: [],
  },
  {
    text: "hello world",
    size: 100,
    expected: ["hello world"],
  },
  {
    text: "a b c d\n\ne f g h i j k l m n",
    size: 5,
    expected: ["a b c d", "f g h i", "k l m n"],
  },
  {
    text: "hello world foo bar baz",
    size: 3,
    expected: ["hello world", "bar baz"],
  },
];

export const recursiveDocumentCases: DocumentChunkCase[] = [
  {
    name: "orient-express size=150",
    text: orientExpress.replace(/\r\n/g, "\n"),
    size: 150,
    expected: recursiveOrientExpressSize150,
  },
  {
    name: "vsoe size=100",
    text: veniseSimplonOrientExpress,
    size: 100,
    expected: recursiveVsoeSize100,
  },
];

export const sentenceCases: ChunkCase[] = [
  {
    text: "",
    size: 10,
    expected: [],
  },
  {
    text: "Bonjour monde. Ceci est un test.",
    size: 100,
    expected: ["Bonjour monde. Ceci est un test."],
  },
  {
    text: "A b c. D e f. G h i. J k l.",
    size: 6,
    overlap: 3,
    expected: ["A b c. D e f.", "D e f. G h i.", "G h i. J k l.", "J k l."],
  },
  {
    text: "A b c. D e f. G h i.",
    size: 6,
    overlap: 0,
    expected: ["A b c. D e f.", "G h i."],
  },
  {
    text: "The train was created in 1883. It connected Paris. The service ceased in 1977.",
    size: 8,
    overlap: 3,
    expected: [
      "The train was created in 1883.",
      "It connected Paris. The service ceased in 1977.",
    ],
  },
];

export const sentenceDocumentCases: DocumentChunkCase[] = [
  {
    name: "orient-express size=100 overlap=30",
    text: orientExpress.replace(/\r\n/g, "\n"),
    size: 100,
    overlap: 30,
    expected: sentenceOrientExpressSize100Overlap30,
  },
  {
    name: "vsoe size=80 overlap=20",
    text: veniseSimplonOrientExpress,
    size: 80,
    overlap: 20,
    expected: sentenceVsoeSize80Overlap20,
  },
  {
    name: "vsoe size=100 overlap=30",
    text: veniseSimplonOrientExpress,
    size: 100,
    overlap: 30,
    expected: sentenceVsoeSize100Overlap30,
  },
  {
    name: "vsoe size=512 overlap=128",
    text: veniseSimplonOrientExpress,
    size: 512,
    overlap: 128,
    expected: sentenceVsoeSize512Overlap128,
  },
];
