# Mimari kararlar — Faz 0

- Kullanıcının isteği yalnızca Faz 0. Master plandaki Faz 1'e geçiş talimatları uygulanmadı. Kaynak plan proje kökünde bulunamadı; Downloads/FOCUS_CITY_CODEX_MASTER_PLAN.md okundu.
- Mevcut `src/app` Router kökü, `/` ve `/explore` yolları, native/web sekme ayrımı ve splash korundu. Ekran uygulamaları `features/foundation` altında; route dosyaları yalnızca giriş noktasıdır.
- `theme/palette.ts` renklerin tek kaynağıdır. Mevcut `constants/theme.ts` uyumluluk amacıyla renkleri yeniden dışa aktarır; font ve spacing tokenlarını korur. `useTheme` sistem tercihini izler; null tercih açık temaya döner.
- Mevcut ThemedText/ThemedView korunur. Button, Card, Screen, EmptyState ve ErrorState ortak bileşenlerdir. Metin ölçekleme kapatılmaz; buton dokunma alanı en az 48 birimdir.
- Türkçe metinler `localization/tr.ts` içindedir. Şimdilik tek dil var; dil seçimi ve cihaz locale algılama paketi gerekmedi.
- Strict TypeScript ve alias'lar zaten vardı. Erken domain modelleri yerine yalnızca ortak Id/Result sözleşmeleri eklendi.
- Node 24 yerleşik test runner ile saf TypeScript tema kontrastı kontrol edilir. Domain/component test framework'ü ilgili fazda değerlendirilecek. Store, depolama, grafik veya backend paketi eklenmedi.
- `app.json`, native dizinler ve runtime bağımlılık sürümleri korunur. Şablonun kullanılmayan örnek bileşenleri silinmedi. Expo markalı splash/ikonlar ürün görsel tasarımı aşamasına bırakıldı.

## Faz 1 — Odaklanma MVP'si

- Kullanıcının “faz 1 e geç” isteğiyle kapsam Faz 1'e genişletildi. Faz 0 kararları yukarıda tarihsel kayıttır. Faz 2 uygulanmaz.
- `/` Odaklan, `/explore` Geçmiş oldu. Özet son oturum kartı olarak Odaklan ekranında ve geçmişte sunulur. Native/web sekme yapısı ve splash korunur. Zamanlayıcı root provider'da yaşar; sekme değişimi onu durdurmaz.
- Hedef süre 15/25/50 veya 1–180 tam dakika. Serbest sürenin özel hedef süre biçimi seçildi; hedef olmadan sınırsız sayaç yoktur. Duraklatmanın süre sınırı yoktur; duraklama çalışılmış süreye eklenmez.
- Yalnızca hedefe ulaşan oturum `completed` ve tam hedef kadar `creditedSeconds` alır. Erken bitirme `cancelled` / 0 geçerli saniyedir; tekrar işlem aynı oturumu çoğaltmaz. Ekonomi ve ödül ledger'ı Faz 2'ye aittir. Yerel kayıt kullanıcı kimliği veya doğrulanmış çalışma iddiası içermez.
- `elapsedMs` tam sayı milisaniye; UI kalan saniyeyi yukarı yuvarlar. UTC ISO başlangıç/bitiş ve checkpoint kaydedilir. Bitiş zamanı dönüş anı yerine son aktif segmentin matematiksel sonudur. Aynı runtime içinde foreground süre `performance.now()` farkıyla ölçülür; `setInterval` yalnızca UI yenilemesi sağlar.
- AppState background/inactive olayında checkpoint, active olayında duvar saatine yeniden referans ve uzlaştırma yapılır. Çalışan oturum arka planda/kapanışta ilerler. Process sonlandığında veya cihaz yeniden başladığında UTC checkpoint ile restore edilir. JS arka planda çalışmak zorunda değildir; bitiş uygulama dönünce kayda alınır. Periyodik checkpoint 15 saniyede birdir, saniyelik depolama yazması yoktur.
- UTC saati son checkpoint'in gerisine düşerse earned süre korunarak pause edilir. Kullanıcı açıkça sürdürür. İleri saat atlaması cold start/background dönüşünde gerçek zamandan ayırt edilemez; hedef süreyle sınırlandırılır. Bu MVP anti-fraud veya server verification sağlamaz.
- AsyncStorage 2.2.0 tek yeni runtime bağımlılığıdır; `npx expo install` ile kuruldu. Aktif oturum ve geçmiş tek `@focus-city/focus/v1` JSON zarfındadır. Sürüm, durum, süre, UTC alanları ve ID tekilliği okunurken doğrulanır. Gelecekteki sürüm veya bozuk kayıt üzerine yazılmaz. Faz 0'da uygulama verisi olmadığından eski kayda migration gerekmez.
- Store tek runtime içinde bir yazmayı kabul eder; devam eden yazma sırasında yeni eylem engellenir. Geçiş diske yazılınca publish edilir. Hatalı yazmanın tam aday snapshot'ı retry için bellekte tutulur; kill öncesi yazılamayan eylem garanti edilemez. Hata sessizce başarıya çevrilmez. Webde çoklu tab ve cihazlar arası concurrency bu yerel MVP'nin dışındadır.
- Geçmiş başlangıçta son 20 kayıtla çizilir; “Daha fazla göster” eski kayıtlara erişir. Kayıtlar silinmez. Çok büyük geçmişte tek JSON yerine sorgulanabilir depolama değerlendirilmelidir; şu an saklama kotası hataları kullanıcıya gösterilir.
- Bildirimler Faz 1'de isteğe bağlıdır; bildirim izni, native notification paketi ve arka plan servisi eklenmedi. Otomatik bitişin görülmesi için uygulamaya dönülür. İlk hedef güvenilir oturum kaydıdır.
- Expo streaming web hydration için `useSyncExternalStore` server snapshot'ı başlangıç yükleme durumunda sabittir. AsyncStorage hazır olsa bile ilk hydrate aynı görünümü kullanır; sonrasında client snapshot'a geçilir.

