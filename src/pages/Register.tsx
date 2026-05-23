import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { storage, generateId } from "@/lib/storage";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "Ник должен быть не менее 2 символов"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(6, "Пароль не менее 6 символов"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Пароли не совпадают", path: ["confirmPassword"] });

type FormData = z.infer<typeof schema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [showPass, setShowPass] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: FormData) => {
    const users = storage.getUsers();
    if (users.find(u => u.email === data.email)) {
      form.setError("email", { message: "Email уже используется" }); return;
    }
    if (users.find(u => u.name.toLowerCase() === data.name.toLowerCase())) {
      form.setError("name", { message: "Ник уже занят" }); return;
    }
    const newUser = {
      id: generateId(), name: data.name, email: data.email,
      passwordHash: btoa(data.email + ":" + data.password),
      roleId: "user", createdAt: new Date().toISOString(),
    };
    storage.setUsers([...users, newUser]);
    login(newUser.id);
    toast({ title: "Аккаунт создан!", description: `Добро пожаловать, ${data.name}!` });
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card rounded-2xl p-8 space-y-6 relative"
        style={{ boxShadow: "0 0 60px rgba(155,48,255,0.2), 0 20px 60px rgba(0,0,0,0.6)" }}>
        <button onClick={() => setLocation("/")}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">
          <X size={16} />
        </button>

        <div className="text-center space-y-2">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center" style={{ boxShadow: "0 0 30px rgba(155,48,255,0.3)" }}>
              <FlowerIcon />
            </div>
          </div>
          <h1 className="font-pixel text-[11px] text-primary neon-text">BlossomCraft</h1>
          <p className="text-[10px] text-muted-foreground font-pixel">- Shop -</p>
          <div className="w-20 h-px mx-auto" style={{ background: "linear-gradient(90deg, transparent, hsl(270 80% 60%), transparent)" }} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground">Регистрация</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Создайте новый аккаунт</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">Ник</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Ваш ник" className="bg-input/50 border-border/60 focus:border-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="you@example.com" className="bg-input/50 border-border/60 focus:border-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">Пароль</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input {...field} type={showPass ? "text" : "password"} placeholder="••••••••"
                      className="bg-input/50 border-border/60 focus:border-primary pr-10" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="confirmPassword" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">Подтвердить пароль</FormLabel>
                <FormControl>
                  <Input {...field} type="password" placeholder="••••••••" className="bg-input/50 border-border/60 focus:border-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Button type="submit" className="w-full gap-2 font-semibold"
              style={{ background: "linear-gradient(135deg, hsl(270 80% 45%), hsl(280 90% 55%))", boxShadow: "0 4px 20px rgba(155,48,255,0.4)" }}>
              <UserPlus size={16} /> Зарегистрироваться
            </Button>
          </form>
        </Form>

        <p className="text-center text-xs text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="text-primary hover:text-accent transition-colors font-medium">Войти</Link>
        </p>
      </div>
    </div>
  );
}

function FlowerIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
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
