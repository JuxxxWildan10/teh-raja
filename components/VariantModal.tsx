"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Plus, Minus, ShoppingCart, Thermometer, Droplets, Scale, Candy } from "lucide-react";
import { ExtendedProduct, ProductVariants, VARIANT_SIZE_UPCHARGE } from "@/lib/store";

interface VariantModalProps {
    product: ExtendedProduct;
    onConfirm: (variants: ProductVariants, finalPrice: number, qty: number) => void;
    onClose: () => void;
}

const isBeverage = (cat: string) => ['signature', 'milk', 'fruit', 'classic'].includes(cat);

// ── Option Configs ────────────────────────────────────────────
const SIZES = [
    { value: 'M' as const, label: 'Regular (M)', upcharge: 0 },
    { value: 'L' as const, label: 'Large (L)', upcharge: 2000 },
];
const TEMPS = [
    { value: 'es' as const, label: '🧊 Es', desc: 'Dingin segar' },
    { value: 'panas' as const, label: '☕ Panas', desc: 'Hangat harum' },
];
const SUGARS: { value: ProductVariants['sugar']; label: string; color: string }[] = [
    { value: '0%', label: '0%', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { value: '25%', label: '25%', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
    { value: '50%', label: '50%', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    { value: '75%', label: '75%', color: 'bg-orange-100 text-orange-700 border-orange-300' },
    { value: '100%', label: '100%', color: 'bg-red-100 text-red-700 border-red-300' },
];
const ICE_LEVELS: { value: ProductVariants['ice']; label: string }[] = [
    { value: 'no-ice', label: 'Tanpa Es' },
    { value: 'less', label: 'Sedikit' },
    { value: 'normal', label: 'Normal' },
    { value: 'extra', label: 'Banyak' },
];

function formatRp(n: number) {
    return 'Rp ' + n.toLocaleString('id-ID');
}

export default function VariantModal({ product, onConfirm, onClose }: VariantModalProps) {
    const beverage = isBeverage(product.category);

    const [size, setSize] = useState<'M' | 'L'>('M');
    const [temperature, setTemperature] = useState<'panas' | 'es'>(beverage ? 'es' : 'es');
    const [sugar, setSugar] = useState<ProductVariants['sugar']>('50%');
    const [ice, setIce] = useState<ProductVariants['ice']>('normal');
    const [qty, setQty] = useState(1);

    // Close ice selector when switching to panas
    useEffect(() => {
        if (temperature === 'panas') setIce('no-ice');
        else setIce('normal');
    }, [temperature]);

    const sizeUpcharge = VARIANT_SIZE_UPCHARGE[size] ?? 0;
    const unitPrice = product.price + sizeUpcharge;
    const totalPrice = unitPrice * qty;

    const buildVariants = (): ProductVariants => ({
        size,
        ...(beverage && { temperature }),
        ...(beverage && { sugar }),
        ...(beverage && temperature === 'es' && { ice }),
    });

    const handleConfirm = () => {
        const variants = buildVariants();
        onConfirm(variants, unitPrice, qty);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 260 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
                >
                    {/* ── Header ───────────────────────────────── */}
                    <div className="relative h-36 sm:h-44 flex-shrink-0 overflow-hidden">
                        {product.image
                            ? <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
                            : <div className="w-full h-full bg-gradient-to-br from-[#0D2B20] to-[#1a4433] flex items-center justify-center text-white/30 text-5xl font-bold">{product.name[0]}</div>
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                        {/* Close btn */}
                        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/40 rounded-full text-white hover:bg-black/60 transition">
                            <X size={16} />
                        </button>

                        {/* Product info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <p className="text-white font-black text-lg leading-tight">{product.name}</p>
                            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{product.description}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-amber-400 font-black">{formatRp(product.price)}</span>
                                <span className="text-xs text-white/40 uppercase">{product.category}</span>
                                <span className="text-xs text-green-400 ml-auto">Stok: {product.stock}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Variant Options (Scrollable) ──────────── */}
                    <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

                        {/* Size */}
                        <section>
                            <div className="flex items-center gap-2 mb-2.5">
                                <Scale size={14} className="text-[#0D2B20]" />
                                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Ukuran</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {SIZES.map(s => (
                                    <button
                                        key={s.value}
                                        onClick={() => setSize(s.value)}
                                        className={`p-3 rounded-xl border-2 text-sm font-bold transition text-left ${size === s.value
                                            ? 'border-[#0D2B20] bg-[#0D2B20] text-amber-400 shadow-md'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50'
                                            }`}
                                    >
                                        <div>{s.label}</div>
                                        <div className={`text-[10px] mt-0.5 ${size === s.value ? 'text-amber-300/80' : 'text-gray-400'}`}>
                                            {s.upcharge > 0 ? `+${formatRp(s.upcharge)}` : 'Harga normal'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Temperature (beverages only) */}
                        {beverage && (
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <Thermometer size={14} className="text-[#0D2B20]" />
                                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Suhu</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {TEMPS.map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => setTemperature(t.value)}
                                            className={`p-3 rounded-xl border-2 text-sm font-bold transition text-left ${temperature === t.value
                                                ? 'border-[#0D2B20] bg-[#0D2B20] text-amber-400 shadow-md'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50'
                                                }`}
                                        >
                                            <div>{t.label}</div>
                                            <div className={`text-[10px] mt-0.5 ${temperature === t.value ? 'text-amber-300/80' : 'text-gray-400'}`}>{t.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Sugar Level (beverages only) */}
                        {beverage && (
                            <section>
                                <div className="flex items-center gap-2 mb-2.5">
                                    <Candy size={14} className="text-[#0D2B20]" />
                                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Level Gula</h3>
                                    <span className="ml-auto text-[10px] text-gray-400 italic">0% = Tanpa gula</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {SUGARS.map(s => (
                                        <button
                                            key={s.value}
                                            onClick={() => setSugar(s.value)}
                                            className={`flex-shrink-0 px-3 py-2 rounded-xl border-2 text-sm font-black transition ${sugar === s.value
                                                ? `${s.color} border-current shadow-sm scale-105`
                                                : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-300'
                                                }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Ice Level (beverages + es only) */}
                        <AnimatePresence>
                            {beverage && temperature === 'es' && (
                                <motion.section
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <Droplets size={14} className="text-blue-500" />
                                        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Level Es</h3>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {ICE_LEVELS.map(lvl => (
                                            <button
                                                key={lvl.value}
                                                onClick={() => setIce(lvl.value)}
                                                className={`py-2 rounded-xl border-2 text-[11px] font-bold transition ${ice === lvl.value
                                                    ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                                                    : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-blue-200'
                                                    }`}
                                            >
                                                {lvl.label}
                                            </button>
                                        ))}
                                    </div>
                                </motion.section>
                            )}
                        </AnimatePresence>

                        {/* Qty selector */}
                        <section className="pb-1">
                            <div className="flex items-center gap-2 mb-2.5">
                                <ShoppingCart size={14} className="text-[#0D2B20]" />
                                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Jumlah</h3>
                                <span className="ml-auto text-[10px] text-gray-400">Maks. {product.stock}</span>
                            </div>
                            <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
                                <button
                                    onClick={() => setQty(Math.max(1, qty - 1))}
                                    disabled={qty <= 1}
                                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition disabled:opacity-30"
                                >
                                    <Minus size={14} />
                                </button>
                                <span className="flex-1 text-center text-2xl font-black text-[#0D2B20]">{qty}</span>
                                <button
                                    onClick={() => setQty(Math.min(product.stock, qty + 1))}
                                    disabled={qty >= product.stock}
                                    className="w-8 h-8 flex items-center justify-center bg-[#0D2B20] rounded-lg text-amber-400 hover:bg-[#1a4433] transition disabled:opacity-30"
                                >
                                    <Plus size={14} />
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* ── Footer CTA ───────────────────────────── */}
                    <div className="px-5 pb-5 pt-3 bg-white border-t border-gray-100 flex-shrink-0">
                        <div className="flex items-center justify-between mb-3 bg-[#0D2B20]/5 rounded-xl p-3">
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total ({qty}x)</p>
                                <p className="text-xl font-black text-[#0D2B20]">{formatRp(totalPrice)}</p>
                            </div>
                            {sizeUpcharge > 0 && (
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400">Harga satuan</p>
                                    <p className="text-sm font-bold text-gray-600">{formatRp(unitPrice)}</p>
                                    <p className="text-[10px] text-amber-600">+{formatRp(sizeUpcharge)} (L)</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleConfirm}
                            className="w-full py-4 bg-[#0D2B20] text-amber-400 font-black text-sm rounded-xl hover:bg-[#1a4433] transition hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-[#0D2B20]/20 flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={18} />
                            Masukkan ke Tray — {formatRp(totalPrice)}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
