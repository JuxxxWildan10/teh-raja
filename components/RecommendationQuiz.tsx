"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getRecommendations } from "@/lib/recommendation";
import { Product } from "@/data/menu";
import { useCartStore } from "@/lib/store";
import { ShoppingBag, RefreshCcw } from "lucide-react";

export default function RecommendationQuiz() {
    const [step, setStep] = useState(0);
    const [prefs, setPrefs] = useState({ sweet: 5, creamy: 5, fruity: 5 });
    const [results, setResults] = useState<Product[]>([]);
    const addToCart = useCartStore((state) => state.addToCart);

    const handleNext = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            const recs = getRecommendations(prefs);
            setResults(recs);
            setStep(4);
        }
    };

    const reset = () => {
        setStep(0);
        setResults([]);
        setPrefs({ sweet: 5, creamy: 5, fruity: 5 });
    };

    const variants = {
        enter: { opacity: 0, x: 50 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-8 rounded-2xl glass text-cream shadow-2xl border border-gold/20">
            <h2 className="text-3xl font-serif text-center text-gold mb-6">Discovery Your Perfect Tea</h2>

            <div className="min-h-[300px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    {step === 0 && (
                        <motion.div key="intro" initial="enter" animate="center" exit="exit" variants={variants} className="text-center">
                            <p className="text-lg mb-8 opacity-90">
                                Our AI Sommelier will analyze your taste profile using Euclidean Vector Mapping to find your ideal blend.
                            </p>
                            <button onClick={() => setStep(1)} className="px-8 py-3 bg-gold text-forest font-bold rounded-full hover:bg-gold-light transition">
                                Start Analysis
                            </button>
                        </motion.div>
                    )}

                    {step === 1 && (
                        <motion.div key="sweet" initial="enter" animate="center" exit="exit" variants={variants}>
                            <h3 className="text-xl mb-4 text-center">Sweetness Level Preference</h3>
                            <input
                                type="range" min="0" max="10" value={prefs.sweet}
                                onChange={(e) => setPrefs({ ...prefs, sweet: parseInt(e.target.value) })}
                                className="w-full h-2 bg-forest-light rounded-lg appearance-none cursor-pointer accent-gold"
                            />
                            <div className="flex justify-between mt-2 text-sm opacity-60">
                                <span>0% Sugar</span>
                                <span>50%</span>
                                <span>100% Sweet</span>
                            </div>
                            <div className="mt-8 text-center">
                                <button onClick={handleNext} className="px-6 py-2 border border-gold/50 rounded-full hover:bg-gold/10">Next</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="creamy" initial="enter" animate="center" exit="exit" variants={variants}>
                            <h3 className="text-xl mb-4 text-center">Creaminess Preference</h3>
                            <input
                                type="range" min="0" max="10" value={prefs.creamy}
                                onChange={(e) => setPrefs({ ...prefs, creamy: parseInt(e.target.value) })}
                                className="w-full h-2 bg-forest-light rounded-lg appearance-none cursor-pointer accent-gold"
                            />
                            <div className="flex justify-between mt-2 text-sm opacity-60">
                                <span>Light / Clear</span>
                                <span>Balanced</span>
                                <span>Rich & Creamy</span>
                            </div>
                            <div className="mt-8 text-center">
                                <button onClick={handleNext} className="px-6 py-2 border border-gold/50 rounded-full hover:bg-gold/10">Next</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="fruity" initial="enter" animate="center" exit="exit" variants={variants}>
                            <h3 className="text-xl mb-4 text-center">Fruity & Floral Notes</h3>
                            <input
                                type="range" min="0" max="10" value={prefs.fruity}
                                onChange={(e) => setPrefs({ ...prefs, fruity: parseInt(e.target.value) })}
                                className="w-full h-2 bg-forest-light rounded-lg appearance-none cursor-pointer accent-gold"
                            />
                            <div className="flex justify-between mt-2 text-sm opacity-60">
                                <span>No Fruit</span>
                                <span>Subtle</span>
                                <span>Fruity Burst</span>
                            </div>
                            <div className="mt-8 text-center">
                                <button onClick={handleNext} className="px-8 py-3 bg-gold text-forest font-bold rounded-full hover:bg-gold-light">Analyze Result</button>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="results" initial="enter" animate="center" exit="exit" variants={variants} className="space-y-4">
                            <h3 className="text-xl text-center text-gold mb-4">Top 3 Matches Found</h3>
                            <div className="grid gap-3">
                                {results.map((p, idx) => (
                                    <div key={p.id} className="flex items-center justify-between bg-forest-light/30 p-3 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-serif text-gold/50">#{idx + 1}</span>
                                            <div>
                                                <p className="font-serif font-bold text-lg">{p.name}</p>
                                                <p className="text-xs opacity-60">Rp {p.price.toLocaleString('id-ID')}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => addToCart(p)}
                                            className="p-2 bg-gold text-forest rounded-full hover:scale-105 transition"
                                        >
                                            <ShoppingBag size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="text-center mt-6">
                                <button onClick={reset} className="flex items-center justify-center gap-2 mx-auto text-sm opacity-60 hover:opacity-100 hover:text-gold">
                                    <RefreshCcw size={14} /> Recalibrate Preferences
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
