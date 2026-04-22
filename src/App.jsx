const API_URL = "https://script.google.com/macros/s/AKfycby7ACCocOywxV3Cx0QEbk2B6Axz7HptgX4zMmi3ApTdcsBxysch0K8xaKkUBgjBkNdtaQ/exec";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_URL}?action=getProducts`);
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error("Gagal load data:", error);
      }
    };
    fetchProducts();
  }, []);
