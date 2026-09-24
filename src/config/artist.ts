/**
 * Single edit point for identity, assets, and real destinations.
 * Only confirmed public URLs live here.
 */
export const artist = {
  name: "THE DJ$ DJ",
  short: "THE DJS DJ",
  year: 2026,
  entity: "THE DJS DJ",
  credit: "ORIGINUL",
  portrait: "/assets/images/figure.jpg",
  portraitAlt: "/assets/images/figure-alt.jpg",
  wordmark: "/assets/brand/wordmark.png",
  wordmarkQuiet: "/assets/brand/wordmark-quiet.png",
  mark: "/assets/brand/mark.svg",
  scanner: "/assets/brand/scanner.svg",
  originulMark: "/assets/brand/originul.svg",
  /** Opt-in excerpt from ACE OF LOVE, K. (VOYAGER). Never autoplays. */
  audioSrc: "/assets/audio/signal.wav",
  links: {
    spotify: "https://open.spotify.com/artist/6rDv2IBYoRIZBLhEcEvQcE",
    apple: "https://music.apple.com/us/album/vip-humble/6792251523",
    soundcloud: "https://soundcloud.com/the_djs_dj",
    amazon: "https://music.amazon.com/search/THE%20DJ%24%20DJ",
    youtube: "https://www.youtube.com/results?search_query=THE+DJ%24+DJ",
    instagram: "https://www.instagram.com/thedjsdj/",
    site: "https://www.thedjsdj.com/",
    originul: "https://originul.com/",
  },
} as const;

export const listenLinks = [
  { id: "spotify", label: "Spotify", href: artist.links.spotify },
  { id: "apple", label: "Apple Music", href: artist.links.apple },
  { id: "soundcloud", label: "SoundCloud", href: artist.links.soundcloud },
  { id: "amazon", label: "Amazon Music", href: artist.links.amazon },
] as const;

export const watchLinks = [{ id: "youtube", label: "YouTube", href: artist.links.youtube }] as const;

export const connectLinks = [
  { id: "instagram", label: "Instagram", href: artist.links.instagram },
  { id: "site", label: "thedjsdj.com", href: artist.links.site },
  { id: "originul", label: "Originul", href: artist.links.originul },
] as const;
