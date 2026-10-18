// Page addresses and the navigation shared by the sidebar and the mobile tab bar.

const ROOT = new URL("../../../", import.meta.url);

export const pageUrl = (path) => new URL(path, ROOT).href;
export const profileUrl = (userId) => pageUrl(`pages/profile.html?id=${encodeURIComponent(userId)}`);
export const assetUrl = (name) => pageUrl(`public/assets/images/${name}`);

// Same pages, labels and icons as the original Miko-Miko sidebar.
export const NAV = [
  { id: "type", label: "Type", icon: "keyboard", href: "index.html" },
  { id: "profile", label: "Profile", icon: "horse", href: "pages/profile.html" },
  { id: "community", label: "Community", icon: "users-three", href: "pages/friends.html" },
  { id: "boards", label: "Boards", icon: "medal", href: "pages/boards.html" },
];
