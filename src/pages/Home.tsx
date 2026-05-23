import { useState, useEffect } from "react";
import { storage, Product, toggleWishlist, isWishlisted, addNotification } from "@/lib/storage";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ProductForm } from "@/components/ProductForm";
import { generateId } from "@/lib/storage";

export default function Home() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [wishlistTs, setWishlistTs] = useState(0);

  useEffect(() => {
    setProducts(storage.getProducts());
    const iv = setInterval(() => setProducts(storage.getProducts()), 1500);
    return () => clearInterval(iv);
  }, []);

  const canEdit = hasPermission("edit_any_product") || hasPermission("*");
  const canDelete = hasPermission("delete_any_product") || hasPermission("*");
  const showActions = canEdit || canDelete ||
    hasPermission("edit_own_product") || hasPermission("delete_own_product");

  const handleDelete = (id: string) => {
    const p = storage.getProducts().find(x => x.id === id);
    if (p && user && user.id !== p.sellerId) {
      addNotification(p.sellerId, "product_deleted", "Товар удалён",
        `Ваш товар «${p.name}» был удалён администратором`, "/dashboard");
    }
    storage.setProducts(storage.getProducts().filter(x => x.id !== id));
    setProducts(storage.getProducts());
    toast({ title: "Товар удалён" });
  };

  const handleSave = (data: Omit<Product, "id" | "sellerId" | "sellerName" | "sellerRoleId" | "createdAt">) => {
    if (!user || !editProduct) return;
    if (user.id !== editProduct.sellerId) {
      addNotification(editProduct.sellerId, "product_edited", "Товар изменён",
        `Ваш товар «${editProduct.name}» был отредактирован администратором`, "/dashboard");
    }
    storage.setProducts(storage.getProducts().map(p => p.id === editProduct.id ? { ...p, ...data } : p));
    setProducts(storage.getProducts());
    toast({ title: "Товар обновлён" });
    setEditProduct(null);
  };

  const handleWishlist = (productId: string) => {
    if (!user) { toast({ title: "Войдите, чтобы добавить в избранное" }); return; }
    const added = toggleWishlist(user.id, productId);
    toast({ title: added ? "Добавлено в избранное ♡" : "Убрано из избранного" });
    setWishlistTs(Date.now());
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.sellerName.toLowerCase().includes(q);
    return matchSearch && (!selectedCategory || p.category === selectedCategory);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center py-8 space-y-2">
        <h1 className="font-pixel text-[14px] md:text-[18px] text-primary neon-text">BlossomCraft Shop</h1>
        <p className="text-muted-foreground text-sm">Лучший магазин предметов сервера</p>
        <div className="w-32 h-0.5 mx-auto" style={{ background: "linear-gradient(90deg, transparent, hsl(270 80% 60%), transparent)" }} />
      </div>

      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск товаров..."
            className="pl-9 bg-input/50 border-border/60 focus:border-primary" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={!selectedCategory ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(null)}
            className="h-7 text-xs" style={!selectedCategory ? { background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" } : {}}>
            Все
          </Button>
          {CATEGORIES.map(cat => (
            <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="h-7 text-xs"
              style={selectedCategory === cat ? { background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" } : { borderColor: "rgba(155,48,255,0.3)" }}>
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SlidersHorizontal size={14} />
        <span>Найдено: <strong className="text-foreground">{filtered.length}</strong> товаров</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <div className="text-5xl opacity-20">📦</div>
          <p className="text-muted-foreground">Товары не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(p => (
            <ProductCard key={p.id + wishlistTs} product={p}
              showActions={showActions}
              showWishlist={!!user}
              wishlisted={user ? isWishlisted(user.id, p.id) : false}
              onWishlist={() => handleWishlist(p.id)}
              onEdit={prod => { setEditProduct(prod); setFormOpen(true); }}
              onDelete={handleDelete} />
          ))}
        </div>
      )}

      <ProductForm open={formOpen} onClose={() => { setFormOpen(false); setEditProduct(null); }}
        onSave={handleSave} initialData={editProduct} />
    </div>
  );
}
