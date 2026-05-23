import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Product, CATEGORIES } from "@/lib/storage";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

import { useRef, useState } from "react";

import { ImagePlus, X } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Название обязательно"),

  description: z.string().min(1, "Описание обязательно"),

  price: z.coerce.number().min(1, "Цена должна быть больше 0"),

  category: z.string().min(1, "Выберите категорию"),

  tradeFor: z.string().min(1, "Укажите что хотите за товар"),

  imageUrl: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProductFormProps {
  open: boolean;

  onClose: () => void;

  onSave: (
    data: Omit<
      Product,
      "id" | "sellerId" | "sellerName" | "sellerRoleId" | "createdAt"
    >,
  ) => void;

  initialData?: Product | null;
}

export function ProductForm({
  open,
  onClose,
  onSave,
  initialData,
}: ProductFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string>(
    initialData?.imageUrl || "",
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),

    defaultValues: {
      name: initialData?.name || "",

      description: initialData?.description || "",

      price: initialData?.price || 0,

      category: initialData?.category || "",

      tradeFor: "",

      imageUrl: initialData?.imageUrl || "",
    },
  });

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Файл слишком большой (макс. 2 МБ)");
      return;
    }

    const reader = new FileReader();

    reader.onload = (ev) => {
      const url = ev.target?.result as string;

      setPreview(url);

      form.setValue("imageUrl", url);
    };

    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreview("");

    form.setValue("imageUrl", "");

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const onSubmit = (data: FormData) => {
    onSave({
      name: data.name,

      description: data.description,

      price: data.price,

      category: data.category,

      tradeFor: data.tradeFor,

      imageUrl: data.imageUrl || "",
    });

    form.reset();

    setPreview("");

    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
    >
      <DialogContent
        className="glass-card border-primary/30 max-w-md"
        style={{
          background: "rgba(15,4,30,0.97)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-pixel text-[11px] text-primary">
            {initialData
              ? "Редактировать товар"
              : "Добавить товар"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Фото товара
              </label>

              {preview ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border/60">
                  <img
                    src={preview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    fileRef.current?.click()
                  }
                  className="w-full h-24 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <ImagePlus size={24} />

                  <span className="text-xs">
                    Нажмите чтобы загрузить
                    (макс. 2 МБ)
                  </span>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border/40" />

                <span className="text-[10px] text-muted-foreground">
                  или вставьте URL
                </span>

                <div className="flex-1 h-px bg-border/40" />
              </div>

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="https://..."
                        className="bg-input/50 border-border/60 focus:border-primary text-xs"
                        onChange={(e) => {
                          field.onChange(e);

                          setPreview(
                            e.target.value,
                          );
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">
                    Название
                  </FormLabel>

                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Алмазный меч"
                      className="bg-input/50 border-border/60 focus:border-primary"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">
                    Описание
                  </FormLabel>

                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Описание товара..."
                      className="bg-input/50 border-border/60 focus:border-primary resize-none"
                      rows={2}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Количество
                    </FormLabel>

                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="64"
                        className="bg-input/50 border-border/60 focus:border-primary"
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">
                      Категория
                    </FormLabel>

                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-input/50 border-border/60">
                          <SelectValue placeholder="Выбрать..." />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent
                        style={{
                          background:
                            "rgba(15,4,30,0.97)",
                          border:
                            "1px solid rgba(155,48,255,0.3)",
                        }}
                      >
                        {CATEGORIES.map((cat) => (
                          <SelectItem
                            key={cat}
                            value={cat}
                          >
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tradeFor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">
                    Что хотите за товар
                  </FormLabel>

                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Алмазы, незерит, железо..."
                      className="bg-input/50 border-border/60 focus:border-primary"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-border/60"
                onClick={onClose}
              >
                Отмена
              </Button>

              <Button
                type="submit"
                className="flex-1"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))",
                }}
              >
                {initialData
                  ? "Сохранить"
                  : "Добавить"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}