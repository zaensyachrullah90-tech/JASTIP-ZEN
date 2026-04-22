import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Home, Settings, Plus, Image as ImageIcon, Package, Check, Trash2, ArrowRight, Diamond } from 'lucide-react';

// --- MOCK DATA PREVIEW ---
const initialProducts = [
  { id: '1', name: 'Tas Chanel Classic Flap', price_modal: 85000000, price_sell: 87500000, stock: 2, category: 'Tas Mewah', image: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=500&q=80' },
  { id: '2', name: 'Jam Tangan Rolex Submariner', price_modal: 150000000, price_sell: 155000000, stock: 1, category: 'Jam Tangan', image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=500&q=80' },
  { id: '3', name: 'Parfum Dior Sauvage', price_modal: 2500000, price_sell: 2800000, stock: 5, category: 'Parfum', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=500&q=80' },
];

const mockOrders = [
  { id: 'ORD-001', date: '2026-04-20', customer: 'Bapak Andi', total_modal: 150000000, total_sell: 155000000, fee: 7750000, ongkir: 5000, grand_total: 162755000, status: 'Selesai' },
  { id: 'ORD-002', date: '2026-04-21', customer: 'Ibu Sarah', total_modal: 2500000, total_sell: 2800000, fee: 140000, ongkir: 5000, grand_total: 2945000, status: 'Diproses' },
];

export default function App() {
  const [view, setView] = useState('shop');
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState(mockOrders);
  const [settings, setSettings] = useState({ fee_percent: 0.05, ongkir_flat: 5000 });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Load Cart dari LocalStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('jastip_cart_premium');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  // Simpan Cart ke LocalStorage
  useEffect(() => {
    localStorage.setItem('jastip_cart_premium', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    alert(`${product.name} telah ditambahkan ke keranjang!`);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(item => item.id !== id));

  // --- KOMPONEN NAVIGASI BAWAH (LUXURY) ---
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

  // --- HALAMAN PEMBELI: TOKO ---
  const ShopView = () => (
    <div className="p-5 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-8 mt-6 text-center">
        <h1 className="text-3xl font-serif text-white tracking-widest uppercase flex justify-center items-center gap-2">
          L<Diamond size={20} className="text-amber-400 fill-amber-400/20" />xury <span className="text-amber-400 font-light">Jastip</span>
        </h1>
        <p className="text-xs text-zinc-400 tracking-widest mt-2 uppercase">Jasa Titip Eksklusif</p>
      </div>
      
      <div className="flex flex-col gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-zinc-900/50 backdrop-blur-md border border-white/5 rounded-3xl overflow-hidden shadow-2xl group">
            <div className="relative">
              <img src={product.image} alt={product.name} className="w-full h-56 object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full">
                <span className="text-[10px] text-amber-400 tracking-widest uppercase font-medium">{product.category}</span>
              </div>
            </div>
            <div className="p-5 relative overflow-hidden">
               {/* Subtle glow effect */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
              
              <h3 className="font-serif text-white text-lg leading-tight mb-2">{product.name}</h3>
              <p className="text-amber-400 font-light tracking-wider text-lg mb-5">Rp {product.price_sell.toLocaleString('id-ID')}</p>
              
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

  // --- HALAMAN PEMBELI: KERANJANG ---
  const CartView = () => {
    const subtotalSell = cart.reduce((sum, item) => sum + (item.price_sell * item.qty), 0);
    const feeJastip = subtotalSell * settings.fee_percent;
    const total = subtotalSell + feeJastip + (cart.length > 0 ? settings.ongkir_flat : 0);
    const [showCheckout, setShowCheckout] = useState(false);
    const [buyerName, setBuyerName] = useState('');

    const handleCheckout = () => {
      if (!buyerName) return alert('Mohon masukkan nama lengkap Anda untuk reservasi.');
      
      let message = `*RESERVASI BARU LUXURY JASTIP*\n\nKlien: ${buyerName}\n\n*Detail Pesanan:*\n`;
      cart.forEach(item => {
        message += `▫️ ${item.name} (${item.qty}x)\n  Rp ${(item.price_sell * item.qty).toLocaleString('id-ID')}\n`;
      });
      message += `\nSubtotal: Rp ${subtotalSell.toLocaleString('id-ID')}`;
      message += `\nBiaya Jasa (5%): Rp ${feeJastip.toLocaleString('id-ID')}`;
      message += `\nOngkos Kirim: Rp ${settings.ongkir_flat.toLocaleString('id-ID')}`;
      message += `\n\n*TOTAL TAGIHAN: Rp ${total.toLocaleString('id-ID')}*`;
      
      const waLink = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
      window.open(waLink, '_blank');
      setCart([]); 
      localStorage.removeItem('jastip_cart_premium');
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
        
        {!showCheckout ? (
          <>
            <div className="space-y-4 mb-8">
              {cart.map(item => (
                <div key={item.id} className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 p-4 rounded-3xl flex gap-4 items-center">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-2xl" />
                  <div className="flex-1">
                    <h4 className="font-serif text-white text-sm leading-tight">{item.name}</h4>
                    <p className="text-amber-400 font-light text-xs mt-2 tracking-wider">Rp {item.price_sell.toLocaleString('id-ID')}</p>
                    <p className="text-zinc-500 text-[10px] mt-1 tracking-widest uppercase">Jml: {item.qty}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="p-3 text-zinc-500 hover:text-red-400 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-3">
              <h3 className="text-white font-serif tracking-widest uppercase text-xs mb-4 border-b border-white/10 pb-2">Ringkasan Pesanan</h3>
              <div className="flex justify-between text-zinc-400 text-xs tracking-wider"><span>Subtotal</span> <span>Rp {subtotalSell.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-zinc-400 text-xs tracking-wider"><span>Biaya Jasa</span> <span>Rp {feeJastip.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-zinc-400 text-xs tracking-wider"><span>Ongkos Kirim</span> <span>Rp {settings.ongkir_flat.toLocaleString('id-ID')}</span></div>
              
              <div className="w-full h-px bg-white/10 my-4"></div>
              
              <div className="flex justify-between items-center">
                 <span className="text-white font-serif tracking-widest uppercase text-xs">Total</span> 
                 <span className="text-amber-400 font-light text-lg tracking-wider">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              
              <button onClick={() => setShowCheckout(true)} className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl mt-6 uppercase tracking-widest text-xs hover:bg-amber-400 transition-all flex justify-center items-center gap-2">
                Lanjut Pembayaran <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-amber-500/30 p-6 rounded-3xl flex flex-col items-center text-center animate-in slide-in-from-right-8">
            <Diamond size={32} className="text-amber-400 mb-4 fill-amber-400/20" />
            <h3 className="font-serif text-white tracking-widest uppercase text-lg mb-2">Pembayaran Aman</h3>
            <p className="text-xs text-zinc-400 mb-6 tracking-wide leading-relaxed">Silakan scan kode QRIS di bawah ini untuk menyelesaikan reservasi Anda.</p>
            
            <div className="bg-white p-3 rounded-3xl shadow-2xl mb-6 w-full max-w-[240px]">
               <div className="w-full aspect-square border border-zinc-200 rounded-2xl flex items-center justify-center flex-col text-zinc-400 bg-zinc-50 relative overflow-hidden">
                  <ImageIcon size={48} className="mb-2 text-zinc-300"/>
                  <span className="text-[10px] tracking-widest uppercase text-zinc-500 font-bold z-10 relative">Area Scan QRIS</span>
                  <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] opacity-10 bg-cover bg-center"></div>
               </div>
            </div>
            
            <p className="font-light text-amber-400 text-2xl tracking-wider mb-6">Rp {total.toLocaleString('id-ID')}</p>
            
            <input 
              type="text" placeholder="Nama Lengkap Klien" 
              value={buyerName} onChange={e => setBuyerName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 text-white placeholder-zinc-600 p-4 rounded-2xl mb-6 focus:outline-none focus:border-amber-400 text-sm tracking-wide text-center"
            />

            <button onClick={handleCheckout} className="w-full bg-white text-black font-bold py-4 rounded-2xl uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:bg-amber-400 transition-all flex justify-center items-center gap-2">
              <Check size={16} /> Konfirmasi via WhatsApp
            </button>
            <button onClick={() => setShowCheckout(false)} className="mt-6 text-xs text-zinc-500 hover:text-white tracking-widest uppercase transition-colors">Batal</button>
          </div>
        )}
      </div>
    );
  };

  // --- HALAMAN ADMIN: DASHBOARD ---
  const AdminView = () => {
    const [adminTab, setAdminTab] = useState('analytics');
    const [passwordInput, setPasswordInput] = useState('');

    // --- LOGIKA LOGIN ADMIN ---
    const handleAdminLogin = () => {
      if (passwordInput === 'admin123') { // Sandi default: admin123
        setIsAdminLoggedIn(true);
        setPasswordInput('');
      } else {
        alert('Sandi salah!');
      }
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
      orders.filter(o => o.status === 'Selesai').forEach(order => {
        revenue += order.total_sell;
        capital += order.total_modal;
        totalFee += order.fee;
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
        
        {/* Modern Tabs */}
        <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl mb-8 border border-white/5">
          <button onClick={() => setAdminTab('analytics')} className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'analytics' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Statistik</button>
          <button onClick={() => setAdminTab('products')} className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${adminTab === 'products' ? 'bg-white text-black font-bold shadow-lg' : 'text-zinc-500 hover:text-white'}`}>Inventaris</button>
        </div>

        {adminTab === 'analytics' && (
          <div className="space-y-6 animate-in slide-in-from-left-4">
            {/* Kartu Finansial Mewah */}
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-6 rounded-3xl text-black relative overflow-hidden shadow-[0_10px_40px_rgba(245,158,11,0.2)]">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <h3 className="text-black/70 font-medium text-[10px] tracking-widest uppercase mb-1">Keuntungan Bersih</h3>
              <p className="text-3xl font-light tracking-wide mb-6">Rp {stats.profit.toLocaleString('id-ID')}</p>
              
              <div className="grid grid-cols-2 gap-4 border-t border-black/10 pt-4 mt-2">
                <div>
                  <p className="text-black/60 text-[9px] tracking-widest uppercase mb-1">Modal Diputar</p>
                  <p className="font-bold text-sm tracking-wider">Rp {stats.capital.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-black/60 text-[9px] tracking-widest uppercase mb-1">Total Transaksi</p>
                  <p className="font-bold text-sm tracking-wider">{stats.orders} Pesanan</p>
                </div>
              </div>
            </div>

            {/* Riwayat Pesanan */}
            <h3 className="font-serif text-white text-sm tracking-widest uppercase mt-8 mb-4 border-b border-white/5 pb-2">Pesanan Terbaru</h3>
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-5 rounded-3xl flex justify-between items-center">
                  <div>
                    <p className="font-serif text-white text-sm mb-1">{order.customer}</p>
                    <p className="text-[10px] text-zinc-500 tracking-widest">{order.id}</p>
                    <p className="text-amber-400 font-light text-xs mt-2 tracking-wider">Rp {order.grand_total.toLocaleString('id-ID')}</p>
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
                onClick={() => alert('Fitur tambah barang otomatis dengan AI sedang dikonfigurasi di sisi backend (Google Sheets).')}
                className="w-full bg-transparent border border-amber-400/50 text-amber-400 py-4 rounded-2xl mb-6 text-xs uppercase tracking-widest flex justify-center items-center gap-2 hover:bg-amber-400/10 transition-all"
              >
                <Plus size={16} /> Tambah Barang Baru (Bantuan AI)
            </button>
            
            <div className="space-y-4">
              {products.map(product => (
                <div key={product.id} className="bg-zinc-900/60 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex gap-4">
                  <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-2xl" />
                  <div className="flex-1 pt-1">
                    <h4 className="font-serif text-white text-sm mb-3 line-clamp-1">{product.name}</h4>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Harga Jual</p>
                        <p className="font-light text-xs text-amber-400 tracking-wider">Rp {product.price_sell.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Modal</p>
                        <p className="font-light text-xs text-zinc-300 tracking-wider">Rp {product.price_modal.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
      </div>
    </div>
  );
}
