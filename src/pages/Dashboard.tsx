import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { storage, Product, getFriends, generateId, toggleWishlist, isWishlisted, AVATAR_EMOJIS, AVATAR_COLORS, getUserAvatar } from "@/lib/storage";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm } from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Plus, Package, User, Calendar, Users, Heart, Bookmark, Pencil, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, role, hasPermission } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [tab, setTab] = useState<"my" | "wishlist">("my");
  const [wishlistTs, setWishlistTs] = useState(0);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [pickedEmoji, setPickedEmoji] = useState("");
  const [pickedColor, setPickedColor] = useState("");

  const refresh = () => {
    if (!user) return;
    const all = storage.getProducts();
    setMyProducts(all.filter(p => p.sellerId === user.id));
    const wl = storage.getWishlist().filter(w => w.userId === user.id);
    setWishlistProducts(all.filter(p => wl.some(w => w.productId === p.id)));
    setFriendCount(getFriends(user.id).length);
  };

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    const av = getUserAvatar(user);
    setPickedEmoji(av.emoji);
    setPickedColor(av.color);
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [user]);

  const canSell = hasPermission("add_product") || hasPermission("*");

  const handleSave = (data: Omit<Product, "id" | "sellerId" | "sellerName" | "sellerRoleId" | "createdAt">) => {
    if (!user) return;
    const all = storage.getProducts();
    if (editProduct) {
      storage.setProducts(all.map(p => p.id === editProduct.id ? { ...p, ...data } : p));
      toast({ title: "Товар обновлён" });
    } else {
      storage.setProducts([...all, { id: generateId(), sellerId: user.id, sellerName: user.name, sellerRoleId: user.roleId, createdAt: new Date().toISOString(), ...data }]);
      toast({ title: "Товар добавлен" });
    }
    refresh(); setEditProduct(null);
  };

  const handleDelete = (id: string) => {
    storage.setProducts(storage.getProducts().filter(p => p.id !== id));
    refresh(); toast({ title: "Товар удалён" });
  };

  const handleWishlistToggle = (productId: string) => {
    if (!user) return;
    const added = toggleWishlist(user.id, productId);
    toast({ title: added ? "Добавлено в избранное" : "Убрано из избранного" });
    setWishlistTs(Date.now()); refresh();
  };

  const saveAvatar = () => {
    if (!user) return;
    storage.setUsers(storage.getUsers().map(u => u.id === user.id ? { ...u, avatarEmoji: pickedEmoji, avatarColor: pickedColor } : u));
    setEditingAvatar(false);
    toast({ title: "Аватар сохранён!" });
    window.location.reload();
  };

  if (!user) return null;
  const currentUser = storage.getUsers().find(u => u.id === user.id) || user;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-pixel text-[13px] text-primary neon-text">Личный кабинет</h1>
        <div className="w-24 h-0.5 mt-2" style={{ background: "linear-gradient(90deg, hsl(270 80% 60%), transparent)" }} />
      </div>

      {/* Profile card */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start gap-5">
          <div className="relative">
            <UserAvatar user={currentUser} size="xl" />
            <button onClick={() => setEditingAvatar(!editingAvatar)}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary border-2 border-background flex items-center justify-center hover:scale-110 transition-transform">
              <Pencil size={11} className="text-white" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
              <RoleBadge roleId={user.roleId} />
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={12} />
              <span>Зарегистрирован: {new Date(user.createdAt).toLocaleDateString("ru-RU")}</span>
            </div>
          </div>
        </div>

        {/* Avatar picker */}
        {editingAvatar && (
          <div className="mt-4 p-4 bg-white/5 rounded-xl border border-border/40 space-y-3">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Выберите аватар</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map(e => (
                <button key={e} onClick={() => setPickedEmoji(e)}
                  className={`w-9 h-9 rounded-full text-lg transition-all hover:scale-110 flex items-center justify-center border-2 ${pickedEmoji === e ? "border-primary bg-primary/20 scale-110" : "border-transparent bg-white/10"}`}>
                  {e}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Цвет</p>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => setPickedColor(c)}
                  className={`w-7 h-7 rounded-full transition-all hover:scale-110 border-2 ${pickedColor === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl"
                style={{ background: pickedColor + "33", borderColor: pickedColor }}>
                {pickedEmoji}
              </div>
              <Button size="sm" onClick={saveAvatar} className="gap-2"
                style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}>
                <Check size={14} /> Сохранить
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingAvatar(false)}>Отмена</Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: <Users size={20} />, label: "Всего друзей", value: friendCount },
          { icon: <Package size={20} />, label: "Мои товары", value: myProducts.length },
          { icon: <Heart size={20} />, label: "Избранное", value: wishlistProducts.length },
          { icon: <User size={20} />, label: "Роль", value: role?.name || "—" },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="text-primary opacity-70">{stat.icon}</div>
            <div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
              <div className="font-semibold text-foreground text-sm">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {canSell && (
            <button onClick={() => setTab("my")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "my" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
              <Package size={14} className="inline mr-2" />Мои товары
            </button>
          )}
          <button onClick={() => setTab("wishlist")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "wishlist" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
            <Bookmark size={14} className="inline mr-2" />Избранное
          </button>
        </div>

        {tab === "my" && canSell && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-[11px] text-primary">Мои товары</span>
              <Button size="sm" onClick={() => { setEditProduct(null); setFormOpen(true); }} className="gap-2"
                style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))" }}>
                <Plus size={14} /> Добавить
              </Button>
            </div>
            {myProducts.length === 0 ? (
              <div className="glass-card rounded-xl p-10 text-center space-y-3">
                <div className="text-4xl opacity-20">📦</div>
                <p className="text-muted-foreground text-sm font-medium">У вас пока нет товаров</p>
                <p className="text-xs text-muted-foreground">Нажмите «Добавить», чтобы выставить первый лот!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {myProducts.map(p => (
                  <ProductCard key={p.id} product={p} showActions
                    onEdit={prod => { setEditProduct(prod); setFormOpen(true); }} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "wishlist" && (
          <div className="space-y-4">
            <span className="font-pixel text-[11px] text-primary">Избранные товары</span>
            {wishlistProducts.length === 0 ? (
              <div className="glass-card rounded-xl p-10 text-center space-y-3">
                <div className="text-4xl opacity-20">♡</div>
                <p className="text-muted-foreground text-sm font-medium">Нет избранных товаров</p>
                <p className="text-xs text-muted-foreground">Нажмите ♡ на карточке товара</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {wishlistProducts.map(p => (
                  <ProductCard key={p.id + wishlistTs} product={p}
                    showWishlist wishlisted={isWishlisted(user.id, p.id)}
                    onWishlist={() => handleWishlistToggle(p.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ProductForm open={formOpen} onClose={() => { setFormOpen(false); setEditProduct(null); }}
        onSave={handleSave} initialData={editProduct} />
    </div>
  );
}
