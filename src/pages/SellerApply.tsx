import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { storage, SellerApplication, generateId, addNotification } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, Check, X, Clock, Send, Users, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SellerApply() {
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [apps, setApps] = useState<SellerApplication[]>([]);
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);

  const isAdmin = hasPermission("manage_users") || hasPermission("*");

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    setApps(storage.getSellerApps());
    const iv = setInterval(() => setApps(storage.getSellerApps()), 2000);
    return () => clearInterval(iv);
  }, [user, refresh]);

  if (!user) return null;

  const myApp = apps.find(a => a.userId === user.id);
  const pendingApps = apps.filter(a => a.status === "pending");
  const reviewedApps = apps.filter(a => a.status !== "pending");
  const allUsers = storage.getUsers();

  const submitApp = () => {
    if (!message.trim()) { toast({ title: "Опишите, почему вы хотите стать продавцом" }); return; }
    if (myApp) { toast({ title: "Заявка уже подана" }); return; }
    if (user.roleId === "seller" || user.roleId === "admin" || user.roleId === "owner" || user.roleId === "deputy") {
      toast({ title: "У вас уже есть права продавца" }); return;
    }
    const app: SellerApplication = {
      id: generateId(), userId: user.id, userName: user.name,
      userEmail: user.email, message: message.trim(), status: "pending",
      createdAt: new Date().toISOString(),
    };
    storage.setSellerApps([...apps, app]);
    // Notify admins
    const admins = allUsers.filter(u => ["admin","owner","deputy"].includes(u.roleId));
    admins.forEach(a => addNotification(a.id, "seller_app_approved", "Новая заявка продавца", `${user.name} хочет стать продавцом`, "/seller-apply"));
    toast({ title: "Заявка отправлена!", description: "Администраторы рассмотрят её в ближайшее время" });
    setMessage(""); setRefresh(r => r + 1);
  };

  const approveApp = (app: SellerApplication) => {
    if (!user) return;
    const updated = apps.map(a => a.id === app.id ? { ...a, status: "approved" as const, reviewedBy: user.id, reviewedByName: user.name, reviewedAt: new Date().toISOString() } : a);
    storage.setSellerApps(updated);
    storage.setUsers(storage.getUsers().map(u => u.id === app.userId ? { ...u, roleId: "seller" } : u));
    addNotification(app.userId, "seller_app_approved", "Заявка одобрена! 🎉", "Вам выдана роль Продавца. Теперь вы можете добавлять товары!", "/dashboard");
    toast({ title: "Заявка одобрена, роль выдана" });
    setRefresh(r => r + 1);
  };

  const rejectApp = (app: SellerApplication) => {
    if (!user) return;
    const updated = apps.map(a => a.id === app.id ? { ...a, status: "rejected" as const, reviewedBy: user.id, reviewedByName: user.name, reviewedAt: new Date().toISOString() } : a);
    storage.setSellerApps(updated);
    addNotification(app.userId, "seller_app_rejected", "Заявка отклонена", "К сожалению, ваша заявка на роль Продавца была отклонена", "/seller-apply");
    toast({ title: "Заявка отклонена" });
    setRefresh(r => r + 1);
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const STATUS_INFO = {
    pending:  { label: "Ожидает", icon: <Clock size={13} />, cls: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
    approved: { label: "Одобрено", icon: <Check size={13} />, cls: "text-green-400 bg-green-400/10 border-green-400/30" },
    rejected: { label: "Отклонено", icon: <X size={13} />, cls: "text-red-400 bg-red-400/10 border-red-400/30" },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-pixel text-[13px] text-primary neon-text">Стать Продавцом</h1>
        <p className="text-sm text-muted-foreground mt-1">Подайте заявку на получение роли Продавца</p>
        <div className="w-28 h-0.5 mt-2" style={{ background: "linear-gradient(90deg, hsl(270 80% 60%), transparent)" }} />
      </div>

      {isAdmin ? (
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="glass-card border border-border/60 p-1 h-auto" style={{ background: "rgba(20,5,40,0.8)" }}>
            <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Clock size={14} /> Новые {pendingApps.length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingApps.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="reviewed" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Check size={14} /> Рассмотренные
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users size={14} /> Все заявки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pendingApps.length === 0 ? (
              <div className="glass-card rounded-xl p-10 text-center space-y-2">
                <div className="text-3xl opacity-20">📭</div>
                <p className="text-muted-foreground text-sm">Новых заявок нет</p>
              </div>
            ) : (
              pendingApps.map(app => {
                const appUser = allUsers.find(u => u.id === app.userId);
                return (
                  <div key={app.id} className="glass-card rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <UserAvatar user={appUser} name={app.userName} size="md" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{app.userName}</span>
                          {appUser && <RoleBadge roleId={appUser.roleId} />}
                          <span className="text-xs text-muted-foreground">{app.userEmail}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(app.createdAt)}</p>
                        <div className="mt-2 p-3 bg-white/5 rounded-lg border border-border/40 text-sm text-foreground">
                          {app.message}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => rejectApp(app)}
                        className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
                        <X size={13} /> Отклонить
                      </Button>
                      <Button size="sm" onClick={() => approveApp(app)}
                        className="gap-2" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                        <Check size={13} /> Одобрить
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-3">
            {reviewedApps.length === 0 ? (
              <div className="glass-card rounded-xl p-10 text-center"><p className="text-muted-foreground text-sm">Нет рассмотренных заявок</p></div>
            ) : (
              reviewedApps.map(app => {
                const si = STATUS_INFO[app.status];
                return (
                  <div key={app.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <UserAvatar name={app.userName} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{app.userName}</span>
                        <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border ${si.cls}`}>{si.icon}{si.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{app.reviewedByName && `Рассмотрел: ${app.reviewedByName} · `}{fmtDate(app.reviewedAt || app.createdAt)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {apps.length === 0 ? (
              <div className="glass-card rounded-xl p-10 text-center"><p className="text-muted-foreground text-sm">Нет заявок</p></div>
            ) : (
              apps.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(app => {
                const si = STATUS_INFO[app.status];
                return (
                  <div key={app.id} className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <UserAvatar name={app.userName} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{app.userName}</span>
                        <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full border ${si.cls}`}>{si.icon}{si.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{app.message}</p>
                    </div>
                    {app.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => rejectApp(app)} className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"><X size={13} /></Button>
                        <Button size="sm" variant="ghost" onClick={() => approveApp(app)} className="h-8 w-8 p-0 text-green-400 hover:bg-green-500/10"><Check size={13} /></Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {/* Info card */}
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-2xl">🛒</div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Роль «Продавец»</h2>
                <p className="text-sm text-muted-foreground">Добавляйте товары в магазин и торгуйте с другими игроками</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { icon: "📦", title: "Добавляйте товары", desc: "Выставляйте предметы в магазин" },
                { icon: "✏️", title: "Редактируйте лоты", desc: "Меняйте цену и описание" },
                { icon: "🤝", title: "Торгуйте с игроками", desc: "Принимайте оплату в любом виде" },
              ].map(f => (
                <div key={f.icon} className="flex items-start gap-2 p-3 bg-white/5 rounded-lg border border-border/40">
                  <span className="text-xl">{f.icon}</span>
                  <div>
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-xs text-muted-foreground">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {myApp ? (
            <div className="glass-card rounded-xl p-6 space-y-3">
              <h3 className="font-semibold text-sm">Ваша заявка</h3>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border w-fit text-sm ${STATUS_INFO[myApp.status].cls}`}>
                {STATUS_INFO[myApp.status].icon}
                {STATUS_INFO[myApp.status].label}
              </div>
              <p className="text-sm text-muted-foreground">{myApp.message}</p>
              <p className="text-xs text-muted-foreground">Подана: {fmtDate(myApp.createdAt)}</p>
              {myApp.status === "rejected" && (
                <Button size="sm" variant="outline" onClick={() => {
                  storage.setSellerApps(apps.filter(a => a.id !== myApp.id));
                  setRefresh(r => r + 1);
                }} className="text-xs border-red-500/30 text-red-400">
                  Подать заново
                </Button>
              )}
            </div>
          ) : (user.roleId === "seller" || user.roleId === "admin" || user.roleId === "owner" || user.roleId === "deputy") ? (
            <div className="glass-card rounded-xl p-6 text-center space-y-2">
              <div className="text-3xl">✅</div>
              <p className="text-sm font-medium text-green-400">У вас уже есть права продавца</p>
              <RoleBadge roleId={user.roleId} />
            </div>
          ) : (
            <div className="glass-card rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">Подать заявку</h3>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide">Расскажите о себе</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Почему вы хотите стать продавцом? Чем будете торговать? (мин. 20 символов)"
                  rows={4}
                  className="w-full mt-1.5 bg-input/50 border border-border/60 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none text-foreground" />
                <p className="text-xs text-muted-foreground mt-1">{message.length}/20 минимум</p>
              </div>
              <Button onClick={submitApp} disabled={message.trim().length < 20}
                className="gap-2" style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))" }}>
                <Send size={14} /> Отправить заявку
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
