// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string; name: string; email: string;
  passwordHash: string; roleId: string; createdAt: string;
  avatarEmoji?: string; avatarColor?: string; lastSeen?: string;
  bio?: string;
}
export interface Role {
  id: string; name: string; color: string;
  permissions: string[]; isSystem: boolean; priority: number;
}
export type PaymentMethod = "Алмазы" | "Обмен" | "Донат-валюта" | "Любой";
export const PAYMENT_METHODS: PaymentMethod[] = ["Алмазы", "Обмен", "Донат-валюта", "Любой"];

export interface Product {
  id: string; name: string; description: string; price: number;
  category: string; paymentMethod: PaymentMethod; imageUrl: string;
  sellerId: string; sellerName: string; sellerRoleId: string; createdAt: string;
}
export interface Message {
  id: string; fromId: string; fromName: string;
  toId: string; toName: string; text: string; createdAt: string; read: boolean;
}
export type NotifType = "new_message" | "product_edited" | "product_deleted" | "friend_request" | "friend_accepted" | "group_invite" | "channel_post" | "group_message" | "call_incoming" | "seller_app_approved" | "seller_app_rejected";
export interface AppNotification {
  id: string; userId: string; type: NotifType;
  title: string; body: string; link?: string; read: boolean; createdAt: string;
}
export type FriendStatus = "pending" | "accepted" | "declined";
export interface FriendRequest {
  id: string; fromId: string; fromName: string;
  toId: string; toName: string; status: FriendStatus; createdAt: string;
}
export interface Group {
  id: string; name: string; description: string;
  type: "group" | "channel"; ownerId: string; ownerName: string;
  adminIds: string[]; memberIds: string[]; subscriberIds: string[];
  avatarEmoji: string; avatarColor: string;
  isPublic: boolean; createdAt: string; pinnedMessageId?: string;
}
export interface GroupMessage {
  id: string; groupId: string; fromId: string; fromName: string; fromRoleId: string;
  text: string; createdAt: string; editedAt?: string; isDeleted: boolean;
  replyToId?: string; reactions: Record<string, string[]>; isPinned: boolean;
}
export interface GroupLog {
  id: string; groupId: string; action: string;
  byId: string; byName: string; targetId?: string; targetName?: string; createdAt: string;
}
export interface ChannelComment {
  id: string; postId: string; groupId: string;
  fromId: string; fromName: string; text: string;
  createdAt: string; reactions: Record<string, string[]>;
}
export interface WishlistItem { userId: string; productId: string; addedAt: string; }
export interface Review {
  id: string; productId: string; sellerId: string;
  reviewerId: string; reviewerName: string;
  rating: 1 | 2 | 3 | 4 | 5; comment: string; createdAt: string;
}
export type SellerAppStatus = "pending" | "approved" | "rejected";
export interface SellerApplication {
  id: string; userId: string; userName: string; userEmail: string;
  message: string; status: SellerAppStatus;
  createdAt: string; reviewedBy?: string; reviewedByName?: string; reviewedAt?: string;
}
export type CallStatus = "calling" | "accepted" | "declined" | "ended";
export interface CallRequest {
  id: string; fromId: string; fromName: string;
  toId: string; toName: string; status: CallStatus; createdAt: string;
}

// ── Default roles ─────────────────────────────────────────────────────────────
const DEFAULT_ROLES: Role[] = [
  { id: "owner",  name: "Владелец",      color: "#ffd700", permissions: ["*"], isSystem: true, priority: 0 },
  { id: "deputy", name: "Зам. Владельца",color: "#c084fc", permissions: ["*"], isSystem: true, priority: 1 },
  { id: "admin",  name: "Администратор", color: "#f97316",
    permissions: ["manage_products","manage_users","manage_roles","delete_any_product","add_product","edit_any_product"], isSystem: true, priority: 2 },
  { id: "seller", name: "Продавец",      color: "#22c55e",
    permissions: ["add_product","edit_own_product","delete_own_product"], isSystem: true, priority: 3 },
  { id: "user",   name: "Пользователь",  color: "#64748b", permissions: [], isSystem: true, priority: 99 },
];

// ── Storage ───────────────────────────────────────────────────────────────────
const s = <T>(key: string, def: T) => ({
  get: (): T => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? def; } catch { return def; } },
  set: (v: T) => localStorage.setItem(key, JSON.stringify(v)),
});

