export function DishOnPlate({
  imageUrl,
  alt,
}: {
  imageUrl: string;
  alt: string;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[260px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/plates/plate-scalloped.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className="absolute left-1/2 top-1/2 w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full object-cover aspect-square"
        loading="lazy"
      />
    </div>
  );
}
