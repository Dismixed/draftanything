export interface GameContent {
  /** The search phrase this page is written around. */
  angle: string;
  /** Page title without the site suffix; the root layout appends " | Stim Games". */
  title: string;
  /** Meta description, 70 to 160 characters. */
  description: string;
  /** Always visible. Two sentences. */
  intro: string;
  /** Three to five blocks. The first is headed "How to play". */
  sections: { heading: string; body: string[] }[];
  /** Four to six questions, phrased the way people search. */
  faq: { question: string; answer: string }[];
}
