import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { storage, AppNotification } from "@/lib/storage";
import { Bell } from "lucide-react";
import { useLocation } from "wouter";

const TYPE_ICONS: Record<string, string> = {
  new_message: "💬", product_edited: "✏️", product_deleted: "🗑️",
  friend_request: "👤", friend_accepted: "🤝", group_invite: "👥",
  channel_post: "📢", group_message: "💬",
};

export function NotificationBell() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [notifs, setNotifs] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = () => setNotifs(storage.getNotifications().filter(n => n.userId === user.id));
    load();
    const iv = setInterval(load, 2000);
    return () => clearInterval(iv);
  }, [user]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const unread = notifs.filter(n => !n.read).length;
  const sorted = [...notifs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);

  const markAll = () => {
    const all = storage.getNotifications();
    storage.setNotifications(all.map(n => n.userId === user.id ? { ...n, read: true } : n));
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = (n: AppNotification) => {
    const all = storage.getNotifications();
    storage.setNotifications(all.map(x => x.id === n.id ? { ...x, read: true } : x));
    setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    if (n.link) setLocation(n.link);
    setOpen(false);
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "только что";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} мин`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч`;
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-xl border border-border/60 z-50 shadow-2xl overflow-hidden"
          style={{ background: "rgba(15,4,30,0.98)", backdropFilter: "blur(20px)", boxShadow: "0 0 40px rgba(155,48,255,0.15)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm font-semibold text-foreground">Уведомления</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-[11px] text-primary hover:text-accent transition-colors">
                Прочитать все
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Bell size={24} className="opacity-20" />
                <p className="text-xs">Нет уведомлений</p>
              </div>
            ) : (
              sorted.map(n => (
                <button key={n.id} onClick={() => handleClick(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 border-b border-border/20 hover:bg-white/5 transition-colors text-left ${!n.read ? "bg-primary/5" : ""}`}>
                  <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold truncate ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{fmt(n.createdAt)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
