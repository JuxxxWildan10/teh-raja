"use client";

import { useState, useEffect } from "react";
import { products, Product } from "@/data/menu";
import { Line, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { Plus, Trash, Edit, LogOut } from "lucide-react";
import Link from "next/link";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [menuItems, setMenuItems] = useState(products);

    const handleLogin = () => {
        if (password === "admin123") {
            setIsAuthenticated(true);
        } else {
            alert("Wrong password!");
        }
    };

    // Mock Data for Charts
    const salesData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
            {
                label: "Sales (Cups)",
                data: [12, 19, 15, 25, 22, 30, 45],
                borderColor: "#D4AF37",
                backgroundColor: "rgba(212, 175, 55, 0.5)",
            },
        ],
    };

    const popularityData = {
        labels: menuItems.map(m => m.name.split(' ').slice(0, 2).join(' ')),
        datasets: [
            {
                label: "Popularity Score",
                data: menuItems.map(() => Math.floor(Math.random() * 100)),
                backgroundColor: "rgba(26, 77, 62, 0.8)",
            }
        ]
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-forest">
                <div className="p-8 glass rounded-2xl w-full max-w-md text-center">
                    <h1 className="text-3xl font-serif text-gold mb-6">Admin Access</h1>
                    <input
                        type="password"
                        className="w-full p-3 bg-black/30 border border-white/10 rounded mb-4 text-white"
                        placeholder="Enter Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button onClick={handleLogin} className="w-full py-3 bg-gold text-forest font-bold rounded hover:bg-gold-light">
                        Login
                    </button>
                    <p className="mt-4 text-xs opacity-40">Hint: admin123</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-forest">
            {/* Admin Navbar */}
            <nav className="bg-forest text-cream p-4 flex justify-between items-center shadow-lg">
                <h1 className="text-xl font-serif font-bold text-gold">TEH RAJA &bull; Dashboard</h1>
                <div className="flex gap-4">
                    <Link href="/" className="opacity-70 hover:opacity-100">View Site</Link>
                    <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 hover:text-red-300">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </nav>

            <div className="container mx-auto p-8">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 text-forest">Weekly Sales Performance</h3>
                        <Line data={salesData} options={{ responsive: true }} />
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-4 text-forest">Product Popularity Index</h3>
                        <Bar data={popularityData} options={{ responsive: true }} />
                    </div>
                </div>

                {/* Menu Management */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-serif font-bold">Menu Management</h2>
                        <button className="px-4 py-2 bg-forest text-gold rounded flex items-center gap-2 hover:bg-forest-light">
                            <Plus size={18} /> Add New Product
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200 text-sm opacity-60">
                                    <th className="py-3">Product Name</th>
                                    <th className="py-3">Price</th>
                                    <th className="py-3">Category</th>
                                    <th className="py-3">Attributes (S/C/F)</th>
                                    <th className="py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {menuItems.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        <td className="py-4 font-bold">{item.name}</td>
                                        <td className="py-4">Rp {item.price.toLocaleString('id-ID')}</td>
                                        <td className="py-4">
                                            <span className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600 uppercase tracking-wide">{item.category}</span>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-1 text-xs">
                                                <span title="Sweetness" className="bg-yellow-100 px-1 rounded">{item.attributes.sweet}</span>
                                                <span title="Creaminess" className="bg-blue-100 px-1 rounded">{item.attributes.creamy}</span>
                                                <span title="Fruity" className="bg-pink-100 px-1 rounded">{item.attributes.fruity}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right flex justify-end gap-2">
                                            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                                            <button className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