## 29 Ekim 2026 — SDK 58 patch bakımı

- Expo Doctor'ın tespit ettiği patch uyumsuzlukları `npx expo install --fix` ile giderildi. Expo 58.0.21, Router 58.0.28 ve React Native 0.88.1 dahil SDK'nın önerdiği sürümler kullanılıyor; SDK major sürümü aynı kaldı.
- Kurulumun otomatik eklediği `expo-image` config plugin girdisi bu fazda gerekmediği için tutulmadı. `app.json`, oturum kuralları ve kayıt şeması değişmedi. Doctor 20/20 geçti.
- Audit raporu 3 high ve 5 low içeriyor; Zod ve deepmerge kök advisory'leri faz raporunda belgeli. Force fix veya major düşürme uygulanmadı.

## Faz 2 — Saf ekonomi ve sürümlü şehir kaydı

- Kullanıcının “gerekiyorsa faz 2 ye geç” isteğiyle Faz 2 uygulandı. Harita, inşa, araştırma satın alma ve belediye programı UI'si açılmadı.
- `CityState` kalıcı kaynaklar, tam sayı kalıntıları, nüfus, vergi tercihi ve son dönem raporudur. Bina örnekleri/koordinatları sonraki harita fazında ayrı şema ile eklenecek. Hesaplanan altyapı `CityConditions` olarak saf fonksiyonlara verilir. Uygulamada boş altyapı kullanılır; nüfus/vergi/gider 0'dır.
- `creditSession` şehir ve ledger'ı immutable tek sonuç olarak döndürür. Aynı oturum aynı içerikle no-op, çelişen aynı ID hata. İptaller ödeme üretmez. Duvar saati ekonomi motoruna girmez.
- RP bonusu oturum başındaki `rewardBonusBasisPoints` snapshot'ıyla hesaplanır; eski oturumlar ve mevcut boş şehir 0 bonusla işlenir. Periyodik veya sonradan değişen bonus uygulanmaz. Kesirli bonus 1/6.000.000 RP biriminde saklanır; model adı `rpBonusRemainderUnits` gerçek birimi açıklar.
- Coin pay kalanı, temel RP saniye kalanı, bonus birim kalanı ve dönem saniye kalanı ayrı tutulur. Safe integer aşımı veya geçersiz süre/bonus reddedilir. Emek sadece ayrılmamış havuza yazılır; harcama/dağıtım yoktur.
- Oturum bitişi, para/RP/emek, dönemler ve ledger tek `ApplicationSave` version 2 içinde, `@focus-city/save/v2` anahtarında saklanır. UI ancak setItem başarılı olunca hepsini birlikte gösterir. Retry aynı snapshot'ı tekrar yazar; ikinci kez ödül hesaplamaz.
- Önce v2 okunur; yalnızca anahtar yoksa `@focus-city/focus/v1` okunur. V1 tamamlanmış oturumları bir kez temel ödüllendirilir, aktif oturum korunur; süresi dolmuş aktif oturum aynı migration transaction'ında tamamlanıp ödüllenir. Eski byte'lar yedek olarak değiştirilmez. Bozuk v2 için eski v1'e sessiz fallback yoktur.
- Ödül kayıt sırası, geçmiş dizisinin tersidir; değişebilen UTC bitiş zamanına göre sıralanmaz. Saat geri alınsa bile ödül ve kalıntı sırası cold start'ta aynı kalır. V2 yüklenirken CityState/ledger geçmişten replay edilerek doğrulanır. Harcama ve altyapı eklenirken bu sözleşme yeni version ile genişletilmeli.
- Vergi aşağı yuvarlanır. Hizmetler öncelik ve ID sırasıyla bütçeye göre fonlanır; fonlanmayan ID'ler raporlanır, borç/bina silme yoktur. Bu ilk ekonomik prototipte finansman oranı hizmet bonusu ve göç altyapısını ölçekler; mahalle veya tek bina özel kesinti simülasyonu uygulanmadı. Ayrıntılar `docs/balance.md` içinde.
- `/city` yeni şehir özeti rotasıdır. Native/web sekmelerde Odaklan ve Geçmiş korunur. Web navigasyonundaki tekrar eden marka alanı çıkarılarak üç sekmeye alan açıldı. Oturum özetleri gerçek ledger girdisini prop olarak alır; UI iş kuralı hesaplamaz.
- Yeni paket yok; Expo config ve runtime sürümleri bu fazda değiştirilmedi. Yerel ledger sunucu doğrulaması veya sosyal sıralama güvenliği değildir.

