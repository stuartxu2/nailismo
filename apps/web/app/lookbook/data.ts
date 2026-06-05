export type Look = {
  handle: string;
  num: string;
  tag: string;
  title: string;
  desc: string;
  cta: string;
  src: string;
  alt: string;
  borderClasses: string;
  tapeClass: string;
  story: string;
  outfit: { label: string; value: string }[];
  pairing: { set: string; productHandle: string; note: string };
  related: string[];
  /** Source numbers (from the 小红书 / RedNote feed) for the mass collage. */
  feed: number[];
};

export const LOOKS: Look[] = [
  {
    handle: "the-blazer",
    num: "01",
    tag: "Black & white",
    title: "The Blazer",
    desc: "Sharp tailoring, zero effort — monochrome tips that read intentional from across the room. 🖤",
    cta: "Shop The Blazer Look →",
    src: "/images/lookbook/the-blazer.avif",
    alt: "The Blazer look — moody monochrome press-on nails, beanie, espresso mug",
    borderClasses: "border-l border-t border-b border-r border-hair",
    tapeClass: "tape",
    story:
      "Black blazer over a soft tee. The hand becomes the punctuation — a clean French read across the room, no salon receipt required.",
    outfit: [
      { label: "Outer", value: "Oversized wool blazer, black" },
      { label: "Under", value: "Garment-dyed cotton tee" },
      { label: "Lower", value: "Pleated wool trouser" },
      { label: "Hands", value: "Monochrome Edge · gloss top" },
      { label: "Metal", value: "Sterling signet, single stack" },
    ],
    pairing: {
      set: "Monochrome Edge",
      productHandle: "monochrome-edge",
      note: "Black-and-white architectural line, glossed for evening light.",
    },
    related: ["the-night-out", "the-desk"],
    feed: [1, 4, 30, 230, 280, 16, 3, 5, 180],
  },
  {
    handle: "the-desk",
    num: "02",
    tag: "Work mode",
    title: "The Desk",
    desc: "Clocked-in but make it a look. Quiet doodle-energy your group chat clocks first. ✍️",
    cta: "Shop The Desk Look →",
    src: "/images/lookbook/the-desk.avif",
    alt: "The Desk look — doodle-art press-on nails, casual tee, daylight smile",
    borderClasses: "border-t border-b border-r border-hair",
    tapeClass: "tape tape-navy",
    story:
      "Stealth finish. Hands read groomed but never loud — the kind of detail clients clock subconsciously before they shake your hand.",
    outfit: [
      { label: "Outer", value: "Heavyweight cotton crew, black" },
      { label: "Under", value: "Ribbed tank, off-white" },
      { label: "Lower", value: "Tapered selvedge denim" },
      { label: "Hands", value: "Galaxy Glitch · soft-tip square" },
      { label: "Wrist", value: "Field watch, black dial" },
    ],
    pairing: {
      set: "Galaxy Glitch",
      productHandle: "galaxy-glitch",
      note: "Low-signal cat-eye black that disappears on camera, holds up to a keyboard.",
    },
    related: ["the-blazer", "the-weekend"],
    feed: [7, 19, 260, 30, 1, 360, 40, 120],
  },
  {
    handle: "the-night-out",
    num: "03",
    tag: "After dark",
    title: "The Night Out",
    desc: "Leather, chrome, a little chaos. The fit that photographs itself under bar light. 🌃",
    cta: "Shop The Night Out Look →",
    src: "/images/lookbook/the-night-out.avif",
    alt: "The Night Out look — multicolor press-on nails, leather jacket, stacked silver rings",
    borderClasses: "border-b border-r border-l border-hair",
    tapeClass: "tape",
    story:
      "Liquid silver under low light. The drink in your hand becomes the secondary detail.",
    outfit: [
      { label: "Outer", value: "Cropped leather moto" },
      { label: "Under", value: "Fitted ribbed tee, black" },
      { label: "Lower", value: "Slim black wool trouser" },
      { label: "Hands", value: "Liquid Metal · chrome gloss" },
      { label: "Metal", value: "Layered silver chains, rings" },
    ],
    pairing: {
      set: "Liquid Metal",
      productHandle: "liquid-metal",
      note: "Chrome finish engineered to catch bar light without going costume.",
    },
    related: ["the-blazer", "the-weekend"],
    feed: [11, 15, 50, 65, 280, 300, 12, 5, 180],
  },
  {
    handle: "the-weekend",
    num: "04",
    tag: "Off duty",
    title: "The Weekend",
    desc: "Golden hour, zero plans, nails still ate. Soft-launch the whole vibe. ☀️",
    cta: "Shop The Weekend Look →",
    src: "/images/lookbook/the-weekend.avif",
    alt: "The Weekend look — blue marble press-on nails, casual fit, sunset light",
    borderClasses: "border-b border-r border-hair",
    tapeClass: "tape tape-navy",
    story:
      "The off-day version. Nothing announces itself. Coffee, errands, a hand on the wheel — finished without effort.",
    outfit: [
      { label: "Outer", value: "Heavyweight loopback hoodie, heather" },
      { label: "Under", value: "Cotton tee, ecru" },
      { label: "Lower", value: "Vintage straight denim" },
      { label: "Hands", value: "Molten Steel · chrome accent" },
      { label: "Foot", value: "Court sneakers, off-white" },
    ],
    pairing: {
      set: "Molten Steel",
      productHandle: "molten-steel",
      note: "Pale pinkish silver base with a metallic accent — restraint, not flash.",
    },
    related: ["the-desk", "the-night-out"],
    feed: [140, 205, 240, 360, 40, 120, 11, 230],
  },
];

export function getLook(handle: string): Look | undefined {
  return LOOKS.find((l) => l.handle === handle);
}
