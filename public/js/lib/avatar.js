import { h } from "./dom.js";
import { isStorageUrl } from "./supabase.js";

function hue(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function initials(name) {
  const clean = (name || "?").replace(/[^A-Za-z0-9]+/g, " ").trim();
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || "?";
}

function fallback(name, size) {
  return h(
    "span.avatar.avatar-initials",
    { style: { "--avatar-size": `${size}px`, "--avatar-hue": hue(name || "?") }, "aria-hidden": "true" },
    initials(name)
  );
}

// Renders a profile picture, or coloured initials when there is none or it fails to load.
export function avatar(profile, size = 40) {
  const name = profile?.username ?? "";
  if (!isStorageUrl(profile?.avatar_url)) return fallback(name, size);

  const img = h("img.avatar", {
    src: profile.avatar_url,
    alt: "",
    width: size,
    height: size,
    loading: "lazy",
    decoding: "async",
    style: { "--avatar-size": `${size}px` },
  });
  img.addEventListener("error", () => img.replaceWith(fallback(name, size)), { once: true });
  return img;
}
