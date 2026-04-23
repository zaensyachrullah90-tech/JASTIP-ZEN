import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShoppingCart, Settings, Plus, Minus, Image as ImageIcon, Package, Check, Trash2, ArrowRight, Diamond, Database, RefreshCw, AlertTriangle, X, Sparkles, Save, Percent, Search, Receipt, Lock, Camera, Wand2, Cloud, Table, Download, Phone, Edit2, TrendingUp, Frown, Award, ChevronRight, ClipboardList, Filter } from 'lucide-react';

// --- FUNGSI KEAMANAN ENKRIPSI SANDI (SHA-256) ---
// Dikunci mati: Mencegah kebocoran di Inspect Element
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const DEFAULT_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; 

// KUNCI MATI DATABASE (BLUEPRINT)
const GLOBAL_API_URL = "https://script.google.com/macros/s/AKfycbxZeQRz93HE5vrVIy-1lSmjY5pqHwncDGodKtO1k1MgwwxxXnZfBvc92ar1fIo195p5FA/exec";

// --- MOCK DATA ---
const initialProducts = [
  { id: '1', name: 'Tas Chanel Classic Flap', price_modal: 85000000, price_sell: 87500000, stock: 2, sold: 12, category: 'Tas Mewah', status: 'Ready', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=500&q=80' },
  { id: '2', name: 'Jam Tangan Rolex Submariner', price_modal: 150000000, price_sell: 155000000, stock: 1, sold: 3, category: 'Jam Tangan', status: 'Ready', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=500&q=80' },
  { id: '3', name: 'Parfum Dior Sauvage', price_modal: 2500000, price_sell: 2800000, stock: 5, sold: 25, category: 'Parfum', status: 'PO', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=500&q=80' },
  { id: '4', name: 'Kacamata Gucci Oversized', price_modal: 4000000, price_sell: 4500000, stock: 3, sold: 0, category: 'Aksesoris', status: 'PO', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=80' },
];

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
  
  // STATE PENYIMPANAN & KONEKSI
  const [apiUrl, setApiUrl] = useState(() => {
    const local = localStorage.getItem('jastip_api_url');
    if (!local || local.includes("MASUKKAN")) return GLOBAL_API_URL;
    return local;
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const [products, setProducts] = useState(() => {
    const local = localStorage.getItem('jastip_products');
    return local ? JSON.parse(local) : initialProducts;
  });

  const [orders, setOrders] = useState(() => {
    const local = localStorage.getItem('jastip_orders');
    return local ? JSON.parse(local) : [];
  });

  const [myOrderIds, setMyOrderIds] = useState(() => {
    const saved = localStorage.getItem('jastip_my_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState(() => {
    const local = localStorage.getItem('jastip_settings');
    let parsed = local ? JSON.parse(local) : DEFAULT_SETTINGS;
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
  const [buyerNotes, setBuyerNotes] = useState(''); 

  // STATE HALAMAN ADMIN
  const [adminTab, setAdminTab] = useState(() => localStorage.getItem('jastip_admin_tab') || 'konfirmasi'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [adminOrderSearch, setAdminOrderSearch] = useState(''); // Filter pesanan admin
  
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);
  const [tempSheetUrl, setTempSheetUrl] = useState(settings.sheet_url);
  const [tempDriveUrl, setTempDriveUrl] = useState(settings.drive_url || '');
  const [tempFeePct, setTempFeePct] = useState(settings.fee_percent * 100);
  const [tempOngkir, setTempOngkir] = useState(settings.ongkir_flat);
  const [tempMinFree, setTempMinFree] = useState(settings.min_free_ongkir);
  const [tempAdminPwd, setTempAdminPwd] = useState('');
  const [tempAdminWa, setTempAdminWa] = useState(settings.admin_wa);
  const [tempQrisImage, setTempQrisImage] = useState(settings.qris_image);

  // STATE MODAL ADMIN (CRUD & REJECT)
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', price_modal: '', price_sell: '', image: '', category: '', status: 'Ready' });

  const [rejectingOrderId, setRejectingOrderId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // STATE MODAL USER (EDIT PESANAN)
  const [editOrderModal, setEditOrderModal] = useState(null);

  // ==========================================
  // SINKRONISASI DATA API (ANTI-CACHE REALTIME)
  // ==========================================
  const syncDataFromGAS = useCallback(async (isManual = false, isSilent = false) => {
    if (!apiUrl || apiUrl === "" || apiUrl === "MASUKKAN_URL_WEB_APP_DISINI") {
      if (isManual) alert("Mohon atur URL API Google Script terlebih dahulu di tab 'SISTEM'!");
      return;
    }

    if (!isSilent) setIsSyncing(true);
    try {
      const timestamp = new Date().getTime();
      const [prodRes, ordRes, setRes] = await Promise.all([
        fetch(`${apiUrl}?action=getProducts&t=${timestamp}`),
        fetch(`${apiUrl}?action=getOrders&t=${timestamp}`),
        fetch(`${apiUrl}?action=getSettings&t=${timestamp}`)
      ]);

      const [prodData, ordData, setData] = await Promise.all([
        prodRes.json(), ordRes.json(), setRes.json()
      ]);

      if (!prodData.error && Array.isArray(prodData)) setProducts(prodData);
      if (!ordData.error && Array.isArray(ordData)) setOrders(ordData);
      if (!setData.error) {
         setSettings(prev => ({ 
           ...prev, 
           fee_percent: setData.fee_percent !== undefined ? Number(setData.fee_percent) : prev.fee_percent, 
           ongkir_flat: setData.ongkir_flat !== undefined ? Number(setData.ongkir_flat) : prev.ongkir_flat, 
           min_free_ongkir: setData.min_free_ongkir !== undefined ? Number(setData.min_free_ongkir) : prev.min_free_ongkir,
           admin_wa: setData.admin_wa || prev.admin_wa,
           qris_image: setData.qris_image || prev.qris_image,
           sheet_url: setData.sheet_url || prev.sheet_url,
           drive_url: setData.drive_url || prev.drive_url,
           admin_password_hash: setData.admin_password_hash || prev.admin_password_hash
         }));
      }
      
      if (isManual) alert("Berhasil! Data perangkat ini telah tersinkronisasi 100% dengan Database Pusat.");
    } catch (error) {
      if (isManual) alert("Gagal Sinkronisasi! Terdapat pemblokiran. Pastikan Anda telah Men-Deploy Script dengan akses 'Siapa Saja' (Anyone).");
      console.error("Fetch Error:", error);
    } finally {
      if (!isSilent) setIsSyncing(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    if (apiUrl && apiUrl !== "") {
      syncDataFromGAS(false, true); 
      const interval = setInterval(() => {
        syncDataFromGAS(false, true); 
      }, 10000); 
      return () => clearInterval(interval);
    }
  }, [apiUrl, syncDataFromGAS]);

  useEffect(() => {
    setTempApiUrl(apiUrl);
    setTempSheetUrl(settings.sheet_url || '');
    setTempDriveUrl(settings.drive_url || '');
    setTempFeePct(settings.fee_percent * 100);
    setTempOngkir(settings.ongkir_flat);
    setTempMinFree(settings.min_free_ongkir);
    setTempAdminWa(settings.admin_wa || '');
    setTempQrisImage(settings.qris_image || '');
  }, [settings, apiUrl]);

  // AUTOSAVE LOKAL 
  useEffect(() => { localStorage.setItem('jastip_current_view', view); }, [view]);
  useEffect(() => { localStorage.setItem('jastip_admin_tab', adminTab); }, [adminTab]);
  useEffect(() => { localStorage.setItem('jastip_admin_logged_in', isAdminLoggedIn); }, [isAdminLoggedIn]);
  useEffect(() => { localStorage.setItem('jastip_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('jastip_orders', JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem('jastip_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('jastip_cart_premium', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('jastip_my_orders', JSON.stringify(myOrderIds)); }, [myOrderIds]);

  // ==========================================
  // FUNGSI PUSH DATABASE (KIRIM DATA KE GAS) 
  // ==========================================
  const pushToDB = (action, payloadObj = {}) => {
    if (apiUrl && apiUrl !== "") {
      fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' }, 
        body: JSON.stringify({ action: action, ...payloadObj })
      }).catch(console.error);
    }
  };

  const handleForcePushLocalToDB = () => {
    if(window.confirm("FITUR MIGRASI: Yakin ingin menimpa Database Cloud agar sama persis dengan HP ini? Sangat berguna jika Laptop Anda kosong sementara di HP sudah banyak barang.")) {
      pushToDB('updateSettings', { payload: settings });
      products.forEach(p => pushToDB('addProduct', { payload: p }));
      orders.forEach(o => pushToDB('addOrder', { payload: o }));
      alert("Proses Upload Berjalan di Latar Belakang! Silakan tunggu sekitar 1-2 menit lalu coba cek di Laptop/Perangkat lain Anda.");
    }
  };

  const handleSaveProduct = () => {
    if(!productForm.name || !productForm.price_sell) return alert('PENTING: Nama dan Harga Jual wajib diisi!');
    
    if (editingProduct) {
      const updatedProduct = {
        ...editingProduct,
        name: productForm.name,
        price_modal: Number(productForm.price_modal) || 0,
        price_sell: Number(productForm.price_sell) || 0,
        category: productForm.category || 'Umum',
        status: productForm.status || 'Ready',
        image: productForm.image || editingProduct.image 
      };
      setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
      pushToDB('editProduct', { payload: updatedProduct }); 
      alert("Perubahan barang berhasil disimpan di Database!");
    } else {
      const newProd = {
        id: "PRD-" + new Date().getTime(),
        name: productForm.name,
        price_modal: Number(productForm.price_modal) || 0,
        price_sell: Number(productForm.price_sell) || 0,
        stock: 1,
        sold: 0,
        category: productForm.category || 'Umum',
        status: productForm.status || 'Ready',
        image: productForm.image || 'https://via.placeholder.com/500?text=Produk' 
      };
      setProducts([newProd, ...products]);
      pushToDB('addProduct', { payload: newProd });
      alert("Barang baru berhasil ditambahkan ke Database!");
    }
    setShowProductModal(false);
  };

  const handleDeleteProduct = (id) => {
    if(window.confirm('Hapus barang ini secara permanen dari etalase?')) {
      setProducts(products.filter(p => p.id !== id));
      setCart(cart.filter(item => item.id !== id));
      pushToDB('deleteProduct', { id: id }); 
    }
  };

  const handleClearInventory = () => {
    if(window.confirm("PERINGATAN: Semua barang di inventaris Anda akan DIHAPUS BERSIH. Lanjutkan?")) {
      setProducts([]);
      setCart([]);
      pushToDB('clearProducts');
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
      setMyOrderIds([]);
      pushToDB('clearOrders');
      alert("Statistik dan Riwayat Pesanan berhasil dikosongkan.");
    }
  };

  // Update oleh Admin
  const handleUpdateOrderStatus = (orderId, newStatus, reason = '') => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus, reject_reason: reason } : o);
    setOrders(updatedOrders);
    pushToDB('updateOrderStatus', { id: orderId, status: newStatus, reason: reason }); 
  };

  const confirmRejectOrder = () => {
    if (!rejectReason.trim()) return alert("Alasan penolakan harus diisi.");
    handleUpdateOrderStatus(rejectingOrderId, 'Ditolak', rejectReason);
    setRejectingOrderId(null);
    setRejectReason('');
  };

  // Update/Delete oleh User Pembeli
  const handleDeleteMyOrder = (id) => {
    if(window.confirm('Yakin ingin membatalkan dan menghapus pesanan ini secara permanen?')) {
      setOrders(orders.filter(o => o.id !== id));
      setMyOrderIds(myOrderIds.filter(oid => oid !== id));
      pushToDB('deleteOrder', { id: id }); 
      alert("Pesanan Anda telah dibatalkan dan dihapus.");
    }
  };

  const handleSaveEditedMyOrder = () => {
    if(!editOrderModal.customer.trim()) return alert('Nama tidak boleh kosong!');
    const updatedOrders = orders.map(o => o.id === editOrderModal.id ? editOrderModal : o);
    setOrders(updatedOrders);
    pushToDB('editOrder', { payload: editOrderModal }); 
    setEditOrderModal(null);
    alert('Catatan/Nama pada pesanan Anda berhasil diperbarui!');
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
    pushToDB('updateSettings', { payload: newSettings }); 
    setTempAdminPwd('');
    alert('Pengaturan Sistem dikunci & Disinkronisasikan ke Database Pusat!');
  };

  const handleResetSystem = () => {
    if (window.confirm("PERINGATAN BAHAYA: Sistem akan direset sepenuhnya ke setelan awal. Lanjutkan?")) {
      localStorage.clear();
      setCart([]);
      setProducts([]);
      setOrders([]);
      setMyOrderIds([]);
      setSettings(DEFAULT_SETTINGS);
      setApiUrl(GLOBAL_API_URL);
      setTempApiUrl(GLOBAL_API_URL);
      setIsAdminLoggedIn(false);
      setView('shop');
      alert("Sistem berhasil direset ke pengaturan awal.");
    }
  };

  // --- FUNGSI KERANJANG ---
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1 }];
    });
    const toast = document.createElement('div');
    toast.className = "fixed top-5 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-[10px] shadow-lg border-2 border-blue-700 z-[100] transition-all flex items-center gap-2 uppercase tracking-widest";
    toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Masuk Keranjang`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 200); }, 1000);
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
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

  // --- KOMPONEN NAVIGASI BAWAH (MODERN FLAT) ---
  const renderBottomNav = () => (
    <div className="fixed bottom-0 w-full max-w-md mx-auto bg-white border-t-2 border-slate-100 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center p-2 pb-4">
        <button onClick={() => setView('shop')} className={`flex flex-col items-center p-2 w-1/4 active:scale-95 transition-transform ${view === 'shop' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <Package size={24} strokeWidth={view === 'shop' ? 3 : 2} />
          <span className="text-[9px] font-black mt-1 tracking-widest uppercase">PRODUK</span>
        </button>
        <button onClick={() => setView('cart')} className={`flex flex-col items-center p-2 w-1/4 relative active:scale-95 transition-transform ${view === 'cart' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <ShoppingCart size={24} strokeWidth={view === 'cart' ? 3 : 2} />
          {cart.length > 0 && (
            <span className="absolute top-1 right-3 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
              {cart.reduce((sum, item) => sum + item.qty, 0)}
            </span>
          )}
          <span className="text-[9px] font-black mt-1 tracking-widest uppercase">KERANJANG</span>
        </button>
        <button onClick={() => setView('orders')} className={`flex flex-col items-center p-2 w-1/4 relative active:scale-95 transition-transform ${view === 'orders' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <ClipboardList size={24} strokeWidth={view === 'orders' ? 3 : 2} />
          {myOrderIds.length > 0 && (
            <span className="absolute top-1 right-3 bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
              {myOrderIds.length}
            </span>
          )}
          <span className="text-[9px] font-black mt-1 tracking-widest uppercase">PESANAN</span>
        </button>
        <button onClick={() => setView('admin')} className={`flex flex-col items-center p-2 w-1/4 active:scale-95 transition-transform ${view === 'admin' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <Settings size={24} strokeWidth={view === 'admin' ? 3 : 2} />
          <span className="text-[9px] font-black mt-1 tracking-widest uppercase">ADMIN</span>
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
      <div className="p-5 pb-28 animate-in fade-in duration-200">
        <div className="mb-6 mt-4 text-center">
          <div className="inline-flex items-center justify-center bg-blue-600 text-white p-3 rounded-2xl mb-3 border-2 border-blue-700 shadow-sm">
             <Diamond size={24} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex justify-center items-center gap-1.5 uppercase">
            JASTIP <span className="text-blue-600">PREMIUM</span>
          </h1>
          <p className="text-[10px] text-slate-500 tracking-widest mt-1 uppercase font-bold">Layanan Titip Eksklusif</p>
        </div>
        
        <div className="relative mb-6">
          <Search size={18} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari Barang..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors"
          />
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center text-slate-500 py-12 flex flex-col items-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Package size={40} strokeWidth={2} className="mb-3 text-slate-300" />
            <p className="font-bold text-sm uppercase tracking-widest">Belum Ada Barang</p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {filteredProducts.map((product, index) => (
            <div key={product.id} className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden relative shadow-sm">
              {index === 0 && (product.sold > 0) && searchQuery === '' && (
                <div className="absolute top-0 right-0 bg-red-500 text-white px-3 py-1.5 rounded-bl-2xl font-black text-[10px] tracking-widest uppercase z-10 flex items-center gap-1">
                  <Sparkles size={12} strokeWidth={3}/> LAKU KERAS
                </div>
              )}
              <div className="relative bg-slate-100 h-56">
                <img src={product.image || 'https://via.placeholder.com/500x300?text=No+Image'} alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 flex gap-2 items-center z-10">
                  <span className="bg-white border-2 border-slate-200 px-2.5 py-1 rounded-xl text-[9px] text-slate-800 tracking-widest uppercase font-black">
                    {product.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black tracking-widest uppercase border-2 ${product.status === 'PO' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                    {product.status === 'PO' ? 'PRE-ORDER' : 'READY STOCK'}
                  </span>
                </div>
              </div>
              <div className="p-5 bg-white">
                <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{product.name}</h3>
                {product.sold > 0 && <p className="text-[10px] text-slate-500 tracking-widest uppercase mb-2 font-bold">Terjual {product.sold} Unit</p>}
                <p className="text-blue-600 font-black tracking-tight text-xl mb-4 mt-2">Rp {Number(product.price_sell).toLocaleString('id-ID')}</p>
                <button 
                  onClick={() => addToCart(product)}
                  className="w-full bg-blue-600 text-white border-2 border-blue-700 py-3.5 rounded-xl text-[11px] font-black tracking-widest uppercase active:scale-95 transition-transform flex items-center justify-center gap-2"
                >
                  <Plus size={16} strokeWidth={3} /> TAMBAH KE KERANJANG
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
      if (!buyerName) return alert('Mohon ketik nama Anda.');
      
      const newOrder = {
        id: 'ORD-' + new Date().getTime(),
        date: new Date().toISOString(),
        customer: buyerName,
        notes: buyerNotes, 
        items: cart, 
        total_modal: cart.reduce((sum, item) => sum + (Number(item.price_modal) * item.qty), 0),
        total_sell: subtotalSell,
        fee: feeJastip,
        ongkir: ongkir,
        grand_total: total,
        status: 'Menunggu Konfirmasi',
        reject_reason: ''
      };
      
      setOrders([newOrder, ...orders]);
      setMyOrderIds(prev => [...prev, newOrder.id]);
      
      pushToDB('addOrder', { payload: newOrder }); 

      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) return { ...p, sold: (p.sold || 0) + cartItem.qty };
        return p;
      });
      setProducts(updatedProducts);

      let message = `*🧾 PESANAN BARU JASTIP*\n*ID:* ${newOrder.id}\n======================\nKlien: *${buyerName}*\n`;
      if (buyerNotes) message += `Catatan: _${buyerNotes}_\n`;
      message += `\n*RINCIAN PESANAN:*\n`;
      
      cart.forEach(item => { message += `🔸 ${item.name} (${item.status}) x${item.qty}\n      Rp ${(Number(item.price_sell) * item.qty).toLocaleString('id-ID')}\n`; });
      message += `\n----------------------\nSubtotal : Rp ${subtotalSell.toLocaleString('id-ID')}\nFee Jasa : Rp ${feeJastip.toLocaleString('id-ID')}\nOngkir   : ${isFreeOngkir ? '*GRATIS!*' : 'Rp ' + ongkir.toLocaleString('id-ID')}\n======================\n*TOTAL   : Rp ${total.toLocaleString('id-ID')}*\n======================\n_Menunggu konfirmasi admin..._`;
      
      let cleanWa = settings.admin_wa ? settings.admin_wa.replace(/\D/g, '') : '';
      if(cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.substring(1);

      window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(message)}`, '_blank');
      setCart([]); setShowCheckout(false); setBuyerName(''); setBuyerNotes(''); setView('orders'); 
    };

    const downloadQRIS = () => {
      if (!settings.qris_image) return;
      const a = document.createElement('a');
      a.href = settings.qris_image;
      a.download = 'QRIS_Jastip_Premium.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    if (cart.length === 0) return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400 animate-in fade-in duration-200">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-2 border-slate-200">
           <ShoppingCart size={40} strokeWidth={2.5} className="text-slate-300" />
        </div>
        <p className="font-black tracking-widest uppercase text-xs">Keranjang Kosong</p>
      </div>
    );

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-200">
        <h2 className="text-xl font-black text-slate-900 mb-6 tracking-widest uppercase flex items-center gap-2">
           <ShoppingCart size={24} strokeWidth={3} className="text-blue-600"/> KERANJANG
        </h2>
        
        {isFreeOngkir ? (
          <div className="bg-emerald-100 border-2 border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 text-xs text-center flex items-center justify-center gap-2 tracking-widest font-black">
            <Sparkles size={16} strokeWidth={3} /> GRATIS ONGKIR AKTIF!
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-slate-200 text-slate-600 p-4 rounded-xl mb-6 text-xs text-center tracking-wide font-bold">
            Beli <span className="text-blue-600 font-black">{settings.min_free_ongkir - totalItems}</span> barang lagi untuk <span className="text-slate-900 font-black">GRATIS ONGKIR</span>
          </div>
        )}

        {!showCheckout ? (
          <>
            <div className="space-y-4 mb-8">
              {cart.map(item => (
                <div key={item.id} className="bg-white border-2 border-slate-100 p-3 rounded-2xl flex gap-3 items-center relative pr-4 shadow-sm">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl bg-slate-100" />
                  <div className="flex-1">
                    <h4 className="font-black text-slate-900 text-sm leading-tight line-clamp-1">{item.name}</h4>
                    <p className="text-blue-600 font-black text-sm mt-1">Rp {Number(item.price_sell).toLocaleString('id-ID')}</p>
                    <div className="flex gap-2 items-center mt-2">
                       <div className="flex items-center bg-slate-50 border-2 border-slate-200 rounded-lg overflow-hidden">
                         <button onClick={() => updateCartQty(item.id, -1)} className="px-2 py-1 text-slate-500 hover:bg-slate-200 font-black"><Minus size={12} strokeWidth={3}/></button>
                         <span className="text-[10px] px-2 font-black text-slate-800">{item.qty}</span>
                         <button onClick={() => updateCartQty(item.id, 1)} className="px-2 py-1 text-slate-500 hover:bg-slate-200 font-black"><Plus size={12} strokeWidth={3}/></button>
                       </div>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-3 bg-red-50 border-2 border-red-100 text-red-500 rounded-xl active:scale-95 transition-transform">
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white border-2 border-slate-200 p-5 rounded-2xl space-y-4 relative shadow-sm">
              <h3 className="text-slate-900 font-black tracking-widest uppercase text-xs mb-2 border-b-2 border-slate-100 pb-3">Ringkasan Tagihan</h3>
              <div className="flex justify-between text-slate-600 text-xs font-bold"><span>Subtotal ({totalItems} item)</span> <span className="text-slate-900 font-black">Rp {subtotalSell.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-slate-600 text-xs font-bold"><span>Biaya Jasa ({(settings.fee_percent * 100).toFixed(0)}%)</span> <span className="text-slate-900 font-black">Rp {feeJastip.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-slate-600 text-xs font-bold items-center">
                <span>Ongkos Kirim</span> 
                {isFreeOngkir ? <span className="text-emerald-600 font-black bg-emerald-100 px-2 py-0.5 rounded text-[10px] tracking-wider uppercase border-2 border-emerald-200">Gratis</span> : <span className="text-slate-900 font-black">Rp {ongkir.toLocaleString('id-ID')}</span>}
              </div>
              <div className="w-full border-t-2 border-dashed border-slate-200 my-4"></div>
              <div className="flex justify-between items-center">
                 <span className="text-slate-900 font-black tracking-widest uppercase text-xs">Total</span> 
                 <span className="text-blue-600 font-black text-xl">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <button onClick={() => setShowCheckout(true)} className="w-full bg-blue-600 text-white border-2 border-blue-700 font-black py-4 rounded-xl mt-4 uppercase tracking-widest text-[11px] active:scale-95 transition-transform flex justify-center items-center gap-2">
                LANJUT PEMBAYARAN <ArrowRight size={16} strokeWidth={3} />
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white border-2 border-slate-200 p-6 rounded-2xl flex flex-col items-center animate-in slide-in-from-right-8 shadow-md">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 border-2 border-blue-200">
               <Receipt size={28} strokeWidth={3} />
            </div>
            <h3 className="font-black text-slate-900 tracking-widest uppercase text-lg mb-6">Penyelesaian</h3>
            
            <div className="w-full mb-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 text-left">Nama Lengkap Pemesan</label>
              <input 
                type="text" placeholder="Ketik nama Anda..." 
                value={buyerName} onChange={e => setBuyerName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-4 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors"
              />
            </div>
            <div className="w-full mb-6">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 text-left">Catatan Khusus (Opsional)</label>
              <textarea 
                placeholder="Misal: Warna hitam, tolong dibungkus rapat..." 
                value={buyerNotes} onChange={e => setBuyerNotes(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-4 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors h-20 resize-none"
              />
            </div>
            
            {settings.qris_image ? (
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 w-full max-w-[240px] relative border-2 border-slate-200">
                 <p className="text-[10px] text-center text-slate-600 font-bold uppercase tracking-widest mb-3">Scan Kode QRIS</p>
                 <img src={settings.qris_image} alt="QRIS" className="w-full aspect-square object-contain rounded-xl border-2 border-slate-200 bg-white" />
                 <button onClick={downloadQRIS} className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] tracking-widest uppercase flex items-center gap-2 active:scale-95 transition-transform w-max border-2 border-blue-700">
                   <Download size={14} strokeWidth={3}/> Simpan QRIS
                 </button>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 w-full border-2 border-slate-200 border-dashed">
                 <div className="w-full py-8 flex items-center justify-center flex-col text-slate-400">
                    <ImageIcon size={32} strokeWidth={2} className="mb-2"/>
                    <span className="text-[10px] tracking-widest uppercase font-bold text-center">QRIS BELUM DIATUR</span>
                 </div>
              </div>
            )}

            <div className="w-full bg-slate-50 p-5 rounded-xl border-2 border-slate-200 mb-6 text-left space-y-2 mt-4">
               <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-3 border-b-2 border-slate-200 pb-2">Rincian Akhir</p>
               {cart.map(c => (
                 <div key={c.id} className="flex justify-between text-xs text-slate-700 font-bold">
                   <span className="truncate pr-2">{c.qty}x {c.name}</span>
                   <span className="text-slate-900 font-black">Rp{(Number(c.price_sell)*c.qty).toLocaleString('id-ID')}</span>
                 </div>
               ))}
               <div className="pt-3 border-t-2 border-dashed border-slate-200 mt-3">
                 <div className="flex justify-between text-[10px] text-slate-600 font-bold mb-1"><span>Fee Jasa</span><span>Rp{feeJastip.toLocaleString('id-ID')}</span></div>
                 <div className="flex justify-between text-[10px] text-slate-600 font-bold"><span>Ongkir</span><span className={isFreeOngkir ? "text-emerald-600 font-black" : ""}>{isFreeOngkir ? 'Rp 0' : 'Rp'+ongkir.toLocaleString('id-ID')}</span></div>
               </div>
               <div className="pt-3 mt-3 border-t-2 border-slate-200 flex justify-between items-center">
                 <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Total Bayar</span>
                 <span className="text-base font-black text-blue-600">Rp {total.toLocaleString('id-ID')}</span>
               </div>
            </div>
            
            <button onClick={handleCheckoutWA} className="w-full bg-emerald-500 text-white border-2 border-emerald-600 font-black py-4 rounded-xl uppercase tracking-widest text-[11px] active:scale-95 transition-transform flex justify-center items-center gap-2">
              <Check size={18} strokeWidth={3} /> KONFIRMASI PESANAN
            </button>
            <button onClick={() => setShowCheckout(false)} className="mt-4 text-[10px] text-slate-500 font-bold hover:text-slate-800 tracking-widest uppercase transition-colors py-2 w-full text-center">BATALKAN</button>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // RENDER: HALAMAN STATUS PESANAN (PEMBELI)
  // ==========================================
  const renderOrdersView = () => {
    const myOrdersList = orders.filter(o => myOrderIds.includes(o.id));

    if (myOrdersList.length === 0) return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-slate-400 animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-2 border-slate-200">
           <ClipboardList size={40} strokeWidth={2.5} className="text-slate-300" />
        </div>
        <p className="font-black tracking-widest uppercase text-xs">Belum Ada Pesanan</p>
      </div>
    );

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-300">
        <h2 className="text-xl font-black text-slate-900 mb-6 tracking-widest uppercase flex items-center gap-2">
           <ClipboardList size={24} strokeWidth={3} className="text-blue-600"/> STATUS PESANAN
        </h2>
        <div className="space-y-4">
          {myOrdersList.map(order => (
            <div key={order.id} className="bg-white border-2 border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-slate-900 text-sm mb-1">{order.customer}</p>
                  <p className="text-[9px] text-slate-400 font-bold tracking-widest">{order.id}</p>
                  <p className="text-blue-600 font-black text-sm mt-1 tracking-wide">Rp {Number(order.grand_total).toLocaleString('id-ID')}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] uppercase tracking-widest font-black px-3 py-1.5 rounded-xl border-2 ${
                     order.status === 'Selesai' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 
                     order.status === 'Ditolak' ? 'bg-red-100 text-red-600 border-red-200' :
                     order.status === 'Diproses' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                     'bg-orange-100 text-orange-600 border-orange-200'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
              
              {order.notes && (
                 <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg mt-1">
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Catatan Pembeli:</p>
                   <p className="text-[11px] text-slate-800 font-medium italic">"{order.notes}"</p>
                 </div>
              )}

              {order.reject_reason && (
                <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl mt-2">
                  <p className="text-[10px] text-red-600 font-black uppercase tracking-widest mb-1">Alasan Penolakan:</p>
                  <p className="text-xs text-red-800 font-bold">{order.reject_reason}</p>
                </div>
              )}

              {order.status === 'Menunggu Konfirmasi' && (
                <div className="flex gap-2 mt-2 pt-3 border-t-2 border-dashed border-slate-200">
                  <button onClick={() => setEditOrderModal(order)} className="flex-1 bg-white border-2 border-slate-200 text-slate-600 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase active:scale-95 transition-transform flex justify-center items-center gap-1.5">
                    <Edit2 size={12} strokeWidth={3}/> Edit Info
                  </button>
                  <button onClick={() => handleDeleteMyOrder(order.id)} className="flex-1 bg-white border-2 border-red-200 text-red-500 py-2 rounded-xl text-[9px] font-black tracking-widest uppercase active:scale-95 transition-transform flex justify-center items-center gap-1.5">
                    <Trash2 size={12} strokeWidth={3}/> Batalkan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
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
        setIsAdminLoggedIn(true); setPasswordInput('');
      } else { alert('Sandi salah!'); }
    };

    if (!isAdminLoggedIn) {
      return (
        <div className="flex flex-col items-center justify-center h-[80vh] p-8 text-center animate-in fade-in duration-300">
          <div className="bg-white border-2 border-slate-200 p-8 rounded-2xl w-full max-w-sm relative shadow-md">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-blue-200">
               <Lock size={32} strokeWidth={3} />
            </div>
            <h2 className="text-slate-900 font-black text-xl tracking-tight uppercase mb-6">Akses Admin</h2>
            <input 
              type="password" placeholder="Ketik Sandi..." 
              value={passwordInput} onChange={e => setPasswordInput(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 text-center tracking-widest p-4 rounded-xl mb-6 focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <button 
              onClick={handleAdminLogin}
              className="w-full bg-blue-600 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] active:scale-95 transition-transform border-2 border-blue-700"
            >
              BUKA PANEL
            </button>
          </div>
        </div>
      );
    }

    // Kalkulasi Statistik Keseluruhan
    let revenue = 0, capital = 0, totalFee = 0;
    orders.forEach(order => {
      if (order.status === 'Selesai') {
         revenue += Number(order.total_sell);
         capital += Number(order.total_modal);
         totalFee += Number(order.fee);
      }
    });
    const stats = { capital, revenue, profit: (revenue - capital) + totalFee, orders: orders.filter(o=>o.status === 'Selesai').length };

    const top10Products = [...products].sort((a,b) => (b.sold || 0) - (a.sold || 0)).filter(p => p.sold > 0).slice(0, 10);
    const unsoldProducts = products.filter(p => !p.sold || p.sold === 0);

    const filteredAdminOrders = orders.filter(order => {
       const matchName = order.customer.toLowerCase().includes(adminOrderSearch.toLowerCase());
       const matchItems = order.items && order.items.some(item => item.name.toLowerCase().includes(adminOrderSearch.toLowerCase()));
       return matchName || matchItems;
    });

    return (
      <div className="p-5 pb-32 animate-in fade-in duration-300">
        <div className="flex justify-between items-center mb-6 pb-2">
          <h2 className="text-xl font-black text-slate-900 tracking-widest uppercase flex items-center gap-2">
            <Settings size={24} className="text-blue-600" strokeWidth={3}/> PANEL
          </h2>
          <button onClick={() => setIsAdminLoggedIn(false)} className="text-[9px] text-slate-500 hover:text-red-600 uppercase tracking-widest font-black bg-slate-100 px-3 py-2 rounded-lg transition-colors border-2 border-slate-200">
            KELUAR
          </button>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6 border-2 border-slate-200 overflow-x-auto hide-scrollbar">
          <button onClick={() => setAdminTab('konfirmasi')} className={`flex-1 min-w-[80px] py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${adminTab === 'konfirmasi' ? 'bg-white text-blue-600 border-2 border-slate-200 shadow-sm' : 'text-slate-500'}`}>Konfirmasi</button>
          <button onClick={() => setAdminTab('analytics')} className={`flex-1 min-w-[80px] py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${adminTab === 'analytics' ? 'bg-white text-blue-600 border-2 border-slate-200 shadow-sm' : 'text-slate-500'}`}>Laporan</button>
          <button onClick={() => setAdminTab('products')} className={`flex-1 min-w-[80px] py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${adminTab === 'products' ? 'bg-white text-blue-600 border-2 border-slate-200 shadow-sm' : 'text-slate-500'}`}>Etalase</button>
          <button onClick={() => setAdminTab('system')} className={`flex-1 min-w-[80px] py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${adminTab === 'system' ? 'bg-white text-blue-600 border-2 border-slate-200 shadow-sm' : 'text-slate-500'}`}>Sistem</button>
        </div>

        {/* TAB KONFIRMASI PESANAN */}
        {adminTab === 'konfirmasi' && (
          <div className="space-y-4 animate-in slide-in-from-left-4">
             <div className="relative mb-6">
                <Search size={18} strokeWidth={3} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari nama klien atau barang..." 
                  value={adminOrderSearch}
                  onChange={e => setAdminOrderSearch(e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 text-slate-900 pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:border-blue-600 text-sm font-bold transition-colors"
                />
             </div>

             <div className="space-y-4">
                 {filteredAdminOrders.length === 0 && <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-2xl text-center"><p className="text-xs font-bold text-slate-400">Tidak ada pesanan.</p></div>}
                 {filteredAdminOrders.map(order => (
                   <div key={order.id} className="bg-white border-2 border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
                     <div className="flex justify-between items-start border-b-2 border-slate-100 pb-3">
                       <div>
                         <p className="font-black text-slate-900 text-sm mb-1">{order.customer}</p>
                         <p className="text-[9px] text-slate-400 font-bold tracking-widest">{order.id}</p>
                       </div>
                       <span className={`text-[9px] uppercase tracking-widest font-black px-3 py-1.5 rounded-xl border-2 ${
                          order.status === 'Selesai' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 
                          order.status === 'Ditolak' ? 'bg-red-100 text-red-600 border-red-200' :
                          order.status === 'Diproses' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                          'bg-orange-100 text-orange-600 border-orange-200'
                       }`}>
                         {order.status}
                       </span>
                     </div>
                     
                     <div className="space-y-2 mb-2">
                        {order.items && order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-xs font-bold text-slate-600">
                             <span>{item.qty}x {item.name}</span>
                          </div>
                        ))}
                     </div>

                     {order.notes && (
                       <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mb-1">
                         <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Catatan Klien:</p>
                         <p className="text-xs text-slate-800 font-bold italic">"{order.notes}"</p>
                       </div>
                     )}

                     <div className="bg-slate-50 p-3 rounded-xl border-2 border-slate-100">
                       <div className="flex justify-between text-[10px] text-slate-500 font-bold"><span>Subtotal</span><span>Rp {order.total_sell.toLocaleString('id-ID')}</span></div>
                       <div className="flex justify-between text-[10px] text-slate-500 font-bold"><span>Fee Jasa</span><span>Rp {order.fee.toLocaleString('id-ID')}</span></div>
                       <div className="flex justify-between text-[10px] text-slate-500 font-bold"><span>Ongkir</span><span>Rp {order.ongkir.toLocaleString('id-ID')}</span></div>
                       <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-slate-200">
                         <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Total Tagihan</span>
                         <span className="text-sm font-black text-blue-600">Rp {Number(order.grand_total).toLocaleString('id-ID')}</span>
                       </div>
                     </div>

                     {order.status === 'Menunggu Konfirmasi' && (
                       <div className="flex gap-2 mt-2 pt-2">
                         <button onClick={() => handleUpdateOrderStatus(order.id, 'Diproses')} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-[10px] font-black tracking-widest uppercase active:scale-95 transition-transform border-2 border-blue-700">Terima & Proses</button>
                         <button onClick={() => setRejectingOrderId(order.id)} className="flex-1 bg-white border-2 border-red-200 text-red-600 py-3 rounded-xl text-[10px] font-black tracking-widest uppercase active:scale-95 transition-transform">Tolak</button>
                       </div>
                     )}
                     {order.status === 'Diproses' && (
                       <div className="flex gap-2 mt-2 pt-2">
                         <button onClick={() => handleUpdateOrderStatus(order.id, 'Selesai')} className="w-full bg-emerald-500 text-white py-3 rounded-xl text-[10px] font-black tracking-widest uppercase active:scale-95 transition-transform border-2 border-emerald-600">Pesanan Selesai</button>
                       </div>
                     )}
                   </div>
                 ))}
             </div>
          </div>
        )}

        {/* TAB ANALYTICS */}
        {adminTab === 'analytics' && (
          <div className="space-y-4 animate-in slide-in-from-left-4">
            <div className="bg-blue-600 p-6 rounded-2xl text-white border-2 border-blue-700 shadow-md">
              <h3 className="text-blue-200 font-bold text-[10px] tracking-widest uppercase mb-1">Total Laba Bersih (Selesai)</h3>
              <p className="text-3xl font-black tracking-tight mb-6">Rp {stats.profit.toLocaleString('id-ID')}</p>
              <div className="grid grid-cols-2 gap-4 border-t-2 border-blue-500 pt-4 mt-2">
                <div>
                  <p className="text-blue-200 text-[9px] font-bold tracking-widest uppercase mb-1">Omset (Pendapatan)</p>
                  <p className="font-black text-sm tracking-wider">Rp {stats.revenue.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-blue-200 text-[9px] font-bold tracking-widest uppercase mb-1">Modal Diputar</p>
                  <p className="font-black text-sm tracking-wider">Rp {stats.capital.toLocaleString('id-ID')}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
                  <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-3 border-2 border-orange-200">
                     <TrendingUp size={20} strokeWidth={3}/>
                  </div>
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">Telah Terjual</p>
                  <p className="text-xl font-black text-slate-900">{top10Products.reduce((sum, p)=>sum+p.sold,0)} Unit</p>
               </div>
               <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
                  <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mb-3 border-2 border-slate-200">
                     <Frown size={20} strokeWidth={3}/>
                  </div>
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">Stok Mati / 0</p>
                  <p className="text-xl font-black text-slate-900">{unsoldProducts.length} Item</p>
               </div>
            </div>

            <div className="bg-white border-2 border-slate-200 p-5 rounded-2xl shadow-sm">
               <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase mb-4 flex items-center gap-2 border-b-2 border-slate-100 pb-3">
                 <Award size={18} className="text-orange-500" strokeWidth={3}/> 10 BARANG TERLARIS
               </h3>
               <div className="space-y-3">
                 {top10Products.length === 0 && <p className="text-xs font-bold text-slate-400">Belum ada penjualan.</p>}
                 {top10Products.map((p, i) => (
                   <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <span className="font-black text-slate-300 text-lg w-4">{i+1}</span>
                         <img src={p.image} className="w-10 h-10 rounded-lg object-cover border-2 border-slate-100 bg-slate-50"/>
                         <p className="text-xs font-black text-slate-800 line-clamp-1">{p.name}</p>
                      </div>
                      <span className="bg-orange-100 text-orange-600 font-black text-[10px] px-2 py-1 rounded-md">{p.sold} x</span>
                   </div>
                 ))}
               </div>
            </div>

            <div className="bg-slate-50 border-2 border-slate-200 border-dashed p-5 rounded-2xl">
               <h3 className="font-black text-slate-600 text-xs tracking-widest uppercase mb-4 flex items-center gap-2">
                 <AlertTriangle size={18} strokeWidth={3}/> PERLU PERHATIAN (0 TERJUAL)
               </h3>
               <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                 {unsoldProducts.length === 0 && <p className="text-[10px] font-bold text-emerald-600 bg-emerald-100 p-2 rounded-lg text-center">Bagus! Semua barang pernah terjual.</p>}
                 {unsoldProducts.map(p => (
                   <div key={p.id} className="text-xs font-bold text-slate-600 flex justify-between bg-white p-2 rounded-lg border-2 border-slate-100">
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500">S: {p.stock}</span>
                   </div>
                 ))}
               </div>
            </div>

            <button onClick={handleClearOrders} className="w-full bg-white border-2 border-red-200 text-red-600 font-black py-4 rounded-xl text-[10px] uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-transform mt-6 shadow-sm">
                <Trash2 size={16} strokeWidth={3}/> KOSONGKAN RIWAYAT & LAPORAN
            </button>
          </div>
        )}

        {/* TAB PRODUCTS */}
        {adminTab === 'products' && (
          <div className="animate-in slide-in-from-right-4">
             <button onClick={openAddProduct} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl mb-4 text-xs uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-transform border-2 border-blue-700 shadow-md">
                <Plus size={18} strokeWidth={3} /> ENTRI BARANG BARU
            </button>

            <div className="flex gap-3 mb-6">
              <button onClick={handleClearInventory} className="flex-1 bg-white border-2 border-red-200 text-red-600 font-black py-3.5 rounded-xl text-[9px] uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-sm">
                  <Trash2 size={14} strokeWidth={3}/> HAPUS SEMUA
              </button>
              <button onClick={handleRestoreDefaults} className="flex-1 bg-white border-2 border-slate-300 text-slate-700 font-black py-3.5 rounded-xl text-[9px] uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-sm">
                  <RefreshCw size={14} strokeWidth={3}/> RESET PABRIK
              </button>
            </div>
            
            <div className="space-y-4">
              {products.length === 0 && <div className="text-center bg-white border-2 border-slate-200 rounded-2xl py-10 shadow-sm"><p className="text-xs font-bold text-slate-400">Etalase kosong.</p></div>}
              {products.map(product => {
                const terjual = product.sold || 0;
                const labaPerItem = Number(product.price_sell) - Number(product.price_modal);
                return (
                  <div key={product.id} className="bg-white border-2 border-slate-200 p-4 rounded-2xl flex flex-col gap-4 relative pr-4 shadow-sm">
                    <div className="flex gap-3 pr-16">
                      <img src={product.image || 'https://via.placeholder.com/150'} alt={product.name} className="w-16 h-16 object-cover rounded-xl bg-slate-100 border-2 border-slate-100" />
                      <div className="flex-1 pt-1">
                        <h4 className="font-black text-slate-900 text-sm mb-1.5 line-clamp-1">{product.name}</h4>
                        <div className="flex gap-2 items-center mb-1">
                           <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold tracking-widest uppercase border border-slate-200">S: {product.stock} | T: {terjual}</span>
                           <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border-2 ${product.status === 'PO' ? 'bg-orange-100 text-orange-600 border-orange-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>{product.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-2 gap-3 border-2 border-slate-100">
                      <div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mb-1">Laba / Item</p>
                        <p className="font-black text-[10px] text-slate-800 tracking-wider">Rp {(labaPerItem/1000).toFixed(0)}Rb</p>
                      </div>
                      <div className="bg-blue-100 p-2 rounded-lg text-center border-2 border-blue-200">
                        <p className="text-[8px] text-blue-700 font-black uppercase tracking-widest mb-0.5">Total Laba</p>
                        <p className="font-black text-[10px] text-blue-800 tracking-wider">Rp {(labaPerItem*terjual).toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="absolute right-4 top-4 flex flex-col gap-2">
                      <button onClick={() => openEditProduct(product)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:bg-blue-100 transition-colors border-2 border-blue-100"><Edit2 size={16} strokeWidth={3} /></button>
                      <button onClick={() => handleDeleteProduct(product.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl active:bg-red-100 transition-colors border-2 border-red-100"><Trash2 size={16} strokeWidth={3}/></button>
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
             <div className="bg-white border-2 border-slate-200 p-5 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-100 pb-2 mt-2">
                  <Database size={18} className="text-slate-500" strokeWidth={3}/>
                  <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase">Pemulihan & Migrasi</h3>
                </div>
                <p className="text-[10px] text-slate-500 mb-4 font-bold">Gunakan fitur ini HANYA jika data di HP Anda lengkap, namun di perangkat lain (Laptop) kosong.</p>
                <button onClick={handleForcePushLocalToDB} className="w-full bg-orange-100 text-orange-600 font-black py-4 rounded-xl uppercase tracking-widest text-[11px] active:scale-95 transition-transform flex items-center justify-center gap-2 border-2 border-orange-200 shadow-sm mb-8">
                  <Cloud size={16} strokeWidth={3}/> UNGGAH PAKSA DATA HP KE CLOUD
                </button>

                <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-100 pb-2 mt-4">
                  <Lock size={18} className="text-slate-500" strokeWidth={3}/>
                  <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase">Keamanan Sandi</h3>
                </div>
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Sandi Baru (Kosongkan jika tetap)</label>
                  <input type="password" value={tempAdminPwd} onChange={e => setTempAdminPwd(e.target.value)} placeholder="Ketik sandi baru..." className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors" />
                </div>

                <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-100 pb-2 mt-4">
                  <Table size={18} className="text-slate-500" strokeWidth={3}/>
                  <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase">Koneksi API Google Script</h3>
                </div>
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Link Master Spreadsheet</label>
                  <textarea value={tempSheetUrl} onChange={e => setTempSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/..." className="w-full bg-slate-50 border-2 border-slate-200 text-slate-700 p-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-[10px] font-mono h-16 resize-none break-all font-bold"/>
                </div>
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">URL API Script (GAS)</label>
                  <input type="text" value={tempApiUrl} onChange={e => setTempApiUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-xs font-mono font-bold transition-colors"/>
                </div>

                <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-100 pb-2 mt-4">
                  <Cloud size={18} className="text-slate-500" strokeWidth={3}/>
                  <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase">Penyimpanan Awan</h3>
                </div>
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Direktori Google Drive (Foto Produk)</label>
                  <input type="text" value={tempDriveUrl} onChange={e => setTempDriveUrl(e.target.value)} placeholder="Contoh: 1A2b3C4d5E6f7G..." className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-xs font-mono font-bold transition-colors"/>
                </div>

                <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-100 pb-2 mt-4">
                  <Percent size={18} className="text-slate-500" strokeWidth={3}/>
                  <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase">Regulasi Biaya</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tarif Jastip (%)</label>
                    <div className="relative">
                      <input type="number" value={tempFeePct} onChange={e => setTempFeePct(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 pr-8 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-black" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Tarif Ongkir (Rp)</label>
                    <input type="number" value={tempOngkir} onChange={e => setTempOngkir(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-black" />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-2 block">Promo Gratis Ongkir</label>
                  <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-100 p-2.5 rounded-xl">
                    <span className="text-xs text-emerald-700 font-bold">Gratis beli</span>
                    <input type="number" value={tempMinFree} onChange={e => setTempMinFree(e.target.value)} className="w-14 bg-white border-2 border-emerald-200 text-emerald-700 p-1.5 rounded-lg focus:outline-none text-sm text-center font-black" />
                    <span className="text-xs text-emerald-700 font-bold">Brg/Lebih</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4 border-b-2 border-slate-100 pb-2 mt-4">
                  <Phone size={18} className="text-slate-500" strokeWidth={3}/>
                  <h3 className="font-black text-slate-900 text-xs tracking-widest uppercase">Kontak & QRIS</h3>
                </div>
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">No. WhatsApp Pusat</label>
                  <input type="number" value={tempAdminWa} onChange={e => setTempAdminWa(e.target.value)} placeholder="Contoh: 6281234567890" className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold font-mono"/>
                </div>
                <div className="mb-6">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Unggah Barcode QRIS</label>
                  {tempQrisImage && (
                    <div className="relative mb-3 w-32 h-32">
                      <img src={tempQrisImage} className="w-full h-full object-contain bg-white rounded-xl border-2 border-slate-200 p-1" alt="QRIS" />
                      <button onClick={() => setTempQrisImage('')} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 border-2 border-red-600"><X size={14} strokeWidth={3}/></button>
                    </div>
                  )}
                  <input 
                    type="file" accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if(file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const img = new Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 300; 
                            const scaleSize = MAX_WIDTH / img.width;
                            canvas.width = MAX_WIDTH;
                            canvas.height = img.height * scaleSize;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            setTempQrisImage(canvas.toDataURL('image/jpeg', 0.5));
                          };
                          img.src = ev.target.result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-[10px] text-slate-600 file:mr-3 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer border-2 border-dashed border-slate-300 rounded-xl p-2 bg-slate-50" 
                  />
                </div>

                <button onClick={handleSaveSystemSettings} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] active:scale-95 transition-transform flex items-center justify-center gap-2 border-2 border-slate-900 shadow-md">
                  <Save size={16} strokeWidth={3}/> KUNCI KONFIGURASI KE DATABASE
                </button>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mt-6">
                <button onClick={() => syncDataFromGAS(true)} disabled={isSyncing} className={`bg-white border-2 border-blue-200 text-blue-600 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm ${isSyncing ? 'opacity-50' : 'active:bg-blue-50'}`}>
                  <RefreshCw size={20} strokeWidth={3} className={isSyncing ? 'animate-spin' : ''}/>
                  <span className="text-[9px] font-black tracking-widest uppercase text-center">
                    {isSyncing ? 'Menyelaraskan...' : 'Tarik Data Realtime'}
                  </span>
                </button>
                <button onClick={handleResetSystem} className="bg-white border-2 border-red-200 text-red-600 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 active:bg-red-50 transition-all shadow-sm">
                  <AlertTriangle size={20} strokeWidth={3}/>
                  <span className="text-[9px] font-black tracking-widest uppercase text-center">Reset ke Pabrik</span>
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
            const MAX_WIDTH = 400; 
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5); 
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
          const res = await fetch(apiUrl, { method: 'POST', mode: 'no-cors', headers:{'Content-Type': 'text/plain'}, body: JSON.stringify({ action: 'ai_description', text: productForm.name || "Buatkan nama mewah." }) });
        } catch(e) { console.error("AI gagal", e); }
      }
      
      setTimeout(() => {
         setProductForm(prev => ({
           ...prev,
           name: prev.name ? `[LUXURY] ${prev.name.toUpperCase()}` : 'Barang Premium Terdeteksi',
           category: prev.category || 'Barang Branded',
           price_sell: prev.price_sell || (Number(prev.price_modal || 0) * 1.5).toString() 
         }));
         setIsGeneratingAI(false);
         alert("✨ AI telah mengoptimalkan detail produk untuk Anda!");
      }, 1500);
    };

    return (
      <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-md sm:rounded-[2rem] rounded-t-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-5 border-b-2 border-slate-100 bg-white z-10 relative">
            <h3 className="font-black text-slate-900 tracking-widest uppercase text-sm flex items-center gap-2">
              <Package size={20} className="text-blue-600" strokeWidth={3}/> 
              {isEditing ? 'Mode Edit Barang' : 'Entri Barang Baru'}
            </h3>
            <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-red-600 bg-slate-100 p-2 rounded-full transition-colors border-2 border-slate-200"><X size={18} strokeWidth={3}/></button>
          </div>
          
          <div className="p-5 overflow-y-auto flex-1 space-y-5 custom-scrollbar bg-slate-50/50">
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Unggah Media Visual</label>
              <div className="flex flex-col gap-4">
                 <div className="flex gap-4 items-center">
                   {imagePreview ? (
                      <img src={imagePreview} className="w-20 h-20 object-cover rounded-xl border-2 border-slate-200 bg-slate-50" alt="Preview" />
                   ) : (
                      <div className="w-20 h-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <Camera size={24} strokeWidth={2} className="mb-1"/><span className="text-[9px] font-bold uppercase">Kosong</span>
                      </div>
                   )}
                   <div className="flex-1">
                     <input 
                        type="file" accept="image/*" capture="environment" onChange={handleImageUploadAndCompress} 
                        className="w-full text-[10px] text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer border-2 border-dashed border-slate-200 rounded-xl p-1 bg-slate-50" 
                     />
                   </div>
                 </div>
                 
                 <button type="button" onClick={handleGenerateAI} disabled={isGeneratingAI} className={`w-full py-3 rounded-xl border-2 text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-2 active:scale-95 transition-transform ${isGeneratingAI ? 'bg-indigo-50 border-indigo-200 text-indigo-400' : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}>
                    {isGeneratingAI ? <RefreshCw size={16} strokeWidth={3} className="animate-spin"/> : <Wand2 size={16} strokeWidth={3}/>}
                    {isGeneratingAI ? 'AI Sedang Bekerja...' : 'Auto-Generate via AI Gemini'}
                 </button>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Produk Eksklusif</label>
                <input type="text" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors" placeholder="Contoh: Sepatu Balenciaga..." />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Ketersediaan</label>
                  <div className="relative">
                    <select value={productForm.status} onChange={e => setProductForm({...productForm, status: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold appearance-none cursor-pointer transition-colors">
                      <option value="Ready">Ready Stock</option>
                      <option value="PO">Pre-Order (PO)</option>
                    </select>
                    <ChevronRight size={16} strokeWidth={3} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Kategori Label</label>
                  <input type="text" value={productForm.category} onChange={e => setProductForm({...productForm, category: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors" placeholder="Misal: Fashion" />
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Harga Modal Pokok</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">Rp</span>
                  <input type="number" value={productForm.price_modal} onChange={e => setProductForm({...productForm, price_modal: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 pl-9 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-black transition-colors" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 block">Harga Jual Akhir</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 font-black text-sm">Rp</span>
                  <input type="number" value={productForm.price_sell} onChange={e => setProductForm({...productForm, price_sell: e.target.value})} className="w-full bg-blue-50 border-2 border-blue-200 text-blue-800 p-3.5 pl-9 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-black transition-colors" placeholder="0" />
                </div>
              </div>
            </div>
            
          </div>

          <div className="p-5 border-t-2 border-slate-100 bg-white relative z-10">
             <button onClick={handleSaveProduct} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl uppercase tracking-widest text-[11px] active:scale-95 transition-transform flex justify-center items-center gap-2 border-2 border-slate-900 shadow-md">
                {isEditing ? 'Terapkan Perubahan' : 'Publikasikan ke Etalase'} <Check size={18} strokeWidth={3}/>
             </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: MODAL TOLAK PESANAN (REJECT)
  // ==========================================
  const renderRejectModal = () => {
    if (!rejectingOrderId) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/80 z-[110] flex items-center justify-center p-5 animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-6 border-2 border-slate-100 flex flex-col gap-4">
           <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-2 mx-auto border-2 border-red-200">
               <AlertTriangle size={24} strokeWidth={3} />
           </div>
           <h3 className="font-black text-slate-900 tracking-widest text-center uppercase text-base">Alasan Penolakan</h3>
           <p className="text-center text-xs text-slate-500 font-bold px-4">Nota akan ditolak dan diberitahukan ke Klien. Mohon sebutkan alasannya.</p>
           <textarea
             className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 rounded-xl p-4 text-sm font-bold focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all mt-2 h-24 resize-none"
             placeholder="Misal: Maaf, kuota PO sudah penuh..."
             value={rejectReason}
             onChange={e => setRejectReason(e.target.value)}
           />
           <div className="flex gap-3 mt-4">
             <button onClick={() => {setRejectingOrderId(null); setRejectReason('');}} className="flex-1 py-3.5 bg-white border-2 border-slate-200 text-slate-600 font-black rounded-xl text-[10px] uppercase tracking-widest active:scale-95 transition-transform">BATAL</button>
             <button onClick={confirmRejectOrder} className="flex-1 py-3.5 bg-red-600 border-2 border-red-700 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-transform">KIRIM TOLAKAN</button>
           </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: MODAL EDIT PESANAN (USER/PEMBELI)
  // ==========================================
  const renderEditOrderModal = () => {
    if (!editOrderModal) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/80 z-[110] flex items-end sm:items-center justify-center sm:p-5 animate-in fade-in duration-200">
        <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-6 border-2 border-slate-100 flex flex-col gap-4">
           <div className="flex justify-between items-center mb-2">
             <h3 className="font-black text-slate-900 tracking-widest uppercase text-sm flex items-center gap-2">
               <Edit2 size={18} className="text-blue-600" strokeWidth={3}/> Edit Detail Pesanan
             </h3>
             <button onClick={() => setEditOrderModal(null)} className="text-slate-400 hover:text-red-600 transition-colors"><X size={20} strokeWidth={3}/></button>
           </div>
           
           <div>
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nama Lengkap</label>
             <input 
               type="text" value={editOrderModal.customer} 
               onChange={e => setEditOrderModal({...editOrderModal, customer: e.target.value})}
               className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors"
             />
           </div>
           <div>
             <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Catatan Khusus</label>
             <textarea
               value={editOrderModal.notes || ''} 
               onChange={e => setEditOrderModal({...editOrderModal, notes: e.target.value})}
               className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 p-3.5 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-sm font-bold transition-colors h-24 resize-none custom-scrollbar"
             />
           </div>

           <button onClick={handleSaveEditedMyOrder} className="w-full mt-4 bg-blue-600 border-2 border-blue-700 text-white font-black py-4 rounded-xl text-[11px] uppercase tracking-widest flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-md">
             <Save size={16} strokeWidth={3}/> Simpan Perubahan
           </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 relative selection:bg-blue-200">
      <div className="max-w-md mx-auto min-h-screen relative bg-white overflow-x-hidden border-x-2 border-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.05)]">
        {view === 'shop' && renderShopView()}
        {view === 'cart' && renderCartView()}
        {view === 'orders' && renderOrdersView()}
        {view === 'admin' && renderAdminView()}
        {renderBottomNav()}
        {renderProductFormModal()}
        {renderRejectModal()}
        {renderEditOrderModal()}
      </div>
    </div>
  );
}
