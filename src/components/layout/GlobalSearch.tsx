import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Building2, Users, Home, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useProperties, useUnits, useTenants } from "@/hooks/useData";
import { Input } from "@/components/ui/input";

interface SearchResult {
  type: "property" | "tenant" | "unit";
  id: string;
  label: string;
  subtitle: string;
  link: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: properties } = useProperties();
  const { data: units } = useUnits();
  const { data: tenants } = useTenants();

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: SearchResult[] = [];

    properties.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.cities?.name?.toLowerCase().includes(q)) {
        out.push({ type: "property", id: p.id, label: p.name, subtitle: `${p.cities?.name || ""} · ${p.address || ""}`, link: `/properties/${p.id}` });
      }
    });

    tenants.forEach(t => {
      if (t.full_name.toLowerCase().includes(q) || t.phone?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q)) {
        out.push({ type: "tenant", id: t.id, label: t.full_name, subtitle: t.phone || t.email || "", link: `/tenants/${t.id}` });
      }
    });

    units.forEach(u => {
      if (u.name.toLowerCase().includes(q)) {
        const prop = properties.find(p => p.id === u.property_id);
        out.push({ type: "unit", id: u.id, label: u.name, subtitle: prop?.name || "", link: `/properties/${u.property_id}` });
      }
    });

    return out.slice(0, 8);
  }, [query, properties, tenants, units]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const iconMap = {
    property: Building2,
    tenant: Users,
    unit: Home,
  };

  function handleSelect(result: SearchResult) {
    setQuery("");
    setOpen(false);
    navigate(result.link);
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher…"
          className="pl-9 pr-16 h-9 w-44 sm:w-56 text-sm bg-muted/50 border-border"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-1 right-0 sm:left-0 w-72 sm:w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Aucun résultat</div>
          ) : (
            <ul className="py-1 max-h-72 overflow-y-auto">
              {results.map(r => {
                const Icon = iconMap[r.type];
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
                    >
                      <div className="p-1.5 rounded-md bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-popover-foreground truncate">{r.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {r.type === "property" ? "Bien" : r.type === "tenant" ? "Locataire" : "Unité"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
