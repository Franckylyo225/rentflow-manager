import { ChevronDown, Menu, LogOut, Settings, LayoutGrid, Building2, UserPlus, Banknote, Receipt, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationBell } from "./NotificationBell";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";

interface AppHeaderProps {
  onMenuClick: () => void;
  orgName?: string;
  userName?: string;
}

export function AppHeader({ onMenuClick, orgName, userName }: AppHeaderProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const initials = userName
    ? userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
          <Menu className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-sm font-semibold text-foreground hidden sm:block">{orgName || "Mon entreprise"}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <GlobalSearch />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Actions rapides</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <DropdownMenuItem onClick={() => navigate("/properties?action=new")} className="rounded-lg">
              <Building2 className="h-4 w-4 mr-2" /> Nouveau bien
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/tenants?action=new")} className="rounded-lg">
              <UserPlus className="h-4 w-4 mr-2" /> Nouveau locataire
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/rents?action=new")} className="rounded-lg">
              <Banknote className="h-4 w-4 mr-2" /> Enregistrer un paiement
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/expenses?action=new")} className="rounded-lg">
              <Receipt className="h-4 w-4 mr-2" /> Ajouter une dépense
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dark mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Changer le thème</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Changer le thème</TooltipContent>
        </Tooltip>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2 rounded-xl">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary ring-2 ring-primary/20">
                {initials}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{userName || "Utilisateur"}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem onClick={() => navigate("/settings")} className="rounded-lg">
              <Settings className="h-4 w-4 mr-2" /> Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive rounded-lg" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