## Faz 3 — 2D yerleşim prototipi

- Kullanıcının “faz 3 e geçelim” isteğiyle 12×12 top-down debug grid eklendi. Başlangıç açık arazi 8×8 (x/y 2–9); (4,4)'te tek ücretsiz 3×3 belediye bulunur. Belediye sabit kök, para kaynağı veya tamamlanmış oyun döngüsü değildir.
- Bina tanımları `domain/map/catalog.ts`, örnek/footprint/bağlantı kuralları `placement.ts`, harita olayları ve harcamaların replay'i `world.ts` içindedir. UI veya saat bağımlılığı yoktur.
- Konut/park/santral planları katalog fiyatını onayda harcar. Construction statüsü ve hedef süre saklanır; emek yatırımı, tamamlanma, nüfus/enerji/hizmet aktivasyonu yapılmaz. Bina satın alma ile tamamlanması ayrı tutuldu.
- Yollar ve plan taşıma maliyeti bu prototipte 0 olarak açıkça seçildi. Her ikisi de önizleme ve onay gerektirir. Belediye taşınamaz; başka bina taşıma kendi eski alanını yok sayarak bütün footprint'i doğrular.
- Yol bağlantısı dört yönlü BFS ile belediye footprint'inden türetilir. Yol ve yapı köşe teması bağlantı değildir; kaldırma/taşıma sonrası uyarı hesaplanır. Bağlantı gereksinimi satın almayı engellemez, sarı uyarı olarak sunulur.
- Güncel application save version 3 / `@focus-city/save/v3`. v1/v2 anahtarları değişmeden yedek kalır. V2'nin brüt ekonomi doğrulamasından sonra tek belediye ile migration yapılır; v1 doğrudan ödüllendirme üzerinden aynı sonuca geçer.
- Ödeme ve map değişikliği tek snapshot'tır. `afterRewardCount` günlüğü hangi ödüllerin harcamadan önce kullanılabildiğini kaydeder. Replay satın almada o prefix'i kullanır; gelecekteki coin'i geçmişe harcatmaz. Yinelenen ID, bozuk map, katalog veya net bakiye reddedilir. Sonraki focus ödülü eski harcamayı sıfırlamaz.
- Harita ve işlem günlüğü aynı veri kaynağına karşı replay ile doğrulanır. Mevcut plansız hizmet ekonomisi bu fazda değişmez. Gerçek yapı aktivasyonu/gelir/gider entegrasyonu için sonraki şema gerekecek.
- Grid hücreleri 48 birim, 144 hücreyle sınırlı; dar ekranda yatay, sayfada dikey kaydırma kullanılır. Yerleşim tap ile sol üst hücre seçimi ve metinli/renkli önizlemedir; drag/izometrik kamera eklenmedi.
- Gerçek A53 bakiyesi korunur. Pozitif satın alma fixture'ları yalnızca testlerdedir. Yeni paket, sprite veya Expo config değişikliği yoktur. Ayrıntılı sözleşme `docs/map.md`.

## Faz 4 — İzometrik render kararı (29 Ekim 2026)

- Skia SDK 58 desteği incelendi; 12×12 prototip mevcut RN View/responder/Animated ile kuruldu. Yeni paket ve config değişikliği yok. Skia geçişi ölçüm ve asset gereksinimiyle değerlendirilecek.
- Mantıksal grid ve v3 kayıt değişmedi. Projection/inverse, zoom anchor ve pinch/pan fonksiyonları domain/map/projection.ts içinde saf ve test edilebilir; kamera persist edilmez.
- Tür ve üç seviye görsel parametreleri SpriteRegistry içinde; domain seviye 1 kalır. İnşaat overlay'i yalnızca görseldir. Reduce Motion ve app background animasyonu durdurur.
- Yerleşim tek dokunma + önizleme + onaydır; sürükleme kamera pan'ıdır. Bina sürükleyip yerleştirme bu prototipte yoktur.
- Native görünümde gesture boyunca üst sayfa scroll'u kapanır. 2D grid 48 birim hedefli erişilebilir alternatif olarak korunur; React renderer hatası aynı state ile buraya düşer.
- Fiziksel pinch ve yayın/düşük cihaz performansı kabulü açık. Faz 5 başlamadı. Kanıt, performans örneği ve güvenlik sınırları docs/isometric.md içinde.
