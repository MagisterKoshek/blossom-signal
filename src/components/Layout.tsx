import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { Starfield } from "@/components/Starfield";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { NotificationBell } from "@/components/NotificationBell";
import { LayoutDashboard, ShoppingBag, Package, Shield, LogIn, LogOut, UserPlus, Menu, X, MessageCircle, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string; label: string; icon: React.ReactNode;
  requireAuth?: boolean; requirePerm?: string; badge?: number; alwaysShow?: boolean;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, role, logout, hasPermission } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadMsg(0); setPendingApps(0); return; }
    const check = () => {
      setUnreadMsg(storage.getMessages().filter(m => m.toId === user.id && !m.read).length);
      if (hasPermission("manage_users") || hasPermission("*")) {
        setPendingApps(storage.getSellerApps().filter(a => a.status === "pending").length);
      }
    };
    check();
    const iv = setInterval(check, 2000);
    return () => clearInterval(iv);
  }, [user]);

  const navItems: NavItem[] = [
    { href: "/", label: "Магазин", icon: <ShoppingBag size={18} /> },
    { href: "/dashboard", label: "Кабинет", icon: <LayoutDashboard size={18} />, requireAuth: true },
    { href: "/products", label: "Товары", icon: <Package size={18} />, requireAuth: true, requirePerm: "add_product" },
    { href: "/messages", label: "Сообщения", icon: <MessageCircle size={18} />, requireAuth: true, badge: unreadMsg },
    { href: "/seller-apply", label: "Стать продавцом", icon: <Store size={18} />, requireAuth: true, badge: (hasPermission("manage_users") || hasPermission("*")) ? pendingApps : 0 },
    { href: "/admin", label: "Админ-панель", icon: <Shield size={18} />, requireAuth: true, requirePerm: "manage_users" },
  ];

  const visibleItems = navItems.filter(item => {
    if (item.requireAuth && !user) return false;
    if (item.requirePerm && !hasPermission(item.requirePerm) && !hasPermission("*")) return false;
    return true;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border">
        <Link href="/" onClick={() => setMobileOpen(false)}>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/20 border border-primary/40 group-hover:border-primary/70 transition-all neon-glow">
              <AlliumFlower />
            </div>
            <div className="flex-1">
              <div className="font-pixel text-[9px] text-primary neon-text leading-tight">BlossomCraft</div>
              <div className="font-pixel text-[7px] text-muted-foreground leading-tight">- Shop -</div>
            </div>
            {user && <NotificationBell />}
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 group relative overflow-hidden ${isActive ? "bg-primary text-primary-foreground shadow-lg" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
                style={isActive ? { boxShadow: "0 0 20px rgba(155,48,255,0.4)" } : {}}>
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/60 rounded-lg" />}
                <span className={`relative z-10 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"} transition-colors`}>{item.icon}</span>
                <span className={`relative z-10 text-sm font-medium flex-1 ${isActive ? "text-white" : "group-hover:text-foreground"} transition-colors`}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="relative z-10 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {user ? (
          <>
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent">
              <UserAvatar user={storage.getUsers().find(u => u.id === user.id) || user} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                {role && <RoleBadge roleId={user.roleId} className="mt-0.5" />}
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => { logout(); setMobileOpen(false); }}>
              <LogOut size={14} /> Выйти
            </Button>
          </>
        ) : (
          <div className="space-y-1.5">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="default" size="sm" className="w-full gap-2"><LogIn size={14} /> Войти</Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="w-full gap-2 border-primary/40 text-primary hover:bg-primary/10"><UserPlus size={14} /> Регистрация</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <Starfield />
      <aside className="hidden md:flex w-60 shrink-0 flex-col fixed inset-y-0 left-0 z-20 border-r border-sidebar-border"
        style={{ background: "rgba(10,3,20,0.9)", backdropFilter: "blur(20px)" }}>
        <SidebarContent />
      </aside>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/70 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col md:hidden transition-transform duration-300 border-r border-sidebar-border ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "rgba(10,3,20,0.97)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <span className="font-pixel text-[9px] text-primary">Menu</span>
          <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto"><SidebarContent /></div>
      </aside>
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3 md:hidden border-b border-sidebar-border"
        style={{ background: "rgba(10,3,20,0.95)", backdropFilter: "blur(20px)" }}>
        <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-primary transition-colors"><Menu size={20} /></button>
        <div className="flex items-center gap-2"><AlliumFlower size={20} /><span className="font-pixel text-[8px] text-primary">BlossomCraft</span></div>
        {user && <div className="ml-auto"><NotificationBell /></div>}
      </div>
      <main className="flex-1 md:ml-60 pt-14 md:pt-0 min-h-screen">
        <div className="h-full p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

function AlliumFlower({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="15" y="18" width="2" height="10" fill="#4ade80" />
      <rect x="14" y="12" width="4" height="4" fill="#e9d5ff" />
      <rect x="11" y="9" width="3" height="3" fill="#a855f7" />
      <rect x="18" y="9" width="3" height="3" fill="#a855f7" />
      <rect x="14" y="7" width="4" height="3" fill="#c084fc" />
      <rect x="11" y="13" width="3" height="3" fill="#a855f7" />
      <rect x="18" y="13" width="3" height="3" fill="#a855f7" />
      <rect x="14" y="16" width="4" height="2" fill="#c084fc" />
      <rect x="10" y="20" width="5" height="2" fill="#22c55e" />
      <rect x="17" y="22" width="5" height="2" fill="#22c55e" />
    </svg>
  );
}
