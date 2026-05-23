import { storage } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";

export function RoleBadge({ roleId, className }: { roleId: string, className?: string }) {
  const roles = storage.getRoles();
  const role = roles.find(r => r.id === roleId);

  if (!role) return null;

  return (
    <Badge 
      style={{ backgroundColor: role.color, color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
      className={`font-pixel text-[10px] px-2 py-1 ${className || ""}`}
    >
      {role.name}
    </Badge>
  );
}
