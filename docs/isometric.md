# Faz 4 — İzometrik görünüm

## Grafik kararı

SDK 58 Skia desteği incelendi; bu 144 hücrelik prototip mevcut React Native View, responder ve Animated API'leriyle çizildi. Yeni paket, native config veya kayıt migration'ı yoktur. Bu bir Skia POC değildir; Skia ekleme kararı yayın sürümü ölçümü ve daha karmaşık asset ihtiyacına bırakıldı.

`SpriteRegistry` özgün programatik tür renklerini, sembolleri ve üç seviye için yükseklik varyantlarını tanımlar. Kalıcı domain hâlâ seviye 1 destekler; 2/3 çizim parametreleri bu seviyeleri açmaz. İnşaat overlay'i bütün planlarda ortak opacity animasyonu kullanır. Reduce Motion açıkken statiktir, arka planda durur ve unmount'ta temizlenir. Animasyon inşaat süresini veya emeği ilerletmez.

## Koordinat sözleşmesi

Mantıksal hücre köşesi `x,y`; tile 64×32 birimdir:

```text
worldX = (x-y) × 32
worldY = (x+y) × 16
screen = world × zoom + cameraOffset
gridX = worldX/64 + worldY/32
gridY = worldY/32 - worldX/64
```

Hit-test kamerayı geri alır, inverse projection uygular ve floor ile hücreyi seçer. Dışarıdaki veya sonlu olmayan koordinatlar komut üretmez. Hücre merkezleri çizim için `x+0.5,y+0.5` kullanır. İnceleme modunda yükseltilmiş bina görseline dokunmak bina anchor'ını seçer; yerleşimde yalnızca zemin hit-test'i kullanılır.

Kamera geçicidir; onaylanmamış seçim, pan ve zoom kayda yazılmaz. Zoom 0.5–2 aralığındadır ve iki parmağın merkezi altındaki dünya noktasını korur. Parmak sayısı değişince referans yenilenir; pinch veya 8 birim üzeri sürükleme hücre seçimiyle sonuçlanmaz. Harita gesture'ı boyunca üst sayfanın kaydırması durur; harita dışından sayfa kaydırılabilir. Dar ekranda minimum zoom nedeniyle kenarlar kırpılabilir, pan ile erişilir.

## Çizim, önizleme ve fallback

Arazi ve yol indeksleri map değişimine bağlı memoize edilir. Her karede harita sınırı kadar (144) aday dolaşılır; viewport dışındakiler çizilmez. Binalar footprint derinliği ve ID ile sıralanır. Bu basit placeholder sırası karmaşık, iç içe yüksek sprite'lar için genel bir occlusion çözümü değildir.

Önizleme yeşil/geçerli, sarı/uyarılı veya kırmızı/geçersizdir; metin de aynı sonucu açıklar. Preview var olan domain kurallarından gelir. Tek ödeme yolu mevcut store onayıdır. Çizim hatasında error boundary aynı map, seçim ve önizlemeyi 2D grid ile sunar; kullanıcı da her zaman 2D alternatifi seçebilir. Native grafik bağlamı çökmesi veya event handler hataları React error boundary kapsamı değildir.

İzometrik hücreler zoom'a göre küçük olabilir; ekran okuyucu ve büyük dokunma hedefleri için 48×48 birim hücre düğmeli 2D grid esastır. Kamera düğmeleri ortak erişilebilir Button bileşenidir. Renk tek bilgi kaynağı değildir.

## Kanıt ve sınırlar

A53 üzerinde aynı (2,2) hücresi %50, %78 ve pan sonrasında doğru seçildi. 100 paralık konut önizlemesi kırmızı/disabled onay verdi; iptal sonrası gerçek bakiye 4 kaldı. Önceki (3,4) yol ve belediye cold reload sonrası korunuyor. Ekran: `screenshots/phase4-a53-isometric.png`.

Expo Go geliştirme oturumunda `dumpsys gfxinfo` örneği: 443 frame, %9.71 janky; p50 9 ms, p90 17 ms, p95 27 ms, p99 48 ms. Örnek uygulama açılışı, kontroller ve harita etkileşimlerini kapsar; JS FPS veya yayın sürümü benchmark'ı değildir. Takılmalar bulunduğu için düşük seviye cihaz/yayın performansı kabulü açık kalır.

Fiziksel iki parmak pinch, TalkBack, iOS, gerçek web gesture'ları, farklı bina türlerinin canlı animasyonu ve error boundary'ye kasıtlı hata enjeksiyonu doğrulanmadı. Ücretli bina oluşturmak için gerçek kayda fixture eklenmedi. Pinch merkezi, scale sınırları ve bozuk sayısal girdiler saf fonksiyon testleriyle doğrulandı.

## Güvenlik incelemesi

İncelenen yüzey: gesture sayıları → geçici kamera/seçim → mevcut önizleme/onay/store. Kamera hiçbir ekonomik değere yazmaz; yerel domain/kayıt doğrulaması korunur. Yeni ağ, gizli anahtar, izin veya bağımlılık yoktur. Mevcut çift onay, yazma hatası/retry ve bozuk kayıt regresyonları çalıştırıldı. Bu çalışma manuel kod incelemesi ve testtir; resmî Codex Security taraması değildir.

## Dokümanlar

- [SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [SDK 58 Skia](https://docs.expo.dev/versions/v58.0.0/sdk/skia/)
- [Responder yaşam döngüsü](https://reactnative.dev/docs/gesture-responder-system)
- [Animated](https://reactnative.dev/docs/animated)
- [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo)
