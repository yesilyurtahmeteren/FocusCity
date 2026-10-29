# Store

`focus-store.ts` oturum + şehir + reward ledger + harita ve işlem günlüğünü tek version 3 zarfta tutar. Focus ve map eylemleri saf domain fonksiyonlarından geçer; tek yazma kilidi, setItem sonrası ortak publish, yükleme koruması ve retry vardır. V1/v2 backup'ları korunarak migration yapılır. Geçersiz harita komutu yazma veya ödeme yapmaz. Saat/storage enjekte edilir; testler React veya gerçek bekleme gerektirmez. Önizleme/seçim UI'da geçicidir. Ek state paketi yoktur.
