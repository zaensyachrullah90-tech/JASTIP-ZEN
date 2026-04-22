import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Home, Settings, Plus, Image as ImageIcon, Package, Check, Trash2, ArrowRight, Diamond, Database, RefreshCw, AlertTriangle, X, Sparkles, Save, Percent, Search, Receipt } from 'lucide-react';

// --- MOCK DATA PREVIEW (Dilengkapi properti 'sold' untuk fitur Terlaris) ---
const initialProducts = [
  { id: '1', name: 'Tas Chanel Classic Flap', price_modal: 85000000, price_sell: 87500000, stock: 2, sold: 12, category: 'Tas Mewah', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=500&q=80' },
  { id: '2', name: 'Jam Tangan Rolex Submariner', price_modal: 150000000, price_sell: 155000000, stock: 1, sold: 3, category: 'Jam Tangan', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=500&q=80' },
  { id: '3', name: 'Parfum Dior Sauvage', price_modal: 2500000, price_sell: 2800000, stock: 5, sold: 25, category: 'Parfum', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=500&q=80' },
  { id: '4', name: 'Kacamata Gucci Oversized', price_modal: 4000000, price_sell: 4500000, stock: 3, sold: 0, category: 'Aksesoris', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=80' },
];

const mockOrders = [
  { id: 'ORD-001', date: '2026-04-20', customer: 'Bapak Andi', total_modal: 150000000, total_sell: 155000000, fee: 7750000, ongkir: 5000, grand_total: 162755000, status: 'Selesai' },
  { id: 'ORD-002', date: '2026-04-21', customer: 'Ibu Sarah', total_modal: 2500000, total_sell: 2800000, fee: 140000, ongkir: 0, grand_total: 2940000, status: 'Diproses' },
];

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycby7ACCocOywxV3Cx0QEbk2B6Axz7HptgX4zMmi3ApTdcsBxysch0K8xaKkUBgjBkNdtaQ/exec";

export default function App() {
  const [view, setView] = useState('shop');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  
  // ==========================================
  // STATE PENYIMPANAN LOKAL (Tersimpan di HP)
  // ==========================================
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jastip_api_url') || DEFAULT_API_URL);
  const [isSyncing, setIsSyncing] = useState(false);

  const [products, setProducts] = useState(() => {
    const localData = localStorage.getItem('jastip_products');
    return localData ? JSON.parse(localData) : initialProducts;
  });

  const [orders, setOrders] = useState(() => {
    const localOrders = localStorage.getItem('jastip_orders');
    return localOrders ? JSON.parse(localOrders) : mockOrders;
  });

  const [settings, setSettings] = useState(() => {
    const localSettings = localStorage.getItem('jastip_settings');
    return localSettings ? JSON.parse(localSettings) : { fee_percent: 0.05, ongkir_flat: 5000 };
  });

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('jastip_cart_premium');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Simpan perubahan otomatis ke LocalStorage
  useEffect(() => { localStorage.setItem('jastip_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('jastip_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('jastip_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('jastip_cart_premium', JSON.stringify(cart)); }, [cart]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price_modal: '', price_sell: '', image: '', category: '' });

  // ==========================================
  // FUNGSI UMUM & KERANJANG
  // ==========================================
  const handleDeleteProduct = (id) => {
    if(window.confirm('Hapus barang ini beserta data analisis labanya?')) {
      setProducts(products.filter(p => p.id !== id));
      setCart(cart.filter(item => item.id !== id));
    }
  };

  const handleResetSystem = () => {
    const confirm = window.confirm("PERINGATAN: Semua data akan dihapus (Keranjang, Produk, Pesanan). Lanjutkan?");
    if (confirm) {
      localStorage.clear();
      setCart([]);
      setProducts(initialProducts);
      setOrders(mockOrders);
      setSettings({ fee_percent: 0.05, ongkir_flat: 5000 });
      setApiUrl(DEFAULT_API_URL);
      setIsAdminLoggedIn(false);
      setView('shop');
      alert("Sistem berhasil direset ke pengaturan awal.");
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    // Notifikasi ringan
    const toast = document.createElement('div');
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-3 rounded-full font-bold text-xs shadow-2xl z-[100] animate-in slide-in-from-top-10 fade-in duration-300";
    toast.innerText = "Berhasil masuk keranjang!";
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out', 'slide-out-to-top-10'); setTimeout(() => toast.remove(), 300); }, 2000);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  // --- KOMPONEN NAVIGASI BAWAH ---
  const BottomNav = () => (
    <div className="fixed bottom-0 w-full max-w-md mx-auto bg-black/80 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl z-50">
      <div className="flex justify-around items-center p-3 pb-5">
        <button onClick={() => setView('shop')} className={`flex flex-col items-center p-2 transition-all duration-300 ${view === 'shop' ? 'text-amber-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Diamond size={22} strokeWidth={view === 'shop' ? 2.5 : 2} />
          <span className="text-[10px] font-medium mt-1 tracking-widest">BUTIK</span>
        </button>
        <button onClick={() => setView('cart')} className={`flex flex-col items-center p-2 relative transition-all duration-300 ${view === 'cart' ? 'text-amber-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <ShoppingCart size={22} strokeWidth={view === 'cart' ? 2.5 : 2} />
          {cart.length > 0 && (
            <span className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-black">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          )}
          <span className="text-[10px] font-medium mt-1 tracking-widest">KERANJANG</span>
        </button>
        <button onClick={() => setView('admin')} className={`flex flex-col items-center p-2 transition-all duration-300 ${view === 'admin' ? 'text-amber-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Settings size={22} strokeWidth={view === 'admin' ? 2.5 : 2} />
          <span className="text-[10px] font-medium mt-1 tracking-widest">ADMIN</span>
        </button>
      </div>
    </div>
  );

  // ==========================================
  // HALAMAN PEMBELI: TOKO (Dengan Pencarian & Terlaris)
  // ==========================================
  const ShopView = () => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter dan Urutkan Barang (Terlaris di atas)
    const filteredProducts = useMemo(() => {
      return products
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => (b.sold || 0) - (a.sold || 0)); // Urutkan berdasarkan yang paling banyak terjual
    }, [products, searchQuery]);

    return (
      <div className="p-5 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-6 mt-6 text-center">
          <h1 className="text-3xl font-serif text-white tracking-widest uppercase flex justify-center items-center gap-2">
            L<Diamond size={20} className="text-amber-400 fill-amber-400/20" />xury <span className="text-amber-400 font-light">Jastip</span>
          </h1>
          <p className="text-xs text-zinc-400 tracking-widest mt-2 uppercase">Jasa Titip Eksklusif</p>
        </div>
        
        {/* Fitur Pencarian */}
        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Cari barang impian Anda..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-amber-400/50 text-sm tracking-wide"
          />
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center text-zinc-500 py-10">Barang tidak ditemukan.</div>
        )}

        <div className="flex flex-col gap-6">
          {filteredProducts.map((product, index) => (
            <div key={product.id} className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-2xl group relative">
              
              {/* Badge Terlaris (Untuk peringkat 1 jika ada penjualan) */}
              {index === 0 && (product.sold > 0) && searchQuery === '' && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-black px-4 py-1.5 rounded-bl-2xl font-bold text-[10px] tracking-widest uppercase z-10 shadow-lg flex items-center gap-1">
                  🔥 Terlaris
                </div>
              )}

              <div className="relative bg-zinc-800">
                <img src={product.image || 'https://via.placeholder.com/500x300?text=No+Image'} alt={product.name} className="w-full h-56 object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex gap-2 items-center">
                  <span className="text-[10px] text-amber-400 tracking-widest uppercase font-medium">{product.category}</span>
                  {product.sold > 0 && <span className="text-[9px] text-zinc-400 border-l border-zinc-600 pl-2">Terjual {product.sold}</span>}
                </div>
              </div>
              <div className="p-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
                
                <h3 className="font-serif text-white text-lg leading-tight mb-2">{product.name}</h3>
                <p className="text-amber-400 font-light tracking-wider text-lg mb-5">Rp {Number(product.price_sell).toLocaleString('id-ID')}</p>
                
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full bg-white text-black py-3 rounded-2xl text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-amber-400 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Tambah Ke Keranjang
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==========================================
  // HALAMAN PEMBELI: KERANJANG & STRUK BERSIH
  // ==========================================
  const CartView = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalSell = cart.reduce((sum, item) => sum + (Number(item.price_sell) * item.qty), 0);
    const feeJastip = subtotalSell * Number(settings.fee_percent);
    
    // Logika Gratis Ongkir Jika Beli >= 3 Barang
    const isFreeOngkir = totalItems >= 3;
    const ongkir = isFreeOngkir ? 0 : (cart.length > 0 ? Number(settings.ongkir_flat) : 0);
    const total = subtotalSell + feeJastip + ongkir;
    
    const [showCheckout, setShowCheckout] = useState(false);
    const [buyerName, setBuyerName] = useState('');

    const handleCheckoutWA = () => {
      if (!buyerName) return alert('Mohon masukkan nama lengkap Anda.');
      
      // Update data di penyimpanan lokal agar Admin bisa melihat pesanan & analisis laba
      const newOrder = {
        id: 'ORD-' + new Date().getTime(),
        date: new Date().toISOString(),
        customer: buyerName,
        total_modal: cart.reduce((sum, item) => sum + (Number(item.price_modal) * item.qty), 0),
        total_sell: subtotalSell,
        fee: feeJastip,
        ongkir: ongkir,
        grand_total: total,
        status: 'Pesanan Baru'
      };
      setOrders([newOrder, ...orders]);

      // Tambahkan angka penjualan (sold) di Produk
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) return { ...p, sold: (p.sold || 0) + cartItem.qty };
        return p;
      });
      setProducts(updatedProducts);

      // Buat Struk Rapi untuk WhatsApp
      let message = `*🧾 STRUK JASTIP PREMIUM*\n======================\nKlien: *${buyerName}*\n\n*RINCIAN PESANAN:*\n`;
      cart.forEach(item => {
        message += `🔸 ${item.name} (${item.qty}x)\n      Rp ${(Number(item.price_sell) * item.qty).toLocaleString('id-ID')}\n`;
      });
      message += `\n----------------------\n`;
      message += `Subtotal Barang : Rp ${subtotalSell.toLocaleString('id-ID')}\n`;
      message += `Fee Jasa (${(settings.fee_percent * 100).toFixed(0)}%) : Rp ${feeJastip.toLocaleString('id-ID')}\n`;
      message += `Ongkos Kirim    : ${isFreeOngkir ? '*GRATIS ONGKIR!*' : 'Rp ' + ongkir.toLocaleString('id-ID')}\n`;
      message += `======================\n`;
      message += `*TOTAL TAGIHAN  : Rp ${total.toLocaleString('id-ID')}*\n======================\n\n_Mohon informasikan metode pembayaran yang Anda inginkan._`;
      
      const waLink = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
      window.open(waLink, '_blank');
      setCart([]); 
    };

    if (cart.length === 0) return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-zinc-600 animate-in fade-in duration-500">
        <Package size={48} strokeWidth={1} className="mb-4" />
        <p className="font-serif tracking-widest uppercase text-sm">Keranjang Anda Kosong</p>
      </div>
    );

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-500">
        <h2 className="text-xl font-serif text-white mb-6 tracking-widest uppercase border-b border-white/10 pb-4">Keranjang Belanja</h2>
        
        {/* Notifikasi Gratis Ongkir */}
        {isFreeOngkir ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-2xl mb-6 text-xs text-center flex items-center justify-center gap-2 tracking-widest font-bold">
            <Sparkles size={16} /> SELAMAT! ANDA MENDAPATKAN GRATIS ONGKIR
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-white/5 text-zinc-400 p-3 rounded-2xl mb-6 text-xs text-center tracking-wide">
            Beli <span className="text-amber-400 font-bold">{3 - totalItems}</span> barang lagi untuk nikmati <span className="text-white font-bold">GRATIS ONGKIR</span>.
          </div>
        )}

        {!showCheckout ? (
          <>
            <div className="space-y-4 mb-8">
              {cart.map(item => (
                <div key={item.id} className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 p-4 rounded-3xl flex gap-4 items-center">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-2xl" />
                  <div className="flex-1">
                    <h4 className="font-serif text-white text-sm leading-tight">{item.name}</h4>
                    <p className="text-amber-400 font-light text-xs mt-2 tracking-wider">Rp {Number(item.price_sell).toLocaleString('id-ID')}</p>
                    <p className="text-zinc-500 text-[10px] mt-1 tracking-widest uppercase">Jml: {item.qty}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-3 text-zinc-500 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
              <h3 className="text-white font-serif tracking-widest uppercase text-xs mb-4 border-b border-white/10 pb-2">Ringkasan Pesanan</h3>
              <div className="flex justify-between text-zinc-400 text-xs tracking-wider"><span>Subtotal ({totalItems} item)</span> <span>Rp {subtotalSell.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-zinc-400 text-xs tracking-wider"><span>Biaya Jasa ({(settings.fee_percent * 100).toFixed(0)}%)</span> <span>Rp {feeJastip.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-zinc-400 text-xs tracking-wider items-center">
                <span>Ongkos Kirim</span> 
                {isFreeOngkir ? (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">GRATIS</span>
                ) : (
                  <span>Rp {ongkir.toLocaleString('id-ID')}</span>
                )}
              </div>
              
              <div className="w-full h-px border-t border-dashed border-white/20 my-4"></div>
              
              <div className="flex justify-between items-center">
                 <span className="text-white font-serif tracking-widest uppercase text-xs">Total</span> 
                 <span className="text-amber-400 font-light text-lg tracking-wider">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              
              <button onClick={() => setShowCheckout(true)} className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl mt-6 uppercase tracking-widest text-xs hover:bg-amber-400 transition-all flex justify-center items-center gap-2">
                Buat Struk Pembayaran <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="bg-[#111] border border-amber-500/30 p-6 rounded-3xl flex flex-col items-center animate-in slide-in-from-right-8 shadow-2xl relative overflow-hidden">
            {/* Desain Struk Kertas Bersih */}
            <div className="absolute inset-0 bg-white opacity-[0.02] pointer-events-none" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
            
            <Receipt size={32} className="text-amber-400 mb-4" />
            <h3 className="font-serif text-white tracking-widest uppercase text-lg mb-6">Struk Jastip</h3>
            
            <input 
              type="text" placeholder="Masukkan Nama Lengkap" 
              value={buyerName} onChange={e => setBuyerName(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white placeholder-zinc-500 p-4 rounded-2xl mb-6 focus:outline-none focus:border-amber-400 text-sm tracking-wide text-center"
            />

            <div className="w-full bg-zinc-900/80 p-4 rounded-2xl border border-white/5 mb-6 text-left space-y-2 relative">
               <div className="absolute left-0 right-0 -top-2 flex justify-between px-2">
                 {Array.from({length: 15}).map((_,i) => <div key={i} className="w-2 h-2 bg-[#050505] rounded-full"></div>)}
               </div>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Rincian Final</p>
               {cart.map(c => (
                 <div key={c.id} className="flex justify-between text-xs text-zinc-300">
                   <span className="truncate pr-2">{c.qty}x {c.name}</span>
                   <span>Rp{(Number(c.price_sell)*c.qty).toLocaleString('id-ID')}</span>
                 </div>
               ))}
               <div className="pt-2 border-t border-dashed border-white/10 mt-2">
                 <div className="flex justify-between text-[10px] text-zinc-400"><span>Fee Jasa</span><span>Rp{feeJastip.toLocaleString('id-ID')}</span></div>
                 <div className="flex justify-between text-[10px] text-zinc-400"><span>Ongkir</span><span className={isFreeOngkir ? "text-emerald-400" : ""}>{isFreeOngkir ? 'Rp 0' : 'Rp'+ongkir.toLocaleString('id-ID')}</span></div>
               </div>
               <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-center">
                 <span className="text-xs font-bold text-white uppercase tracking-widest">Total Bayar</span>
                 <span className="text-sm font-bold text-amber-400">Rp {total.toLocaleString('id-ID')}</span>
               </div>
            </div>

            <button onClick={handleCheckoutWA} className="w-full bg-white text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-amber-400 transition-all flex justify-center items-center gap-2">
              <Check size={16} /> Kirim Struk via WA
            </button>
            <button onClick={() => setShowCheckout(false)} className="mt-6 text-xs text-zinc-500 hover:text-white tracking-widest uppercase transition-colors">Batal</button>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // HALAMAN ADMIN: PANEL EKSEKUTIF
  // ==========================================
  const AdminView = () => {
    const [adminTab, setAdminTab] = useState('analytics'); 
    const [passwordInput, setPasswordInput] = useState('');
    
    const [tempApiUrl, setTempApiUrl] = useState(apiUrl);
    const [tempFeePct, setTempFeePct] = useState(settings.fee_percent * 100);
    const [tempOngkir, setTempOngkir] = useState(settings.ongkir_flat);

    const handleAdminLogin = () => {
      if (passwordInput === 'admin123') { 
        setIsAdminLoggedIn(true);
        setPasswordInput('');
      } else {
        alert('Sandi salah!');
      }
    };

    const handleSaveSystemSettings = () => {
      localStorage.setItem('jastip_api_url', tempApiUrl);
      setApiUrl(tempApiUrl);
      const newSettings = { fee_percent: Number(tempFeePct) / 100, ongkir_flat: Number(tempOngkir) };
      setSettings(newSettings);
      alert('Pengaturan Sistem & Biaya berhasil disimpan!');
    };

    if (!isAdminLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center animate-in fade-in duration-500">
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl">
            <Settings size={40} className="text-amber-400 mx-auto mb-6" />
            <h2 className="text-white font-serif text-lg tracking-widest uppercase mb-2">Akses Terbatas</h2>
            <p className="text-zinc-500 text-xs mb-8">Silakan masukkan sandi panel eksekutif.</p>
            
            <input 
              type="password" 
              placeholder="Masukkan Sandi" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)}
              className="w-full bg-black/50 border border-white/10 text-white text-center tracking-widest p-4 rounded-2xl mb-6 focus:outline-none focus:border-amber-400 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <button 
              onClick={handleAdminLogin}
              className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-amber-400 transition-all"
            >
              Masuk
            </button>
          </div>
        </div>
      );
    }

    const stats = useMemo(() => {
      let revenue = 0, capital = 0, totalFee = 0;
      orders.forEach(order => {
        revenue += Number(order.total_sell);
        capital += Number(order.total_modal);
        totalFee += Number(order.fee);
      });
      return { capital, revenue, profit: (revenue - capital) + totalFee, orders: orders.length };
    }, [orders]);

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-serif text-white tracking-widest uppercase flex items-center gap-3">
            <Settings size={20} className="text-amber-400"/> Panel Eksekutif
          </h2>
          <button onClick={() => setIsAdminLoggedIn(false)} className="text-[10px] text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors">
            KELUAR
          </button>
        </div>
        
        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl mb-6 border border-white/5">
          <button onClick={() => setAdminTab('analytics')} className={`flex-1 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'analytics' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Statistik</button>
          <button onClick={() => setAdminTab('products')} className={`flex-1 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'products' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Inventaris & Analisis</button>
          <button onClick={() => setAdminTab('system')} className={`flex-1 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'system' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Sistem</button>
        </div>

        {/* TAB 1: ANALYTICS UTAMA */}
        {adminTab === 'analytics' && (
          <div className="space-y-6 animate-in slide-in-from-left-4">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-6 rounded-3xl text-black relative overflow-hidden shadow-[0_10px_40px_rgba(245,158,11,0.2)]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <h3 className="text-black/70 font-medium text-[10px] tracking-widest uppercase mb-1">Total Keuntungan Bersih</h3>
              <p className="text-3xl font-light tracking-wide mb-6">Rp {stats.profit.toLocaleString('id-ID')}</p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-black/10 pt-4 mt-2">
                <div>
                  <p className="text-black/60 text-[9px] tracking-widest uppercase mb-1">Total Modal Diputar</p>
                  <p className="font-bold text-sm tracking-wider">Rp {stats.capital.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-black/60 text-[9px] tracking-widest uppercase mb-1">Total Transaksi</p>
                  <p className="font-bold text-sm tracking-wider">{stats.orders} Pesanan</p>
                </div>
              </div>
            </div>

            <h3 className="font-serif text-white text-sm tracking-widest uppercase mt-8 mb-4 border-b border-white/5 pb-2">Pesanan Tersimpan</h3>
            <div className="space-y-4">
              {orders.length === 0 && <p className="text-xs text-zinc-500 text-center">Belum ada pesanan.</p>}
              {orders.map(order => (
                <div key={order.id} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-5 rounded-3xl flex justify-between items-center">
                  <div>
                    <p className="font-serif text-white text-sm mb-1">{order.customer}</p>
                    <p className="text-[10px] text-zinc-500 tracking-widest">{order.id}</p>
                    <p className="text-amber-400 font-light text-xs mt-2 tracking-wider">Rp {Number(order.grand_total).toLocaleString('id-ID')}</p>
                  </div>
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border ${order.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY & ANALISIS BARANG */}
        {adminTab === 'products' && (
          <div className="animate-in slide-in-from-right-4">
             <button 
                onClick={() => setShowAddModal(true)}
                className="w-full bg-transparent border border-amber-400/50 text-amber-400 py-4 rounded-2xl mb-6 text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-amber-400/10 transition-all"
              >
                <Plus size={16} /> Tambah Barang Baru
            </button>
            
            <div className="space-y-4">
              {products.length === 0 && <p className="text-center text-zinc-600 text-sm py-4">Inventaris kosong.</p>}
              {products.map(product => {
                // Kalkulasi Analisis per Barang
                const terjual = product.sold || 0;
                const modalItem = Number(product.price_modal);
                const jualItem = Number(product.price_sell);
                const labaPerItem = jualItem - modalItem;
                const totalLabaBarang = labaPerItem * terjual;
                const totalModalBarang = modalItem * terjual;

                return (
                  <div key={product.id} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col gap-4 relative pr-2">
                    
                    {/* Header Item */}
                    <div className="flex gap-4 pr-10">
                      <img src={product.image || 'https://via.placeholder.com/150'} alt={product.name} className="w-16 h-16 object-cover rounded-2xl bg-zinc-800" />
                      <div className="flex-1 pt-1">
                        <h4 className="font-serif text-white text-sm mb-1 line-clamp-1">{product.name}</h4>
                        <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-zinc-300 tracking-widest uppercase">
                          Stok: {product.stock} | Terjual: {terjual}
                        </span>
                      </div>
                    </div>

                    {/* Analisis Data Laba */}
                    <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                      <div>
                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Total Modal Keluar</p>
                        <p className="font-light text-[10px] text-zinc-300 tracking-wider">Rp {totalModalBarang.toLocaleString('id-ID')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1">Laba / Item</p>
                        <p className="font-light text-[10px] text-zinc-300 tracking-wider">Rp {labaPerItem.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 text-center">
                        <p className="text-[8px] text-amber-500 uppercase tracking-widest mb-0.5">Total Laba Bersih</p>
                        <p className="font-bold text-[10px] text-amber-400 tracking-wider">Rp {totalLabaBarang.toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    {/* Tombol Hapus Barang */}
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="absolute right-4 top-4 p-2 bg-red-950/40 text-red-400 rounded-xl hover:bg-red-900 hover:text-red-300 transition-colors border border-red-500/20"
                      title="Hapus Barang"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM */}
        {adminTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-6 rounded-3xl">
                
                {/* Bagian API */}
                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
                  <Database size={18} className="text-amber-400"/>
                  <h3 className="font-serif text-white text-sm tracking-widest uppercase">Database API</h3>
                </div>
                <textarea 
                  value={tempApiUrl} 
                  onChange={e => setTempApiUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl mb-6 focus:outline-none focus:border-amber-400 text-xs font-mono h-20 resize-none break-all"
                />

                {/* Bagian Perhitungan Biaya */}
                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3 mt-4">
                  <Percent size={18} className="text-amber-400"/>
                  <h3 className="font-serif text-white text-sm tracking-widest uppercase">Pengaturan Biaya</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Fee Jastip (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={tempFeePct} 
                        onChange={e => setTempFeePct(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 text-white p-3 pr-8 rounded-xl focus:border-amber-400 text-sm" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Ongkir (Rp)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={tempOngkir} 
                        onChange={e => setTempOngkir(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" 
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-500 mb-6 italic">*Catatan: Sistem otomatis menggratiskan ongkir jika pelanggan membeli 3 barang atau lebih.</p>

                <button 
                  onClick={handleSaveSystemSettings}
                  className="w-full bg-white text-black font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={16}/> Simpan Semua Pengaturan
                </button>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => syncDataFromGAS(true)}
                  disabled={isSyncing}
                  className={`bg-zinc-900/60 border border-white/5 p-5 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all ${isSyncing ? 'opacity-50' : 'hover:border-amber-400/50 hover:bg-zinc-800'}`}
                >
                  <RefreshCw size={24} className={`text-amber-400 ${isSyncing ? 'animate-spin' : ''}`}/>
                  <span className="text-[10px] text-white tracking-widest uppercase font-bold text-center">
                    {isSyncing ? 'Proses...' : 'Sinkronkan GAS'}
                  </span>
                </button>

                <button 
                  onClick={handleResetSystem}
                  className="bg-red-950/30 border border-red-500/20 p-5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-red-900/40 transition-all"
                >
                  <AlertTriangle size={24} className="text-red-400"/>
                  <span className="text-[10px] text-red-200 tracking-widest uppercase font-bold text-center">
                    Reset Pabrik
                  </span>
                </button>
             </div>
          </div>
        )}
      </div>
    );
  };

  // --- MODAL TAMBAH BARANG ---
  const AddProductModal = () => {
    if (!showAddModal) return null;

    const handleAddProduct = () => {
      if(!newProduct.name || !newProduct.price_sell) return alert('Nama dan Harga Jual wajib diisi!');
      
      const productToAdd = {
        id: "LOKAL-" + new Date().getTime().toString(),
        name: newProduct.name,
        price_modal: Number(newProduct.price_modal) || 0,
        price_sell: Number(newProduct.price_sell) || 0,
        stock: 1,
        sold: 0,
        category: newProduct.category || 'Lainnya',
        image: newProduct.image || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80' 
      };

      setProducts([productToAdd, ...products]);
      setShowAddModal(false);
      setNewProduct({ name: '', price_modal: '', price_sell: '', image: '', category: '' });
      alert("Barang berhasil ditambahkan ke toko secara permanen!");
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-[#111] border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-5 border-b border-white/5 bg-zinc-900/50">
            <h3 className="font-serif text-white tracking-widest uppercase text-sm">Tambah Barang Baru</h3>
            <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Nama Barang</label>
              <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" placeholder="Contoh: Sepatu Nike..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Harga Modal</label>
                <input type="number" value={newProduct.price_modal} onChange={e => setNewProduct({...newProduct, price_modal: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" placeholder="100000" />
              </div>
              <div>
                <label className="text-[10px] text-amber-500 uppercase tracking-widest mb-1 block">Harga Jual</label>
                <input type="number" value={newProduct.price_sell} onChange={e => setNewProduct({...newProduct, price_sell: e.target.value})} className="w-full bg-black/50 border border-amber-500/30 text-white p-3 rounded-xl focus:border-amber-400 text-sm" placeholder="150000" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Kategori</label>
              <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" placeholder="Contoh: Sepatu" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">URL Foto (Drive / Web)</label>
              <input type="text" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm text-zinc-400" placeholder="https://..." />
            </div>
          </div>

          <div className="p-5 border-t border-white/5 bg-zinc-900/50">
             <button onClick={handleAddProduct} className="w-full bg-amber-500 text-black font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-amber-400 transition-all flex justify-center items-center gap-2">
                Simpan Ke Toko <Sparkles size={16}/>
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-zinc-300 relative selection:bg-amber-500/30">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-[#0a0a0a] overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        {view === 'shop' && <ShopView />}
        {view === 'cart' && <CartView />}
        {view === 'admin' && <AdminView />}
        <BottomNav />
        <AddProductModal />
      </div>
    </div>
  );
}
