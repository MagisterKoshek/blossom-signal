import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { storage, Product, generateId } from "@/lib/storage";
import { ProductCard } from "@/components/ProductCard";
import { ProductForm } from "@/components/ProductForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/storage";

export default function Products() {
  const { user, hasPermission } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLocation("/login"); return; }
    if (!hasPermission("add_product") && !hasPermission("*")) { setLocation("/"); return; }
    setProducts(storage.getProducts());
  }, [user]);

  const refresh = () => setProducts(storage.getProducts());

  const handleSave = (data: Omit<Product, "id" | "sellerId" | "sellerName" | "sellerRoleId" | "createdAt">) => {
    if (!user) return;
    const all = storage.getProducts();
    if (editProduct) {
      storage.setProducts(all.map((p) => p.id === editProduct.id ? { ...p, ...data } : p));
      toast({ title: "Товар обновлён" });
    } else {
      const np: Product = {
        id: generateId(),
        sellerId: user.id,
        sellerName: user.name,
        sellerRoleId: user.roleId,
        createdAt: new Date().toISOString(),
        ...data,
      };
      storage.setProducts([...all, np]);
      toast({ title: "Товар добавлен", description: `${data.name} появился в магазине` });
    }
    refresh();
    setEditProduct(null);
  };

  const handleDelete = (id: string) => {
    storage.setProducts(storage.getProducts().filter((p) => p.id !== id));
    refresh();
    toast({ title: "Товар удалён" });
  };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.sellerName.toLowerCase().includes(q);
    const matchCat = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const canAdd = hasPermission("add_product") || hasPermission("*");

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-pixel text-[13px] text-primary neon-text">Управление товарами</h1>
          <div className="w-24 h-0.5 mt-2" style={{ background: "linear-gradient(90deg, hsl(270 80% 60%), transparent)" }} />
        </div>
        {canAdd && (
          <Button
            onClick={() => { setEditProduct(null); setFormOpen(true); }}
            className="gap-2"
            style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))", boxShadow: "0 4px 20px rgba(155,48,255,0.3)" }}
            data-testid="button-add-product-main"
          >
            <Plus size={16} />
            Добавить товар
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="pl-9 bg-input/50 border-border/60 focus:border-primary"
            data-testid="input-products-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!selectedCategory ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="h-7 text-xs"
            style={!selectedCategory ? { background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" } : {}}
          >
            Все
          </Button>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="h-7 text-xs"
              style={selectedCategory === cat ? { background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" } : { borderColor: "rgba(155,48,255,0.3)" }}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        Найдено: <strong className="text-foreground">{filtered.length}</strong> товаров
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-xl space-y-3">
          <Package size={40} className="mx-auto text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">Товары не найдены</p>
          {canAdd && (
            <Button
              variant="outline"
              onClick={() => setFormOpen(true)}
              className="gap-2 border-primary/40 text-primary"
            >
              <Plus size={14} /> Добавить первый товар
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              showActions
              onEdit={(prod) => { setEditProduct(prod); setFormOpen(true); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProductForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditProduct(null); }}
        onSave={handleSave}
        initialData={editProduct}
      />
    </div>
  );
}
