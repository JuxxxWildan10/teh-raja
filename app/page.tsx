"use client";

import Navbar from "@/components/Navbar";
import RecommendationQuiz from "@/components/RecommendationQuiz";
import { products } from "@/data/menu";
import { useCartStore } from "@/lib/store";
import { motion } from "framer-motion";
import { ShoppingBag, Star, ArrowDown } from "lucide-react";
import Image from "next/image";

export default function Home() {
  const addToCart = useCartStore((state) => state.addToCart);

  return (
    <main className="min-h-screen bg-forest text-cream selection:bg-gold selection:text-forest">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* Abstract Background */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--color-gold-light)_0%,_transparent_20%)] opacity-20" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--color-forest-light)_0%,_transparent_40%)] opacity-40" />
        </div>

        <div className="container relative z-10 px-6 text-center">
          <motion.h1
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-6xl md:text-8xl font-serif font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-b from-gold-light to-gold"
          >
            TEH RAJA
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl opacity-80 max-w-2xl mx-auto mb-10 font-light"
          >
            Royalty in Every Sip. Experience the perfect fusion of tradition and precision.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex gap-4 justify-center"
          >
            <a href="#recommendation" className="px-8 py-3 bg-gold text-forest font-bold rounded-full hover:scale-105 transition shadow-lg shadow-gold/20">
              Find My Tea
            </a>
            <a href="#menu" className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/5 transition backdrop-blur-sm">
              View Menu
            </a>
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-10 opacity-50"
        >
          <ArrowDown />
        </motion.div>
      </section>

      {/* RECOMMENDATION SECTION */}
      <section id="recommendation" className="py-20 bg-forest-light/10 relative">
        <div className="container mx-auto px-6">
          <div className="mb-12 text-center">
            <h2 className="text-4xl font-serif text-gold mb-4">AI Tea Sommelier</h2>
            <p className="opacity-60 max-w-md mx-auto">
              Not sure what to pick? Let our algorithm analyze your preferences and suggest the perfect blend for your mood today.
            </p>
          </div>
          <RecommendationQuiz />
        </div>
      </section>

      {/* MENU GRID */}
      <section id="menu" className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-serif text-center mb-16"><span className="border-b-2 border-gold pb-2">Royal Collection</span></h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, idx) => (
              <motion.div
                itemProp="product"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                key={product.id}
                className="group relative bg-white/5 border border-white/5 rounded-2xl overflow-hidden hover:border-gold/30 transition-colors"
              >
                <div className="h-64 bg-black/20 relative overflow-hidden">
                  {/* Placeholder for Image */}
                  <div className="absolute inset-0 flex items-center justify-center text-gold/20 font-serif text-4xl opacity-30">
                    {product.name[0]} {product.name.split(' ')[1]?.[0]}
                  </div>
                  {/* Add overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                    <button
                      onClick={() => addToCart(product)}
                      className="bg-gold text-forest px-6 py-2 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition duration-300"
                    >
                      Add to Tray
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-serif font-bold">{product.name}</h3>
                    <span className="bg-gold/10 text-gold text-xs px-2 py-1 rounded border border-gold/20">{product.category}</span>
                  </div>
                  <p className="text-sm opacity-60 mb-4 h-10 overflow-hidden">{product.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gold-light">Rp {product.price.toLocaleString('id-ID')}</span>
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, i) => (
                        <Star key={i} size={12} className={i < Math.floor(product.attributes.sweet / 3) ? "text-gold fill-gold" : "text-white/20"} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black/40 py-10 border-t border-white/5 text-center text-sm opacity-40">
        <p>TEH RAJA &copy; 2024. Designed for Skripsi.</p>
      </footer>
    </main>
  );
}
