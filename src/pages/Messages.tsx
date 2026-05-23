import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  storage, Message, Group, GroupMessage, GroupLog, ChannelComment,
  generateId, addNotification, addGroupLog, GROUP_EMOJIS, FriendRequest,
  AVATAR_EMOJIS, AVATAR_COLORS, CallRequest, getUserAvatar
} from "@/lib/storage";
import { RoleBadge } from "@/components/RoleBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send, ArrowLeft, UserPlus, X, Check, ChevronRight,
  Pencil, Trash2, Pin, ScrollText, MessageSquare, Phone, PhoneOff, PhoneCall
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Panel = "dm" | "group" | "channel";

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
const fmtAgo = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60000) return "только что";
  if (d < 3600000) return `${Math.floor(d / 60000)} мин`;
  if (d < 86400000) return `${Math.floor(d / 3600000)} ч`;
  return fmtDate(iso);
};

export default function Messages() {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>("dm");

  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [activePartnerName, setActivePartnerName] = useState("");
  const [dmText, setDmText] = useState("");

  const [friendReqs, setFriendReqs] = useState<FriendRequest[]>([]);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [friendSearchQ, setFriendSearchQ] = useState("");
  const [friendSearchResult, setFriendSearchResult] = useState<{ id: string; name: string; roleId: string } | null>(null);

  const [groupMsgs, setGroupMsgs] = useState<GroupMessage[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [groupText, setGroupText] = useState("");
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [editingMsg, setEditingMsg] = useState<GroupMessage | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState<"group" | "channel" | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupEmoji, setNewGroupEmoji] = useState("🌸");
  const [newGroupColor, setNewGroupColor] = useState(AVATAR_COLORS[0]);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [channelComments, setChannelComments] = useState<ChannelComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [calls, setCalls] = useState<CallRequest[]>([]);
  const [activeCall, setActiveCall] = useState<CallRequest | null>(null);
  const isOwnerOrDeputy = hasPermission("*") || hasPermission("manage_users");

  const loadAll = () => {
    if (!user) return;
    setDmMessages(storage.getMessages());
    setFriendReqs(storage.getFriendReqs());
    setGroupMsgs(storage.getGroupMsgs());
    setChannelComments(storage.getChannelComments());
    const c = storage.getCalls();
    setCalls(c);
    // Check for incoming call
    const incoming = c.find(x => x.toId === user.id && x.status === "calling");
    if (incoming && !activeCall) setActiveCall(incoming);
    // Check if our outgoing call was answered/declined
    const outgoing = c.find(x => x.fromId === user.id && (x.status === "accepted" || x.status === "declined" || x.status === "ended"));
    if (outgoing && activeCall?.id === outgoing.id && outgoing.status !== "accepted") {
      if (outgoing.status === "declined") { toast({ title: `${outgoing.toName} отклонил звонок` }); setActiveCall(null); }
      if (outgoing.status === "ended") setActiveCall(null);
    }
  };

  useEffect(() => { loadAll(); const iv = setInterval(loadAll, 1000); return () => clearInterval(iv); }, [user, activeCall]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [dmMessages, groupMsgs, activeGroupId, activePartnerId]);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const toId = p.get("to"); const toName = p.get("name");
    if (toId) { setActivePartnerId(toId); setActivePartnerName(decodeURIComponent(toName || "")); setPanel("dm"); }
  }, [location]);
  useEffect(() => {
    if (!user || !activePartnerId || activePartnerId === "bot-friends") return;
    const msgs = storage.getMessages();
    const updated = msgs.map(m => m.fromId === activePartnerId && m.toId === user.id && !m.read ? { ...m, read: true } : m);
    storage.setMessages(updated); setDmMessages(updated);
  }, [activePartnerId, user]);

  if (!user) return <div className="flex items-center justify-center h-64 text-muted-foreground">Войдите для просмотра сообщений</div>;

  const allUsers = storage.getUsers();
  const allGroups = storage.getGroups();
  const myDMs = dmMessages.filter(m => m.fromId === user.id || m.toId === user.id);
  const convoMap = new Map<string, { partnerId: string; partnerName: string; partnerRoleId: string; lastMsg: string; lastAt: string; unread: number }>();
  for (const m of myDMs) {
    const pid = m.fromId === user.id ? m.toId : m.fromId;
    const pname = m.fromId === user.id ? m.toName : m.fromName;
    const ex = convoMap.get(pid);
    const isNewer = !ex || m.createdAt > ex.lastAt;
    const pu = allUsers.find(u => u.id === pid);
    if (isNewer) convoMap.set(pid, { partnerId: pid, partnerName: pname, partnerRoleId: pu?.roleId || "user", lastMsg: m.text, lastAt: m.createdAt, unread: (ex?.unread || 0) + (m.toId === user.id && !m.read ? 1 : 0) });
    else if (ex && m.toId === user.id && !m.read) ex.unread++;
  }
  const convos = Array.from(convoMap.values()).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  const thread = activePartnerId && activePartnerId !== "bot-friends"
    ? myDMs.filter(m => (m.fromId === user.id && m.toId === activePartnerId) || (m.fromId === activePartnerId && m.toId === user.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : [];
  const pendingReqs = friendReqs.filter(r => r.toId === user.id && r.status === "pending");
  const myGroups = allGroups.filter(g => g.type === "group");
  const myChannels = allGroups.filter(g => g.type === "channel");
  const activeGroup = allGroups.find(g => g.id === activeGroupId);
  const activeChannel = allGroups.find(g => g.id === activeChannelId);
  const activeGroupMsgs = groupMsgs.filter(m => m.groupId === (activeGroupId || activeChannelId) && !m.isDeleted).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const channelPosts = groupMsgs.filter(m => m.groupId === activeChannelId && !m.isDeleted).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const isGroupAdmin = (g: Group | undefined) => g && (g.adminIds.includes(user.id) || g.ownerId === user.id);

  // ── DM ──────────────────────────────────────────────────────────────────────
  const sendDM = () => {
    if (!dmText.trim() || !activePartnerId || activePartnerId === "bot-friends") return;
    const partner = allUsers.find(u => u.id === activePartnerId);
    const msg: Message = { id: generateId(), fromId: user.id, fromName: user.name, toId: activePartnerId, toName: partner?.name || activePartnerName, text: dmText.trim(), createdAt: new Date().toISOString(), read: false };
    const updated = [...storage.getMessages(), msg];
    storage.setMessages(updated); setDmMessages(updated); setDmText("");
    addNotification(activePartnerId, "new_message", `Сообщение от ${user.name}`, dmText.trim(), "/messages");
  };

  // ── Calls ────────────────────────────────────────────────────────────────────
  const startCall = (toId: string, toName: string) => {
    const call: CallRequest = { id: generateId(), fromId: user.id, fromName: user.name, toId, toName, status: "calling", createdAt: new Date().toISOString() };
    storage.setCalls([...storage.getCalls().filter(c => c.status === "ended" || c.status === "declined"), call]);
    setActiveCall(call);
    addNotification(toId, "call_incoming", `📞 Звонок от ${user.name}`, "Входящий голосовой звонок", "/messages");
    toast({ title: `Звоним ${toName}...` });
  };
  const acceptCall = (call: CallRequest) => {
    storage.setCalls(storage.getCalls().map(c => c.id === call.id ? { ...c, status: "accepted" } : c));
    setActiveCall({ ...call, status: "accepted" });
  };
  const endCall = () => {
    if (!activeCall) return;
    storage.setCalls(storage.getCalls().map(c => c.id === activeCall.id ? { ...c, status: "ended" } : c));
    setActiveCall(null);
  };
  const declineCall = (call: CallRequest) => {
    storage.setCalls(storage.getCalls().map(c => c.id === call.id ? { ...c, status: "declined" } : c));
    setActiveCall(null);
  };

  // ── Friends ──────────────────────────────────────────────────────────────────
  const searchFriend = () => {
    const found = allUsers.find(u => u.name.toLowerCase() === friendSearchQ.trim().toLowerCase() && u.id !== user.id);
    if (!found) { toast({ title: "Пользователь не найден" }); setFriendSearchResult(null); return; }
    setFriendSearchResult({ id: found.id, name: found.name, roleId: found.roleId });
  };
  const sendFriendReq = (toId: string, toName: string) => {
    const reqs = storage.getFriendReqs();
    if (reqs.some(r => (r.fromId === user.id && r.toId === toId) || (r.fromId === toId && r.toId === user.id))) {
      toast({ title: "Запрос уже существует" }); return;
    }
    storage.setFriendReqs([...reqs, { id: generateId(), fromId: user.id, fromName: user.name, toId, toName, status: "pending", createdAt: new Date().toISOString() }]);
    addNotification(toId, "friend_request", `Запрос в друзья от ${user.name}`, `${user.name} хочет добавить вас в друзья`, "/messages");
    toast({ title: "Запрос отправлен!" }); setShowFriendSearch(false); setFriendSearchQ(""); setFriendSearchResult(null);
  };
  const acceptFriend = (r: FriendRequest) => {
    storage.setFriendReqs(storage.getFriendReqs().map(x => x.id === r.id ? { ...x, status: "accepted" } : x));
    addNotification(r.fromId, "friend_accepted", `${user.name} принял запрос`, `Теперь вы друзья с ${user.name}`, "/messages");
    toast({ title: "Запрос принят!" }); loadAll();
  };
  const declineFriend = (r: FriendRequest) => {
    storage.setFriendReqs(storage.getFriendReqs().map(x => x.id === r.id ? { ...x, status: "declined" } : x));
    loadAll();
  };

  // ── Groups ───────────────────────────────────────────────────────────────────
  const createGroup = (type: "group" | "channel") => {
    if (!newGroupName.trim()) return;
    const g: Group = { id: generateId(), name: newGroupName.trim(), description: newGroupDesc.trim(), type, ownerId: user.id, ownerName: user.name, adminIds: [user.id], memberIds: [user.id], subscriberIds: [user.id], avatarEmoji: newGroupEmoji, avatarColor: newGroupColor, isPublic: true, createdAt: new Date().toISOString() };
    storage.setGroups([...storage.getGroups(), g]);
    addGroupLog(g.id, "Создан", user.id, user.name);
    setNewGroupName(""); setNewGroupDesc(""); setShowCreateGroup(null);
    type === "group" ? setActiveGroupId(g.id) : setActiveChannelId(g.id);
    setPanel(type === "group" ? "group" : "channel");
    toast({ title: `${type === "group" ? "Группа" : "Канал"} создан!` });
  };
  const joinGroup = (gId: string, type: "group" | "channel") => {
    const all = storage.getGroups();
    const g = all.find(x => x.id === gId);
    if (!g) return;
    const isMember = g.memberIds.includes(user.id) || g.subscriberIds.includes(user.id);
    if (!isMember) {
      storage.setGroups(all.map(x => x.id === gId ? { ...x, memberIds: [...x.memberIds, user.id], subscriberIds: [...x.subscriberIds, user.id] } : x));
      addGroupLog(gId, "Участник вступил", user.id, user.name);
    }
    type === "group" ? setActiveGroupId(gId) : setActiveChannelId(gId);
  };
  const leaveGroup = (gId: string) => {
    storage.setGroups(storage.getGroups().map(x => x.id === gId ? { ...x, memberIds: x.memberIds.filter(id => id !== user.id), subscriberIds: x.subscriberIds.filter(id => id !== user.id) } : x));
    addGroupLog(gId, "Участник покинул", user.id, user.name);
    setActiveGroupId(null); setActiveChannelId(null);
  };
  const addMember = (gId: string, memberId: string, memberName: string) => {
    const all = storage.getGroups();
    const g = all.find(x => x.id === gId);
    if (!g || g.memberIds.includes(memberId)) { toast({ title: "Уже в группе" }); return; }
    storage.setGroups(all.map(x => x.id === gId ? { ...x, memberIds: [...x.memberIds, memberId], subscriberIds: [...x.subscriberIds, memberId] } : x));
    addGroupLog(gId, "Участник добавлен", user.id, user.name, memberId, memberName);
    addNotification(memberId, "group_invite", `Вас добавили в ${g.name}`, `${user.name} добавил вас в группу`, "/messages");
    toast({ title: `${memberName} добавлен в группу` }); setMemberSearch(""); setShowAddMember(false);
  };
  const sendGroupMsg = (gId: string) => {
    if (!groupText.trim()) return;
    const g = storage.getGroups().find(x => x.id === gId);
    if (!g) return;
    const isAdmin = g.adminIds.includes(user.id) || g.ownerId === user.id;
    if (g.type === "channel" && !isAdmin) return;
    const msg: GroupMessage = { id: generateId(), groupId: gId, fromId: user.id, fromName: user.name, fromRoleId: user.roleId, text: groupText.trim(), createdAt: new Date().toISOString(), isDeleted: false, replyToId: replyTo?.id, reactions: {}, isPinned: false };
    storage.setGroupMsgs([...storage.getGroupMsgs(), msg]);
    setGroupMsgs(storage.getGroupMsgs()); setGroupText(""); setReplyTo(null);
    g.memberIds.filter(id => id !== user.id).slice(0, 15).forEach(id => addNotification(id, "group_message", g.name, `${user.name}: ${groupText.slice(0, 50)}`, "/messages"));
  };
  const deleteGroupMsg = (msgId: string, gId: string) => {
    const g = storage.getGroups().find(x => x.id === gId);
    const msg = storage.getGroupMsgs().find(m => m.id === msgId);
    if (!msg) return;
    const isAdmin = g?.adminIds.includes(user.id) || g?.ownerId === user.id;
    if (msg.fromId !== user.id && !isAdmin) return;
    storage.setGroupMsgs(storage.getGroupMsgs().map(m => m.id === msgId ? { ...m, isDeleted: true } : m));
    if (msg.fromId !== user.id) addGroupLog(gId, "Удалено сообщение", user.id, user.name, msg.fromId, msg.fromName);
    setGroupMsgs(storage.getGroupMsgs());
  };
  const pinGroupMsg = (msgId: string, gId: string) => {
    const g = storage.getGroups().find(x => x.id === gId);
    if (!(g?.adminIds.includes(user.id) || g?.ownerId === user.id)) return;
    storage.setGroups(storage.getGroups().map(x => x.id === gId ? { ...x, pinnedMessageId: msgId } : x));
    addGroupLog(gId, "Закреплено сообщение", user.id, user.name);
  };
  const editGroupMsg = (msgId: string) => {
    if (!groupText.trim()) return;
    storage.setGroupMsgs(storage.getGroupMsgs().map(m => m.id === msgId ? { ...m, text: groupText.trim(), editedAt: new Date().toISOString() } : m));
    setGroupMsgs(storage.getGroupMsgs()); setEditingMsg(null); setGroupText("");
  };
  const reactToMsg = (msgId: string, emoji: string, isGrp: boolean) => {
    if (isGrp) {
      storage.setGroupMsgs(storage.getGroupMsgs().map(m => {
        if (m.id !== msgId) return m;
        const r = { ...m.reactions }; if (!r[emoji]) r[emoji] = [];
        r[emoji] = r[emoji].includes(user.id) ? r[emoji].filter(id => id !== user.id) : [...r[emoji], user.id];
        return { ...m, reactions: r };
      })); setGroupMsgs(storage.getGroupMsgs());
    } else {
      storage.setChannelComments(storage.getChannelComments().map(c => {
        if (c.id !== msgId) return c;
        const r = { ...c.reactions }; if (!r[emoji]) r[emoji] = [];
        r[emoji] = r[emoji].includes(user.id) ? r[emoji].filter(id => id !== user.id) : [...r[emoji], user.id];
        return { ...c, reactions: r };
      })); setChannelComments(storage.getChannelComments());
    }
    setShowReactions(null);
  };
  const sendComment = (postId: string, gId: string) => {
    if (!commentText.trim()) return;
    storage.setChannelComments([...storage.getChannelComments(), { id: generateId(), postId, groupId: gId, fromId: user.id, fromName: user.name, text: commentText.trim(), createdAt: new Date().toISOString(), reactions: {} }]);
    setChannelComments(storage.getChannelComments()); setCommentText("");
  };

  // ── Message bubble ─────────────────────────────────────────────────────────
  const Bubble = ({ m, gId }: { m: GroupMessage; gId: string }) => {
    const isMe = m.fromId === user.id;
    const g = storage.getGroups().find(x => x.id === gId);
    const isAdmin = isGroupAdmin(g);
    const replyMsg = m.replyToId ? groupMsgs.find(x => x.id === m.replyToId) : null;
    const totalReactions = Object.entries(m.reactions).filter(([, ids]) => ids.length > 0);
    const mUser = allUsers.find(u => u.id === m.fromId);
    return (
      <div className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}>
        <UserAvatar user={mUser} name={m.fromName} size="xs" className="mt-1 shrink-0" />
        <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? "items-end" : "items-start"}`}>
          {!isMe && (
            <div className="flex items-center gap-1 px-1">
              <span className="text-[11px] font-semibold text-primary">{m.fromName}</span>
              <RoleBadge roleId={m.fromRoleId} />
              {m.isPinned && <Pin size={10} className="text-yellow-400" />}
            </div>
          )}
          {replyMsg && (
            <div className={`text-[10px] px-2 py-1 rounded border-l-2 border-primary/60 bg-primary/5 max-w-xs truncate ${isMe ? "text-right" : ""}`}>
              ↩ {replyMsg.fromName}: {replyMsg.text}
            </div>
          )}
          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isMe ? "bg-primary/80 text-white rounded-tr-sm" : "bg-white/8 border border-white/10 rounded-tl-sm"}`}>
            {m.text}{m.editedAt && <span className="text-[9px] opacity-60 ml-1">ред.</span>}
          </div>
          {totalReactions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {totalReactions.map(([emoji, ids]) => (
                <button key={emoji} onClick={() => reactToMsg(m.id, emoji, true)}
                  className={`text-xs px-1.5 py-0.5 rounded-full border ${ids.includes(user.id) ? "bg-primary/30 border-primary/50" : "bg-white/10 border-white/20"}`}>
                  {emoji} {ids.length}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-muted-foreground">{fmtTime(m.createdAt)}</span>
            <button onClick={() => setShowReactions(showReactions === m.id ? null : m.id)} className="text-[10px] hover:text-primary px-1">😊</button>
            <button onClick={() => setReplyTo(m)} className="text-[10px] hover:text-primary px-1">↩</button>
            {isMe && <button onClick={() => { setEditingMsg(m); setGroupText(m.text); }} className="text-[10px] hover:text-primary px-1"><Pencil size={10} /></button>}
            {(isMe || isAdmin) && <button onClick={() => deleteGroupMsg(m.id, gId)} className="text-[10px] hover:text-destructive px-1"><Trash2 size={10} /></button>}
            {isAdmin && <button onClick={() => pinGroupMsg(m.id, gId)} className="text-[10px] hover:text-yellow-400 px-1"><Pin size={10} /></button>}
          </div>
          {showReactions === m.id && (
            <div className="flex gap-1 bg-black/80 border border-border/60 rounded-full px-2 py-1">
              {GROUP_EMOJIS.map(e => <button key={e} onClick={() => reactToMsg(m.id, e, true)} className="hover:scale-125 transition-transform text-base">{e}</button>)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const memberSearchResults = allUsers.filter(u => {
    if (!memberSearch.trim() || u.id === user.id) return false;
    const g = allGroups.find(x => x.id === (activeGroupId || activeChannelId));
    if (g?.memberIds.includes(u.id)) return false;
    return u.name.toLowerCase().includes(memberSearch.toLowerCase());
  });

  return (
    <div>
      {/* ── Incoming call overlay ── */}
      {activeCall && activeCall.toId === user.id && activeCall.status === "calling" && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="glass-card rounded-3xl p-8 space-y-6 text-center border border-primary/40 w-80"
            style={{ background: "rgba(15,4,30,0.98)", boxShadow: "0 0 60px rgba(155,48,255,0.3)" }}>
            <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-primary/40 mx-auto flex items-center justify-center text-3xl animate-pulse">
              {getUserAvatar(allUsers.find(u => u.id === activeCall.fromId) || { avatarEmoji: "🌸", avatarColor: "#7c3aed" } as any).emoji}
            </div>
            <div>
              <p className="text-lg font-semibold">{activeCall.fromName}</p>
              <p className="text-sm text-muted-foreground">Входящий звонок...</p>
            </div>
            <div className="flex justify-center gap-6">
              <button onClick={() => declineCall(activeCall)}
                className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors">
                <PhoneOff size={22} className="text-white" />
              </button>
              <button onClick={() => acceptCall(activeCall)}
                className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-600 transition-colors">
                <Phone size={22} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active call screen ── */}
      {activeCall && (activeCall.fromId === user.id || activeCall.toId === user.id) && activeCall.status === "accepted" && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="glass-card rounded-3xl p-8 space-y-6 text-center border border-green-500/30 w-80"
            style={{ background: "rgba(10,30,15,0.98)", boxShadow: "0 0 60px rgba(34,197,94,0.2)" }}>
            <div className="w-20 h-20 rounded-full bg-green-500/20 border-4 border-green-500/40 mx-auto flex items-center justify-center text-3xl">
              {activeCall.fromId === user.id
                ? getUserAvatar(allUsers.find(u => u.id === activeCall.toId) || { avatarEmoji: "🌸", avatarColor: "#059669" } as any).emoji
                : getUserAvatar(allUsers.find(u => u.id === activeCall.fromId) || { avatarEmoji: "🌸", avatarColor: "#059669" } as any).emoji}
            </div>
            <div>
              <p className="text-lg font-semibold">{activeCall.fromId === user.id ? activeCall.toName : activeCall.fromName}</p>
              <p className="text-sm text-green-400 flex items-center justify-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />Звонок идёт</p>
              <p className="text-xs text-muted-foreground mt-1">Голосовой звонок (симуляция)</p>
            </div>
            <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mx-auto hover:bg-red-600 transition-colors">
              <PhoneOff size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* ── Outgoing call screen ── */}
      {activeCall && activeCall.fromId === user.id && activeCall.status === "calling" && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="glass-card rounded-3xl p-8 space-y-6 text-center border border-primary/30 w-80"
            style={{ background: "rgba(15,4,30,0.98)" }}>
            <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-primary/40 mx-auto flex items-center justify-center text-3xl animate-pulse">
              {getUserAvatar(allUsers.find(u => u.id === activeCall.toId) || { avatarEmoji: "🌸", avatarColor: "#7c3aed" } as any).emoji}
            </div>
            <div>
              <p className="text-lg font-semibold">{activeCall.toName}</p>
              <p className="text-sm text-muted-foreground">Вызов...</p>
            </div>
            <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center mx-auto hover:bg-red-600 transition-colors">
              <PhoneOff size={22} className="text-white" />
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-pixel text-[13px] text-primary neon-text">Сообщения</h1>
          <p className="text-xs text-muted-foreground mt-1">Общение с игроками сервера</p>
        </div>
        <div className="flex gap-2">
          {panel === "dm" && (
            <Button size="sm" onClick={() => setShowFriendSearch(true)} variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
              <UserPlus size={14} /> Найти игрока
            </Button>
          )}
          {(panel === "group" || panel === "channel") && (
            <Button size="sm" onClick={() => setShowCreateGroup(panel === "group" ? "group" : "channel")} variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
              <span className="text-base">{panel === "group" ? "👥" : "📢"}</span> Создать
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-3 glass-card rounded-lg p-1 w-fit">
        {(["dm", "group", "channel"] as Panel[]).map(p => (
          <button key={p} onClick={() => setPanel(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${panel === p ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
            {p === "dm" ? "💬 Личные" : p === "group" ? "👥 Группы" : "📢 Каналы"}
          </button>
        ))}
      </div>

      <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        {/* ── Left panel ── */}
        <div className={`w-64 shrink-0 glass-card rounded-xl overflow-hidden flex flex-col ${(panel === "dm" && activePartnerId) || (panel === "group" && activeGroupId) || (panel === "channel" && activeChannelId) ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b border-border/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {panel === "dm" ? "Беседы" : panel === "group" ? "Группы" : "Каналы"}
          </div>
          <div className="flex-1 overflow-y-auto">
            {panel === "dm" && (
              <>
                <button onClick={() => { setActivePartnerId("bot-friends"); setActivePartnerName("Заявки в друзья"); }}
                  className={`w-full flex items-center gap-3 p-3 border-b border-border/20 hover:bg-white/5 transition-colors text-left ${activePartnerId === "bot-friends" ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl shrink-0">🤝</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Заявки в друзья</span>
                      {pendingReqs.length > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingReqs.length}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{pendingReqs.length > 0 ? `${pendingReqs.length} новых` : "Нет заявок"}</p>
                  </div>
                </button>
                {convos.map(c => {
                  const cu = allUsers.find(u => u.id === c.partnerId);
                  return (
                    <button key={c.partnerId} onClick={() => { setActivePartnerId(c.partnerId); setActivePartnerName(c.partnerName); }}
                      className={`w-full flex items-center gap-3 p-3 border-b border-border/20 hover:bg-white/5 transition-colors text-left ${activePartnerId === c.partnerId ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}>
                      <UserAvatar user={cu} name={c.partnerName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{c.partnerName}</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{fmtDate(c.lastAt)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{c.lastMsg}</p>
                      </div>
                      {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">{c.unread}</span>}
                    </button>
                  );
                })}
              </>
            )}
            {panel === "group" && myGroups.map(g => (
              <button key={g.id} onClick={() => joinGroup(g.id, "group")}
                className={`w-full flex items-center gap-3 p-3 border-b border-border/20 hover:bg-white/5 transition-colors text-left ${activeGroupId === g.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl shrink-0 border-2" style={{ background: g.avatarColor + "33", borderColor: g.avatarColor + "66" }}>
                  {g.avatarEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{g.name}</div>
                  <div className="text-[11px] text-muted-foreground">{g.memberIds.length} участников</div>
                </div>
              </button>
            ))}
            {panel === "channel" && myChannels.map(g => (
              <button key={g.id} onClick={() => joinGroup(g.id, "channel")}
                className={`w-full flex items-center gap-3 p-3 border-b border-border/20 hover:bg-white/5 transition-colors text-left ${activeChannelId === g.id ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl shrink-0 border-2" style={{ background: g.avatarColor + "33", borderColor: g.avatarColor + "66" }}>
                  {g.avatarEmoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{g.name}</div>
                  <div className="text-[11px] text-muted-foreground">{g.subscriberIds.length} подписчиков</div>
                </div>
              </button>
            ))}
            {panel === "group" && myGroups.length === 0 && <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs">Нет групп</div>}
            {panel === "channel" && myChannels.length === 0 && <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-xs">Нет каналов</div>}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className={`flex-1 glass-card rounded-xl overflow-hidden flex flex-col ${(!activePartnerId && panel === "dm") || (!activeGroupId && panel === "group") || (!activeChannelId && panel === "channel") ? "hidden md:flex" : "flex"}`}>

          {/* DM */}
          {panel === "dm" && activePartnerId && (
            <>
              <div className="p-3 border-b border-border/40 flex items-center gap-3">
                <button className="md:hidden text-muted-foreground" onClick={() => setActivePartnerId(null)}><ArrowLeft size={16} /></button>
                {activePartnerId === "bot-friends" ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-base">🤝</div>
                ) : (
                  <UserAvatar user={allUsers.find(u => u.id === activePartnerId)} name={activePartnerName} size="sm" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-semibold">{activePartnerName}</div>
                  {activePartnerId !== "bot-friends" && (() => { const pu = allUsers.find(u => u.id === activePartnerId); return pu ? <RoleBadge roleId={pu.roleId} /> : null; })()}
                </div>
                {activePartnerId !== "bot-friends" && (
                  <button onClick={() => startCall(activePartnerId, activePartnerName)}
                    className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 hover:bg-green-500/40 transition-colors" title="Позвонить">
                    <Phone size={14} />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activePartnerId === "bot-friends" ? (
                  <>
                    <p className="text-xs text-muted-foreground text-center">Входящие запросы в друзья</p>
                    {pendingReqs.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">Нет запросов</div>
                    ) : pendingReqs.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 glass-card rounded-xl">
                        <UserAvatar user={allUsers.find(u => u.id === r.fromId)} name={r.fromName} size="sm" />
                        <div className="flex-1"><div className="font-medium text-sm">{r.fromName}</div><div className="text-[11px] text-muted-foreground">{fmtAgo(r.createdAt)}</div></div>
                        <button onClick={() => acceptFriend(r)} className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 hover:bg-green-500/40 transition-colors"><Check size={14} /></button>
                        <button onClick={() => declineFriend(r)} className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 hover:bg-red-500/40 transition-colors"><X size={14} /></button>
                      </div>
                    ))}
                  </>
                ) : (
                  thread.map(m => {
                    const isMe = m.fromId === user.id;
                    const mu = allUsers.find(u => u.id === m.fromId);
                    return (
                      <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        <UserAvatar user={mu} name={m.fromName} size="xs" className="mt-1 shrink-0" />
                        <div className={`max-w-[70%] flex flex-col gap-0.5 ${isMe ? "items-end" : ""}`}>
                          <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-primary/80 text-white rounded-tr-sm" : "bg-white/8 border border-white/10 rounded-tl-sm"}`}>{m.text}</div>
                          <span className="text-[10px] text-muted-foreground px-1">{fmtTime(m.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
              {activePartnerId !== "bot-friends" && (
                <div className="p-3 border-t border-border/40 flex gap-2">
                  <Input value={dmText} onChange={e => setDmText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendDM()}
                    placeholder="Введите сообщение..." className="bg-input/50 border-border/60 focus:border-primary flex-1" />
                  <Button onClick={sendDM} disabled={!dmText.trim()} size="icon" style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}><Send size={15} /></Button>
                </div>
              )}
            </>
          )}

          {/* Group chat */}
          {panel === "group" && activeGroupId && activeGroup && (
            <>
              <div className="p-3 border-b border-border/40 flex items-center gap-2">
                <button className="md:hidden text-muted-foreground" onClick={() => setActiveGroupId(null)}><ArrowLeft size={16} /></button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2" style={{ background: activeGroup.avatarColor + "33", borderColor: activeGroup.avatarColor }}>{activeGroup.avatarEmoji}</div>
                <div className="flex-1"><div className="text-sm font-semibold">{activeGroup.name}</div><div className="text-[11px] text-muted-foreground">{activeGroup.memberIds.length} участников</div></div>
                {isGroupAdmin(activeGroup) && <button onClick={() => setShowAddMember(true)} className="text-muted-foreground hover:text-primary transition-colors" title="Добавить участника"><UserPlus size={15} /></button>}
                {isOwnerOrDeputy && <button onClick={() => setShowLogs(!showLogs)} className="text-muted-foreground hover:text-primary transition-colors" title="Логи"><ScrollText size={15} /></button>}
                <button onClick={() => leaveGroup(activeGroup.id)} className="text-xs text-destructive hover:text-red-400 ml-1">Выйти</button>
              </div>
              {showLogs && isOwnerOrDeputy ? (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <div className="text-xs font-semibold text-primary mb-3 flex items-center gap-2"><ScrollText size={13} /> Логи группы</div>
                  {storage.getGroupLogs().filter(l => l.groupId === activeGroupId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(l => (
                    <div key={l.id} className="text-xs text-muted-foreground flex items-center gap-2 py-1 border-b border-border/20">
                      <span className="text-foreground font-medium">{l.byName}</span><span>{l.action}</span>
                      {l.targetName && <span className="text-primary">→ {l.targetName}</span>}
                      <span className="ml-auto shrink-0 text-[10px]">{fmtAgo(l.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {activeGroupMsgs.filter(m => m.groupId === activeGroupId).length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-10">Нет сообщений</div>
                    ) : activeGroupMsgs.filter(m => m.groupId === activeGroupId).map(m => <Bubble key={m.id} m={m} gId={activeGroupId} />)}
                    <div ref={bottomRef} />
                  </div>
                  {replyTo && (
                    <div className="px-3 py-2 bg-primary/10 border-t border-primary/30 flex items-center gap-2">
                      <div className="flex-1 text-xs text-muted-foreground truncate">↩ {replyTo.fromName}: {replyTo.text}</div>
                      <button onClick={() => setReplyTo(null)}><X size={12} /></button>
                    </div>
                  )}
                  <div className="p-3 border-t border-border/40 flex gap-2">
                    <Input value={groupText} onChange={e => setGroupText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && (editingMsg ? editGroupMsg(editingMsg.id) : sendGroupMsg(activeGroupId))}
                      placeholder={editingMsg ? "Редактировать..." : "Сообщение..."} className="bg-input/50 border-border/60 focus:border-primary flex-1" />
                    {editingMsg && <Button variant="ghost" size="icon" onClick={() => { setEditingMsg(null); setGroupText(""); }}><X size={14} /></Button>}
                    <Button onClick={() => editingMsg ? editGroupMsg(editingMsg.id) : sendGroupMsg(activeGroupId)} disabled={!groupText.trim()} size="icon" style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}><Send size={15} /></Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Channel */}
          {panel === "channel" && activeChannelId && activeChannel && (
            <>
              <div className="p-3 border-b border-border/40 flex items-center gap-2">
                <button className="md:hidden text-muted-foreground" onClick={() => setActiveChannelId(null)}><ArrowLeft size={16} /></button>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg border-2" style={{ background: activeChannel.avatarColor + "33", borderColor: activeChannel.avatarColor }}>{activeChannel.avatarEmoji}</div>
                <div className="flex-1"><div className="text-sm font-semibold">{activeChannel.name}</div><div className="text-[11px] text-muted-foreground">{activeChannel.subscriberIds.length} подписчиков</div></div>
                {isGroupAdmin(activeChannel) && <button onClick={() => setShowAddMember(true)} className="text-muted-foreground hover:text-primary" title="Добавить"><UserPlus size={15} /></button>}
                {isOwnerOrDeputy && <button onClick={() => setShowLogs(!showLogs)} className="text-muted-foreground hover:text-primary" title="Логи"><ScrollText size={15} /></button>}
                <button onClick={() => leaveGroup(activeChannel.id)} className="text-xs text-destructive hover:text-red-400 ml-1">Отписаться</button>
              </div>
              {showLogs && isOwnerOrDeputy ? (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {storage.getGroupLogs().filter(l => l.groupId === activeChannelId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(l => (
                    <div key={l.id} className="text-xs text-muted-foreground flex items-center gap-2 py-1 border-b border-border/20">
                      <span className="font-medium text-foreground">{l.byName}</span><span>{l.action}</span>
                      {l.targetName && <span className="text-primary">→ {l.targetName}</span>}
                      <span className="ml-auto text-[10px]">{fmtAgo(l.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isGroupAdmin(activeChannel) && (
                    <div className="flex gap-2 pb-3 border-b border-border/30">
                      <Input value={groupText} onChange={e => setGroupText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendGroupMsg(activeChannelId)}
                        placeholder="Новый пост..." className="bg-input/50 border-border/60 focus:border-primary flex-1 text-sm" />
                      <Button onClick={() => sendGroupMsg(activeChannelId)} disabled={!groupText.trim()} size="icon" style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}><Send size={15} /></Button>
                    </div>
                  )}
                  {channelPosts.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-10">Нет постов</div>
                  ) : channelPosts.map(post => {
                    const postComments = channelComments.filter(c => c.postId === post.id);
                    const postReactions = Object.entries(post.reactions).filter(([, ids]) => ids.length > 0);
                    const isExpanded = activePostId === post.id;
                    return (
                      <div key={post.id} className="glass-card rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <UserAvatar user={allUsers.find(u => u.id === post.fromId)} name={post.fromName} size="sm" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-primary">{post.fromName}</span>
                              <span className="text-[10px] text-muted-foreground">{fmtAgo(post.createdAt)}</span>
                            </div>
                            <p className="text-sm mt-1 leading-relaxed">{post.text}</p>
                          </div>
                          {isGroupAdmin(activeChannel) && <button onClick={() => deleteGroupMsg(post.id, activeChannelId)} className="text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {postReactions.map(([e, ids]) => (
                            <button key={e} onClick={() => reactToMsg(post.id, e, true)} className={`text-xs px-2 py-0.5 rounded-full border ${ids.includes(user.id) ? "bg-primary/30 border-primary/50" : "bg-white/10 border-white/20"}`}>{e} {ids.length}</button>
                          ))}
                          <button onClick={() => setShowReactions(showReactions === post.id ? null : post.id)} className="text-xs px-2 py-0.5 rounded-full border border-white/20 bg-white/5">+ 😊</button>
                        </div>
                        {showReactions === post.id && (
                          <div className="flex gap-1 bg-black/80 border border-border/60 rounded-full px-3 py-1.5 w-fit">
                            {GROUP_EMOJIS.map(e => <button key={e} onClick={() => reactToMsg(post.id, e, true)} className="hover:scale-125 transition-transform text-lg">{e}</button>)}
                          </div>
                        )}
                        <button onClick={() => setActivePostId(isExpanded ? null : post.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <MessageSquare size={12} /> {postComments.length} комментариев {isExpanded ? "▲" : "▼"}
                        </button>
                        {isExpanded && (
                          <div className="pl-3 border-l border-border/40 space-y-2">
                            {postComments.map(c => (
                              <div key={c.id} className="flex gap-2">
                                <UserAvatar user={allUsers.find(u => u.id === c.fromId)} name={c.fromName} size="xs" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2"><span className="text-xs font-semibold text-primary">{c.fromName}</span><span className="text-[10px] text-muted-foreground">{fmtAgo(c.createdAt)}</span></div>
                                  <p className="text-xs mt-0.5">{c.text}</p>
                                  {Object.entries(c.reactions).filter(([, ids]) => ids.length > 0).map(([e, ids]) => (
                                    <button key={e} onClick={() => reactToMsg(c.id, e, false)} className={`text-[10px] px-1.5 py-0.5 rounded-full border mr-1 mt-1 ${ids.includes(user.id) ? "bg-primary/30 border-primary/50" : "bg-white/10 border-white/20"}`}>{e} {ids.length}</button>
                                  ))}
                                </div>
                              </div>
                            ))}
                            <div className="flex gap-2 mt-2">
                              <Input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment(post.id, activeChannelId)}
                                placeholder="Комментарий..." className="bg-input/50 border-border/60 focus:border-primary flex-1 h-8 text-xs" />
                              <Button onClick={() => sendComment(post.id, activeChannelId)} size="sm" className="h-8 px-2" style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}><Send size={12} /></Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Empty states */}
          {panel === "dm" && !activePartnerId && <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground"><div className="text-4xl opacity-20">💬</div><p className="text-sm">Выберите беседу или найдите игрока</p></div>}
          {panel === "group" && !activeGroupId && <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground"><div className="text-4xl opacity-20">👥</div><p className="text-sm">Выберите группу или создайте новую</p></div>}
          {panel === "channel" && !activeChannelId && <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground"><div className="text-4xl opacity-20">📢</div><p className="text-sm">Выберите канал или создайте новый</p></div>}
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Friend search */}
      {showFriendSearch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm space-y-4 border border-primary/30" style={{ background: "rgba(15,4,30,0.98)" }}>
            <div className="flex items-center justify-between"><h3 className="font-pixel text-[11px] text-primary">Найти игрока</h3><button onClick={() => { setShowFriendSearch(false); setFriendSearchQ(""); setFriendSearchResult(null); }}><X size={16} className="text-muted-foreground hover:text-foreground" /></button></div>
            <div className="flex gap-2">
              <Input value={friendSearchQ} onChange={e => setFriendSearchQ(e.target.value)} onKeyDown={e => e.key === "Enter" && searchFriend()} placeholder="Ник игрока..." className="bg-input/50 border-border/60 focus:border-primary flex-1" />
              <Button onClick={searchFriend} size="icon" style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}><ChevronRight size={16} /></Button>
            </div>
            {friendSearchResult && (
              <div className="flex items-center gap-3 p-3 glass-card rounded-xl border border-border/40">
                <UserAvatar user={allUsers.find(u => u.id === friendSearchResult.id)} name={friendSearchResult.name} size="md" />
                <div className="flex-1"><div className="font-medium text-sm">{friendSearchResult.name}</div><RoleBadge roleId={friendSearchResult.roleId} /></div>
                <Button size="sm" onClick={() => sendFriendReq(friendSearchResult.id, friendSearchResult.name)} className="gap-1" style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}><UserPlus size={13} /> Добавить</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create group/channel */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm space-y-4 border border-primary/30" style={{ background: "rgba(15,4,30,0.98)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-pixel text-[11px] text-primary">{showCreateGroup === "group" ? "Создать группу" : "Создать канал"}</h3>
              <button onClick={() => setShowCreateGroup(null)}><X size={16} className="text-muted-foreground" /></button>
            </div>
            {/* Emoji avatar picker */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Аватар</p>
              <div className="flex flex-wrap gap-1.5">
                {AVATAR_EMOJIS.map(e => (
                  <button key={e} onClick={() => setNewGroupEmoji(e)}
                    className={`w-9 h-9 rounded-full text-lg flex items-center justify-center transition-all hover:scale-110 border-2 ${newGroupEmoji === e ? "border-primary scale-110 bg-primary/20" : "border-transparent bg-white/10"}`}>{e}</button>
                ))}
              </div>
              <div className="flex gap-1.5 mt-2">
                {AVATAR_COLORS.map(c => (
                  <button key={c} onClick={() => setNewGroupColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${newGroupColor === c ? "border-white scale-110" : "border-transparent"}`} style={{ background: c }} />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2" style={{ background: newGroupColor + "33", borderColor: newGroupColor }}>{newGroupEmoji}</div>
                <span className="text-xs text-muted-foreground">Предпросмотр</span>
              </div>
            </div>
            <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder={showCreateGroup === "group" ? "Название группы..." : "Название канала..."} className="bg-input/50 border-border/60 focus:border-primary" />
            <Input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} placeholder="Описание (необязательно)..." className="bg-input/50 border-border/60 focus:border-primary" />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateGroup(null)}>Отмена</Button>
              <Button className="flex-1" onClick={() => createGroup(showCreateGroup)} style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}>Создать</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add member */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 w-full max-w-sm space-y-4 border border-primary/30" style={{ background: "rgba(15,4,30,0.98)" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-pixel text-[11px] text-primary">Добавить участника</h3>
              <button onClick={() => { setShowAddMember(false); setMemberSearch(""); }}><X size={16} className="text-muted-foreground" /></button>
            </div>
            <Input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Поиск по нику..." className="bg-input/50 border-border/60 focus:border-primary" />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {memberSearch.trim() === "" ? (
                <p className="text-xs text-muted-foreground text-center py-4">Введите имя для поиска</p>
              ) : memberSearchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Никого не найдено</p>
              ) : memberSearchResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                  <UserAvatar user={u} size="sm" />
                  <div className="flex-1"><div className="text-sm font-medium">{u.name}</div><RoleBadge roleId={u.roleId} /></div>
                  <Button size="sm" onClick={() => addMember((activeGroupId || activeChannelId)!, u.id, u.name)} className="h-7 text-xs" style={{ background: "linear-gradient(135deg, hsl(270 80% 50%), hsl(280 90% 60%))" }}>+ Добавить</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
