"use client";

/**
 * ============================================================================
 * FILE: app/menu/page.tsx
 * ============================================================================
 * @file Menu Catalog Page
 * @description Halaman Menu interaktif untuk pelanggan. Dilengkapi dengan sistem rekomendasi (Quiz AI), banner promo aktif, dan pengecekan stok/BOM real-time.
 *
 * FUNGSI UTAMA:
 * 1. Menampilkan katalog menu Teh Raja dengan filter kategori (`signature`, `milk`, `fruit`, `classic`, `snack`, `food`) dan pencarian nama menu.
 * 2. Mengecek ketersediaan stok bahan baku BOM secara real-time (`isOutOfIngredient`): jika salah satu bahan resep habis, kartu menu otomatis berstatus "Habis".
 * 3. Membuka modal pemilihan varian (`VariantModal`) saat pelanggan menekan tombol "+ Keranjang".
 * 4. Menampilkan progres pesanan aktif (`OrderStatusOverlay`) dan mendukung ketukan rahasia 5x pada judul/logo untuk akses staf (`useSecretLogoTap`).
 * 5. **Proteksi Kunci Buka/Tutup Kedai (`isOnlineOrderOpen`)**: Jika Admin menutup kedai (misal Hari Libur / di luar jam operasional),
 *    katalog menu & keranjang otomatis dikunci sehingga pelanggan tidak dapat mengakses menu, namun tetap menampilkan informasi
 *    libur/tutup dan tetap menjaga akses rahasia 5x Tap Logo untuk Admin.
 * ============================================================================
 */

import Navbar from "@/components/Navbar";
import RecommendationQuiz from "@/components/RecommendationQuiz";
import OrderStatusOverlay from "@/components/OrderStatusOverlay";
import VariantModal from "@/components/VariantModal";
import { useSecretLogoTap } from "@/components/SecretStaffModal";
import { useToast } from "@/components/Toast";
import {
  useAuthStore,
  useCartStore,
  useProductStore,
  usePromoStore,
  useInventoryStore,
  useStoreConfigStore,
  useSalesStore,
  SHOP_CLOSE_PRESETS,
  ExtendedProduct,
  ProductVariants,
} from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  ArrowDown,
  AlertTriangle,
  Download,
  Search,
  ShoppingBag,
  Tag,
  Receipt,
  Lock,
  Unlock,
  Clock,
  Home as HomeIcon,
  LayoutDashboard,
  CalendarX2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Semua Menu',
  signature: 'Signature',
  milk: 'Milk Tea',
  fruit: 'Fruit Tea',
  classic: 'Classic',
  snack: 'Snack',
  food: 'Food & Roti',
};

