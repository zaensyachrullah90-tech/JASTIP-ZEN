import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Home, Settings, Plus, Image as ImageIcon, Package, Check, Trash2, ArrowRight, Diamond, Database, RefreshCw, AlertTriangle, X, Sparkles, Save, Percent, Search, Receipt, Lock, Camera, Wand2, Cloud, Table, Download, Phone, Edit2, TrendingUp, Frown, Award, ChevronRight } from 'lucide-react';

// --- FUNGSI KEAMANAN ENKRIPSI SANDI (SHA-256) ---
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const DEFAULT_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

// --- MOCK DATA ---
const initialProducts = [
  { id: '1', name: 'Tas Chanel Classic Flap', price_modal: 85000000, price_sell: 87500000, stock: 2, sold: 12, category: 'Tas Mewah', status: 'Ready', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=500&q=80' },
  { id: '2', name: 'Jam Tangan Rolex Submariner', price_modal: 150000000, price_sell: 155000000, stock: 1, sold: 3, category: 'Jam Tangan', status: 'Ready', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=500&q=80' },
  { id: '3', name: 'Parfum Dior Sauvage', price_modal: 2500000, price_sell: 2800000, stock: 5, sold: 25, category: 'Parfum', status: 'PO', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=500&q=80' },
  { id: '4', name: 'Kacamata Gucci Oversized', price_modal: 4000000, price_sell: 4500000, stock: 3, sold: 0, category: 'Aksesoris', status: 'PO', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=80' },
];

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbxZeQRz93HE5vrVIy-1lSmjY5pqHwncDGodKtO1k1MgwwxxXnZfBvc92ar1fIo195p5FA/exec";
const DEFAULT_SETTINGS = { 
  fee_percent: 0.05, 
  ongkir_flat: 5000, 
  min_free_ongkir: 3, 
  admin_password_hash: DEFAULT_HASH,
  sheet_url: 'https://docs.google.com/spreadsheets/d/1C4EfIpC-uCRGDfDOdm0pDG92SJDqQ_AeEGJB7HrMUJo/edit?gid=50998068#gid=50998068',
  drive_url: 'https://drive.google.com/drive/folders/1pYE8Jv_U9neNLwxvwDTNkRJPHgbUaPYE?hl=ID',
  admin_wa: '6281234567890',
  qris_image: ''
};

export default function App() {
  // STATE NAVIGASI (Persistent)
  const [view, setView] = useState(() => localStorage.getItem('jastip_current_view') || 'shop');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => localStorage.getItem('jastip_admin_logged_in') === 'true');
  
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
  const [adminTab, setAdminTab] = useState(() => localStorage.getItem('jastip_admin_tab') || 'analytics'); 
  const [passwordInput, setPasswordInput] = useState('');
  
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);
  const [tempSheetUrl, setTempSheetUrl] = useState(settings.sheet_url);
  const [tempDriveUrl, setTempDriveUrl] = useState(settings.drive_url || '');
  const [tempFeePct, setTempFeePct] = useState(settings.fee_percent * 100);
  const [tempOngkir, setTempOngkir] = useState(settings.ongkir_flat);
  const [tempMinFree, setTempMinFree] = useState(settings.min_free_ongkir);
  const [tempAdminPwd, setTempAdminPwd] = useState('');
  const [tempAdminWa, setTempAdminWa] = useState(settings.admin_wa);
  const [tempQrisImage, setTempQrisImage] = useState(settings.qris_image);

  // STATE CRUD BARANG (CREATE & UPDATE)
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price_modal: '', price_sell: '', image: '', category: '', status: 'Ready' });

  // ==========================================
  // SINKRONISASI DATA API (OTOMATIS & MANUAL)
  // ==========================================
  const syncDataFromGAS = useCallback(async (isManual = false, isSilent = false) => {
    if (!apiUrl || apiUrl === "" || apiUrl === "MASUKKAN_URL_WEB_APP_DISINI") {
      if (isManual) alert("Mohon atur URL API Google Script terlebih dahulu di tab 'SISTEM'!");
      return;
    }

    if (!isSilent) setIsSyncing(true);
    try {
      const resProducts = await fetch(`${apiUrl}?action=getProducts`);
      const dataProducts = await resProducts.json();
      if (!dataProducts.error && Array.isArray(dataProducts)) setProducts(dataProducts);

      const resOrders = await fetch(`${apiUrl}?action=getOrders`);
      const dataOrders = await resOrders.json();
      if (!dataOrders.error && Array.isArray(dataOrders)) setOrders(dataOrders);

      const resSettings = await fetch(`${apiUrl}?action=getSettings`);
      const dataSettings = await resSettings.json();
      if (!dataSettings.error) {
         setSettings(prev => ({ 
           ...prev, 
           fee_percent: Number(dataSettings.fee_percent) ?? prev.fee_percent, 
           ongkir_flat: Number(dataSettings.ongkir_flat) ?? prev.ongkir_flat, 
           min_free_ongkir: Number(dataSettings.min_free_ongkir) ?? prev.min_free_ongkir 
         }));
      }
      
      if (isManual) alert("Sinkronisasi database pusat berhasil! Perangkat telah diperbarui.");
    } catch (error) {
      if (isManual) alert("Gagal sinkronisasi. Pastikan URL API benar dan koneksi internet stabil.");
      console.error("Fetch Error:", error);
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [apiUrl]);

  // Auto-sync & Auto-Polling
  useEffect(() => {
    if (apiUrl && apiUrl !== "" && apiUrl !== "MASUKKAN_URL_WEB_APP_DISINI") {
      syncDataFromGAS(false, true); 
      const interval = setInterval(() => {
        syncDataFromGAS(false, true); 
      }, 15000); 
      return () => clearInterval(interval);
    }
  }, [apiUrl, syncDataFromGAS]);

  // AUTOSAVE LOKAL 
  useEffect(() => { localStorage.setItem('jastip_current_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('jastip_admin_tab', adminTab); }, [adminTab]);
  useEffect(() => { localStorage.setItem('jastip_admin_logged_in', isAdminLoggedIn); }, [isAdminLoggedIn]);
  useEffect(() => { localStorage.setItem('jastip_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('jastip_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('jastip_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('jastip_cart_premium', JSON.stringify(cart)); }, [cart]);

  // ==========================================
  // FUNGSI UMUM, KERANJANG, DAN DB PUSH
  // ==========================================
  const handleDeleteProduct = (id) => {
    if(window.confirm('Hapus barang ini secara permanen dari etalase?')) {
      setProducts(products.filter(p => p.id !== id));
      setCart(cart.filter(item => item.id !== id));
      if (apiUrl && apiUrl !== "") {
        fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'deleteProduct', id: id }) }).catch(console.error);
      }
    }
  };

  const handleClearInventory = () => {
    if(window.confirm("PERINGATAN: Semua barang di inventaris Anda akan DIHAPUS BERSIH. Lanjutkan?")) {
      setProducts([]);
      setCart([]);
      if (apiUrl && apiUrl !== "") {
        fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'clearProducts' }) }).catch(console.error);
      }
      alert("Inventaris berhasil dikosongkan.");
    }
  };

  const handleRestoreDefaults = () => {
    if(window.confirm("Ingin mengembalikan barang ke daftar bawaan pabrik?")) {
      setProducts(initialProducts);
      setCart([]);
      alert("Daftar barang berhasil dikembalikan ke pengaturan awal.");
    }
  };

  const handleClearOrders = () => {
    if(window.confirm("PERINGATAN: Semua riwayat pesanan (Nota) dan Statistik Keuntungan akan di-reset menjadi NOL. Lanjutkan?")) {
      setOrders([]);
      if (apiUrl && apiUrl !== "") {
        fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'clearOrders' }) }).catch(console.error);
      }
      alert("Statistik dan Riwayat Pesanan berhasil dikosongkan.");
    }
  };

  const handleResetSystem = () => {
    if (window.confirm("PERINGATAN BAHAYA: Sistem akan direset sepenuhnya. Lanjutkan?")) {
      localStorage.clear();
      setCart([]);
      setProducts(initialProducts);
      setOrders([]);
      setSettings(DEFAULT_SETTINGS);
      setApiUrl(DEFAULT_API_URL);
      setTempApiUrl(DEFAULT_API_URL);
      setTempSheetUrl(DEFAULT_SETTINGS.sheet_url);
      setTempDriveUrl(DEFAULT_SETTINGS.drive_url);
      setTempAdminWa(DEFAULT_SETTINGS.admin_wa);
      setTempQrisImage('');
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
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs shadow-[0_8px_30px_rgba(37,99,235,0.4)] z-[100] animate-in slide-in-from-top-10 fade-in duration-300 flex items-center gap-2";
    toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Berhasil Masuk Keranjang!`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out', 'slide-out-to-top-10'); setTimeout(() => toast.remove(), 300); }, 2000);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: '', price_modal: '', price_sell: '', image: '', category: '', status: 'Ready' });
    setImagePreview('');
    setShowProductModal(true);
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({ ...product });
    setImagePreview(product.image);
    setShowProductModal(true);
  };

  // --- FUNGSI RENDER TAMPILAN BAWAH (MODERN WHITE/BLUE) ---
  const renderBottomNav = () => (
    <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-slate-200 rounded-t-3xl z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center p-3 pb-5">
        <button onClick={() => setView('shop')} className={`flex flex-col items-center p-2 transition-all duration-300 ${view === 'shop' ? 'text-blue-600 scale-110 drop-shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
          <Package size={24} strokeWidth={view === 'shop' ? 2.5 : 2} />
          <span className="text-[9px] font-bold mt-1 tracking-widest uppercase">PRODUK</span>
        </button>
        <button onClick={() => setView('cart')} className={`flex flex-col items-center p-2 relative transition-all duration-300 ${view === 'cart' ? 'text-blue-600 scale-110 drop-shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
          <ShoppingCart size={24} strokeWidth={view === 'cart' ? 2.5 : 2} />
          {cart.length > 0 && (
            <span className="absolute top-1 right-1 bg-gradient-to-r from-orange-400 to-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold border border-white shadow-sm">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          )}
          <span className="text-[9px] font-bold mt-1 tracking-widest uppercase">KERANJANG</span>
        </button>
        <button onClick={() => setView('admin')} className={`flex flex-col items-center p-2 transition-all duration-300 ${view === 'admin' ? 'text-blue-600 scale-110 drop-shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
          <Settings size={24} strokeWidth={view === 'admin' ? 2.5 : 2} />
          <span className="text-[9px] font-bold mt-1 tracking-widest uppercase">ADMIN</span>
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
        <div className="mb-6 mt-4 text-center">
          <div className="inline-flex items-center justify-center bg-blue-50 text-blue-600 p-3 rounded-full mb-3 shadow-sm border border-blue-100">
             <Diamond size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex justify-center items-center gap-1.5">
            JASTIP <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">PREMIUM</span>
          </h1>
          <p className="text-[10px] text-slate-500 tracking-widest mt-1.5 uppercase font-medium">Layanan Titip Eksklusif & Terpercaya</p>
        </div>
        
        <div className="relative mb-8">
          <Search size={18} strokeWidth={2.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari tas, parfum, aksesoris..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-medium shadow-sm transition-all"
          />
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center text-slate-400 py-12 flex flex-col items-center bg-slate-50 rounded-3xl border border-slate-100">
            <Package size={48} strokeWidth={1.5} className="mb-3 text-slate-300" />
            <p className="font-medium text-sm">Barang tidak ditemukan.</p>
          </div>
        )}

        <div className="flex flex-col gap-6">
          {filteredProducts.map((product, index) => (
            <div key={product.id} className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] group relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)]">
              {/* Badge Terlaris */}
              {index === 0 && (product.sold > 0) && searchQuery === '' && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-1.5 rounded-bl-2xl font-bold text-[9px] tracking-widest uppercase z-10 shadow-md flex items-center gap-1">
                  <Sparkles size={12} strokeWidth={2.5}/> TERLARIS
                </div>
              )}
              <div className="relative bg-slate-100">
                <img src={product.image || 'https://via.placeholder.com/500x300?text=No+Image'} alt={product.name} className="w-full h-64 object-cover transition-all duration-700 mix-blend-multiply" />
                
                {/* Badge Kategori & Status (Ready/PO) */}
                <div className="absolute top-4 left-4 flex gap-2 items-center z-10">
                  <span className="bg-white/90 backdrop-blur-sm border border-slate-200/50 px-3 py-1 rounded-full text-[9px] text-slate-700 tracking-widest uppercase font-bold shadow-sm">
                    {product.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-sm ${product.status === 'PO' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                    {product.status === 'PO' ? 'PRE-ORDER' : 'READY STOCK'}
                  </span>
                </div>
              </div>
              
              <div className="p-6 relative bg-white">
                <h3 className="font-extrabold text-slate-800 text-lg leading-tight mb-1 pr-8">{product.name}</h3>
                
                {product.sold > 0 && <p className="text-[10px] text-slate-400 tracking-widest uppercase mb-2 font-semibold">Telah Terjual {product.sold} Unit</p>}
                
                <p className="text-blue-600 font-extrabold tracking-tight text-xl mb-6 mt-2">Rp {Number(product.price_sell).toLocaleString('id-ID')}</p>
                
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-2xl text-[11px] font-bold tracking-widest uppercase shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Plus size={16} strokeWidth={3} /> TAMBAHKAN
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
      
      setOrders([newOrder, ...orders]);

      if (apiUrl && apiUrl !== DEFAULT_API_URL && apiUrl !== "") {
        fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify({ action: 'addOrder', payload: newOrder })
        }).catch(e => console.error("Gagal sinkron nota ke Database API", e));
      }

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
      message += `*TOTAL TAGIHAN  : Rp ${total.toLocaleString('id-ID')}*\n======================\n\n_Sistem otomatis, mohon tunggu konfirmasi admin._`;
      
      let cleanWa = settings.admin_wa.replace(/\D/g, '');
      if(cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.substring(1);

      const waLink = `https://wa.me/${cleanWa}?text=${encodeURIComponent(message)}`;
      window.open(waLink, '_blank');
      setCart([]); 
      setShowCheckout(false);
      setBuyerName('');
    };

    const downloadQRIS = () => {
      if (!settings.qris_image) return;
      const a = document.createElement('a');
      a.href = settings.qris_image;
      a.download = 'QRIS_Jastip_Premium.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    if (cart.length === 0) return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
           <ShoppingCart size={40} strokeWidth={2} className="text-slate-300" />
        </div>
        <p className="font-bold tracking-widest uppercase text-xs">Keranjang Kosong</p>
      </div>
    );

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-500">
        <h2 className="text-lg font-extrabold text-slate-800 mb-6 tracking-widest uppercase flex items-center gap-2">
           <ShoppingCart size={20} className="text-blue-600"/> Keranjang
        </h2>
        
        {isFreeOngkir ? (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl mb-6 text-[11px] text-center flex items-center justify-center gap-2 tracking-widest font-extrabold shadow-sm">
            <Sparkles size={16} strokeWidth={2.5} className="text-emerald-500" /> SELAMAT! GRATIS ONGKIR
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 text-slate-500 p-4 rounded-2xl mb-6 text-[11px] text-center tracking-wide font-medium shadow-sm">
            Beli <span className="text-blue-600 font-extrabold">{settings.min_free_ongkir - totalItems}</span> barang lagi untuk <span className="text-slate-800 font-extrabold">GRATIS ONGKIR</span>
          </div>
        )}

        {!showCheckout ? (
          <>
            <div className="space-y-4 mb-8">
              {cart.map(item => (
                <div key={item.id} className="bg-white border border-slate-100 p-4 rounded-3xl flex gap-4 items-center relative pr-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-2xl bg-slate-100" />
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-1">{item.name}</h4>
                    <p className="text-blue-600 font-extrabold text-sm mt-1">Rp {Number(item.price_sell).toLocaleString('id-ID')}</p>
                    <div className="flex gap-2 items-center mt-2">
                       <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-1 rounded-lg font-bold tracking-widest uppercase">Jml: {item.qty}</span>
                       <span className={`text-[8px] font-bold px-2 py-1 rounded-lg uppercase tracking-widest ${item.status === 'PO' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>{item.status}</span>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 relative overflow-hidden shadow-lg">
              <h3 className="text-slate-800 font-extrabold tracking-widest uppercase text-xs mb-2 border-b border-slate-100 pb-3">Ringkasan Pembayaran</h3>
              <div className="flex justify-between text-slate-500 text-xs font-medium"><span>Subtotal ({totalItems} item)</span> <span className="text-slate-800 font-bold">Rp {subtotalSell.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-slate-500 text-xs font-medium"><span>Biaya Jasa ({(settings.fee_percent * 100).toFixed(0)}%)</span> <span className="text-slate-800 font-bold">Rp {feeJastip.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-slate-500 text-xs font-medium items-center">
                <span>Ongkos Kirim</span> 
                {isFreeOngkir ? (
                  <span className="text-emerald-600 font-extrabold bg-emerald-100 px-2 py-0.5 rounded text-[10px] tracking-wider">GRATIS</span>
                ) : (
                  <span className="text-slate-800 font-bold">Rp {ongkir.toLocaleString('id-ID')}</span>
                )}
              </div>
              <div className="w-full h-px border-t border-dashed border-slate-200 my-4"></div>
              <div className="flex justify-between items-center">
                 <span className="text-slate-800 font-extrabold tracking-widest uppercase text-xs">Total Tagihan</span> 
                 <span className="text-blue-600 font-black text-xl">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <button onClick={() => setShowCheckout(true)} className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl mt-6 uppercase tracking-widest text-[11px] hover:bg-slate-700 transition-all flex justify-center items-center gap-2 shadow-lg">
                Buat Struk Pembayaran <ArrowRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col items-center animate-in slide-in-from-right-8 shadow-2xl relative overflow-hidden">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm border border-blue-100">
               <Receipt size={28} strokeWidth={2.5} />
            </div>
            <h3 className="font-extrabold text-slate-800 tracking-widest uppercase text-lg mb-6">Penyelesaian</h3>
            
            <div className="w-full mb-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 text-left">Nama Lengkap Klien</label>
              <input 
                type="text" placeholder="Ketik nama Anda di sini..." 
                value={buyerName} onChange={e => setBuyerName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-medium transition-all"
              />
            </div>
            
            {settings.qris_image ? (
              <div className="bg-slate-50 p-4 rounded-3xl shadow-inner mb-6 w-full max-w-[240px] relative border border-slate-100">
                 <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mb-3">Scan QRIS Berikut</p>
                 <img src={settings.qris_image} alt="QRIS" className="w-full aspect-square object-contain rounded-2xl border border-white shadow-sm bg-white" />
                 <button onClick={downloadQRIS} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-5 py-2.5 rounded-full font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 shadow-[0_4px_15px_rgba(37,99,235,0.4)] hover:scale-105 transition-transform w-max">
                   <Download size={14} strokeWidth={2.5}/> Simpan QRIS
                 </button>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-3xl mb-6 w-full border border-slate-200 border-dashed">
                 <div className="w-full py-8 flex items-center justify-center flex-col text-slate-400">
                    <ImageIcon size={32} strokeWidth={1.5} className="mb-2 text-slate-300"/>
                    <span className="text-[10px] tracking-widest uppercase font-bold text-center">Admin belum mengatur QRIS</span>
                 </div>
              </div>
            )}

            <div className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 text-left space-y-2 relative mt-4 shadow-sm">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Rincian Nota</p>
               {cart.map(c => (
                 <div key={c.id} className="flex justify-between text-xs text-slate-600 font-medium">
                   <span className="truncate pr-2">{c.qty}x {c.name}</span>
                   <span className="text-slate-800 font-bold">Rp{(Number(c.price_sell)*c.qty).toLocaleString('id-ID')}</span>
                 </div>
               ))}
               <div className="pt-3 border-t border-dashed border-slate-300 mt-3">
                 <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1"><span>Fee Jasa</span><span>Rp{feeJastip.toLocaleString('id-ID')}</span></div>
                 <div className="flex justify-between text-[10px] text-slate-500 font-medium"><span>Ongkir</span><span className={isFreeOngkir ? "text-emerald-600 font-bold" : ""}>{isFreeOngkir ? 'Rp 0' : 'Rp'+ongkir.toLocaleString('id-ID')}</span></div>
               </div>
               <div className="pt-3 mt-3 border-t border-slate-200 flex justify-between items-center">
                 <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Total Bayar</span>
                 <span className="text-base font-black text-blue-600">Rp {total.toLocaleString('id-ID')}</span>
               </div>
            </div>
            
            <button onClick={handleCheckoutWA} className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-4 rounded-2xl uppercase tracking-widest text-xs shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.5)] transition-all flex justify-center items-center gap-2">
              <Check size={18} strokeWidth={3} /> Kirim Bukti via WA
            </button>
            <button onClick={() => setShowCheckout(false)} className="mt-6 text-[10px] text-slate-400 font-bold hover:text-slate-600 tracking-widest uppercase transition-colors">Batalkan</button>
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
        ...settings,
        fee_percent: Number(tempFeePct) / 100, 
        ongkir_flat: Number(tempOngkir),
        min_free_ongkir: Number(tempMinFree),
        admin_password_hash: newHash,
        sheet_url: tempSheetUrl,
        drive_url: tempDriveUrl,
        admin_wa: tempAdminWa,
        qris_image: tempQrisImage
      };
      setSettings(newSettings);
      setTempAdminPwd('');
      alert('Pengaturan Sistem, Kontak & Biaya berhasil disimpan secara lokal!');
    };

    if (!isAdminLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center animate-in fade-in duration-500">
          <div className="bg-white border border-slate-200 p-8 rounded-[2rem] w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative overflow-hidden">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-blue-100">
               <Lock size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-slate-800 font-extrabold text-xl tracking-tight uppercase mb-2">Panel Eksekutif</h2>
            <p className="text-slate-500 text-xs font-medium mb-8">Sistem Manajemen Terpadu.<br/>(Sandi Default: <span className="font-mono bg-slate-100 px-1 rounded">admin123</span>)</p>
            
            <input 
              type="password" 
              placeholder="Masukkan Sandi Akses" 
              value={passwordInput} 
              onChange={e => setPasswordInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-center tracking-widest p-4 rounded-2xl mb-6 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm font-bold transition-all"
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <button 
              onClick={handleAdminLogin}
              className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl uppercase tracking-widest text-[11px] shadow-lg hover:bg-slate-700 transition-all"
            >
              Autentikasi Masuk
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

    // ANALISIS DATA
    const top10Products = [...products].sort((a,b) => (b.sold || 0) - (a.sold || 0)).filter(p => p.sold > 0).slice(0, 10);
    const unsoldProducts = products.filter(p => !p.sold || p.sold === 0);

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-500">
        <div className="flex justify-between items-center mb-6 pb-4">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-widest uppercase flex items-center gap-2">
            <Settings size={20} className="text-blue-600" strokeWidth={2.5}/> Dasbor
          </h2>
          <button onClick={() => setIsAdminLoggedIn(false)} className="text-[9px] text-slate-500 hover:text-red-500 uppercase tracking-widest font-extrabold bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl shadow-sm transition-colors">
            TUTUP SESI
          </button>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200 shadow-inner">
          <button onClick={() => setAdminTab('analytics')} className={`flex-1 py-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${adminTab === 'analytics' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Laporan</button>
          <button onClick={() => setAdminTab('products')} className={`flex-1 py-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${adminTab === 'products' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Inventaris</button>
          <button onClick={() => setAdminTab('system')} className={`flex-1 py-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${adminTab === 'system' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>Sistem</button>
        </div>

        {/* TAB ANALYTICS */}
        {adminTab === 'analytics' && (
          <div className="space-y-6 animate-in slide-in-from-left-4">
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-6 rounded-3xl text-white relative overflow-hidden shadow-[0_15px_30px_rgba(37,99,235,0.3)]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <h3 className="text-blue-100 font-bold text-[10px] tracking-widest uppercase mb-1">Total Laba Bersih</h3>
              <p className="text-3xl font-black tracking-tight mb-6 drop-shadow-sm">Rp {stats.profit.toLocaleString('id-ID')}</p>
              <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 mt-2">
                <div>
                  <p className="text-blue-100 text-[9px] font-bold tracking-widest uppercase mb-1">Modal Diputar</p>
                  <p className="font-extrabold text-sm tracking-wider">Rp {stats.capital.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-blue-100 text-[9px] font-bold tracking-widest uppercase mb-1">Transaksi</p>
                  <p className="font-extrabold text-sm tracking-wider">{stats.orders} Pesanan</p>
                </div>
              </div>
            </div>

            {/* SEGMEN ANALISIS BARU (Top 10 & Tidak Laku) */}
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                  <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mb-3">
                     <TrendingUp size={20} strokeWidth={2.5}/>
                  </div>
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">Telah Terjual</p>
                  <p className="text-xl font-black text-slate-800">{top10Products.reduce((sum, p)=>sum+p.sold,0)} Unit</p>
               </div>
               <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm">
                  <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mb-3">
                     <Frown size={20} strokeWidth={2.5}/>
                  </div>
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">Stok Mati / 0</p>
                  <p className="text-xl font-black text-slate-800">{unsoldProducts.length} Item</p>
               </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
               <h3 className="font-extrabold text-slate-800 text-xs tracking-widest uppercase mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                 <Award size={16} className="text-orange-500" strokeWidth={2.5}/> 10 Barang Paling Laku
               </h3>
               <div className="space-y-3">
                 {top10Products.length === 0 && <p className="text-xs font-medium text-slate-400">Belum ada data penjualan.</p>}
                 {top10Products.map((p, i) => (
                   <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <span className="font-black text-slate-300 text-lg w-4">{i+1}</span>
                         <img src={p.image} className="w-10 h-10 rounded-lg object-cover border border-slate-100"/>
                         <p className="text-xs font-bold text-slate-700 line-clamp-1">{p.name}</p>
                      </div>
                      <span className="bg-orange-50 text-orange-600 font-extrabold text-[10px] px-2 py-1 rounded-md">{p.sold} x</span>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 border-dashed p-6 rounded-3xl">
               <h3 className="font-extrabold text-slate-600 text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
                 <AlertTriangle size={16} strokeWidth={2.5}/> Perlu Perhatian (0 Terjual)
               </h3>
               <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                 {unsoldProducts.length === 0 && <p className="text-[10px] font-bold text-emerald-500 bg-emerald-50 p-2 rounded-lg text-center">Bagus! Semua barang pernah terjual.</p>}
                 {unsoldProducts.map(p => (
                   <div key={p.id} className="text-xs font-semibold text-slate-500 flex justify-between bg-white p-2 rounded-lg border border-slate-100">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[9px] bg-slate-100 px-1.5 rounded text-slate-400">Stok: {p.stock}</span>
                   </div>
                 ))}
               </div>
            </div>

            <h3 className="font-extrabold text-slate-800 text-sm tracking-widest uppercase mt-8 mb-4">Riwayat Transaksi</h3>
            <div className="space-y-4">
              {orders.length === 0 && <div className="text-center bg-white border border-slate-200 rounded-3xl py-8 shadow-sm"><p className="text-xs font-bold text-slate-400">Belum ada nota transaksi.</p></div>}
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-slate-200 p-5 rounded-3xl flex justify-between items-center shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                  <div>
                    <p className="font-bold text-slate-800 text-sm mb-1">{order.customer}</p>
                    <p className="text-[9px] text-slate-400 font-bold tracking-widest">{order.id}</p>
                    <p className="text-blue-600 font-black text-sm mt-2 tracking-wide">Rp {Number(order.grand_total).toLocaleString('id-ID')}</p>
                  </div>
                  <span className={`text-[9px] uppercase tracking-widest font-black px-3 py-1.5 rounded-xl border ${order.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-orange-50 text-orange-500 border-orange-200'}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>

            <button 
                onClick={handleClearOrders}
                className="w-full bg-white border border-red-200 text-red-500 font-bold py-4 rounded-2xl text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-red-50 transition-all mt-6 shadow-sm"
            >
                <Trash2 size={16} strokeWidth={2.5}/> Kosongkan Riwayat & Statistik
            </button>
          </div>
        )}

        {/* TAB PRODUCTS (FULL CRUD) */}
        {adminTab === 'products' && (
          <div className="animate-in slide-in-from-right-4">
             <button 
                onClick={openAddProduct}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-4 rounded-2xl mb-4 text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_8px_25px_rgba(37,99,235,0.4)] transition-all"
              >
                <Plus size={18} strokeWidth={3} /> Entri Barang Baru
            </button>

            <div className="flex gap-3 mb-8">
              <button 
                  onClick={handleClearInventory}
                  className="flex-1 bg-white border border-red-200 text-red-500 font-bold py-3.5 rounded-2xl text-[9px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-red-50 transition-all shadow-sm"
                >
                  <Trash2 size={14} strokeWidth={2.5}/> Kosongkan
              </button>
              <button 
                  onClick={handleRestoreDefaults}
                  className="flex-1 bg-white border border-slate-300 text-slate-600 font-bold py-3.5 rounded-2xl text-[9px] uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <RefreshCw size={14} strokeWidth={2.5}/> Blueprint Awal
              </button>
            </div>
            
            <div className="space-y-4">
              {products.length === 0 && <div className="text-center bg-white border border-slate-200 rounded-3xl py-10 shadow-sm"><p className="text-xs font-bold text-slate-400">Etalase kosong.</p></div>}
              {products.map(product => {
                const terjual = product.sold || 0;
                const modalItem = Number(product.price_modal);
                const jualItem = Number(product.price_sell);
                const labaPerItem = jualItem - modalItem;
                const totalLabaBarang = labaPerItem * terjual;
                const totalModalBarang = modalItem * terjual;

                return (
                  <div key={product.id} className="bg-white border border-slate-200 p-5 rounded-[2rem] flex flex-col gap-4 relative pr-4 shadow-[0_4px_15px_rgb(0,0,0,0.03)]">
                    <div className="flex gap-4 pr-16">
                      <img src={product.image || 'https://via.placeholder.com/150'} alt={product.name} className="w-16 h-16 object-cover rounded-2xl bg-slate-100 border border-slate-100" />
                      <div className="flex-1 pt-1">
                        <h4 className="font-extrabold text-slate-800 text-sm mb-1.5 line-clamp-1">{product.name}</h4>
                        <div className="flex gap-2 items-center mb-1">
                           <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold tracking-widest uppercase border border-slate-200/50">Stok: {product.stock} | Terjual: {terjual}</span>
                           <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-widest ${product.status === 'PO' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>{product.status}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-2xl p-3 grid grid-cols-3 gap-3 border border-slate-100">
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Modal Keluar</p>
                        <p className="font-extrabold text-[10px] text-slate-700 tracking-wider">Rp {(totalModalBarang/1000000).toFixed(1)}Jt</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mb-1">Laba / Item</p>
                        <p className="font-extrabold text-[10px] text-slate-700 tracking-wider">Rp {(labaPerItem/1000).toFixed(0)}Rb</p>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-xl text-center border border-blue-100/50">
                        <p className="text-[8px] text-blue-600 font-extrabold uppercase tracking-widest mb-0.5">Total Laba</p>
                        <p className="font-black text-[10px] text-blue-700 tracking-wider">Rp {totalLabaBarang.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    
                    {/* ACTION BUTTONS (EDIT & DELETE) */}
                    <div className="absolute right-4 top-5 flex flex-col gap-2">
                      <button 
                        onClick={() => openEditProduct(product)}
                        className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors border border-slate-200"
                        title="Edit Barang"
                      >
                        <Edit2 size={16} strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
                        title="Hapus Barang"
                      >
                        <Trash2 size={16} strokeWidth={2.5}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB SYSTEM */}
        {adminTab === 'system' && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
             <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-[0_10px_30px_rgb(0,0,0,0.03)]">
                
                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                  <Lock size={20} className="text-slate-400" strokeWidth={2.5}/>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-widest uppercase">Kunci Keamanan</h3>
                </div>
                <div className="mb-8">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Ubah Sandi Eksekutif (Kosongkan = Tetap)</label>
                  <input 
                    type="password" 
                    value={tempAdminPwd} 
                    onChange={e => setTempAdminPwd(e.target.value)}
                    placeholder="Ketik sandi baru..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all" 
                  />
                </div>

                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                  <Table size={20} className="text-slate-400" strokeWidth={2.5}/>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-widest uppercase">Database Spreadsheet</h3>
                </div>
                <div className="mb-5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Link Master Spreadsheet</label>
                  <textarea 
                    value={tempSheetUrl} 
                    onChange={e => setTempSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-600 p-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-[10px] font-mono h-16 resize-none break-all"
                  />
                </div>
                <div className="mb-8">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">URL API Script (Engine Sinkronisasi)</label>
                  <input 
                    type="text"
                    value={tempApiUrl} 
                    onChange={e => setTempApiUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-mono font-medium transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                  <Cloud size={20} className="text-slate-400" strokeWidth={2.5}/>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-widest uppercase">Penyimpanan Awan</h3>
                </div>
                <div className="mb-8">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Direktori Google Drive (Foto Produk)</label>
                  <input 
                    type="text"
                    value={tempDriveUrl} 
                    onChange={e => setTempDriveUrl(e.target.value)}
                    placeholder="Contoh: 1A2b3C4d5E6f7G..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-mono font-medium transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                  <Percent size={20} className="text-slate-400" strokeWidth={2.5}/>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-widest uppercase">Regulasi Biaya</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tarif Jastip</label>
                    <div className="relative">
                      <input type="number" value={tempFeePct} onChange={e => setTempFeePct(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 pr-8 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tarif Ongkir</label>
                    <input type="number" value={tempOngkir} onChange={e => setTempOngkir(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold" />
                  </div>
                </div>

                <div className="mb-8">
                  <label className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest mb-2 block">Regulasi Gratis Ongkir</label>
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                    <span className="text-xs text-emerald-700 font-bold">Gratis jika beli</span>
                    <input type="number" value={tempMinFree} onChange={e => setTempMinFree(e.target.value)} className="w-16 bg-white border border-emerald-200 text-emerald-700 p-2 rounded-lg focus:outline-none text-sm text-center font-black" />
                    <span className="text-xs text-emerald-700 font-bold">Barang/Lebih</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
                  <Phone size={20} className="text-slate-400" strokeWidth={2.5}/>
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-widest uppercase">Operasional & Finansial</h3>
                </div>
                <div className="mb-5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">No. WhatsApp Pusat (Penerima Nota)</label>
                  <input 
                    type="number"
                    value={tempAdminWa} 
                    onChange={e => setTempAdminWa(e.target.value)}
                    placeholder="Contoh: 6281234567890"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold font-mono"
                  />
                </div>
                <div className="mb-8">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Unggah Barcode QRIS</label>
                  {tempQrisImage && (
                    <div className="relative mb-3 w-32 h-32">
                      <img src={tempQrisImage} className="w-full h-full object-contain bg-white rounded-xl border border-slate-200 shadow-sm p-1" alt="QRIS" />
                      <button onClick={() => setTempQrisImage('')} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 shadow-md"><X size={14} strokeWidth={3}/></button>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if(file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 600; 
                            const scaleSize = MAX_WIDTH / img.width;
                            canvas.width = MAX_WIDTH;
                            canvas.height = img.height * scaleSize;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            setTempQrisImage(canvas.toDataURL('image/jpeg', 0.8));
                          };
                          img.src = ev.target.result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[10px] text-slate-500 file:mr-3 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-[10px] file:font-extrabold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer border border-dashed border-slate-300 rounded-xl p-2" 
                  />
                </div>

                <button onClick={handleSaveSystemSettings} className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl uppercase tracking-widest text-[11px] hover:bg-slate-700 transition-all flex items-center justify-center gap-2 shadow-lg">
                  <Save size={16} strokeWidth={2.5}/> SIMPAN SELURUH KONFIGURASI
                </button>
             </div>
             
             {/* Action Buttons */}
             <div className="grid grid-cols-2 gap-4 mt-6">
                <button onClick={() => syncDataFromGAS(true)} disabled={isSyncing} className={`bg-white border border-blue-200 text-blue-600 p-5 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all shadow-sm ${isSyncing ? 'opacity-50' : 'hover:bg-blue-50 hover:border-blue-300'}`}>
                  <RefreshCw size={24} strokeWidth={2.5} className={isSyncing ? 'animate-spin' : ''}/>
                  <span className="text-[9px] font-extrabold tracking-widest uppercase text-center">
                    {isSyncing ? 'Menyelaraskan...' : 'Tarik Database'}
                  </span>
                </button>

                <button onClick={handleResetSystem} className="bg-white border border-red-200 text-red-500 p-5 rounded-3xl flex flex-col items-center justify-center gap-3 hover:bg-red-50 hover:border-red-300 transition-all shadow-sm">
                  <AlertTriangle size={24} strokeWidth={2.5}/>
                  <span className="text-[9px] font-extrabold tracking-widest uppercase text-center">Reset ke Pabrik</span>
                </button>
             </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER: MODAL TAMBAH & EDIT BARANG (CRUD)
  // ==========================================
  const renderProductFormModal = () => {
    if (!showProductModal) return null;

    const isEditing = !!editingProduct;

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
            setProductForm(prev => ({ ...prev, image: compressedBase64 }));
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    const handleGenerateAI = async () => {
      if(!productForm.name && !imagePreview) return alert("Mohon masukkan foto atau ketik nama barang terlebih dahulu agar AI bisa menganalisa.");
      
      setIsGeneratingAI(true);
      
      if (apiUrl && apiUrl !== DEFAULT_API_URL && apiUrl !== "") {
        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({ action: 'ai_description', text: productForm.name || "Buatkan nama mewah untuk barang jastip." })
          });
          const data = await res.json();
          if (data.ai_result) {
              setProductForm(prev => ({ ...prev, name: data.ai_result }));
          }
        } catch(e) {
           console.error("AI gagal terkoneksi", e);
        }
      } else {
        setTimeout(() => {
           const enhancedName = productForm.name ? `[LUXURY] ${productForm.name.toUpperCase()} EDITION` : 'Barang Premium Terdeteksi';
           setProductForm(prev => ({
             ...prev,
             name: enhancedName,
             category: prev.category || 'Barang Branded',
             price_sell: prev.price_sell || (Number(prev.price_modal || 0) * 1.5).toString() 
           }));
           alert("✨ AI telah mengoptimalkan detail produk untuk Anda!");
        }, 1500);
      }
      setIsGeneratingAI(false);
    };

    const handleSaveProduct = () => {
      if(!productForm.name || !productForm.price_sell) return alert('PENTING: Nama dan Harga Jual wajib diisi!');
      
      let finalProduct;

      if (isEditing) {
        finalProduct = {
          ...editingProduct,
          name: productForm.name,
          price_modal: Number(productForm.price_modal) || 0,
          price_sell: Number(productForm.price_sell) || 0,
          category: productForm.category || 'Barang Baru',
          status: productForm.status || 'Ready',
          image: productForm.image || editingProduct.image 
        };

        setProducts(products.map(p => p.id === editingProduct.id ? finalProduct : p));
        
        if (apiUrl && apiUrl !== "") {
          fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'editProduct', payload: finalProduct }) }).catch(console.error);
        }
        alert("Pembaruan barang berhasil dikunci!");

      } else {
        finalProduct = {
          id: "LOKAL-" + new Date().getTime().toString(),
          name: productForm.name,
          price_modal: Number(productForm.price_modal) || 0,
          price_sell: Number(productForm.price_sell) || 0,
          stock: 1,
          sold: 0,
          category: productForm.category || 'Barang Baru',
          status: productForm.status || 'Ready',
          image: productForm.image || 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=500&q=80' 
        };

        setProducts([finalProduct, ...products]);
        
        if (apiUrl && apiUrl !== "") {
          fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'addProduct', payload: finalProduct }) }).catch(console.error);
        }
        alert("Barang baru berhasil ditambahkan ke etalase utama!");
      }

      setShowProductModal(false);
    };

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-md sm:rounded-[2rem] rounded-t-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white z-10 relative shadow-sm">
            <h3 className="font-extrabold text-slate-800 tracking-widest uppercase text-sm flex items-center gap-2">
              <Package size={18} className="text-blue-600" strokeWidth={2.5}/> 
              {isEditing ? 'Mode Edit Barang' : 'Entri Barang Baru'}
            </h3>
            <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-red-500 bg-slate-50 p-2 rounded-full transition-colors"><X size={18} strokeWidth={2.5}/></button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar bg-slate-50/50">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Unggah Media Visual</label>
              <div className="flex flex-col gap-4">
                 <div className="flex gap-4 items-center">
                   {imagePreview ? (
                      <img src={imagePreview} className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm bg-slate-50" alt="Preview" />
                   ) : (
                      <div className="w-20 h-20 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <Camera size={24} strokeWidth={1.5} className="mb-1"/><span className="text-[9px] font-bold uppercase">Kosong</span>
                      </div>
                   )}
                   <div className="flex-1">
                     <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={handleImageUploadAndCompress} 
                        className="w-full text-[10px] text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-extrabold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-colors cursor-pointer" 
                     />
                   </div>
                 </div>
                 
                 <button 
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI}
                    className={`w-full py-3 rounded-xl border text-[10px] uppercase tracking-widest font-extrabold flex items-center justify-center gap-2 transition-all shadow-sm ${isGeneratingAI ? 'bg-indigo-50 border-indigo-200 text-indigo-400' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                 >
                    {isGeneratingAI ? <RefreshCw size={14} strokeWidth={2.5} className="animate-spin"/> : <Wand2 size={14} strokeWidth={2.5}/>}
                    {isGeneratingAI ? 'AI Sedang Bekerja...' : 'Auto-Generate via AI Gemini'}
                 </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Produk Eksklusif</label>
                <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold transition-all" placeholder="Contoh: Sepatu Balenciaga..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status Ketersediaan</label>
                  <div className="relative">
                    <select value={productForm.status} onChange={e => setProductForm({...productForm, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold appearance-none cursor-pointer transition-all">
                      <option value="Ready">Ready Stock</option>
                      <option value="PO">Pre-Order (PO)</option>
                    </select>
                    <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Kategori Label</label>
                  <input type="text" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold transition-all" placeholder="Misal: Fashion" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Harga Modal Pokok</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                  <input type="number" value={productForm.price_modal} onChange={e => setProductForm({...productForm, price_modal: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-slate-800 p-3.5 pl-10 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold transition-all" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-2 block">Harga Jual Akhir</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 font-black text-sm">Rp</span>
                  <input type="number" value={productForm.price_sell} onChange={e => setProductForm({...productForm, price_sell: e.target.value})} className="w-full bg-blue-50 border border-blue-200 text-blue-800 p-3.5 pl-10 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 text-sm font-black transition-all" placeholder="0" />
                </div>
              </div>
            </div>
            
          </div>

          <div className="p-6 border-t border-slate-100 bg-white relative z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
             <button onClick={handleSaveProduct} className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl uppercase tracking-widest text-[11px] hover:bg-slate-700 transition-all flex justify-center items-center gap-2 shadow-lg">
                {isEditing ? 'Terapkan Perubahan' : 'Publikasikan ke Etalase'} <Check size={16} strokeWidth={3}/>
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative selection:bg-blue-200">
      <div className="max-w-md mx-auto min-h-screen relative shadow-2xl bg-slate-50 overflow-x-hidden border-x border-slate-200/50">
        {view === 'shop' && renderShopView()}
        {view === 'cart' && renderCartView()}
        {view === 'admin' && renderAdminView()}
        {renderBottomNav()}
        {renderProductFormModal()}
      </div>
    </div>
  );
}
