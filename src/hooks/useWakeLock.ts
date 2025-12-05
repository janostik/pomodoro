import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean) {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    useEffect(() => {
        // Check if the browser supports the Wake Lock API
        const isSupported = "wakeLock" in navigator;

        if (!isSupported) {
            console.warn("Wake Lock API is not supported in this browser.");
            return;
        }

        async function lock() {
            try {
                // Request a screen wake lock
                wakeLockRef.current = await navigator.wakeLock.request("screen");

                wakeLockRef.current.addEventListener("release", () => {
                    console.log("Wake lock released");
                });
                console.log("Wake lock acquired");
            } catch (e) {
                console.error("WakeLock error:", e);
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
