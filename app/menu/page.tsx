"use client";

/**
 * @file Menu Catalog Page
 * @description Halaman Menu interaktif untuk pelanggan. Dilengkapi dengan sistem rekomendasi (Quiz AI) untuk mencocokkan rasa teh dengan profil pengguna.
 */


import Navbar from "@/components/Navbar";
import RecommendationQuiz from "@/components/RecommendationQuiz";
import OrderStatusOverlay from "@/components/OrderStatusOverlay"; // [NEW] 
import VariantModal from "@/components/VariantModal";
import { useCartStore, useProductStore, ExtendedProduct, ProductVariants } from "@/lib/store"; // Use dynamic store
import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowDown, AlertTriangle, Download, Search, ShoppingBag } from "lucide-react";
import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Home() {
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.total);
  const setCartOpen = useCartStore((state) => state.setCartDrawerOpen);
  const isCartOpen = useCartStore((state) => state.isCartDrawerOpen);
  const products = useProductStore((state) => state.products); // Dynamic products
  const [isClient, setIsClient] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [variantProduct, setVariantProduct] = useState<ExtendedProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleVariantConfirm = (variants: ProductVariants, finalPrice: number, qty: number) => {
    if (!variantProduct) return;
    for (let i = 0; i < qty; i++) {
      addToCart(variantProduct, variants, finalPrice);
    }
    setVariantProduct(null);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setIsClient(true);

    // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    });
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  }

  if (!isClient) return null; // Hydration fix

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
            className="text-4xl md:text-6xl lg:text-8xl font-serif font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-b from-gold-light to-gold"
          >
            TEH RAJA
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl md:text-2xl opacity-80 max-w-2xl mx-auto mb-10 font-light"
          >
            Kemewahan dalam Setiap Tegukan. Rasakan perpaduan sempurna tradisi dan presisi.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex gap-4 justify-center"
          >
            <a href="#recommendation" className="px-8 py-3 bg-gold text-forest font-bold rounded-full hover:scale-105 transition shadow-lg shadow-gold/20">
              Cari Teh Favorit
            </a>
            <a href="#menu" className="px-8 py-3 border border-white/20 rounded-full hover:bg-white/5 transition backdrop-blur-sm">
              Lihat Menu
            </a>
          </motion.div>

          {/* PWA Install Button (Only visible if proper criteria met) */}
          {deferredPrompt && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleInstall}
              className="mt-8 px-6 py-2 bg-white/10 backdrop-blur rounded-full text-sm hover:bg-white/20 transition flex items-center gap-2 mx-auto border border-white/10"
            >
              <Download size={16} /> Install Aplikasi
            </motion.button>
          )}
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
              Bingung mau pilih apa? Biarkan algoritma cerdas kami menganalisis selera Anda dan menyarankan racikan sempurna untuk mood Anda hari ini.
            </p>
          </div>
          <RecommendationQuiz />
        </div>
      </section>

      {/* MENU GRID */}
      <section id="menu" className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-serif text-center mb-8"><span className="border-b-2 border-gold pb-2">Koleksi Raja</span></h2>

          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide justify-center flex-wrap">
            {/* Search bar */}
            <div className="w-full flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 mb-2">
              <Search size={16} className="text-white/40 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari minuman favoritmu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none text-white placeholder:text-white/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white transition text-xs">✕</button>
              )}
            </div>

            {/* Category buttons */}
            {['all', 'signature', 'milk', 'fruit', 'classic', 'snack'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full font-bold text-sm transition flex-shrink-0 ${
                  activeCategory === cat 
                  ? 'bg-gold text-forest shadow-lg' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}
              >
                {cat === 'all' ? 'Semua Menu' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.length === 0 ? (
              <div className="col-span-full text-center py-20 opacity-50">
                <p className="text-xl">Belum ada menu yang tersedia.</p>
              </div>
            ) : (
              products
                .filter(p => activeCategory === 'all' || p.category === activeCategory)
                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()))
                .map((product, idx) => (
                <motion.div
                  itemProp="product"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  key={product.id}
                  className={`group relative bg-white/5 border rounded-2xl overflow-hidden transition-colors ${product.stock <= 0 ? 'border-red-500/30 opacity-70' : 'border-white/5 hover:border-gold/30'
                    }`}
                >
                  <div className="h-64 bg-black/20 relative overflow-hidden">
                    {/* Image / Placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center text-gold/20 font-serif text-4xl opacity-30">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className={`w-full h-full object-cover transition duration-700 group-hover:scale-110 ${product.stock <= 0 ? 'grayscale' : ''}`} />
                      ) : (
                        <span>{product.name[0]}</span>
                      )}
                    </div>

                    {/* STATUS BADGES */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                      {product.category === 'signature' && (
                        <span className="bg-gold text-forest text-xs font-bold px-3 py-1 rounded-full shadow-lg">Signature</span>
                      )}
                      {product.stock <= 0 ? (
                        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">SOLD OUT</span>
                      ) : product.stock <= (product.minStockThreshold || 5) && (
                        <span className="bg-yellow-500 text-forest text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                          <AlertTriangle size={10} /> Limited: {product.stock}
                        </span>
                      )}
                    </div>

                    {/* OVERLAY ACTION */}
                    <div className={`absolute inset-0 bg-black/60 opacity-0 transition duration-300 flex items-center justify-center ${product.stock > 0 ? 'group-hover:opacity-100' : ''}`}>
                      <button
                        onClick={() => setVariantProduct(product)}
                        disabled={product.stock <= 0}
                        className="bg-gold text-forest px-6 py-2 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition duration-300 hover:scale-105"
                      >
                        Tambah ke Tray
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-serif font-bold">{product.name}</h3>
                    </div>
                    <p className="text-sm opacity-60 mb-4 h-10 overflow-hidden line-clamp-2">{product.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gold-light">Rp {product.price.toLocaleString('id-ID')}</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className="text-gold fill-gold"
                          />
                        ))}
                      </div>
                    </div>
                    {/* Mobile-visible add button */}
                    <button
                      onClick={() => setVariantProduct(product)}
                      disabled={product.stock <= 0}
                      className="w-full mt-3 py-2 bg-gold text-forest rounded-lg font-bold text-sm hover:bg-gold-light transition disabled:opacity-40 disabled:cursor-not-allowed md:hidden"
                    >
                      {product.stock <= 0 ? 'Habis' : '+ Tambah ke Tray'}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black/40 py-10 border-t border-white/5 text-center text-sm opacity-40">
        <p>TEH RAJA &copy; 2026. M. YARZUQ WILDANI [0402231058]. Dibuat untuk Praktik Kerja Lapangan.</p>
      </footer>

      {/* Mobile sticky cart bar */}
      <AnimatePresence>
        {cartItems.length > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-forest/95 backdrop-blur-md border-t border-gold/20"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="w-full bg-gold text-forest py-3.5 rounded-2xl font-bold flex items-center justify-between px-5 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag size={20} />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{cartItems.length}</span>
                </div>
                <span>{cartItems.length} item di Tray</span>
              </div>
              <span className="font-black">Rp {cartTotal().toLocaleString('id-ID')} →</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OVERLAYS */}
      <OrderStatusOverlay />

      <AnimatePresence>
        {variantProduct && (
          <VariantModal
            product={variantProduct}
            onConfirm={handleVariantConfirm}
            onClose={() => setVariantProduct(null)}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
