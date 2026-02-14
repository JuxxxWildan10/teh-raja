"use client";

import { useEffect, useRef, useState } from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, update } from "firebase/database";
import { useSalesStore, useCartStore, Order } from "@/lib/store";

// Audio Assets (Base64 placeholder - replace with actual short sounds if needed, 
// but for now I'll use simple generated beeps or just console logs if assets aren't provided.
// Actually, I will use a simple online URL or a very short base64 for "Ping")
const SUCCESS_SOUND = "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"; // Ding
const ALERT_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"; // Alert

export default function FirebaseSync() {
    const { orders, addOrder, updateOrderStatus } = useSalesStore();
    const { activeOrderId } = useCartStore();

    // Refs to track previous state for audio triggers
    const prevOrdersLength = useRef(orders.length);
    const prevStatus = useRef<string | null>(null);

    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // 1. Listen for Firebase Changes (Cloud -> Client)
    useEffect(() => {
        const ordersRef = ref(rtdb, 'orders');

        // Listen for value changes
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            setIsConnected(true);
            setErrorMsg(null);

            const data = snapshot.val();
            if (data) {
                const loadedOrders: Order[] = Object.values(data);
                useSalesStore.setState({ orders: loadedOrders });
            }
        }, (error) => {
            console.error("Firebase Sync Error:", error);
            setIsConnected(false);
            setErrorMsg(error.message);
        });

        // Optional: Check explicit connection state
        const connectedRef = ref(rtdb, ".info/connected");
        const unsubscribeStatus = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                console.log("Firebase RTDB Connected");
                setIsConnected(true);
            } else {
                console.log("Firebase RTDB Disconnected");
                setIsConnected(false);
            }
        });

        return () => {
            unsubscribe();
            unsubscribeStatus();
        };
    }, []);

    // 2. Audio Logic: New Order (Admin)
    useEffect(() => {
        const pendingCount = orders.filter(o => o.status === 'pending').length;
        const prevPending = orders.length; // Simplified check: just length increase

        // If orders length increased AND the new order is pending (likely)
        if (orders.length > prevOrdersLength.current) {
            // Find the new order? Or just play sound.
            // Play sound for Admin
            new Audio(ALERT_SOUND).play().catch(e => console.log("Audio prevented", e));
        }
        prevOrdersLength.current = orders.length;
    }, [orders]);

    // 3. Audio Logic: Status Change (User)
    useEffect(() => {
        if (!activeOrderId) return;

        const myOrder = orders.find(o => o.id === activeOrderId);
        if (myOrder && myOrder.status !== prevStatus.current) {
            // Status changed!
            if (prevStatus.current) { // Don't play on initial load
                new Audio(SUCCESS_SOUND).play().catch(e => console.log("Audio prevented", e));
            }
            prevStatus.current = myOrder.status;
        }
    }, [orders, activeOrderId]);

    return (
        <div className="fixed bottom-4 left-4 z-[9999] pointer-events-none opacity-80 backdrop-blur top-auto right-auto">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${errorMsg
                ? 'bg-red-900/80 text-white border-red-500'
                : isConnected
                    ? 'bg-green-900/80 text-green-100 border-green-500'
                    : 'bg-yellow-900/80 text-yellow-100 border-yellow-500'
                }`}>
                <div className={`w-2 h-2 rounded-full ${errorMsg ? 'bg-red-500 animate-pulse' : isConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'
                    }`} />
                {errorMsg ? "Sync Error" : isConnected ? "Realtime On" : "Connecting..."}
            </div>
            {errorMsg && <div className="mt-1 text-[10px] bg-black text-red-300 p-1 rounded max-w-[200px]">{errorMsg}</div>}
        </div>
    );
}
