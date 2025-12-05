"use client";

import { CheckSquare, CornerDownLeft, Pause, Play, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";
import notificationSound from "./assets/notification.mp3";

const DISAPPEAR_DELAY_MS = 3000; // 3 seconds for completed items to disappear
const DEFAULT_DURATION_MINUTES = 10;

interface TodoItem {
	id: number;
	text: string;
	completed: boolean;
}

import { useWakeLock } from "@/hooks/useWakeLock";

export default function TimerPage() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const audioRef = useRef<HTMLAudioElement>(null);
	const animationFrameId = useRef<number | null>(null);
	const completedItemTimeouts = useRef<
		Record<number, ReturnType<typeof setTimeout>>
	>({});

	const [totalMinutes, setTotalMinutes] = useState(DEFAULT_DURATION_MINUTES);
	const [remainingSeconds, setRemainingSeconds] = useState(0);
	const [isRunning, setIsRunning] = useState(false);
	const { theme } = useTheme();

	useWakeLock(isRunning);

	const [isDragging, setIsDragging] = useState(false);
	const [newTodoText, setNewTodoText] = useState("");
	const [canvasSize, setCanvasSize] = useState(300);
	const [isResizing, setIsResizing] = useState(false);
	const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Calculate responsive canvas size
	useEffect(() => {
		const updateSize = () => {
			setIsResizing(true);
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
			resizeTimeoutRef.current = setTimeout(() => {
				setIsResizing(false);
			}, 150);

			const vh = window.innerHeight;
			const vw = window.innerWidth;
			const isMobile = vw < 768;
			// On mobile: smaller to leave room for task list below
			// On desktop: can be larger since it's side by side
			const maxSize = isMobile
				? Math.min(vw * 0.8, vh * 0.4, 350)
				: Math.min(vw * 0.4, vh * 0.6, 450);
			setCanvasSize(Math.max(200, maxSize));
		};

		updateSize();
		window.addEventListener("resize", updateSize);
		return () => {
			window.removeEventListener("resize", updateSize);
			if (resizeTimeoutRef.current) {
				clearTimeout(resizeTimeoutRef.current);
			}
		};
	}, []);

	const [todos, setTodos] = useState<TodoItem[]>(() => {
		if (typeof window !== "undefined") {
			const savedTodos = localStorage.getItem("kaiserkraft-todos");
			try {
				return savedTodos ? JSON.parse(savedTodos) : [];
			} catch (e) {
				console.error("Failed to parse todos from localStorage:", e);
				return [];
			}
		}
		return [];
	});

	useEffect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("kaiserkraft-todos", JSON.stringify(todos));
		}
	}, [todos]);

	useEffect(() => {
		setRemainingSeconds(totalMinutes * 60);
	}, [totalMinutes]);

	const drawTimer = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const centerX = canvasSize / 2;
			const centerY = canvasSize / 2;
			const radius = canvasSize / 2 - 10;
			const scale = canvasSize / 300; // Scale factor relative to base size

			const computedStyle = getComputedStyle(document.documentElement);
			const bgColor = computedStyle.getPropertyValue('--background').trim();
			const textColor = computedStyle.getPropertyValue('--foreground').trim();
			const strokeColor = computedStyle.getPropertyValue('--clock-stroke').trim();

			const colors = {
				bg: bgColor,
				stroke: strokeColor,
				tick: strokeColor,
				text: textColor,
				red: "rgba(255, 0, 0, 0.7)",
			};

			ctx.clearRect(0, 0, canvasSize, canvasSize);

			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
			ctx.fillStyle = colors.bg;
			ctx.fill();
			ctx.strokeStyle = colors.stroke;
			ctx.lineWidth = 2 * scale;
			ctx.stroke();

			ctx.strokeStyle = colors.tick;
			ctx.lineWidth = 1 * scale;
			const longTick = 10 * scale;
			const shortTick = 5 * scale;
			for (let i = 0; i < 60; i++) {
				const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
				const x1 = centerX + radius * Math.cos(angle);
				const y1 = centerY + radius * Math.sin(angle);
				const tickLen = i % 5 === 0 ? longTick : shortTick;
				const x2 = centerX + (radius - tickLen) * Math.cos(angle);
				const y2 = centerY + (radius - tickLen) * Math.sin(angle);
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
			}

			ctx.fillStyle = colors.text;
			ctx.font = `${14 * scale}px Arial`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const labelOffset = 25 * scale;
			for (let i = 5; i <= 60; i += 5) {
				const angle = (i / 60) * 2 * Math.PI - Math.PI / 2;
				const x = centerX + (radius - labelOffset) * Math.cos(angle);
				const y = centerY + (radius - labelOffset) * Math.sin(angle);
				ctx.fillText(i.toString(), x, y);
			}

			const redSectionProportion = remainingSeconds / (60 * 60);
			const startAngle = -Math.PI / 2;
			const endAngle = startAngle + redSectionProportion * 2 * Math.PI;

			if (redSectionProportion > 0) {
				ctx.beginPath();
				ctx.moveTo(centerX, centerY);
				ctx.arc(centerX, centerY, radius, startAngle, endAngle);
				ctx.closePath();
				ctx.fillStyle = colors.red;
				ctx.fill();
			}

			const minutes = Math.floor(remainingSeconds / 60);
			const seconds = Math.floor(remainingSeconds % 60);
			const timeString = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
			ctx.fillStyle = colors.text;
			ctx.font = `bold ${36 * scale}px Arial`;
			ctx.fillText(timeString, centerX, centerY);
		},
		[remainingSeconds, theme, canvasSize],
	);

	// Redraw canvas when theme changes (with RAF to ensure CSS is applied)
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const frameId = requestAnimationFrame(() => {
			drawTimer(ctx);
		});
		return () => cancelAnimationFrame(frameId);
	}, [theme, drawTimer]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		drawTimer(ctx);

		let lastTime = 0;
		const animate = (currentTime: DOMHighResTimeStamp) => {
			if (!isRunning) {
				animationFrameId.current = null;
				return;
			}

			if (!lastTime) lastTime = currentTime;
			const deltaTime = currentTime - lastTime;

			if (deltaTime >= 1000) {
				setRemainingSeconds((prev) => {
					const newTime = Math.max(0, prev - Math.floor(deltaTime / 1000));
					if (newTime === 0) {
						setIsRunning(false);
						if (audioRef.current) {
							try {
								audioRef.current
									.play()
									.catch((e) => console.error("Audio playback error:", e));
							} catch (e) {
								console.error("Error attempting to play audio:", e);
							}
						}
						setTotalMinutes(DEFAULT_DURATION_MINUTES);
						// setRemainingSeconds will be handled by the useEffect dependent on totalMinutes
					}
					return newTime;
				});
				lastTime = currentTime;
			}
			animationFrameId.current = requestAnimationFrame(animate);
		};

		if (isRunning) {
			animationFrameId.current = requestAnimationFrame(animate);
		} else {
			if (animationFrameId.current) {
				cancelAnimationFrame(animationFrameId.current);
			}
		}

		return () => {
			if (animationFrameId.current) {
				cancelAnimationFrame(animationFrameId.current);
			}
		};
	}, [isRunning, remainingSeconds, drawTimer]);

	const getCoords = (
		canvas: HTMLCanvasElement,
		evt: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent,
	) => {
		const rect = canvas.getBoundingClientRect();
		let clientX, clientY;
		if ("touches" in evt) {
			clientX = evt.touches[0].clientX;
			clientY = evt.touches[0].clientY;
		} else {
			clientX = evt.clientX;
			clientY = evt.clientY;
		}
		return {
			x: clientX - rect.left,
			y: clientY - rect.top,
		};
	};

	const unlockAudio = () => {
		if (audioRef.current) {
			const audio = audioRef.current;
			audio.muted = true;
			audio.play().then(() => {
				audio.pause();
				audio.muted = false;
				audio.currentTime = 0;
			}).catch(() => {});
		}
	};

	const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
		unlockAudio();
		if (isRunning) return;
		setIsDragging(true);
		updateTimeFromEvent(e);
		if ("touches" in e) {
			e.preventDefault();
		}
	};

	const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
		if (!isDragging) return;
		updateTimeFromEvent(e);
		if ("touches" in e) {
			e.preventDefault();
		}
	};

	const handleEndDrag = () => {
		setIsDragging(false);
	};

	const updateTimeFromEvent = (e: React.MouseEvent | React.TouchEvent) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const centerX = canvasSize / 2;
		const centerY = canvasSize / 2;
		const coords = getCoords(canvas, e);
		const dx = coords.x - centerX;
		const dy = coords.y - centerY;

		let angle = Math.atan2(dy, dx);

		angle += Math.PI / 2;
		if (angle < 0) {
			angle += 2 * Math.PI;
		}

		let minutes = Math.round((angle / (2 * Math.PI)) * 60);
		minutes = Math.max(1, Math.min(60, minutes));

		setTotalMinutes(minutes);
		setRemainingSeconds(minutes * 60);
	};

	const handleStartPause = () => {
		if (!isRunning) {
			unlockAudio();
		}
		setIsRunning((prev) => !prev);
	};

	const handleToggleTodo = (id: number) => {
		setTodos((prevTodos) => {
			const updatedTodos = prevTodos.map((todo) => {
				if (todo.id === id) {
					const newCompletedStatus = !todo.completed;
					if (newCompletedStatus) {
						const timeout = setTimeout(() => {
							setTodos((currentTodos) =>
								currentTodos.filter((t) => t.id !== id),
							);
							delete completedItemTimeouts.current[id];
						}, DISAPPEAR_DELAY_MS);
						completedItemTimeouts.current[id] = timeout;
					} else {
						if (completedItemTimeouts.current[id]) {
							clearTimeout(completedItemTimeouts.current[id]);
							delete completedItemTimeouts.current[id];
						}
					}
					return { ...todo, completed: newCompletedStatus };
				}
				return todo;
			});
			return updatedTodos;
		});
	};

	const handleAddTodo = () => {
		if (newTodoText.trim() === "") return;
		setTodos((prevTodos) => {
			const newId =
				prevTodos.length > 0 ? Math.max(...prevTodos.map((t) => t.id)) + 1 : 1;
			return [
				...prevTodos,
				{ id: newId, text: newTodoText.trim(), completed: false },
			];
		});
		setNewTodoText("");
	};

	return (
		<div className="flex flex-col md:flex-row items-center md:justify-center min-h-full w-full bg-background text-foreground p-4 gap-6 md:gap-8 transition-colors duration-300 overflow-y-auto">
			<div className="flex flex-col items-center mt-4 md:mt-0">
				<div ref={containerRef} className="relative">
					<canvas
						ref={canvasRef}
						width={canvasSize}
						height={canvasSize}
						className="border border-border rounded-full shadow-lg cursor-pointer bg-card"
						onMouseDown={handleStartDrag}
						onMouseMove={handleDragMove}
						onMouseUp={handleEndDrag}
						onMouseLeave={handleEndDrag}
						onTouchStart={handleStartDrag}
						onTouchMove={handleDragMove}
						onTouchEnd={handleEndDrag}
						onTouchCancel={handleEndDrag}
					/>
					<Button
						variant="ghost"
						onClick={handleStartPause}
						disabled={remainingSeconds === 0 && !isRunning}
						className={cn(
							"absolute left-1/2 -translate-x-1/2 text-foreground hover:bg-black/20 dark:hover:bg-white/20 transition-opacity text-lg px-6 py-3 h-auto",
							(isDragging || isResizing) && "opacity-0 pointer-events-none"
						)}
						style={{ top: `${canvasSize * 0.62}px` }}
					>
						{isRunning ? (
							<Pause className="mr-2 h-4 w-4" />
						) : (
							<Play className="mr-2 h-4 w-4" />
						)}
						{isRunning ? "Pause" : "Start"}
					</Button>
				</div>
			</div>

			<div className="w-full max-w-md flex-1 md:flex-none">
				<ul className="space-y-2 mb-6">
					<AnimatePresence mode="popLayout">
						{todos.map((todo) => (
							<motion.li
								key={todo.id}
								layout
								initial={{ opacity: 0, y: -20, scale: 0.95 }}
								animate={{
									opacity: todo.completed ? 0.6 : 1,
									y: 0,
									scale: 1,
								}}
								exit={{
									opacity: 0,
									scale: 0.8,
									x: 100,
									transition: { duration: 0.3, ease: "easeOut" },
								}}
								transition={{
									layout: { type: "spring", stiffness: 500, damping: 30 },
									opacity: { duration: 0.2 },
									scale: { duration: 0.2 },
								}}
								className="flex items-center justify-between p-1 rounded-md"
							>
								<Button
									variant="ghost"
									className={cn(
										"w-full justify-start text-left px-3 py-2 rounded-md transition-colors duration-200 flex items-start gap-3 h-auto whitespace-normal",
										todo.completed
											? "line-through text-muted-foreground bg-muted hover:bg-muted/80"
											: "text-foreground hover:bg-accent hover:text-accent-foreground",
									)}
									onClick={() => handleToggleTodo(todo.id)}
									aria-pressed={todo.completed}
								>
									<motion.span
										initial={false}
										animate={{
											scale: todo.completed ? [1, 1.3, 1] : 1,
											rotate: todo.completed ? [0, -10, 10, 0] : 0,
										}}
										transition={{ duration: 0.3 }}
									>
										{todo.completed ? (
											<CheckSquare className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
										) : (
											<Square className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
										)}
									</motion.span>
									<span className="flex-1 break-words">{todo.text}</span>
								</Button>
							</motion.li>
						))}
					</AnimatePresence>
				</ul>
				<div className="relative px-1">
					<Input
						type="text"
						placeholder="Add a new task..."
						value={newTodoText}
						onChange={(e) => setNewTodoText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleAddTodo();
							}
						}}
						className="w-full bg-transparent border-0 border-b border-input rounded-none px-3 py-2 focus:border-foreground focus:ring-0 focus:outline-none focus:shadow-none focus-visible:ring-0 focus-visible:outline-none shadow-none pr-10 text-foreground placeholder:text-muted-foreground"
						aria-label="New task input"
						autoFocus={false}
					/>
					<button
						type="button"
						onClick={handleAddTodo}
						className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-foreground transition-colors cursor-pointer"
						aria-label="Add task"
					>
						<CornerDownLeft className="h-4 w-4" />
					</button>
				</div>
			</div>


			<audio
				ref={audioRef}
				src={notificationSound}
				preload="auto"
			/>
		</div>
	);
}
