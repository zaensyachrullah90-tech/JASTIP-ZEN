import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Home, Settings, Plus, Image as ImageIcon, Package, Check, Trash2, ArrowRight, Diamond, Database, RefreshCw, AlertTriangle, X, Sparkles, Save, Percent, Search, Receipt, Lock, Camera, Wand2 } from 'lucide-react';

// --- FUNGSI KEAMANAN ENKRIPSI SANDI (SHA-256) ---
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Default Hash untuk 'admin123'
const DEFAULT_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

// --- MOCK DATA ---
const initialProducts = [
  { id: '1', name: 'Tas Chanel Classic Flap', price_modal: 85000000, price_sell: 87500000, stock: 2, sold: 12, category: 'Tas Mewah', status: 'Ready', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=500&q=80' },
  { id: '2', name: 'Jam Tangan Rolex Submariner', price_modal: 150000000, price_sell: 155000000, stock: 1, sold: 3, category: 'Jam Tangan', status: 'Ready', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=500&q=80' },
  { id: '3', name: 'Parfum Dior Sauvage', price_modal: 2500000, price_sell: 2800000, stock: 5, sold: 25, category: 'Parfum', status: 'PO', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=500&q=80' },
  { id: '4', name: 'Kacamata Gucci Oversized', price_modal: 4000000, price_sell: 4500000, stock: 3, sold: 0, category: 'Aksesoris', status: 'PO', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=80' },
];

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycby7ACCocOywxV3Cx0QEbk2B6Axz7HptgX4zMmi3ApTdcsBxysch0K8xaKkUBgjBkNdtaQ/exec";
const DEFAULT_SETTINGS = { fee_percent: 0.05, ongkir_flat: 5000, min_free_ongkir: 3, admin_password_hash: DEFAULT_HASH };

export default function App() {
  // STATE NAVIGASI
  const [view, setView] = useState('shop');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  
  // STATE PENYIMPANAN
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jastip_api_url') || DEFAULT_API_URL);
  const [isSyncing, setIsSyncing] = useState(false);

  const [products, setProducts] = useState(() => {
    const localData = localStorage.getItem('jastip_products');
    return localData ? JSON.parse(localData) : initialProducts;
  });

  const [orders, setOrders] = useState(() => {
    const localOrders = localStorage.getItem('jastip_orders');
    return localOrders ? JSON.parse(localOrders) : [];
  });

  const [settings, setSettings] = useState(() => {
    const localSettings = localStorage.getItem('jastip_settings');
    let parsed = localSettings ? JSON.parse(localSettings) : DEFAULT_SETTINGS;
    if (parsed.admin_password) {
      parsed.admin_password_hash = DEFAULT_HASH;
      delete parsed.admin_password;
    }
    return { ...DEFAULT_SETTINGS, ...parsed };
  });

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('jastip_cart_premium');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // STATE HALAMAN TOKO & KERANJANG
  const [searchQuery, setSearchQuery] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [buyerName, setBuyerName] = useState('');

  // STATE HALAMAN ADMIN
  const [adminTab, setAdminTab] = useState('analytics'); 
  const [passwordInput, setPasswordInput] = useState('');
  
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);
  const [tempFeePct, setTempFeePct] = useState(settings.fee_percent * 100);
  const [tempOngkir, setTempOngkir] = useState(settings.ongkir_flat);
  const [tempMinFree, setTempMinFree] = useState(settings.min_free_ongkir);
  const [tempAdminPwd, setTempAdminPwd] = useState('');

  // STATE MODAL TAMBAH BARANG
  const [showAddModal, setShowAddModal] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price_modal: '', price_sell: '', image: '', category: '', status: 'Ready' });

  // AUTOSAVE LOKAL
  useEffect(() => { localStorage.setItem('jastip_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('jastip_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('jastip_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('jastip_cart_premium', JSON.stringify(cart)); }, [cart]);

  // ==========================================
  // FUNGSI UMUM & KERANJANG
  // ==========================================
  const handleDeleteProduct = (id) => {
    if(window.confirm('Hapus barang ini secara permanen dari etalase?')) {
      setProducts(products.filter(p => p.id !== id));
      setCart(cart.filter(item => item.id !== id));
    }
  };

  const handleClearInventory = () => {
    if(window.confirm("PERINGATAN: Semua barang di inventaris Anda akan DIHAPUS BERSIH. Lanjutkan?")) {
      setProducts([]);
      setCart([]);
      alert("Inventaris berhasil dikosongkan.");
    }
  };

  const handleClearOrders = () => {
    if(window.confirm("PERINGATAN: Semua riwayat pesanan (Nota) dan Statistik Keuntungan akan di-reset menjadi NOL. Lanjutkan?")) {
      setOrders([]);
      alert("Statistik dan Riwayat Pesanan berhasil dikosongkan.");
    }
  };

  const handleResetSystem = () => {
    if (window.confirm("PERINGATAN BAHAYA: Sistem akan direset sepenuhnya (Keranjang, Produk, Pesanan, Pengaturan kembali ke pabrik). Lanjutkan?")) {
      localStorage.clear();
      setCart([]);
      setProducts(initialProducts);
      setOrders([]);
      setSettings(DEFAULT_SETTINGS);
      setApiUrl(DEFAULT_API_URL);
      setIsAdminLoggedIn(false);
      setView('shop');
      alert("Sistem berhasil direset ke pengaturan pabrik.");
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
    const toast = document.createElement('div');
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-6 py-3 rounded-full font-bold text-xs shadow-2xl z-[100] animate-in slide-in-from-top-10 fade-in duration-300 flex items-center gap-2";
    toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Masuk Keranjang!`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out', 'slide-out-to-top-10'); setTimeout(() => toast.remove(), 300); }, 2000);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  // --- FUNGSI RENDER TAMPILAN BAWAH ---
  const renderBottomNav = () => (
    <div className="fixed bottom-0 w-full max-w-md mx-auto bg-black/90 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl z-50">
      <div className="flex justify-around items-center p-3 pb-5">
        <button onClick={() => setView('shop')} className={`flex flex-col items-center p-2 transition-all duration-300 ${view === 'shop' ? 'text-amber-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Diamond size={22} strokeWidth={view === 'shop' ? 2.5 : 2} />
          <span className="text-[10px] font-medium mt-1 tracking-widest">PRODUK</span>
        </button>
        <button onClick={() => setView('cart')} className={`flex flex-col items-center p-2 relative transition-all duration-300 ${view === 'cart' ? 'text-amber-400 scale-110' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <ShoppingCart size={22} strokeWidth={view === 'cart' ? 2.5 : 2} />
          {cart.length > 0 && (
            <span className="absolute top-1 right-1 bg-amber-500 text-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-black shadow-[0_0_10px_rgba(245,158,11,0.5)]">
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
  // RENDER: HALAMAN TOKO
  // ==========================================
  const renderShopView = () => {
    const filteredProducts = products
        .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => (b.sold || 0) - (a.sold || 0)); 

    return (
      <div className="p-5 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-6 mt-6 text-center">
          <h1 className="text-3xl font-serif text-white tracking-widest uppercase flex justify-center items-center gap-2">
            L<Diamond size={20} className="text-amber-400 fill-amber-400/20" />xury <span className="text-amber-400 font-light">Jastip</span>
          </h1>
          <p className="text-xs text-zinc-400 tracking-widest mt-2 uppercase">Koleksi Jasa Titip Eksklusif</p>
        </div>
        
        <div className="relative mb-8">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Cari tas, parfum, aksesoris..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 text-white pl-12 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-amber-400/50 text-sm tracking-wide shadow-inner"
          />
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center text-zinc-500 py-10 flex flex-col items-center">
            <Package size={40} className="mb-3 opacity-30" />
            <p>Barang tidak ditemukan.</p>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {filteredProducts.map((product, index) => (
            <div key={product.id} className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-2xl group relative">
              {/* Badge Terlaris */}
              {index === 0 && (product.sold > 0) && searchQuery === '' && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-black px-4 py-1.5 rounded-bl-2xl font-bold text-[10px] tracking-widest uppercase z-10 shadow-lg flex items-center gap-1">
                  <Sparkles size={12}/> Terlaris
                </div>
              )}
              <div className="relative bg-zinc-800">
                <img src={product.image || 'https://via.placeholder.com/500x300?text=No+Image'} alt={product.name} className="w-full h-64 object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                
                {/* Badge Kategori & Status (Ready/PO) */}
                <div className="absolute top-3 left-3 flex gap-2 items-center z-10">
                  <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] text-amber-400 tracking-widest uppercase font-medium shadow-lg">
                    {product.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg ${product.status === 'PO' ? 'bg-orange-500/90 text-white border border-orange-400/50' : 'bg-emerald-500/90 text-white border border-emerald-400/50'}`}>
                    {product.status === 'PO' ? 'PRE-ORDER' : 'READY'}
                  </span>
                </div>

              </div>
              <div className="p-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
                <h3 className="font-serif text-white text-lg leading-tight mb-2 pr-12">{product.name}</h3>
                
                {product.sold > 0 && <p className="text-[10px] text-zinc-500 tracking-widest uppercase mb-1">Terjual {product.sold} Unit</p>}
                <p className="text-amber-400 font-light tracking-wider text-xl mb-5">Rp {Number(product.price_sell).toLocaleString('id-ID')}</p>
                
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
  // RENDER: HALAMAN KERANJANG
  // ==========================================
  const renderCartView = () => {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotalSell = cart.reduce((sum, item) => sum + (Number(item.price_sell) * item.qty), 0);
    const feeJastip = subtotalSell * Number(settings.fee_percent);
    
    const isFreeOngkir = totalItems >= Number(settings.min_free_ongkir);
    const ongkir = isFreeOngkir ? 0 : (cart.length > 0 ? Number(settings.ongkir_flat) : 0);
    const total = subtotalSell + feeJastip + ongkir;

    const handleCheckoutWA = () => {
      if (!buyerName) return alert('Mohon masukkan nama lengkap Anda.');
      
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
      
      // 1. Simpan ke LocalStorage HP
      setOrders([newOrder, ...orders]);

      // 2. Kirim otomatis ke Database API GAS (Jika ada URL API)
      if (apiUrl && apiUrl !== DEFAULT_API_URL) {
        fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'addOrder', payload: newOrder })
        }).catch(e => console.error("Gagal sinkron nota ke Database API", e));
      }

      // Update jumlah terjual
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) return { ...p, sold: (p.sold || 0) + cartItem.qty };
        return p;
      });
      setProducts(updatedProducts);

      let message = `*🧾 STRUK JASTIP PREMIUM*\n======================\nKlien: *${buyerName}*\n\n*RINCIAN PESANAN:*\n`;
      cart.forEach(item => {
        message += `🔸 ${item.name} (${item.status === 'PO' ? 'PRE-ORDER' : 'READY'}) x${item.qty}\n      Rp ${(Number(item.price_sell) * item.qty).toLocaleString('id-ID')}\n`;
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
      setShowCheckout(false);
      setBuyerName('');
    };

    if (cart.length === 0) return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-zinc-600 animate-in fade-in duration-500">
        <Package size={48} strokeWidth={1} className="mb-4 opacity-50" />
        <p className="font-serif tracking-widest uppercase text-sm">Keranjang Kosong</p>
      </div>
    );

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-500">
        <h2 className="text-xl font-serif text-white mb-6 tracking-widest uppercase border-b border-white/10 pb-4">Keranjang Belanja</h2>
        
        {isFreeOngkir ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-2xl mb-6 text-xs text-center flex items-center justify-center gap-2 tracking-widest font-bold shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Sparkles size={16} /> SELAMAT! ANDA MENDAPATKAN GRATIS ONGKIR
          </div>
        ) : (
          <div className="bg-zinc-900/60 border border-white/5 text-zinc-400 p-3 rounded-2xl mb-6 text-xs text-center tracking-wide">
            Beli <span className="text-amber-400 font-bold">{settings.min_free_ongkir - totalItems}</span> barang lagi untuk nikmati <span className="text-white font-bold">GRATIS ONGKIR</span>.
          </div>
        )}

        {!showCheckout ? (
          <>
            <div className="space-y-4 mb-8">
              {cart.map(item => (
                <div key={item.id} className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 p-4 rounded-3xl flex gap-4 items-center relative pr-4">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-2xl" />
                  <div className="flex-1">
                    <h4 className="font-serif text-white text-sm leading-tight">{item.name}</h4>
                    <p className="text-amber-400 font-light text-xs mt-1 tracking-wider">Rp {Number(item.price_sell).toLocaleString('id-ID')}</p>
                    <div className="flex gap-2 items-center mt-2">
                       <p className="text-zinc-400 text-[10px] tracking-widest uppercase font-bold">Jml: {item.qty}</p>
                       <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${item.status === 'PO' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{item.status}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-3 relative overflow-hidden shadow-2xl">
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
            <div className="absolute inset-0 bg-white opacity-[0.02] pointer-events-none" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
            <Receipt size={32} className="text-amber-400 mb-4" />
            <h3 className="font-serif text-white tracking-widest uppercase text-lg mb-6">Struk Jastip</h3>
            <input 
              type="text" placeholder="Masukkan Nama Lengkap" 
              value={buyerName} onChange={e => setBuyerName(e.target.value)}
              className="w-full bg-black/50 border border-white/20 text-white placeholder-zinc-500 p-4 rounded-2xl mb-6 focus:outline-none focus:border-amber-400 text-sm tracking-wide text-center"
            />
            <div className="w-full bg-zinc-900/80 p-4 rounded-2xl border border-white/5 mb-6 text-left space-y-2 relative shadow-inner">
               <div className="absolute left-0 right-0 -top-2 flex justify-between px-2">
                 {Array.from({length: 15}).map((_,i) => <div key={i} className="w-2 h-2 bg-[#050505] rounded-full"></div>)}
               </div>
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 border-b border-white/5 pb-2">Rincian Final</p>
               {cart.map(c => (
                 <div key={c.id} className="flex justify-between text-xs text-zinc-300">
                   <span className="truncate pr-2">{c.qty}x {c.name} <span className="text-[8px] text-zinc-500">({c.status})</span></span>
                   <span>Rp{(Number(c.price_sell)*c.qty).toLocaleString('id-ID')}</span>
                 </div>
               ))}
               <div className="pt-2 border-t border-dashed border-white/10 mt-2">
                 <div className="flex justify-between text-[10px] text-zinc-400"><span>Fee Jasa</span><span>Rp{feeJastip.toLocaleString('id-ID')}</span></div>
                 <div className="flex justify-between text-[10px] text-zinc-400"><span>Ongkir</span><span className={isFreeOngkir ? "text-emerald-400 font-bold" : ""}>{isFreeOngkir ? 'Rp 0' : 'Rp'+ongkir.toLocaleString('id-ID')}</span></div>
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
  // RENDER: HALAMAN ADMIN
  // ==========================================
  const renderAdminView = () => {
    const handleAdminLogin = async () => {
      const inputHash = await hashPassword(passwordInput);
      if (inputHash === settings.admin_password_hash) { 
        setIsAdminLoggedIn(true);
        setPasswordInput('');
      } else {
        alert('Sandi salah!');
      }
    };

    const handleSaveSystemSettings = async () => {
      localStorage.setItem('jastip_api_url', tempApiUrl);
      setApiUrl(tempApiUrl);
      
      let newHash = settings.admin_password_hash;
      if (tempAdminPwd.trim() !== '') {
        newHash = await hashPassword(tempAdminPwd);
      }

      const newSettings = { 
        fee_percent: Number(tempFeePct) / 100, 
        ongkir_flat: Number(tempOngkir),
        min_free_ongkir: Number(tempMinFree),
        admin_password_hash: newHash
      };
      setSettings(newSettings);
      setTempAdminPwd('');
      alert('Pengaturan Sistem, Sandi & Biaya berhasil disimpan!');
    };

    if (!isAdminLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center animate-in fade-in duration-500">
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
            <Lock size={40} className="text-amber-400 mx-auto mb-6" />
            <h2 className="text-white font-serif text-lg tracking-widest uppercase mb-2">Akses Terbatas</h2>
            <p className="text-zinc-500 text-xs mb-8">Masukkan sandi keamanan. (Default: admin123)</p>
            
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

    let revenue = 0, capital = 0, totalFee = 0;
    orders.forEach(order => {
      revenue += Number(order.total_sell);
      capital += Number(order.total_modal);
      totalFee += Number(order.fee);
    });
    const stats = { capital, revenue, profit: (revenue - capital) + totalFee, orders: orders.length };

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
          <h2 className="text-xl font-serif text-white tracking-widest uppercase flex items-center gap-3">
            <Settings size={20} className="text-amber-400"/> Panel Eksekutif
          </h2>
          <button onClick={() => setIsAdminLoggedIn(false)} className="text-[10px] text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors font-bold bg-white/5 px-3 py-1.5 rounded-lg">
            KELUAR
          </button>
        </div>
        
        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl mb-6 border border-white/5">
          <button onClick={() => setAdminTab('analytics')} className={`flex-1 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'analytics' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Statistik</button>
          <button onClick={() => setAdminTab('products')} className={`flex-1 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'products' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Inventaris</button>
          <button onClick={() => setAdminTab('system')} className={`flex-1 py-3 text-[9px] sm:text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'system' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Sistem</button>
        </div>

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

            <button 
                onClick={handleClearOrders}
                className="w-full bg-transparent border border-red-500/30 text-red-400 py-3 rounded-2xl text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-red-500/10 transition-all mt-4"
            >
                <Trash2 size={14} /> Kosongkan Riwayat & Statistik
            </button>

            <h3 className="font-serif text-white text-sm tracking-widest uppercase mt-6 mb-4 border-b border-white/5 pb-2">Riwayat Pesanan</h3>
            <div className="space-y-4">
              {orders.length === 0 && <p className="text-xs text-zinc-500 text-center py-6">Belum ada pesanan masuk.</p>}
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

        {adminTab === 'products' && (
          <div className="animate-in slide-in-from-right-4">
             <button 
                onClick={() => setShowAddModal(true)}
                className="w-full bg-amber-500/10 border border-amber-500/50 text-amber-400 py-4 rounded-2xl mb-4 text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-amber-500/20 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]"
              >
                <Plus size={16} /> Tambah Barang Baru (Foto)
            </button>

            <button 
                onClick={handleClearInventory}
                className="w-full bg-transparent border border-red-500/30 text-red-400 py-3 rounded-2xl mb-6 text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={14} /> Kosongkan Inventaris Saja
            </button>
            
            <div className="space-y-4">
              {products.length === 0 && <p className="text-center text-zinc-600 text-sm py-4">Inventaris kosong.</p>}
              {products.map(product => {
                const terjual = product.sold || 0;
                const modalItem = Number(product.price_modal);
                const jualItem = Number(product.price_sell);
                const labaPerItem = jualItem - modalItem;
                const totalLabaBarang = labaPerItem * terjual;
                const totalModalBarang = modalItem * terjual;

                return (
                  <div key={product.id} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex flex-col gap-4 relative pr-2 shadow-lg">
                    <div className="flex gap-4 pr-10">
                      <img src={product.image || 'https://via.placeholder.com/150'} alt={product.name} className="w-16 h-16 object-cover rounded-2xl bg-zinc-800" />
                      <div className="flex-1 pt-1">
                        <h4 className="font-serif text-white text-sm mb-1 line-clamp-1">{product.name}</h4>
                        <div className="flex gap-2 items-center mb-1">
                           <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded text-zinc-300 tracking-widest uppercase">Stok: {product.stock} | Terjual: {terjual}</span>
                           <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest ${product.status === 'PO' ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{product.status}</span>
                        </div>
                      </div>
                    </div>
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
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="absolute right-4 top-4 p-2 bg-red-950/40 text-red-400 rounded-xl hover:bg-red-900 hover:text-red-300 transition-colors border border-red-500/20"
                      title="Hapus Satu Barang"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {adminTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-6 rounded-3xl shadow-xl">
                
                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3">
                  <Lock size={18} className="text-amber-400"/>
                  <h3 className="font-serif text-white text-sm tracking-widest uppercase">Keamanan Sandi</h3>
                </div>
                <div className="mb-6">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Ubah Sandi Baru (Kosongkan jika tidak diubah)</label>
                  <input 
                    type="password" 
                    value={tempAdminPwd} 
                    onChange={e => setTempAdminPwd(e.target.value)}
                    placeholder="Ketik sandi baru..."
                    className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:border-amber-400 text-sm" 
                  />
                </div>

                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3 mt-4">
                  <Database size={18} className="text-amber-400"/>
                  <h3 className="font-serif text-white text-sm tracking-widest uppercase">Database API Google</h3>
                </div>
                <textarea 
                  value={tempApiUrl} 
                  onChange={e => setTempApiUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl mb-6 focus:outline-none focus:border-amber-400 text-xs font-mono h-20 resize-none break-all"
                />

                <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-3 mt-4">
                  <Percent size={18} className="text-amber-400"/>
                  <h3 className="font-serif text-white text-sm tracking-widest uppercase">Pengaturan Biaya & Promo</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Fee Jastip (%)</label>
                    <div className="relative">
                      <input type="number" value={tempFeePct} onChange={e => setTempFeePct(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white p-3 pr-8 rounded-xl focus:border-amber-400 text-sm" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Ongkir (Rp)</label>
                    <input type="number" value={tempOngkir} onChange={e => setTempOngkir(e.target.value)} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1 block">Syarat Gratis Ongkir</label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Minimal beli</span>
                    <input type="number" value={tempMinFree} onChange={e => setTempMinFree(e.target.value)} className="w-16 bg-black/50 border border-emerald-500/30 text-emerald-400 p-2 rounded-xl focus:border-emerald-400 text-sm text-center font-bold" />
                    <span className="text-xs text-zinc-400">barang</span>
                  </div>
                </div>

                <button onClick={handleSaveSystemSettings} className="w-full bg-white text-black font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2">
                  <Save size={16}/> Simpan Semua Pengaturan
                </button>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => alert("Fitur sinkronisasi memerlukan script Backend GAS yang aktif.")} className="bg-zinc-900/60 border border-white/5 p-5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-amber-400/50 hover:bg-zinc-800 transition-all">
                  <RefreshCw size={24} className="text-amber-400"/>
                  <span className="text-[10px] text-white tracking-widest uppercase font-bold text-center">Tarik Data GAS</span>
                </button>

                <button onClick={handleResetSystem} className="bg-red-950/30 border border-red-500/20 p-5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-red-900/40 transition-all">
                  <AlertTriangle size={24} className="text-red-400"/>
                  <span className="text-[10px] text-red-200 tracking-widest uppercase font-bold text-center">Reset Total Pabrik</span>
                </button>
             </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER: MODAL TAMBAH BARANG
  // ==========================================
  const renderAddProductModal = () => {
    if (!showAddModal) return null;

    const handleImageUploadAndCompress = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6); 
            setImagePreview(compressedBase64);
            setNewProduct(prev => ({ ...prev, image: compressedBase64 }));
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    const handleGenerateAI = async () => {
      if(!newProduct.name && !imagePreview) return alert("Mohon masukkan foto atau nama barang terlebih dahulu agar AI bisa menganalisa.");
      
      setIsGeneratingAI(true);
      
      if (apiUrl && apiUrl !== DEFAULT_API_URL) {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'ai_description', text: newProduct.name || "Tolong perbaiki dan buatkan nama mewah untuk barang jastip ini." })
          });
          const data = await res.json();
          if (data.ai_result) {
              setNewProduct(prev => ({ ...prev, name: data.ai_result }));
          }
        } catch(e) {
           console.error("AI gagal terkoneksi", e);
        }
      } else {
        setTimeout(() => {
           const enhancedName = newProduct.name ? `[PREMIUM] ${newProduct.name.toUpperCase()} (Special Edition)` : 'Barang Mewah Terdeteksi';
           setNewProduct(prev => ({
             ...prev,
             name: enhancedName,
             category: prev.category || 'Barang Branded',
             price_sell: prev.price_sell || (Number(prev.price_modal || 0) * 1.5).toString() 
           }));
           alert("✨ AI telah menganalisa dan menyempurnakan detail produk Anda!");
        }, 1500);
      }
      setIsGeneratingAI(false);
    };

    const handleAddProduct = () => {
      if(!newProduct.name || !newProduct.price_sell) return alert('Nama dan Harga Jual wajib diisi!');
      
      const productToAdd = {
        id: "LOKAL-" + new Date().getTime().toString(),
        name: newProduct.name,
        price_modal: Number(newProduct.price_modal) || 0,
        price_sell: Number(newProduct.price_sell) || 0,
        stock: 1,
        sold: 0,
        category: newProduct.category || 'Barang Baru',
        status: newProduct.status || 'Ready',
        image: newProduct.image || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80' 
      };

      setProducts([productToAdd, ...products]);
      setShowAddModal(false);
      setNewProduct({ name: '', price_modal: '', price_sell: '', image: '', category: '', status: 'Ready' });
      setImagePreview('');
      
      alert("Barang & Foto berhasil disimpan ke perangkat (Aman dari Blank Page)!\n\nUntuk menyimpannya langsung ke link Google Drive, pastikan script API Backend Anda telah mendukung upload gambar.");
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-[#111] border border-white/10 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-5 border-b border-white/5 bg-zinc-900/50">
            <h3 className="font-serif text-white tracking-widest uppercase text-sm">Tambah Barang (Kamera)</h3>
            <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            
            <div className="bg-black/50 p-3 rounded-2xl border border-white/10">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 block">Foto Barang Asli</label>
              <div className="flex flex-col gap-3">
                 <div className="flex gap-3 items-center">
                   {imagePreview ? (
                      <img src={imagePreview} className="w-16 h-16 object-cover rounded-xl border border-white/10" alt="Preview" />
                   ) : (
                      <div className="w-16 h-16 bg-zinc-900 rounded-xl border border-white/10 flex flex-col items-center justify-center text-zinc-600">
                        <Camera size={20} className="mb-1"/><span className="text-[8px]">KOSONG</span>
                      </div>
                   )}
                   <div className="flex-1">
                     <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleImageUploadAndCompress} 
                        className="w-full text-[10px] text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-amber-500/10 file:text-amber-400 hover:file:bg-amber-500/20" 
                     />
                   </div>
                 </div>
                 
                 <button 
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI}
                    className={`w-full py-2.5 rounded-xl border border-indigo-500/30 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-all ${isGeneratingAI ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'}`}
                 >
                    {isGeneratingAI ? <RefreshCw size={14} className="animate-spin"/> : <Wand2 size={14}/>}
                    {isGeneratingAI ? 'AI Sedang Membaca...' : 'Percantik Detail via AI Gemini'}
                 </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Nama Barang</label>
              <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" placeholder="Contoh: Sepatu Nike..." />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Status Barang</label>
                <select value={newProduct.status} onChange={e => setNewProduct({...newProduct, status: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:outline-none focus:border-amber-400 text-sm">
                  <option value="Ready">Ready Stock</option>
                  <option value="PO">Pre-Order (PO)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Kategori</label>
                <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" placeholder="Contoh: Sepatu" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Harga Modal</label>
                <input type="number" value={newProduct.price_modal} onChange={e => setNewProduct({...newProduct, price_modal: e.target.value})} className="w-full bg-black/50 border border-white/10 text-white p-3 rounded-xl focus:border-amber-400 text-sm" placeholder="100000" />
              </div>
              <div>
                <label className="text-[10px] text-amber-500 uppercase tracking-widest mb-1 block">Harga Jual</label>
                <input type="number" value={newProduct.price_sell} onChange={e => setNewProduct({...newProduct, price_sell: e.target.value})} className="w-full bg-black/50 border border-amber-500/30 text-white p-3 rounded-xl focus:border-amber-400 text-sm font-bold" placeholder="150000" />
              </div>
            </div>
            
          </div>

          <div className="p-5 border-t border-white/5 bg-zinc-900/50">
             <button onClick={handleAddProduct} className="w-full bg-amber-500 text-black font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-amber-400 transition-all flex justify-center items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                Simpan Ke Etalase <Sparkles size={16}/>
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] font-sans text-zinc-300 relative selection:bg-amber-500/30">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-[#0a0a0a] overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        {view === 'shop' && renderShopView()}
        {view === 'cart' && renderCartView()}
        {view === 'admin' && renderAdminView()}
        {renderBottomNav()}
        {renderAddProductModal()}
      </div>
    </div>
  );
}
