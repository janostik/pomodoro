import { useEffect, useRef } from "react";
import NoSleep from "nosleep.js";

export function useWakeLock(active: boolean) {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    const noSleepRef = useRef<NoSleep | null>(null);

    useEffect(() => {
        const isWakeLockSupported = "wakeLock" in navigator;

        async function lock() {
            if (isWakeLockSupported) {
                try {
                    wakeLockRef.current = await navigator.wakeLock.request("screen");
                    wakeLockRef.current.addEventListener("release", () => {
                        console.log("Wake lock released");
                    });
                    console.log("Wake lock acquired");
                } catch (e) {
                    console.error("WakeLock error:", e);
                }
            } else {
                // Fallback for iOS/Safari using NoSleep.js
                if (!noSleepRef.current) {
                    noSleepRef.current = new NoSleep();
                }
                try {
                    await noSleepRef.current.enable();
                    console.log("NoSleep enabled (iOS fallback)");
                } catch (e) {
                    console.error("NoSleep error:", e);
                }
            }
        }

        async function release() {
            if (wakeLockRef.current) {
                try {
                    await wakeLockRef.current.release();
                    wakeLockRef.current = null;
                } catch (e) {
                    console.error("WakeLock release error:", e);
                }
            }
            if (noSleepRef.current) {
                noSleepRef.current.disable();
                console.log("NoSleep disabled");
            }
        }

        if (active) {
            lock();
        } else {
            release();
        }

        // Re-request the lock when the document becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && active) {
                lock();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            release();
        };
    }, [active]);
}
