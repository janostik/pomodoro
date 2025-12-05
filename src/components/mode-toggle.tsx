import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModeToggle() {
    const { setTheme, theme } = useTheme();

    return (
        <div className="fixed bottom-4 left-4 z-50 flex items-center rounded-full bg-background/80 backdrop-blur-sm p-1 gap-1">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme("light")}
                className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    theme === "light" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                title="Light"
            >
                <Sun className="h-4 w-4" />
                <span className="sr-only">Light</span>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme("dark")}
                className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    theme === "dark" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                title="Dark"
            >
                <Moon className="h-4 w-4" />
                <span className="sr-only">Dark</span>
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme("system")}
                className={cn(
                    "h-8 w-8 rounded-full transition-colors",
                    theme === "system" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                )}
                title="System"
            >
                <Monitor className="h-4 w-4" />
                <span className="sr-only">System</span>
            </Button>
        </div>
    );
}
