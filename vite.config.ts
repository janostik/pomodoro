import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	base: "/pomodoro/",
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,mp3,webmanifest}"],
				navigateFallback: "/index.html",
			},
			includeAssets: [
				"favicon.ico",
				"favicon-16x16.png",
				"favicon-32x32.png",
				"apple-touch-icon.png",
			],
			manifest: {
				name: "Pomodoro",
				short_name: "Pomodoro",
				description: "Offline Pomodoro Timer",
				start_url: "/",
				scope: "/",
				theme_color: "#ffffff",
				background_color: "#ffffff",
				display: "standalone",
				icons: [
					{
						src: "android-chrome-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "android-chrome-512x512.png",
						sizes: "512x512",
						type: "image/png",
					},
					{
						src: "apple-touch-icon.png",
						sizes: "180x180",
						type: "image/png",
						purpose: "apple touch icon",
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
