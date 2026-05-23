import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { storage, User, Role, Product, generateId, addNotification, SellerApplication } from "@/lib/storage";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm } from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Users, Shield, Package, Pencil, Trash2, Plus, Check, Crown, Clock, X, ShoppingBag } from "lucide-react";

const ALL_PERMISSIONS = [
  { id: "manage_products",    label: "Управление товарами" },
  { id: "manage_users",       label: "Управление пользователями" },
  { id: "manage_roles",       label: "Управление ролями" },
  { id: "delete_any_product", label: "Удалять любой товар" },
  { id: "edit_any_product",   label: "Редактировать любой товар" },
  { id: "add_product",        label: "Добавлять товары" },
  { id: "edit_own_product",   label: "Редактировать свои товары" },
  { id: "delete_own_product", label: "Удалять свои товары" },
];

const roleSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  permissions: z.array(z.string()),
});
type RoleFormData = z.infer<typeof roleSchema>;

export default function Admin() {
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [apps, setApps] = useState<SellerApplication[]>([]);
  const [changeRoleUserId, setChangeRoleUserId] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roleFormOpen, setRoleFormOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [prodFormOpen, setProdFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const refresh = () => {
    setUsers(storage.getUsers());
    setRoles(storage.getRoles());
    setProducts(storage.getProducts());
    setApps(storage.getSellerApps());
  };

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    if (!hasPermission("manage_users") && !hasPermission("*")) { setLocation("/"); return; }
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [user]);

  const handleChangeRole = (targetUserId: string) => {
    const allUsers = storage.getUsers();
    const target = allUsers.find(u => u.id === targetUserId);
    if (!target) return;
    const curRole = roles.find(r => r.id === user?.roleId);
    const tgtRole = roles.find(r => r.id === target.roleId);
    if (curRole && tgtRole && tgtRole.priority <= curRole.priority && user?.id !== target.id) {
      toast({ title: "Недостаточно прав", variant: "destructive" }); return;
    }
    storage.setUsers(allUsers.map(u => u.id === targetUserId ? { ...u, roleId: selectedRoleId } : u));
    toast({ title: "Роль изменена" });
    refresh(); setChangeRoleUserId(null);
  };

  const roleForm = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", color: "#9b30ff", permissions: [] },
  });

  const openRoleForm = (role?: Role) => {
    if (role) { setEditRole(role); roleForm.reset({ name: role.name, color: role.color, permissions: role.permissions }); }
    else { setEditRole(null); roleForm.reset({ name: "", color: "#9b30ff", permissions: [] }); }
    setRoleFormOpen(true);
  };

  const handleSaveRole = (data: RoleFormData) => {
    const allRoles = storage.getRoles();
    if (editRole) {
      storage.setRoles(allRoles.map(r => r.id === editRole.id ? { ...r, ...data } : r));
      toast({ title: "Роль обновлена" });
    } else {
      storage.setRoles([...allRoles, { id: generateId(), name: data.name, color: data.color, permissions: data.permissions, isSystem: false, priority: 50 }]);
      toast({ title: "Роль создана" });
    }
    refresh(); setRoleFormOpen(false);
  };

  const handleSaveProduct = (data: Omit<Product, "id" | "sellerId" | "sellerName" | "sellerRoleId" | "createdAt">) => {
    if (!user) return;
    const all = storage.getProducts();
    if (editProduct) {
      storage.setProducts(all.map(p => p.id === editProduct.id ? { ...p, ...data } : p));
    } else {
      storage.setProducts([...all, { id: generateId(), sellerId: user.id, sellerName: user.name, sellerRoleId: user.roleId, createdAt: new Date().toISOString(), ...data }]);
    }
    toast({ title: "Товар сохранён" }); refresh(); setEditProduct(null);
  };

  const approveApp = (app: SellerApplication) => {
    if (!user) return;
    storage.setSellerApps(apps.map(a => a.id === app.id ? { ...a, status: "approved" as const, reviewedBy: user.id, reviewedByName: user.name, reviewedAt: new Date().toISOString() } : a));
    storage.setUsers(storage.getUsers().map(u => u.id === app.userId ? { ...u, roleId: "seller" } : u));
    addNotification(app.userId, "seller_app_approved", "Заявка одобрена! 🎉", "Вам выдана роль Продавца!", "/dashboard");
    toast({ title: "Заявка одобрена" }); refresh();
  };

  const rejectApp = (app: SellerApplication) => {
    if (!user) return;
    storage.setSellerApps(apps.map(a => a.id === app.id ? { ...a, status: "rejected" as const, reviewedBy: user.id, reviewedByName: user.name, reviewedAt: new Date().toISOString() } : a));
    addNotification(app.userId, "seller_app_rejected", "Заявка отклонена", "Ваша заявка на роль Продавца была отклонена", "/seller-apply");
    toast({ title: "Заявка отклонена" }); refresh();
  };

  const pendingApps = apps.filter(a => a.status === "pending");
  const filteredUsers = users.filter(u => { const q = userSearch.toLowerCase(); return !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q); });
  const currentRole = roles.find(r => r.id === user?.roleId);
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="font-pixel text-[13px] text-primary neon-text">Панель управления</h1>
        <div className="w-28 h-0.5 mt-2" style={{ background: "linear-gradient(90deg, hsl(270 80% 60%), transparent)" }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users size={18} />, label: "Пользователей", value: users.length },
          { icon: <Shield size={18} />, label: "Ролей", value: roles.length },
          { icon: <Package size={18} />, label: "Товаров", value: products.length },
          { icon: <ShoppingBag size={18} />, label: "Заявок продавца", value: pendingApps.length, accent: pendingApps.length > 0 },
        ].map(s => (
          <div key={s.label} className={`glass-card rounded-xl p-4 flex items-center gap-3 ${s.accent ? "border-yellow-500/40" : ""}`}>
            <div className={`opacity-70 ${s.accent ? "text-yellow-400" : "text-primary"}`}>{s.icon}</div>
            <div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={`font-semibold ${s.accent ? "text-yellow-400" : ""}`}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="glass-card border border-border/60 p-1 h-auto flex-wrap" style={{ background: "rgba(20,5,40,0.8)" }}>
          <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"><Users size={14} /> Пользователи</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"><Shield size={14} /> Роли</TabsTrigger>
          <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white"><Package size={14} /> Товары</TabsTrigger>
          <TabsTrigger value="seller-apps" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white relative">
            <ShoppingBag size={14} /> Заявки продавца
            {pendingApps.length > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingApps.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* ── USERS TAB ── */}
        <TabsContent value="users" className="space-y-4">
          <Input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Поиск пользователей..." className="bg-input/50 border-border/60 max-w-sm" />
          <div className="glass-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs">
                  <th className="text-left p-3">Пользователь</th>
                  <th className="text-left p-3 hidden md:table-cell">Email</th>
                  <th className="text-left p-3">Роль</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const uRole = roles.find(r => r.id === u.roleId);
                  const canChange = !(uRole?.priority === 0) || (currentRole?.priority === 0 && u.id !== user.id);
                  return (
                    <tr key={u.id} className="border-b border-border/30 hover:bg-primary/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={u} size="xs" />
                          <span className="font-medium">{u.name}</span>
                          {uRole?.priority === 0 && <Crown size={12} className="text-yellow-400" />}
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{u.email}</td>
                      <td className="p-3"><RoleBadge roleId={u.roleId} /></td>
                      <td className="p-3">
                        {canChange && (
                          <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => { setChangeRoleUserId(u.id); setSelectedRoleId(u.roleId); }}>
                            <Pencil size={11} className="mr-1" /> Роль
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── ROLES TAB ── */}
        <TabsContent value="roles" className="space-y-4">
          {(hasPermission("manage_roles") || hasPermission("*")) && (
            <Button onClick={() => openRoleForm()} className="gap-2" style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))" }}>
              <Plus size={14} /> Создать роль
            </Button>
          )}
          <div className="grid gap-3">
            {roles.map(r => (
              <div key={r.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}` }} />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{r.name}</span>
                    <Badge style={{ background: r.color + "33", color: r.color, border: `1px solid ${r.color}55` }} className="text-xs">Приоритет: {r.priority}</Badge>
                    {r.isSystem && <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">Системная</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {r.permissions.includes("*") ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">Все права</span>
                    ) : r.permissions.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Нет прав</span>
                    ) : r.permissions.map(p => {
                      const perm = ALL_PERMISSIONS.find(ap => ap.id === p);
                      return <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 border border-border/40">{perm?.label || p}</span>;
                    })}
                  </div>
                </div>
                {!r.isSystem && (hasPermission("manage_roles") || hasPermission("*")) && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-primary" onClick={() => openRoleForm(r)}><Pencil size={13} /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => { storage.setRoles(storage.getRoles().filter(x => x.id !== r.id)); refresh(); toast({ title: "Роль удалена" }); }}><Trash2 size={13} /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── PRODUCTS TAB ── */}
        <TabsContent value="products" className="space-y-4">
          <Button onClick={() => { setEditProduct(null); setProdFormOpen(true); }} className="gap-2" style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))" }}>
            <Plus size={14} /> Добавить товар
          </Button>
          {products.length === 0 ? (
            <div className="glass-card rounded-xl p-10 text-center space-y-3">
              <div className="text-4xl opacity-20">📦</div>
              <p className="text-muted-foreground text-sm font-medium">Товаров пока нет</p>
              <p className="text-xs text-muted-foreground">Добавьте первый товар или подождите, пока продавцы разместят свои лоты</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} showActions
                  onEdit={prod => { setEditProduct(prod); setProdFormOpen(true); }}
                  onDelete={id => { storage.setProducts(storage.getProducts().filter(x => x.id !== id)); refresh(); toast({ title: "Товар удалён" }); }} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── SELLER APPS TAB ── */}
        <TabsContent value="seller-apps" className="space-y-4">
          {pendingApps.length === 0 && apps.length === 0 ? (
            <div className="glass-card rounded-xl p-10 text-center space-y-3">
              <div className="text-4xl opacity-20">📭</div>
              <p className="text-muted-foreground text-sm">Заявок пока нет</p>
            </div>
          ) : (
            <>
              {pendingApps.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wide flex items-center gap-2"><Clock size={12} /> Ожидают рассмотрения ({pendingApps.length})</h3>
                  {pendingApps.map(app => {
                    const appUser = users.find(u => u.id === app.userId);
                    return (
                      <div key={app.id} className="glass-card rounded-xl p-4 space-y-3 border border-yellow-500/20">
                        <div className="flex items-start gap-3">
                          <UserAvatar user={appUser} name={app.userName} size="md" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{app.userName}</span>
                              {appUser && <RoleBadge roleId={appUser.roleId} />}
                            </div>
                            <p className="text-xs text-muted-foreground">{app.userEmail}</p>
                            <div className="mt-2 p-3 bg-white/5 rounded-lg text-sm">{app.message}</div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => rejectApp(app)} className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"><X size={13} /> Отклонить</Button>
                          <Button size="sm" onClick={() => approveApp(app)} className="gap-2" style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}><Check size={13} /> Одобрить</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {apps.filter(a => a.status !== "pending").length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Рассмотренные</h3>
                  {apps.filter(a => a.status !== "pending").map(app => (
                    <div key={app.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                      <UserAvatar name={app.userName} size="sm" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{app.userName}</span>
                        <p className="text-xs text-muted-foreground">{app.reviewedByName && `${app.status === "approved" ? "Одобрил" : "Отклонил"}: ${app.reviewedByName}`}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${app.status === "approved" ? "text-green-400 bg-green-400/10 border-green-400/30" : "text-red-400 bg-red-400/10 border-red-400/30"}`}>
                        {app.status === "approved" ? <><Check size={10} /> Одобрено</> : <><X size={10} /> Отклонено</>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Change role dialog */}
      <Dialog open={!!changeRoleUserId} onOpenChange={v => !v && setChangeRoleUserId(null)}>
        <DialogContent className="max-w-sm" style={{ background: "rgba(15,4,30,0.97)", border: "1px solid rgba(155,48,255,0.3)" }}>
          <DialogHeader><DialogTitle className="font-pixel text-[11px] text-primary">Изменить роль</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger className="bg-input/50 border-border/60"><SelectValue placeholder="Выберите роль" /></SelectTrigger>
              <SelectContent style={{ background: "rgba(15,4,30,0.97)", border: "1px solid rgba(155,48,255,0.3)" }}>
                {roles.map(r => <SelectItem key={r.id} value={r.id}><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: r.color }} />{r.name}</div></SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setChangeRoleUserId(null)}>Отмена</Button>
              <Button className="flex-1 gap-2" style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))" }}
                onClick={() => changeRoleUserId && handleChangeRole(changeRoleUserId)}>
                <Check size={14} /> Сохранить
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role form dialog */}
      <Dialog open={roleFormOpen} onOpenChange={v => !v && setRoleFormOpen(false)}>
        <DialogContent className="max-w-md" style={{ background: "rgba(15,4,30,0.97)", border: "1px solid rgba(155,48,255,0.3)" }}>
          <DialogHeader><DialogTitle className="font-pixel text-[11px] text-primary">{editRole ? "Редактировать роль" : "Создать роль"}</DialogTitle></DialogHeader>
          <Form {...roleForm}>
            <form onSubmit={roleForm.handleSubmit(handleSaveRole)} className="space-y-4">
              <FormField control={roleForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Название</FormLabel>
                  <FormControl><Input {...field} placeholder="Модератор" className="bg-input/50 border-border/60" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={roleForm.control} name="color" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Цвет</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-3">
                      <input type="color" {...field} className="w-10 h-10 rounded cursor-pointer bg-transparent border border-border/60" />
                      <span className="text-sm text-muted-foreground">{field.value}</span>
                    </div>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={roleForm.control} name="permissions" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Права</FormLabel>
                  <div className="space-y-2">
                    {ALL_PERMISSIONS.map(p => {
                      const checked = field.value.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? "bg-primary border-primary" : "border-border/60 hover:border-primary/50"}`}
                            onClick={() => checked ? field.onChange(field.value.filter(v => v !== p.id)) : field.onChange([...field.value, p.id])}>
                            {checked && <Check size={10} className="text-white" />}
                          </div>
                          <span className="text-sm text-muted-foreground group-hover:text-foreground">{p.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </FormItem>
              )} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setRoleFormOpen(false)}>Отмена</Button>
                <Button type="submit" className="flex-1" style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))" }}>{editRole ? "Сохранить" : "Создать"}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ProductForm open={prodFormOpen} onClose={() => { setProdFormOpen(false); setEditProduct(null); }} onSave={handleSaveProduct} initialData={editProduct} />
    </div>
  );
}
