import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Plus, Send, Trash2, MessageSquare, Wrench, ChevronDown, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread, getThreadMessages } from "@/lib/threads.functions";
import { toast } from "sonner";

type Thread = { id: string; title: string; updated_at: string };

export function ChatPanel() {
  const qc = useQueryClient();
  const fetchThreads = useServerFn(listThreads);
  const fetchMessages = useServerFn(getThreadMessages);
  const newThread = useServerFn(createThread);
  const removeThread = useServerFn(deleteThread);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const threadsQ = useQuery({
    queryKey: ["threads"],
    queryFn: () => fetchThreads(),
  });

  const threads: Thread[] = threadsQ.data?.threads ?? [];

  // Auto-select or create first thread
  useEffect(() => {
    if (!threadsQ.data) return;
    if (threads.length > 0 && !activeId) setActiveId(threads[0].id);
    if (threads.length === 0 && !activeId) {
      newThread({ data: {} }).then((r) => {
        setActiveId(r.thread.id);
        qc.invalidateQueries({ queryKey: ["threads"] });
      });
    }
  }, [threadsQ.data]); // eslint-disable-line

  const initialMsgsQ = useQuery({
    queryKey: ["messages", activeId],
    queryFn: () => activeId ? fetchMessages({ data: { threadId: activeId } }) : Promise.resolve({ messages: [] }),
    enabled: !!activeId,
  });

  if (!activeId || !token) {
    return <div className="card-surface rounded-2xl p-6 text-sm text-muted-foreground">Loading concierge…</div>;
  }

  return (
    <div className="card-surface rounded-2xl overflow-hidden flex flex-col h-[640px]">
      <div className="flex border-b border-border">
        <ThreadList
          threads={threads}
          activeId={activeId}
          onSelect={setActiveId}
          onNew={async () => {
            const r = await newThread({ data: {} });
            await qc.invalidateQueries({ queryKey: ["threads"] });
            setActiveId(r.thread.id);
          }}
          onDelete={async (id) => {
            await removeThread({ data: { id } });
            await qc.invalidateQueries({ queryKey: ["threads"] });
            if (activeId === id) setActiveId(null);
          }}
        />
        <ChatArea
          key={activeId}
          threadId={activeId}
          token={token}
          initial={initialMsgsQ.data?.messages as UIMessage[] | undefined}
          onAfterSend={() => qc.invalidateQueries({ queryKey: ["threads"] })}
        />
      </div>
    </div>
  );
}

function ThreadList({ threads, activeId, onSelect, onNew, onDelete }: {
  threads: Thread[]; activeId: string; onSelect: (id: string) => void;
  onNew: () => void; onDelete: (id: string) => void;
}) {
  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-border bg-background/40">
      <button onClick={onNew} className="m-3 px-3 py-2 rounded-md bg-[color:var(--color-primary)]/10 border border-[color:var(--color-primary)]/30 text-[color:var(--color-primary)] text-xs font-medium flex items-center justify-center gap-2 hover:bg-[color:var(--color-primary)]/20 transition">
        <Plus className="h-3.5 w-3.5" /> New chat
      </button>
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
        {threads.map(t => (
          <div key={t.id} className={`group flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition ${activeId === t.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60"}`} onClick={() => onSelect(t.id)}>
            <MessageSquare className="h-3 w-3 shrink-0" />
            <span className="flex-1 truncate">{t.title}</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="opacity-0 group-hover:opacity-100 transition"><Trash2 className="h-3 w-3 hover:text-destructive" /></button>
          </div>
        ))}
      </div>
    </aside>
  );
}

function ChatArea({ threadId, token, initial, onAfterSend }: {
  threadId: string; token: string; initial?: UIMessage[]; onAfterSend: () => void;
}) {
  const transport = new DefaultChatTransport({
    api: "/api/chat",
    headers: { Authorization: `Bearer ${token}` },
    body: { threadId },
  });
  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initial ?? [],
    transport,
    onError: (e) => toast.error(e.message),
    onFinish: () => onAfterSend(),
  });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, [threadId, status]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, status]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming" || status === "submitted") return;
    sendMessage({ text: input.trim() });
    setInput("");
  };

  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
        {empty && (
          <div className="h-full grid place-items-center text-center">
            <div className="max-w-sm">
              <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[color:var(--color-primary)] mb-3"><Sparkles className="h-3 w-3" /> AI Concierge</div>
              <h3 className="text-lg font-medium mb-2">Ask in plain language</h3>
              <p className="text-xs text-muted-foreground mb-4">"Find me parking near Koramangala for 3 hours under ₹250" • "Why is the price up right now?" • "Will spots be free in 2 hours?"</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "Find parking in Koramangala for 3 hours, budget ₹250",
                  "Will there be spots near Indiranagar in 2 hours?",
                  "Why is pricing high at Stadium Side Lot?",
                ].map(s => (
                  <button key={s} onClick={() => sendMessage({ text: s })} className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-[color:var(--color-primary)]/40 text-muted-foreground hover:text-foreground transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m) => <MessageView key={m.id} message={m} />)}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="text-xs text-muted-foreground flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-primary)] animate-pulse" /> Thinking…</div>
        )}
      </div>
      <form onSubmit={submit} className="border-t border-border p-3 bg-background/40">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }}
            placeholder="Ask about parking, pricing, or availability…"
            rows={1}
            className="flex-1 resize-none px-3 py-2 rounded-md bg-secondary/60 border border-border outline-none focus:border-[color:var(--color-primary)]/50 text-sm max-h-32"
          />
          <button type="submit" disabled={busy || !input.trim()} className="h-9 w-9 grid place-items-center rounded-md bg-[color:var(--color-primary)] text-primary-foreground disabled:opacity-40 hover:opacity-90 transition">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageView({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-2 ${isUser ? "" : "w-full"}`}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return isUser ? (
              <div key={i} className="px-3 py-2 rounded-2xl bg-[color:var(--color-primary)] text-primary-foreground text-sm whitespace-pre-wrap">{part.text}</div>
            ) : (
              <div key={i} className="text-sm prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2">
                <ReactMarkdown>{part.text}</ReactMarkdown>
              </div>
            );
          }
          if (part.type?.startsWith("tool-")) {
            return <ToolPart key={i} part={part as Record<string, unknown>} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}

function ToolPart({ part }: { part: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const name = String(part.type).replace("tool-", "");
  const state = String(part.state ?? "");
  const output = part.output as Record<string, unknown> | undefined;
  return (
    <div className="rounded-lg border border-border bg-background/40 overflow-hidden text-xs">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/40 transition">
        <Wrench className="h-3 w-3 text-[color:var(--color-primary)]" />
        <span className="font-mono">{name}</span>
        <span className={`ml-auto text-[10px] uppercase tracking-wider ${state.includes("error") ? "text-destructive" : state === "output-available" ? "text-[color:var(--color-primary)]" : "text-muted-foreground"}`}>{state.replace("-", " ")}</span>
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 py-2 border-t border-border bg-background/60">
          {part.input ? <div className="mb-2"><div className="text-muted-foreground mb-1">Input</div><pre className="font-mono text-[10px] overflow-x-auto">{JSON.stringify(part.input, null, 2)}</pre></div> : null}
          {output ? <div><div className="text-muted-foreground mb-1">Output</div><pre className="font-mono text-[10px] overflow-x-auto">{JSON.stringify(output, null, 2)}</pre></div> : null}
        </div>
      )}
    </div>
  );
}
