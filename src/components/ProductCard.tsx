import { useState } from "react";
import {
  Product,
  storage,
  addNotification,
  getProductRating,
  generateId,
} from "@/lib/storage";

import { useAuth } from "@/lib/auth";

import { Button } from "@/components/ui/button";

import {
  Pencil,
  Trash2,
  Package,
  MessageCircle,
  Heart,
  Star,
} from "lucide-react";

import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { StarRating } from "@/components/StarRating";

import { useLocation } from "wouter";

import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;

  onEdit?: (product: Product) => void;

  onDelete?: (id: string) => void;

  showActions?: boolean;

  showWishlist?: boolean;

  wishlisted?: boolean;

  onWishlist?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Оружие: "#ef4444",
  Броня: "#3b82f6",
  Инструменты: "#f59e0b",
  Ресурсы: "#8b5cf6",
  Еда: "#22c55e",
  Прочее: "#64748b",
};

export function ProductCard({
  product,
  onEdit,
  onDelete,
  showActions = false,
  showWishlist = false,
  wishlisted = false,
  onWishlist,
}: ProductCardProps) {
  const { user, hasPermission } = useAuth();

  const { toast } = useToast();

  const [, setLocation] = useLocation();

  const [showReview, setShowReview] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);

  const [reviewComment, setReviewComment] = useState("");

  const { avg, count } = getProductRating(product.id);

  const canEdit =
    showActions &&
    (hasPermission("edit_any_product") ||
      hasPermission("*") ||
      (hasPermission("edit_own_product") &&
        product.sellerId === user?.id));

  const canDelete =
    showActions &&
    (hasPermission("delete_any_product") ||
      hasPermission("*") ||
      (hasPermission("delete_own_product") &&
        product.sellerId === user?.id));

  const canMessage =
    user && user.id !== product.sellerId;

  const canReview =
    user && user.id !== product.sellerId;

  const catColor =
    CATEGORY_COLORS[product.category] ||
    "#64748b";

  const sellerUser = storage
    .getUsers()
    .find((u) => u.id === product.sellerId);

  const handleMessage = () =>
    setLocation(
      `/messages?to=${product.sellerId}&name=${encodeURIComponent(
        product.sellerName,
      )}`,
    );

  const handleDelete = () => {
    if (!onDelete) return;

    if (user && user.id !== product.sellerId) {
      addNotification(
        product.sellerId,
        "product_deleted",
        "Товар удалён",
        `Ваш товар «${product.name}» был удалён администратором`,
        "/dashboard",
      );
    }

    onDelete(product.id);
  };

  const handleEdit = () => {
    if (!onEdit) return;

    if (user && user.id !== product.sellerId) {
      addNotification(
        product.sellerId,
        "product_edited",
        "Товар изменён",
        `Ваш товар «${product.name}» был отредактирован администратором`,
        "/dashboard",
      );
    }

    onEdit(product);
  };

  const submitReview = () => {
    if (!user || !reviewComment.trim()) return;

    const reviews = storage.getReviews();

    if (
      reviews.find(
        (r) =>
          r.productId === product.id &&
          r.reviewerId === user.id,
      )
    ) {
      toast({
        title: "Вы уже оставляли отзыв",
      });

      setShowReview(false);

      return;
    }

    storage.setReviews([
      ...reviews,
      {
        id: generateId(),

        productId: product.id,

        sellerId: product.sellerId,

        reviewerId: user.id,

        reviewerName: user.name,

        rating:
          reviewRating as 1 | 2 | 3 | 4 | 5,

        comment: reviewComment.trim(),

        createdAt: new Date().toISOString(),
      },
    ]);

    toast({
      title: "Отзыв добавлен!",
    });

    setShowReview(false);

    setReviewComment("");
  };

  return (
    <div
      className="glass-card rounded-xl overflow-hidden flex flex-col group hover:border-primary/50 transition-all duration-300"
      style={{
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      {/* Image */}
      <div className="h-40 bg-gradient-to-br from-purple-900/40 to-purple-950/60 flex items-center justify-center border-b border-border relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (
                e.target as HTMLImageElement
              ).style.display = "none";
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            <Package
              size={40}
              className="text-primary"
            />
          </div>
        )}

        {/* Category */}
        <div className="absolute top-2 left-2">
          <span
            className="text-white text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: catColor + "cc",
            }}
          >
            {product.category}
          </span>
        </div>

        {/* Trade For */}
        <div className="absolute top-2 right-2">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{
              background:
                "rgba(0,0,0,0.65)",
              color: "#c084fc",
              border:
                "1px solid rgba(192,132,252,0.35)",
              maxWidth: "140px",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Хочет: {product.tradeFor}
          </span>
        </div>

        {(showWishlist ||
          (user && !showActions)) && (
          <button
            onClick={(e) => {
              e.stopPropagation();

              onWishlist?.();
            }}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:scale-110 transition-transform"
          >
            <Heart
              size={13}
              className={
                wishlisted
                  ? "fill-red-400 text-red-400"
                  : "text-white/60"
              }
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1">
          {product.name}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">
          {product.description}
        </p>

        {count > 0 && (
          <div className="flex items-center gap-1.5">
            <StarRating
              rating={Math.round(avg)}
              size="sm"
            />

            <span className="text-[10px] text-muted-foreground">
              {avg.toFixed(1)} ({count})
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/5 border border-white/10">
          <UserAvatar
            user={sellerUser}
            name={product.sellerName}
            size="xs"
          />

          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-foreground font-medium truncate">
              {product.sellerName}
            </div>

            <RoleBadge
              roleId={product.sellerRoleId}
            />
          </div>

          {canMessage && (
            <button
              onClick={handleMessage}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Написать"
            >
              <MessageCircle size={14} />
            </button>
          )}

          {canReview && (
            <button
              onClick={() =>
                setShowReview(!showReview)
              }
              className="text-muted-foreground hover:text-yellow-400 transition-colors"
              title="Оставить отзыв"
            >
              <Star size={14} />
            </button>
          )}
        </div>

        {showReview && (
          <div className="space-y-2 p-2 bg-white/5 rounded-lg border border-border/40">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Оценка:
              </span>

              <StarRating
                rating={reviewRating}
                interactive
                size="md"
                onChange={setReviewRating}
              />
            </div>

            <input
              value={reviewComment}
              onChange={(e) =>
                setReviewComment(
                  e.target.value,
                )
              }
              placeholder="Ваш отзыв..."
              onKeyDown={(e) =>
                e.key === "Enter" &&
                submitReview()
              }
              className="w-full text-xs bg-transparent border border-border/40 rounded px-2 py-1.5 focus:outline-none focus:border-primary text-foreground"
            />

            <div className="flex gap-2">
              <button
                onClick={() =>
                  setShowReview(false)
                }
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Отмена
              </button>

              <button
                onClick={submitReview}
                className="text-xs bg-primary/80 hover:bg-primary text-white px-3 py-1 rounded-md transition-colors"
              >
                Отправить
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
          <span className="font-pixel text-[11px] text-primary neon-text">
            {product.price.toLocaleString()}
          </span>

          <div className="flex items-center gap-1">
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={handleEdit}
              >
                <Pencil size={13} />
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 size={13} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}