export default function Home() {
  const user = useAuthStore((state) => state.user);
  const isAdvancedUnlocked = useAuthStore((state) => state.isAdvancedUnlocked);
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.total);
  const setCartOpen = useCartStore((state) => state.setCartDrawerOpen);
  const isCartOpen = useCartStore((state) => state.isCartDrawerOpen);
  const products = useProductStore((state) => state.products);
  const promos = usePromoStore((state) => state.promos);
  const getApplicablePromo = usePromoStore((state) => state.getApplicablePromo);
  const ingredients = useInventoryStore((state) => state.ingredients);
  const {
    isOnlineOrderOpen,
    closedBadge,
    closedMessage,
    reopenInfo,
    openOnlineStore,
    closeOnlineStore,
  } = useStoreConfigStore();
  const addLog = useSalesStore((state) => state.addLog);
  const toast = useToast();

  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [variantProduct, setVariantProduct] = useState<ExtendedProduct | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tutup modal varian otomatis apabila Admin mengunci kedai secara real-time
  if (!isOnlineOrderOpen && variantProduct) {
    setVariantProduct(null);
  }

  const activePromos = promos.filter(
    p => p.isActive && (isAdvancedUnlocked || p.type === 'bundle' || p.alwaysApplyInPkl)
  );
  const traySubtotal = cartTotal();
  const trayPromoMatch = getApplicablePromo(traySubtotal, cartItems, isAdvancedUnlocked);
  const trayGrandTotal = Math.max(0, traySubtotal - (trayPromoMatch?.discountAmount || 0));

  const handleHeroLogoTap = useSecretLogoTap(() => {
    window.dispatchEvent(new CustomEvent('tehraja:open-secret-modal'));
  });

  const handleVariantConfirm = (variants: ProductVariants, finalPrice: number, qty: number) => {
    if (!isOnlineOrderOpen) {
      setVariantProduct(null);
      toast.error(`Mohon maaf, Kedai sedang tutup (${closedBadge || 'Libur Operasional'}).`);
      return;
    }
    if (!variantProduct) return;
    for (let i = 0; i < qty; i++) {
      addToCart(variantProduct, variants, finalPrice);
    }
    setVariantProduct(null);
  };

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    }
  };

  if (!isClient) return null;

  const handleAdminQuickUnlock = () => {
    openOnlineStore(user?.name || 'Admin');
    addLog('STORE_ONLINE_OPEN', 'Kedai & menu online pelanggan dibuka kembali dari halaman /menu', user?.name || 'Admin');
    toast.success('🔓 Kedai telah dibuka! Pelanggan kini dapat mengakses katalog menu & memesan online.');
  };

  const handleAdminQuickLockHoliday = () => {
    const preset = SHOP_CLOSE_PRESETS[0];
    closeOnlineStore({
      closedBadge: preset.badge,
      closedMessage: preset.message,
      reopenInfo: preset.reopenHint,
      updatedBy: user?.name || 'Admin',
    });
    addLog('STORE_ONLINE_LOCK', `Kedai & menu online pelanggan dikunci (${preset.badge})`, user?.name || 'Admin');
    toast.info(`🔒 Kedai berhasil dikunci (${preset.badge}). Pelanggan tidak dapat mengakses menu.`);
  };

  // ── TAMPILAN SAAT KEDAI TUTUP / LIBUR (PELANGGAN TIDAK BISA MENGAKSES MENU) ──
  if (!isOnlineOrderOpen) {
    return (
      <main className="min-h-screen bg-forest text-cream selection:bg-gold selection:text-forest flex flex-col">
        <Navbar />

        {/* Banner Kendali Cepat khusus Admin yang sedang login */}
        {user?.role === 'admin' && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl bg-[#07221B]/95 backdrop-blur-xl border border-amber-400/40 rounded-2xl p-3.5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <div className="w-8 h-8 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 flex-shrink-0">
                <Lock size={15} />
              </div>
              <div>
                <p className="font-bold text-amber-300">Mode Admin: Menu Pelanggan Sedang Dikunci</p>
                <p className="text-[11px] text-white/60">Pelanggan melihat layar tutup ini &amp; tidak bisa memesan.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Link
                href="/admin"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <LayoutDashboard size={13} /> Admin
              </Link>
              <button
                type="button"
                onClick={handleAdminQuickUnlock}
                className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#07221B] text-xs font-black transition flex items-center gap-1.5 shadow-lg"
              >
                <Unlock size={13} /> Buka Kedai Sekarang
              </button>
            </div>
          </div>
        )}

        <section className={`flex-1 flex items-center justify-center px-4 sm:px-6 pt-24 relative overflow-hidden ${user?.role === 'admin' ? 'pb-40 sm:pb-28' : 'pb-20'}`}>
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--color-gold-light)_0%,_transparent_25%)] opacity-15" />
            <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--color-forest-light)_0%,_transparent_45%)] opacity-40" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 max-w-xl w-full bg-black/30 backdrop-blur-xl border border-gold/25 rounded-3xl p-6 sm:p-8 md:p-11 text-center shadow-2xl"
          >
            {/* Icon & Badge Tutup */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/15 border border-red-400/30 flex items-center justify-center text-red-300 shadow-lg">
              <CalendarX2 size={32} />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-bold uppercase tracking-wider mb-5">
              <Lock size={12} />
              <span>{closedBadge || 'Kedai Sedang Tutup'}</span>
            </div>

            {/* Judul tetap mendukung 5x Tap Rahasia Staf/Admin agar Admin tidak pernah terkunci */}
            <h1
              onClick={handleHeroLogoTap}
              className="text-3xl md:text-5xl font-serif font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-b from-gold-light to-gold cursor-pointer select-none inline-block active:scale-95 transition-transform"
              title="TEH RAJA"
            >
              TEH RAJA
            </h1>

            <h2 className="text-lg md:text-xl font-bold text-white mb-3">
              Mohon Maaf, Menu &amp; Pemesanan Online Sedang Ditutup
            </h2>

            <p className="text-sm md:text-base text-white/75 leading-relaxed mb-6">
              {closedMessage || 'Saat ini Kedai Teh Raja sedang libur / tutup operasional sehingga katalog menu belum dapat diakses.'}
            </p>

            {reopenInfo && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold/10 border border-gold/30 text-gold text-xs md:text-sm font-semibold mb-7">
                <Clock size={15} className="flex-shrink-0" />
                <span>{reopenInfo}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 border-t border-white/10">
              <Link
                href="/"
                className="px-6 py-3 rounded-xl bg-gold text-forest font-bold text-sm hover:bg-gold-light transition flex items-center justify-center gap-2 shadow-lg"
              >
                <HomeIcon size={16} /> Kembali ke Beranda
              </Link>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('tehraja:open-tracker-modal'))}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <Receipt size={16} className="text-gold" /> Lacak Pesanan &amp; Struk
              </button>
            </div>
          </motion.div>
        </section>

        <footer className="bg-black/40 py-6 border-t border-white/5 text-center text-xs opacity-40">
          <p>TEH RAJA &copy; 2026 · Authentic Tea &amp; Blends</p>
        </footer>

        {/* Overlay pelacakan pesanan sebelumnya tetap aktif jika pelanggan baru saja memesan sebelum tutup */}
        <OrderStatusOverlay />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-forest text-cream selection:bg-gold selection:text-forest">
      <Navbar />

      {/* Pintasan Admin saat login di halaman /menu untuk mengunci kedai kapanpun */}
      {user?.role === 'admin' && (
        <div className="fixed bottom-4 right-4 z-40 hidden md:flex items-center gap-2 bg-[#07221B]/95 backdrop-blur-md border border-emerald-500/40 rounded-full pl-3.5 pr-2 py-1.5 shadow-xl text-xs">
          <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Kedai Online: Buka
          </span>
          <button
            type="button"
            onClick={handleAdminQuickLockHoliday}
            className="px-2.5 py-1 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold transition flex items-center gap-1"
            title="Kunci & tutup akses menu pelanggan sekarang"
          >
            <Lock size={11} /> Tutup Kedai
          </button>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="relative min-h-[100dvh] py-24 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--color-gold-light)_0%,_transparent_20%)] opacity-20" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--color-forest-light)_0%,_transparent_40%)] opacity-40" />
        </div>

        <div className="container relative z-10 px-4 sm:px-6 text-center">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Kedai Sedang Buka · Siap Menerima Pesanan
            </span>
          </div>
          <motion.h1
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            onClick={handleHeroLogoTap}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-serif font-bold mb-5 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-b from-gold-light to-gold cursor-pointer select-none inline-block active:scale-95 transition-transform"
          >
            TEH RAJA
          </motion.h1>
          <motion.p
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-base sm:text-xl md:text-2xl opacity-80 max-w-2xl mx-auto mb-8 sm:mb-10 font-light"
          >
            Kemewahan dalam Setiap Tegukan. Rasakan perpaduan sempurna tradisi dan presisi.
          </motion.p>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center"
          >
            <a href="#menu" className="w-full sm:w-auto px-8 py-3 bg-gold text-forest font-bold rounded-full hover:scale-105 transition shadow-lg shadow-gold/20">
              Pesan Menu
            </a>
            {isAdvancedUnlocked && (
              <a href="#recommendation" className="w-full sm:w-auto px-6 py-3 border border-white/20 rounded-full hover:bg-white/5 transition backdrop-blur-sm">
                AI Tea Sommelier
              </a>
            )}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('tehraja:open-tracker-modal'))}
              className="w-full sm:w-auto px-6 py-3 bg-white/10 border border-gold/40 text-gold font-bold rounded-full hover:bg-white/15 transition backdrop-blur-sm flex items-center justify-center gap-2"
            >
              <Receipt size={16} /> Lacak Pesanan &amp; Struk
            </button>
          </motion.div>

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
          className="hidden sm:block absolute bottom-8 opacity-50"
        >
          <ArrowDown />
        </motion.div>
      </section>

      {/* RECOMMENDATION SECTION (Hanya tampil jika Fitur Pengembangan Lanjutan di-unlock) */}
      {isAdvancedUnlocked && (
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
      )}

      {/* MENU GRID */}
      <section id="menu" className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-serif text-center mb-6"><span className="border-b-2 border-gold pb-2">Koleksi Raja</span></h2>

          {/* Active Promos Banner */}
          {activePromos.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {activePromos.map(promo => (
                <div
                  key={promo.id}
                  className="inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 rounded-2xl sm:rounded-full bg-gold/15 border border-gold/40 text-gold text-xs font-bold text-center max-w-full"
                >
                  <Tag size={13} className="flex-shrink-0" />
                  <span>{promo.name}:</span>
                  <span className="text-white/90 font-normal">
                    {promo.description || (
                      promo.type === 'bundle'
                        ? `Beli ${promo.bundleQty || 3} cup (${promo.targetSize || 'M'}) = Rp ${promo.value.toLocaleString('id-ID')}`
                        : promo.type === 'amount'
                          ? `Potongan Rp ${promo.value.toLocaleString('id-ID')}`
                          : `Diskon ${promo.value}%`
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide justify-center flex-wrap">
            {/* Search bar */}
            <div className="w-full flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 mb-2">
              <Search size={16} className="text-white/40 flex-shrink-0" />
              <input
                type="text"
                placeholder="Cari minuman atau camilan favoritmu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-sm w-full focus:outline-none text-white placeholder:text-white/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-white/40 hover:text-white transition text-xs">✕</button>
              )}
            </div>

            {/* Category buttons */}
            {['all', 'signature', 'milk', 'fruit', 'classic', 'snack', 'food'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full font-bold text-sm transition flex-shrink-0 ${activeCategory === cat
                    ? 'bg-gold text-forest shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                  }`}
              >
                {CATEGORY_LABELS[cat] || cat}
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
                .map((product, idx) => {
                  const isBomDepleted = product.recipe && product.recipe.length > 0 && product.recipe.some(r => {
                    const ing = ingredients.find(i => i.id === r.ingredientId);
                    return !ing || ing.stock < r.quantity;
                  });
                  const isOut = !product.isAvailable || product.stock <= 0 || isBomDepleted;
                  const productBundlePromo = activePromos.find(p =>
                    p.type === 'bundle' &&
                    (p.productId === product.id || (p.productId === '2' && product.name.toLowerCase().includes('imperial jasmine')))
                  );

                  return (
                    <motion.div
                      itemProp="product"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.08 }}
                      key={product.id}
                      className={`group relative bg-white/5 border rounded-2xl overflow-hidden transition-colors ${isOut ? 'border-red-500/30 opacity-70' : 'border-white/5 hover:border-gold/30'}`}
                    >
                      <div className="h-64 bg-black/20 relative overflow-hidden">
                        <div className="absolute inset-0 flex items-center justify-center text-gold/20 font-serif text-4xl opacity-30">
                          {product.image ? (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className={`object-cover transition duration-700 group-hover:scale-110 ${isOut ? 'grayscale' : ''}`}
                            />
                          ) : (
                            <span>{product.name[0]}</span>
                          )}
                        </div>

                        {/* PROMO BADGE TOP-LEFT */}
                        {productBundlePromo && !isOut && (
                          <div className="absolute top-4 left-4">
                            <span className="inline-flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-lg">
                              <Tag size={11} />
                              {productBundlePromo.bundleQty || 3} {productBundlePromo.targetSize || 'M'} = Rp {(productBundlePromo.value / 1000).toLocaleString('id-ID')}rb
                            </span>
                          </div>
                        )}

                        {/* STATUS BADGES */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                          {product.category === 'signature' && (
                            <span className="bg-gold text-forest text-xs font-bold px-3 py-1 rounded-full shadow-lg">Signature</span>
                          )}
                          {isOut ? (
                            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                              {isBomDepleted ? 'BAHAN HABIS' : 'SOLD OUT'}
                            </span>
                          ) : product.stock <= (product.minStockThreshold || 5) && (
                            <span className="bg-yellow-500 text-forest text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                              <AlertTriangle size={10} /> Limited: {product.stock}
                            </span>
                          )}
                        </div>

                        {/* OVERLAY ACTION */}
                        <div className={`absolute inset-0 bg-black/60 opacity-0 transition duration-300 flex items-center justify-center ${!isOut ? 'group-hover:opacity-100' : ''}`}>
                          <button
                            onClick={() => setVariantProduct(product)}
                            disabled={isOut}
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
                        <div className="flex justify-between items-center gap-2">
                          <div className="min-w-0">
                            <span className="text-lg font-bold text-gold-light">Rp {product.price.toLocaleString('id-ID')}</span>
                            {typeof product.largePrice === 'number' && (
                              <span className="text-[11px] text-white/50 ml-1.5">(L: Rp {product.largePrice.toLocaleString('id-ID')})</span>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={12} className="text-gold fill-gold" />
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => setVariantProduct(product)}
                          disabled={isOut}
                          className="w-full mt-3 py-2 bg-gold text-forest rounded-lg font-bold text-sm hover:bg-gold-light transition disabled:opacity-40 disabled:cursor-not-allowed md:hidden"
                        >
                          {isOut ? 'Habis' : '+ Tambah ke Tray'}
                        </button>
                      </div>
                    </motion.div>
                  );
                })
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`bg-black/40 pt-10 border-t border-white/5 text-center text-sm opacity-40 ${cartItems.length > 0 ? 'pb-28' : 'pb-10'}`}>
        <p>TEH RAJA &copy; 2026 · Authentic Tea &amp; Blends</p>
      </footer>

      {/* Mobile sticky cart bar */}
      <AnimatePresence>
        {cartItems.length > 0 && !isCartOpen && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-forest/95 backdrop-blur-md border-t border-gold/20"
          >
            <button
              onClick={() => setCartOpen(true)}
              className="w-full max-w-2xl mx-auto bg-gold text-forest py-3 sm:py-3.5 rounded-2xl font-bold flex items-center justify-between px-4 sm:px-5 text-sm sm:text-base shadow-xl"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="relative">
                  <ShoppingBag size={18} />
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartItems.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                </div>
                <span>{cartItems.reduce((s, i) => s + i.quantity, 0)} item di Tray</span>
                {trayPromoMatch && (
                  <span className="hidden sm:inline text-[11px] bg-forest/15 px-2 py-0.5 rounded-full font-bold">
                    Hemat Rp {trayPromoMatch.discountAmount.toLocaleString('id-ID')}
                  </span>
                )}
              </div>
              <span className="font-black whitespace-nowrap">Rp {trayGrandTotal.toLocaleString('id-ID')} →</span>
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
