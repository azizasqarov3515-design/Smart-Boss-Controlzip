import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  useGetProducts,
  useCreateSale,
  useGetCustomers,
  useCreateCustomer,
  type Product,
  type Customer,
  type SaleWithItems,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useColors } from "../hooks/useColors";
import { useSettings } from "../hooks/useSettings";
import {
  autoSelectFormat,
  buildPrintHtml,
  printDoc,
  sharePdf,
  generateReceiptPdfBlob,
  FORMAT_LABELS,
  FORMAT_DESC,
  FORMAT_ICON,
  type PrintFormat,
  type PdfSeller,
} from "../utils/PrintService";

function formatMoney(n: number) {
  return n.toLocaleString("uz-UZ") + " UZS";
}

export function POS() {
  const queryClient = useQueryClient();
  const colors = useColors();
  const [, setLocation] = useLocation();

  // POS State
  const [tab, setTab] = useState<"cart" | "products">("cart");
  const [cart, setCart] = useState<Map<number, { product: Product; quantity: number }>>(new Map());
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState<"all" | "dona" | "kg" | "m">("all");

  // Checkout Modal State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "debt">("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [partialPayment, setPartialPayment] = useState("");
  const [saleError, setSaleError] = useState<string | null>(null);

  // Customer Picker Modal State
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMode, setCustomerMode] = useState<"list" | "create">("list");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("+998 ");
  const [newCustomerTelegramId, setNewCustomerTelegramId] = useState("");

  // Qty Prompt Modal State (for kg/m products)
  const [qtyPromptProduct, setQtyPromptProduct] = useState<Product | null>(null);
  const [qtyPromptValue, setQtyPromptValue] = useState("");
  const [qtyPromptSumma, setQtyPromptSumma] = useState("");

  // Print Modal State
  const [lastSale, setLastSale] = useState<SaleWithItems | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState<PrintFormat>("a5");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [telegramSending, setTelegramSending] = useState(false);

  // Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  const { managerId, role, workerName, username, managerPhone } = useAuth();
  const { settings } = useSettings(managerId);

  const getPdfSeller = (): PdfSeller => {
    if (role === "worker") {
      return { name: workerName ?? "Ishchi", phone: null, isManager: false };
    }
    return {
      name: settings.sellers[0]?.name ?? username ?? "Menejer",
      phone: settings.sellers[0]?.phone ?? managerPhone ?? null,
      isManager: true,
    };
  };

  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useGetProducts();
  const { data: customers, refetch: refetchCustomers, isLoading: customersLoading } = useGetCustomers();

  const { mutate: createCustomer, isPending: creatingCustomer } = useCreateCustomer({
    mutation: {
      onSuccess: (data) => {
        setSelectedCustomer(data);
        setCustomerPickerOpen(false);
        setConfirmOpen(true);
        setNewCustomerName("");
        setNewCustomerPhone("+998 ");
        setNewCustomerTelegramId("");
        refetchCustomers();
      },
      onError: () => {
        alert("Mijozni saqlashda xato yuz berdi");
      },
    },
  });

  const { mutate: createSale, isPending: checkingOut } = useCreateSale({
    mutation: {
      onSuccess: (data: SaleWithItems) => {
        queryClient.invalidateQueries();
        setConfirmOpen(false);
        setSaleError(null);
        setLastSale(data);
        setPrintFormat(autoSelectFormat(data.itemCount));
        setPrintError(null);
        setCart(new Map());
        setTab("cart");
        setPrintModalOpen(true);

        // Automatically send PDF receipt to customer's Telegram if token and customer telegram ID exist
        if (settings.telegramBotToken && selectedCustomer?.telegramId) {
          handleTelegramSend(data, selectedCustomer);
        }
      },
      onError: (err: Error) => {
        setSaleError(err.message || "Sotuv amalga oshmadi");
      },
    },
  });

  // Global Physical Barcode Gun Listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if inputs are focused
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      const currentTime = Date.now();
      
      // If typing speed is fast (< 35ms), it's likely a barcode gun
      if (currentTime - lastKeyTime > 100) {
        buffer = ""; // Clear buffer if delay is too long
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length > 2) {
          handleScanned(buffer);
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products]);

  const addToCart = useCallback(
    (product: Product, qty = 1) => {
      if (product.quantity <= 0) {
        alert(`"${product.name}" mahsulotida stok qolmagan`);
        return;
      }
      setCart((prev) => {
        const next = new Map(prev);
        const existing = next.get(product.id);
        const newQty = Math.round(((existing?.quantity ?? 0) + qty) * 1000) / 1000;
        if (newQty > product.quantity) {
          alert(`Stok yetarli emas. Faqat ${product.quantity} ${product.unit || "dona"} mavjud`);
          return prev;
        }
        next.set(product.id, { product, quantity: newQty });
        return next;
      });
    },
    []
  );

  const setQty = useCallback((productId: number, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(productId);
      if (!item) return prev;
      const rounded = Math.round(qty * 1000) / 1000;
      if (rounded <= 0) {
        next.delete(productId);
      } else if (rounded > item.product.quantity) {
        alert(`Stok yetarli emas. Faqat ${item.product.quantity} ${item.product.unit || "dona"} mavjud`);
      } else {
        next.set(productId, { ...item, quantity: rounded });
      }
      return next;
    });
  }, []);

  const handleScanned = useCallback(
    (data: string) => {
      const barcode = data.trim();
      let found = products?.find((p) => p.barcode === barcode);

      if (!found) {
        const lower = barcode.toLowerCase();
        found = products?.find((p) => p.name.toLowerCase() === lower);
      }

      if (!found) {
        const asId = parseInt(barcode, 10);
        if (!isNaN(asId)) {
          found = products?.find((p) => p.id === asId);
        }
      }

      if (found) {
        addToCart(found);
      } else {
        alert(`"${barcode}" shtrix-kodi bo'yicha mahsulot topilmadi.`);
      }
    },
    [products, addToCart]
  );

  const cartItems = Array.from(cart.values());
  const total = Math.round(cartItems.reduce((s, i) => s + i.product.salePrice * i.quantity, 0) * 100) / 100;

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setSaleError(null);
    setPartialPayment("");
    setConfirmOpen(true);
  };

  const handleConfirmSale = () => {
    if (paymentType === "debt" && !selectedCustomer) {
      setSaleError("Qarzga sotish uchun mijoz tanlanishi shart");
      return;
    }
    const paid = paymentType === "debt"
      ? (partialPayment ? parseFloat(partialPayment.replace(/\s/g, "")) || 0 : 0)
      : undefined;

    createSale({
      data: {
        items: cartItems.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        paymentType,
        customerId: selectedCustomer?.id ?? undefined,
        paidAmount: paid,
      },
    });
  };

  const handlePrint = () => {
    if (!lastSale) return;
    const html = buildPrintHtml(lastSale, settings, selectedCustomer, printFormat, getPdfSeller());
    printDoc(html);
  };

  const handleSharePdf = async () => {
    if (!lastSale) return;
    const html = buildPrintHtml(lastSale, settings, selectedCustomer, printFormat, getPdfSeller());
    const name = `${settings.storeName}-faktura-${lastSale.id}.html`;
    await sharePdf(html, name);
  };

  const getTelegramShareUrl = (saleOverride?: SaleWithItems) => {
    const sale = saleOverride || lastSale;
    if (!sale) return "";
    const receiptUrl = `${window.location.origin}/api/receipt/${sale.id}`;
    const text = `Sizning savdo chekingiz: ${receiptUrl}`;
    return `https://t.me/share/url?url=${encodeURIComponent(receiptUrl)}&text=${encodeURIComponent(text)}`;
  };

  const handleTelegramSend = async (saleOverride?: SaleWithItems, customerOverride?: Customer | null) => {
    const sale = saleOverride || lastSale;
    const customer = customerOverride !== undefined ? customerOverride : selectedCustomer;
    if (!sale) return;

    const targetChatId = customer?.telegramId || settings.telegramChatId;

    if (settings.telegramBotToken && targetChatId) {
      setTelegramSending(true);
      try {
        // 1. Build HTML Invoice
        const html = buildPrintHtml(sale, settings, customer, printFormat, getPdfSeller());
        
        // 2. Generate PDF Blob
        const pdfBlob = await generateReceiptPdfBlob(html);
        
        // 3. Construct FormData for sendDocument API
        const formData = new FormData();
        formData.append("chat_id", targetChatId);
        
        const filename = `faktura-${sale.id}.pdf`;
        formData.append("document", pdfBlob, filename);
        
        const caption = customer?.telegramId
          ? `Hurmatli ${customer.name}, SMARTBOSS do'konidan xaridingiz uchun rahmat!\n\nSavdo hisob-fakturasi (PDF formatda) ilova qilindi.`
          : `Yangi savdo amalga oshirildi!\nSumma: ${formatMoney(sale.totalAmount)}\nTovarlar soni: ${sale.itemCount}`;
        formData.append("caption", caption);

        // 4. Post to Telegram Bot API sendDocument
        const response = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendDocument`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          alert("Chek Telegram orqali mijozga muvaffaqiyatli yuborildi!");
        } else {
          const errData = await response.json();
          console.error("Telegram send error:", errData);
          alert("Chekni yuborib bo'lmadi. Telegram orqali qo'lda ulash oynasini ochamiz.");
          window.open(getTelegramShareUrl(sale), "_blank");
        }
      } catch (err) {
        console.error("Telegram send catch:", err);
        alert("Telegram-ga yuborishda xatolik yuz berdi. Qo'lda ulash oynasini ochamiz.");
        window.open(getTelegramShareUrl(sale), "_blank");
      } finally {
        setTelegramSending(false);
      }
    } else {
      window.open(getTelegramShareUrl(sale), "_blank");
    }
  };

  const closePrintModal = () => {
    setPrintModalOpen(false);
    setLastSale(null);
    setPrintError(null);
    setSelectedCustomer(null);
  };

  const handleQtyPromptConfirm = () => {
    if (!qtyPromptProduct) return;
    const qty = parseFloat(qtyPromptValue.replace(",", "."));
    if (isNaN(qty) || qty <= 0) {
      alert("To'g'ri miqdor kiriting (masalan: 1.5)");
      return;
    }
    addToCart(qtyPromptProduct, qty);
    setQtyPromptProduct(null);
    setQtyPromptValue("");
    setQtyPromptSumma("");
  };

  const handleQtyPromptChange = (val: string) => {
    if (!qtyPromptProduct) return;
    const clean = val.replace(/[^0-9.,]/g, "");
    setQtyPromptValue(clean);
    
    const qty = parseFloat(clean.replace(",", "."));
    if (!isNaN(qty) && qty > 0) {
      setQtyPromptSumma(Math.round(qty * qtyPromptProduct.salePrice).toString());
    } else {
      setQtyPromptSumma("");
    }
  };

  const handleQtyPromptSummaChange = (val: string) => {
    if (!qtyPromptProduct) return;
    const clean = val.replace(/\D/g, "");
    setQtyPromptSumma(clean);
    
    const sum = parseFloat(clean);
    if (!isNaN(sum) && sum > 0 && qtyPromptProduct.salePrice > 0) {
      const qty = Math.round((sum / qtyPromptProduct.salePrice) * 1000) / 1000;
      setQtyPromptValue(qty.toString());
    } else {
      setQtyPromptValue("");
    }
  };

  const filteredProducts = (products ?? []).filter((p) => {
    if (unitFilter !== "all" && p.unit !== unitFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.barcode?.includes(q) ||
      String(p.id).includes(q)
    );
  });

  return (
    <div style={{ paddingBottom: "100px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top Bar Tabs */}
      <div style={{
        display: "flex",
        height: "50px",
        backgroundColor: colors.card,
        borderBottom: `1px solid ${colors.border}`,
        position: "sticky",
        top: 0,
        zIndex: 10
      }}>
        <div
          onClick={() => setTab("cart")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            borderBottom: tab === "cart" ? `3px solid ${colors.primary}` : "none",
            color: tab === "cart" ? colors.primary : colors.mutedForeground
          }}
        >
          <span className="material-icons">shopping_cart</span>
          <span>Savat {cartItems.length > 0 && `(${cartItems.length})`}</span>
        </div>
        <div
          onClick={() => setTab("products")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            borderBottom: tab === "products" ? `3px solid ${colors.primary}` : "none",
            color: tab === "products" ? colors.primary : colors.mutedForeground
          }}
        >
          <span className="material-icons">inventory_2</span>
          <span>Tovarlar</span>
        </div>
        <div
          onClick={() => setScannerOpen(true)}
          style={{
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.primary,
            color: "white",
            cursor: "pointer"
          }}
        >
          <span className="material-icons">qr_code_scanner</span>
        </div>
      </div>

      {/* Cart View */}
      {tab === "cart" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {cartItems.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px", gap: "10px", marginTop: "60px" }}>
              <span className="material-icons" style={{ fontSize: "64px", color: colors.border }}>shopping_cart</span>
              <h3 style={{ fontSize: "16px" }}>Savat bo'sh</h3>
              <p className="text-muted" style={{ fontSize: "13px", textAlign: "center" }}>
                Tovarlar bo'limidan mahsulot qo'shing yoki yuqoridagi skaner tugmasini bosing
              </p>
              <button className="btn-primary" onClick={() => setTab("products")} style={{ marginTop: "10px" }}>
                <span className="material-icons">add</span>
                <span>Tovar tanlash</span>
              </button>
            </div>
          ) : (
            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {cartItems.map(({ product, quantity }) => (
                <div key={product.id} className="card-standard" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <h4 style={{ fontSize: "15px" }}>{product.name}</h4>
                      <p className="text-muted" style={{ fontSize: "12px" }}>{product.brand}</p>
                    </div>
                    <span style={{ fontWeight: 700, color: colors.primary }}>
                      {formatMoney(product.salePrice * quantity)}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        className="btn-secondary"
                        onClick={() => setQty(product.id, quantity - 1)}
                        style={{ padding: "6px 12px" }}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="input-field"
                        value={quantity}
                        onChange={(e) => setQty(product.id, parseFloat(e.target.value) || 0)}
                        style={{ width: "60px", textAlign: "center", padding: "6px" }}
                      />
                      <button
                        className="btn-secondary"
                        onClick={() => setQty(product.id, quantity + 1)}
                        style={{ padding: "6px 12px" }}
                      >
                        +
                      </button>
                      <span className="text-muted" style={{ fontSize: "13px" }}>{product.unit || "dona"}</span>
                    </div>

                    <button
                      className="btn-secondary"
                      onClick={() => setQty(product.id, 0)}
                      style={{ color: "#EF4444", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                    >
                      <span className="material-icons" style={{ fontSize: "18px" }}>delete</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Checkout Panel */}
              <div style={{
                position: "fixed",
                bottom: "65px",
                left: 0,
                right: 0,
                backgroundColor: colors.card,
                borderTop: `1px solid ${colors.border}`,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                zIndex: 5
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700 }}>
                  <span className="text-muted">Umumiy summa:</span>
                  <span>{formatMoney(total)}</span>
                </div>
                <button className="btn-success" onClick={handleCheckout} style={{ width: "100%" }}>
                  <span className="material-icons">check_circle</span>
                  <span>Sotish — {formatMoney(total)}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products list view */}
      {tab === "products" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "16px" }}>
          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: "12px" }}>
            <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground }}>search</span>
            <input
              type="text"
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, brend, barcode or ID..."
              style={{ paddingLeft: "45px" }}
            />
          </div>

          {/* Unit filters */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "10px", marginBottom: "10px" }}>
            {([
              { key: "all", label: "Barchasi", icon: "📦" },
              { key: "dona", label: "Dona", icon: "🔢" },
              { key: "kg", label: "Kg", icon: "⚖️" },
              { key: "m", label: "Metr", icon: "📏" }
            ] as const).filter((ut) => ut.key === "all" || !settings.disabledUnits?.includes(ut.key)).map((ut) => (
              <button
                key={ut.key}
                onClick={() => setUnitFilter(ut.key)}
                className={`btn-secondary ${unitFilter === ut.key ? "active" : ""}`}
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  backgroundColor: unitFilter === ut.key ? colors.primary : colors.card,
                  borderColor: unitFilter === ut.key ? colors.primary : colors.border,
                  color: unitFilter === ut.key ? "white" : colors.foreground,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  flexShrink: 0
                }}
              >
                <span>{ut.icon}</span>
                <span>{ut.label}</span>
              </button>
            ))}
          </div>

          {/* List */}
          {productsLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <div className="spinner" style={{ width: "24px", height: "24px", border: `2px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="card-standard"
                  onClick={() => {
                    if (p.unit === "kg" || p.unit === "m") {
                      setQtyPromptProduct(p);
                    } else {
                      addToCart(p, 1);
                    }
                  }}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                >
                  <div>
                    <h4 style={{ fontSize: "15px" }}>{p.name}</h4>
                    <p className="text-muted" style={{ fontSize: "12px" }}>{p.brand} · Stok: {p.quantity} {p.unit || "dona"}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontWeight: 700, color: colors.primary }}>{formatMoney(p.salePrice)}</span>
                    <div style={{ fontSize: "10px", color: colors.mutedForeground, marginTop: "2px" }}>{p.unit || "dona"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quantity prompt modal */}
      {qtyPromptProduct && (
        <div className="modal-backdrop" onClick={() => setQtyPromptProduct(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h3 style={{ fontSize: "18px", color: colors.foreground, marginBottom: "4px" }}>
              {qtyPromptProduct.name}
            </h3>
            <p className="text-muted" style={{ fontSize: "12px", marginBottom: "16px" }}>
              Sotuv narxi: {formatMoney(qtyPromptProduct.salePrice)} / {qtyPromptProduct.unit}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  Miqdor ({qtyPromptProduct.unit})
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={qtyPromptValue}
                  onChange={(e) => handleQtyPromptChange(e.target.value)}
                  placeholder={`Masalan: 1.5`}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                  Summa (so'm)
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={qtyPromptSumma}
                  onChange={(e) => handleQtyPromptSummaChange(e.target.value)}
                  placeholder="Masalan: 15000"
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button className="btn-secondary" onClick={() => setQtyPromptProduct(null)} style={{ flex: 1 }}>
                  Bekor
                </button>
                <button className="btn-primary" onClick={handleQtyPromptConfirm} style={{ flex: 1 }}>
                  Savatga qo'shish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout confirmation modal */}
      {confirmOpen && (
        <div className="modal-backdrop" onClick={() => { if (!checkingOut) setConfirmOpen(false); }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "90%" }}>
            <div className="sheet-handle"></div>
            <h2 style={{ fontSize: "18px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-icons" style={{ color: colors.primary }}>shopping_cart_checkout</span>
              <span>Sotishni tasdiqlash</span>
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Payment Type */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                {(["cash", "card", "debt"] as const).map((pt) => {
                  const label = pt === "cash" ? "Naqd" : pt === "card" ? "Karta" : "Qarz";
                  const icon = pt === "cash" ? "payments" : pt === "card" ? "credit_card" : "assignment";
                  const active = paymentType === pt;
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPaymentType(pt)}
                      className="btn-secondary"
                      style={{
                        padding: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        backgroundColor: active ? (pt === "debt" ? "#dc2626" : colors.primary) : colors.card,
                        borderColor: active ? (pt === "debt" ? "#dc2626" : colors.primary) : colors.border,
                        color: active ? "white" : colors.foreground,
                        flexDirection: "column",
                        gap: "4px"
                      }}
                    >
                      <span className="material-icons">{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Customer selection */}
              {paymentType === "debt" && !selectedCustomer && (
                <button
                  className="btn-secondary"
                  onClick={() => { setConfirmOpen(false); setCustomerPickerOpen(true); }}
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="material-icons">person_search</span>
                    <span>Qarz oluvchi mijozni tanlang...</span>
                  </div>
                  <span className="material-icons">arrow_forward_ios</span>
                </button>
              )}

              {/* Optional customer attachment for cash/card */}
              {paymentType !== "debt" && !selectedCustomer && (
                <button
                  className="btn-secondary"
                  onClick={() => { setConfirmOpen(false); setCustomerPickerOpen(true); }}
                  style={{ borderStyle: "dashed", width: "100%", justifyContent: "center" }}
                >
                  <span className="material-icons">person_add</span>
                  <span>Mijoz biriktirish (ixtiyoriy)</span>
                </button>
              )}

              {selectedCustomer && (
                <div className="card-standard" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: colors.primary,
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "14px"
                    }}>
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ fontSize: "14px" }}>{selectedCustomer.name}</h4>
                      <p className="text-muted" style={{ fontSize: "11px" }}>{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    style={{ background: "none", border: "none", color: colors.mutedForeground, cursor: "pointer" }}
                  >
                    <span className="material-icons" style={{ fontSize: "18px" }}>close</span>
                  </button>
                </div>
              )}

              {/* Partial Payment for Debt */}
              {paymentType === "debt" && (
                <div style={{ backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: "12px", padding: "12px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "#991B1B", marginBottom: "4px", fontWeight: 500 }}>
                    Hozir to'lanadigan qismi (ixtiyoriy)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={partialPayment}
                    onChange={(e) => setPartialPayment(e.target.value.replace(/\D/g, ""))}
                    placeholder="Masalan: 100000"
                    style={{ backgroundColor: "white", color: "#000", borderColor: "#FCA5A5" }}
                  />
                  {partialPayment && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#991B1B", marginTop: "8px", fontWeight: 600 }}>
                      <span>Qarzga yoziladigan summa:</span>
                      <span>{formatMoney(Math.max(0, total - (parseFloat(partialPayment) || 0)))}</span>
                    </div>
                  )}
                </div>
              )}

              <hr style={{ border: "none", borderTop: `1px solid ${colors.border}` }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 700 }}>
                <span>Jami summa:</span>
                <span>{formatMoney(total)}</span>
              </div>

              {saleError && (
                <div style={{ backgroundColor: "#FEE2E2", color: "#EF4444", padding: "10px", borderRadius: "10px", fontSize: "13px" }}>
                  {saleError}
                </div>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  className="btn-secondary"
                  onClick={() => setConfirmOpen(false)}
                  style={{ flex: 1 }}
                  disabled={checkingOut}
                >
                  Bekor qilish
                </button>
                <button
                  className="btn-success"
                  onClick={handleConfirmSale}
                  style={{ flex: 1 }}
                  disabled={checkingOut}
                >
                  {checkingOut ? "Sotilmoqda..." : "Sotish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Picker Modal */}
      {customerPickerOpen && (
        <div className="modal-backdrop" onClick={() => { setCustomerPickerOpen(false); setConfirmOpen(true); }}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()} style={{ maxHeight: "85%" }}>
            <div className="sheet-handle"></div>
            <h3 style={{ fontSize: "18px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="material-icons" style={{ color: colors.primary }}>people</span>
              <span>Mijoz tanlash</span>
            </h3>

            {/* Mode selection tabs */}
            <div style={{ display: "flex", backgroundColor: colors.muted, borderRadius: "8px", padding: "4px", marginBottom: "14px" }}>
              <button
                onClick={() => setCustomerMode("list")}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: customerMode === "list" ? colors.card : "transparent",
                  color: customerMode === "list" ? colors.foreground : colors.mutedForeground
                }}
              >
                Mavjud mijozlar
              </button>
              <button
                onClick={() => setCustomerMode("create")}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  backgroundColor: customerMode === "create" ? colors.card : "transparent",
                  color: customerMode === "create" ? colors.foreground : colors.mutedForeground
                }}
              >
                Yangi mijoz qo'shish
              </button>
            </div>

            {customerMode === "list" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ position: "relative", marginBottom: "10px" }}>
                  <span className="material-icons" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: colors.mutedForeground }}>search</span>
                  <input
                    type="text"
                    className="input-field"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Qidiruv..."
                    style={{ paddingLeft: "45px" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "300px", overflowY: "auto" }}>
                  {customersLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
                      <div className="spinner" style={{ width: "20px", height: "20px", border: `2px solid ${colors.border}`, borderTopColor: colors.primary, borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                    </div>
                  ) : (
                    (customers ?? [])
                      .filter((c) => !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch))
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCustomer(c);
                            setCustomerPickerOpen(false);
                            setConfirmOpen(true);
                          }}
                          className="card-standard"
                          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        >
                          <div>
                            <h4 style={{ fontSize: "14px" }}>{c.name}</h4>
                            <p className="text-muted" style={{ fontSize: "11px" }}>{c.phone}</p>
                          </div>
                          {c.totalDebt > 0 && (
                            <span style={{ fontSize: "12px", color: "#DC2626", fontWeight: 700 }}>
                              Qarz: {formatMoney(c.totalDebt)}
                            </span>
                          )}
                        </div>
                      ))
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                    Mijoz ismi (majburiy)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    placeholder="Ismi familiyasi..."
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                    Telefon raqami
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={newCustomerPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length < 5) {
                        setNewCustomerPhone("+998 ");
                        return;
                      }
                      const mainDigits = val.slice(5).replace(/\D/g, "");
                      const code = mainDigits.slice(0, 2);
                      const part1 = mainDigits.slice(2, 5);
                      const part2 = mainDigits.slice(5, 7);
                      const part3 = mainDigits.slice(7, 9);
                      let formatted = "+998 ";
                      if (code) formatted += code;
                      if (part1) formatted += " " + part1;
                      if (part2) formatted += " " + part2;
                      if (part3) formatted += " " + part3;
                      setNewCustomerPhone(formatted);
                    }}
                    maxLength={17}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", color: colors.mutedForeground, marginBottom: "4px" }}>
                    Telegram ID raqami
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={newCustomerTelegramId}
                    onChange={(e) => setNewCustomerTelegramId(e.target.value.replace(/\D/g, ""))}
                    placeholder="Masalan: 123456789"
                  />
                </div>

                <button
                  className="btn-primary"
                  disabled={creatingCustomer || !newCustomerName.trim()}
                  onClick={() => {
                    const phone = newCustomerPhone.replace(/[\s+]/g, "");
                    if (phone.length !== 12) {
                      alert("Telefon raqami noto'g'ri");
                      return;
                    }
                    createCustomer({
                      data: {
                        name: newCustomerName.trim(),
                        phone,
                        debtLimit: 0,
                        telegramId: newCustomerTelegramId.trim() || undefined,
                      }
                    });
                  }}
                  style={{ width: "100%", marginTop: "10px" }}
                >
                  {creatingCustomer ? "Saqlanmoqda..." : "Mijozni saqlash va tanlash"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Print / share receipt modal */}
      {printModalOpen && (
        <div className="modal-backdrop" onClick={closePrintModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "rgba(16, 185, 129, 0.05)",
              padding: "16px",
              borderRadius: "14px",
              border: `1.5px solid rgba(16, 185, 129, 0.2)`,
              marginBottom: "16px"
            }}>
              <span className="material-icons" style={{ color: colors.success, fontSize: "28px" }}>check_circle</span>
              <div>
                <h3 style={{ fontSize: "16px", color: colors.foreground }}>Sotuv amalga oshdi!</h3>
                {lastSale && (
                  <p style={{ fontSize: "12px", color: colors.mutedForeground, marginTop: "2px" }}>
                    {lastSale.itemCount} dona mahsulot · {formatMoney(lastSale.totalAmount)}
                  </p>
                )}
              </div>
            </div>

            {/* Print Formats */}
            <p style={{ fontSize: "12px", color: colors.mutedForeground, marginBottom: "8px", fontWeight: 500 }}>
              Chek formatini tanlang:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px", marginBottom: "16px" }}>
              {(["a4", "a5", "thermal"] as const).map((fmt) => {
                const active = printFormat === fmt;
                return (
                  <button
                    key={fmt}
                    onClick={() => setPrintFormat(fmt)}
                    className="btn-secondary"
                    style={{
                      padding: "10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      backgroundColor: active ? `${colors.primary}12` : colors.card,
                      borderColor: active ? colors.primary : colors.border,
                      borderWidth: active ? "2px" : "1px",
                      color: active ? colors.primary : colors.foreground,
                      flexDirection: "column",
                      gap: "4px"
                    }}
                  >
                    <span className="material-icons">{FORMAT_ICON[fmt]}</span>
                    <span>{FORMAT_LABELS[fmt]}</span>
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <button className="btn-primary" onClick={handlePrint} style={{ flex: 1 }}>
                <span className="material-icons">print</span>
                <span>Chop etish</span>
              </button>
              <button className="btn-secondary" onClick={handleSharePdf} style={{ flex: 1, backgroundColor: "#7C3AED", color: "white", border: "none" }}>
                <span className="material-icons">download</span>
                <span>Yuklash</span>
              </button>
            </div>

            {/* Telegram share button */}
            <button
              onClick={() => handleTelegramSend()}
              disabled={telegramSending}
              className="btn-primary"
              style={{
                backgroundColor: "#0088cc",
                color: "white",
                textDecoration: "none",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                boxShadow: "none",
                marginBottom: "12px",
                border: "none",
                cursor: "pointer"
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px" }}>
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>{telegramSending ? "Yuborilmoqda..." : "Telegram orqali yuborish"}</span>
            </button>

            <button className="btn-secondary" onClick={closePrintModal} style={{ width: "100%" }}>
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Manual Scanner Dialog fallback */}
      {scannerOpen && (
        <div className="modal-backdrop" onClick={() => setScannerOpen(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h3 style={{ fontSize: "18px", marginBottom: "12px" }}>Barcode qidirish</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                className="input-field"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Barcode yoki ID raqami..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleScanned(manualBarcode);
                    setManualBarcode("");
                    setScannerOpen(false);
                  }
                }}
              />
              <button
                className="btn-primary"
                onClick={() => {
                  handleScanned(manualBarcode);
                  setManualBarcode("");
                  setScannerOpen(false);
                }}
              >
                Qidirish
              </button>
            </div>
            <p className="text-muted" style={{ fontSize: "11px", marginTop: "10px" }}>
              Maslahat: Jismoniy skaner quroli ulangan bo'lsa, hech qanday tugmani bosmasdan mahsulot shtrix-kodini shunchaki skanerlang, savatga avtomatik qo'shiladi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
export default POS;
