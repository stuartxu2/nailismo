import type { ShopifyImage } from "@/lib/shopify/types";

export function ProductGallery({
  images,
  title,
}: {
  images: ShopifyImage[];
  title: string;
}) {
  if (images.length === 0) {
    return (
      <div className="aspect-square bg-shiracha border border-hair flex items-center justify-center">
        <span className="cap">No imagery</span>
      </div>
    );
  }
  const [hero, ...rest] = images;
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden bg-shiracha border border-hair">
        <img src={hero.url} alt={hero.altText ?? title} className="img-cover" />
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {rest.slice(0, 8).map((img, i) => (
            <div
              key={`${img.url}-${i}`}
              className="relative aspect-square overflow-hidden bg-shiracha border border-hair"
            >
              <img
                src={img.url}
                alt={img.altText ?? `${title} — view ${i + 2}`}
                className="img-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
