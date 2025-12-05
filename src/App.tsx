import TimerPage from "./TimerPage";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

function App() {
	return (
		<ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
			<TimerPage />
			<ModeToggle />
		</ThemeProvider>
	);
}

export default App;
