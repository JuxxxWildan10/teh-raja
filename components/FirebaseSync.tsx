"use client";

import { useEffect, useRef } from "react";
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

    // 1. Listen for Firebase Changes (Cloud -> Client)
    useEffect(() => {
        const ordersRef = ref(rtdb, 'orders');
        const unsubscribe = onValue(ordersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array
                const loadedOrders: Order[] = Object.values(data);

                // Sync to Zustand (avoid infinite loop by checking JSON stringify or simplified check? 
                // leveraging Zustand's setter is fine, but we need to avoid re-triggering "addOrder" logic if we had that.)
                // Actually, useSalesStore just sets state.
                // We need a way to set orders directly without triggering side effects if any.
                // For now, I'll assume useSalesStore.setState is accessible or I'll add a 'setOrders' action.
                // Wait, useSalesStore doesn't have 'setOrders'. I should check store.ts.
                // It has 'addOrder'. I might need to add 'syncOrders'.

                // Let's rely on the store's current implementation to just REPLACE the orders if I add a setOrders.
                // For now, I'll just skip this implementation detail until I update store.ts.
                // But wait, I need to write this file now. 
                // I will assume I will add `setOrders` to the store.
                useSalesStore.setState({ orders: loadedOrders });
            }
        });

        return () => unsubscribe();
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

    return null; // Headless component
}
