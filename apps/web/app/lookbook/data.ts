export type Look = {
  handle: string;
  num: string;
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
};

export const LOOKS: Look[] = [
  {
    handle: "the-blazer",
    num: "Look 01",
    title: "The Blazer",
    desc: "Oversized black blazer · silver signet · dark trouser · Monochrome Edge.",
    cta: "Shop The Blazer Look →",
    src: "/images/listing/black and white press on nails.avif",
    alt: "The Blazer — oversized black blazer, silver signet rings, Monochrome Edge manicure",
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
  },
  {
    handle: "the-desk",
    num: "Look 02",
    title: "The Desk",
    desc: "Black tee · mechanical keyboard · laptop · espresso · Galaxy Glitch.",
    cta: "Shop The Desk Look →",
    src: "/images/listing/cat eye black press on nails.avif",
    alt: "The Desk — minimal knit, mechanical keyboard, espresso, Galaxy Glitch nails",
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
  },
  {
    handle: "the-night-out",
    num: "Look 03",
    title: "The Night Out",
    desc: "Black tee · leather jacket · silver jewelry · cocktail · Liquid Metal.",
    cta: "Shop The Night Out Look →",
    src: "/images/listing/silver press on nails.avif",
    alt: "The Night Out — leather jacket, silver jewelry, cocktail, Liquid Metal press-on nails",
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
  },
  {
    handle: "the-weekend",
    num: "Look 04",
    title: "The Weekend",
    desc: "Heavyweight gray hoodie · vintage denim · sneakers · Molten Steel.",
    cta: "Shop The Weekend Look →",
    src: "/images/listing/pale pinkish and silver press on nails.avif",
    alt: "The Weekend — heavyweight gray hoodie, vintage denim, sneakers, Molten Steel",
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
  },
];

export function getLook(handle: string): Look | undefined {
  return LOOKS.find((l) => l.handle === handle);
}