export const storage = {
  getUsers:          (): User[]              => s<User[]>             ("bc_users",    []).get(),
  setUsers:          (v: User[])             => s<User[]>             ("bc_users",    []).set(v),
  getRoles:          (): Role[]              => s<Role[]>             ("bc_roles",    []).get(),
  setRoles:          (v: Role[])             => s<Role[]>             ("bc_roles",    []).set(v),
  getProducts:       (): Product[]           => s<Product[]>          ("bc_products", []).get(),
  setProducts:       (v: Product[])          => s<Product[]>          ("bc_products", []).set(v),
  getSession:        (): string | null       => localStorage.getItem("bc_session"),
  setSession:        (id: string | null)     => id ? localStorage.setItem("bc_session", id) : localStorage.removeItem("bc_session"),
  getMessages:       (): Message[]           => s<Message[]>          ("bc_messages", []).get(),
  setMessages:       (v: Message[])          => s<Message[]>          ("bc_messages", []).set(v),
  getNotifications:  (): AppNotification[]   => s<AppNotification[]>  ("bc_notifs",   []).get(),
  setNotifications:  (v: AppNotification[])  => s<AppNotification[]>  ("bc_notifs",   []).set(v),
  getFriendReqs:     (): FriendRequest[]     => s<FriendRequest[]>    ("bc_friends",  []).get(),
  setFriendReqs:     (v: FriendRequest[])    => s<FriendRequest[]>    ("bc_friends",  []).set(v),
  getGroups:         (): Group[]             => s<Group[]>            ("bc_groups",   []).get(),
  setGroups:         (v: Group[])            => s<Group[]>            ("bc_groups",   []).set(v),
  getGroupMsgs:      (): GroupMessage[]      => s<GroupMessage[]>     ("bc_grpmsgs",  []).get(),
  setGroupMsgs:      (v: GroupMessage[])     => s<GroupMessage[]>     ("bc_grpmsgs",  []).set(v),
  getGroupLogs:      (): GroupLog[]          => s<GroupLog[]>         ("bc_grplogs",  []).get(),
  setGroupLogs:      (v: GroupLog[])         => s<GroupLog[]>         ("bc_grplogs",  []).set(v),
  getChannelComments:(): ChannelComment[]    => s<ChannelComment[]>   ("bc_comments", []).get(),
  setChannelComments:(v: ChannelComment[])   => s<ChannelComment[]>   ("bc_comments", []).set(v),
  getWishlist:       (): WishlistItem[]      => s<WishlistItem[]>     ("bc_wishlist", []).get(),
  setWishlist:       (v: WishlistItem[])     => s<WishlistItem[]>     ("bc_wishlist", []).set(v),
  getReviews:        (): Review[]            => s<Review[]>           ("bc_reviews",  []).get(),
  setReviews:        (v: Review[])           => s<Review[]>           ("bc_reviews",  []).set(v),
  getSellerApps:     (): SellerApplication[] => s<SellerApplication[]>("bc_sappls",   []).get(),
  setSellerApps:     (v: SellerApplication[]) => s<SellerApplication[]>("bc_sappls",  []).set(v),
  getCalls:          (): CallRequest[]       => s<CallRequest[]>      ("bc_calls",    []).get(),
  setCalls:          (v: CallRequest[])      => s<CallRequest[]>      ("bc_calls",    []).set(v),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export const generateId = (): string => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const CATEGORIES = ["Оружие", "Броня", "Инструменты", "Ресурсы", "Еда", "Прочее"];
export const GROUP_EMOJIS = ["👍","❤️","😂","😮","😢","🔥","🎉","👎"];
export const AVATAR_EMOJIS = ["🌸","⚔️","🛡️","💎","🔮","🌙","⭐","🦋","🐉","🌺","🎭","🏆","🦊","🐺","🌈","💜","🎮","⚡","🌿","🍄"];
export const AVATAR_COLORS = ["#7c3aed","#db2777","#0891b2","#059669","#d97706","#dc2626","#4f46e5","#0d9488","#ea580c","#be185d"];

export function addNotification(userId: string, type: NotifType, title: string, body: string, link?: string) {
  const notifs = storage.getNotifications();
  notifs.push({ id: generateId(), userId, type, title, body, link, read: false, createdAt: new Date().toISOString() });
  storage.setNotifications(notifs);
}
export function addGroupLog(groupId: string, action: string, byId: string, byName: string, targetId?: string, targetName?: string) {
  const logs = storage.getGroupLogs();
  logs.push({ id: generateId(), groupId, action, byId, byName, targetId, targetName, createdAt: new Date().toISOString() });
  storage.setGroupLogs(logs);
}
export function getFriends(userId: string): User[] {
  const reqs = storage.getFriendReqs();
  const ids = reqs.filter(r => r.status === "accepted" && (r.fromId === userId || r.toId === userId))
    .map(r => r.fromId === userId ? r.toId : r.fromId);
  return storage.getUsers().filter(u => ids.includes(u.id));
}
export function areFriends(a: string, b: string): boolean {
  return storage.getFriendReqs().some(r =>
    r.status === "accepted" && ((r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a)));
}
export function toggleWishlist(userId: string, productId: string): boolean {
  const list = storage.getWishlist();
  const idx = list.findIndex(w => w.userId === userId && w.productId === productId);
  if (idx >= 0) { storage.setWishlist(list.filter((_, i) => i !== idx)); return false; }
  storage.setWishlist([...list, { userId, productId, addedAt: new Date().toISOString() }]); return true;
}
export function isWishlisted(userId: string, productId: string): boolean {
  return storage.getWishlist().some(w => w.userId === userId && w.productId === productId);
}
export function getProductRating(productId: string): { avg: number; count: number } {
  const reviews = storage.getReviews().filter(r => r.productId === productId);
  if (!reviews.length) return { avg: 0, count: 0 };
  return { avg: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, count: reviews.length };
}
export function getSellerRating(sellerId: string): { avg: number; count: number } {
  const reviews = storage.getReviews().filter(r => r.sellerId === sellerId);
  if (!reviews.length) return { avg: 0, count: 0 };
  return { avg: reviews.reduce((s, r) => s + r.rating, 0) / reviews.length, count: reviews.length };
}
export function getUserAvatar(user: User): { emoji: string; color: string } {
  return { emoji: user.avatarEmoji || "🌸", color: user.avatarColor || "#7c3aed" };
}

// ── Owner constants ───────────────────────────────────────────────────────────
const NEW_OWNER_ID    = "seed-owner-id";
const NEW_OWNER_EMAIL = "magisterkoshek@gmail.com";
const NEW_OWNER_PASS  = "Saha2022@333";
const NEW_OWNER_NAME  = "Magister_Koshek";
const NEW_OWNER_HASH  = btoa(NEW_OWNER_EMAIL + ":" + NEW_OWNER_PASS);

// ── Seed / Migrate ────────────────────────────────────────────────────────────
export const seedStorage = () => {
  // Roles
  if (storage.getRoles().length === 0) storage.setRoles(DEFAULT_ROLES);

  // Owner — remove old, ensure new
  let users = storage.getUsers().filter(u => u.email !== "owner@blossomcraft.ru");
  const ownerEx = users.find(u => u.id === NEW_OWNER_ID);
  if (!ownerEx) {
    users = [{ id: NEW_OWNER_ID, name: NEW_OWNER_NAME, email: NEW_OWNER_EMAIL,
      passwordHash: NEW_OWNER_HASH, roleId: "owner", createdAt: new Date().toISOString(),
      avatarEmoji: "👑", avatarColor: "#ffd700" }, ...users.filter(u => u.id !== NEW_OWNER_ID)];
  } else if (ownerEx.passwordHash !== NEW_OWNER_HASH || ownerEx.email !== NEW_OWNER_EMAIL || ownerEx.roleId !== "owner") {
    users = users.map(u => u.id === NEW_OWNER_ID ? { ...u, email: NEW_OWNER_EMAIL, name: NEW_OWNER_NAME, passwordHash: NEW_OWNER_HASH, roleId: "owner", avatarEmoji: u.avatarEmoji || "👑", avatarColor: u.avatarColor || "#ffd700" } : u);
  }
  storage.setUsers(users);

  // Products — remove old seed items (sp1-sp6), migrate remaining
  let prods = storage.getProducts();
  const SEED_IDS = ["sp1","sp2","sp3","sp4","sp5","sp6"];
  const allAreSeed = prods.length > 0 && prods.every(p => SEED_IDS.includes(p.id));
  if (allAreSeed) {
    storage.setProducts([]); // clear default products
  } else if (prods.length > 0) {
    // Remove any remaining seed IDs mixed in
    prods = prods.filter(p => !SEED_IDS.includes(p.id));
    const fixed = prods.map(p => ({
      ...p,
      paymentMethod: p.paymentMethod || "Любой" as PaymentMethod,
      sellerRoleId: p.sellerRoleId || "user",
      sellerName: p.sellerId === NEW_OWNER_ID ? NEW_OWNER_NAME : p.sellerName,
    }));
    storage.setProducts(fixed);
  }
};

// ── JSON export ───────────────────────────────────────────────────────────────
export function exportAllData(): string {
  const data: Record<string, unknown> = {};
  const keys = ["bc_users","bc_roles","bc_products","bc_messages","bc_notifs","bc_friends","bc_groups","bc_grpmsgs","bc_grplogs","bc_comments","bc_wishlist","bc_reviews","bc_sappls"];
  for (const k of keys) {
    try { data[k] = JSON.parse(localStorage.getItem(k) || "null"); } catch { data[k] = null; }
  }
  return JSON.stringify(data, null, 2);
}
