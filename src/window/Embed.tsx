import type { Banner, Embed as EmbedItem } from "@/content";
import { resolveEmbed, youTubeThumbnail } from "@/lib/embeds";

function Tile({
  image,
  href,
  children,
}: {
  image: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="artist-background"
      style={{ backgroundImage: `url('${image}')` }}
    >
      {children}
    </a>
  );
}

export function EmbedView({ embed }: { embed: EmbedItem }) {
  const spec = resolveEmbed(embed.url, embed.provider);
  if (spec) {
    return (
      <iframe
        title={`${spec.label} item: ${embed.title}`}
        className={`embed embed-${spec.provider}`}
        src={spec.src}
        width="100%"
        height={spec.height}
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }
  const image = embed.backgroundImage ?? youTubeThumbnail(embed.url);
  if (image) {
    return (
      <Tile image={image} href={embed.url}>
        {embed.title}
      </Tile>
    );
  }
  return (
    <p className="music-track-title">
      <a href={embed.url}>{embed.title}</a>
    </p>
  );
}

export function BannerView({ banner }: { banner: Banner["banner"] }) {
  return (
    <Tile image={banner.image} href={banner.href}>
      {banner.lines.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </Tile>
  );
}
