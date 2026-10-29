# Faz 0 — Proje altyapısı

## Kapsam

Yalnızca Faz 0 uygulandı. Başlangıç ve altyapı ekranları, native/web navigasyon etiketleri, açık/koyu palette, Türkçe metin temeli, ortak Screen/Button/Card/EmptyState/ErrorState, Id/Result tipleri ve katman sınırları hazırlandı. Faz 1 ve sonrası uygulanmadı.

`app.json`, Expo Router entry, SDK/runtime bağımlılıkları, strict TypeScript, typedRoutes, React Compiler, splash ve mevcut native/web navigasyon yapısı korundu. Repo başlangıçta dosyaları staged olarak içeriyordu; staging veya geçmiş üzerinde işlem yapılmadı.

## Geliştirme araçları

ESLint ve SDK uyumlu eslint-config-expo lint için; Prettier format için eklendi. Hepsi geliştirme bağımlılığıdır. Yeni runtime/native bağımlılığı yok. Node 24 yerleşik test runner kullanılır. Format komutu ve kontrolü ayrıdır. Domain test framework'ü henüz eklenmedi.

## Güvenlik

27 Ekim 2026 tarihli başlangıç `npm audit --json`: 3 high, 0 critical. Üç kayıt aynı bağımlılık zincirini temsil eder: `expo → @expo/cli → zod`. Kök advisory: [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), Zod <4.6.6, büyük koleksiyonların doğrulanmasında bellek tüketimi / hizmet reddi.

Bu bulgu geliştirme CLI zincirinde gözlemlendi; mobil bundle'da istismar edilebilirlik kanıtı değildir. Uyarı çözülmüş sayılmıyor. npm'nin önerdiği Expo 54.0.38 sürümüne düşüş SDK 58 hedefini bozar; uygulanmadı. `audit fix --force`, override veya kör güncelleme yapılmadı. Takip: SDK 58 uyumlu Expo CLI düzeltmesini kontrol et; uyum doğrulanınca patch güncellemesi ve audit/doctor/lint/typecheck tekrar çalıştır.

## Manuel cihaz kontrol listesi

- [ ] SDK 58 uyumlu Expo Go / development build ile Android'de açılış ve splash kapanması.
- [ ] Başlangıç → Altyapı butonu ve iki sekme arasında geçiş; Android geri hareketi.
- [ ] Küçük ekran ve büyük sistem yazı boyutunda içerik kaydırma / buton erişimi.
- [ ] Açık/koyu sistem teması, ekran okuyucu etiketleri, metin kontrastı.
- [ ] Çentik, durum çubuğu ve alt sekme alanlarında taşma olmaması.
- [ ] iOS ve web için aynı temel akış.

Gerçek cihaz veya emülatörde UI testi bu teslimde yapılmadı; Android açılış kabul kriteri henüz doğrulanmadı.

## Kontrol sonuçları

- `npm run typecheck`: başarılı, strict TypeScript temiz.
- `npm run lint`: başarılı. Şablondaki web hydration hook'unda effect içinde senkron state güncellemesi yerine SSR snapshot desteği olan `useSyncExternalStore` kullanıldı. Web tab ref tipi React Native 0.88 Pressable sözleşmesiyle düzeltildi; `any` veya lint kuralı kapatma kullanılmadı.
- `npm test`: 2/2 başarılı. İki temada metin/surface ve buton kontrastı en az 4.5:1. Node, CommonJS proje içindeki saf TS dosyalarını ES module olarak yeniden yorumladığı için bilgilendirme uyarısı verir; testleri etkilemez. Sırf bu uyarı için projenin module tipi değiştirilmedi.
- `npm run format:check`: başarılı. `tsconfig.json` yalnızca formatlandı; strict/alias ayarları değişmedi.
- `npx expo install --check`: ağ erişimiyle başarılı, paketler uyumlu. Lock dosyasındaki doğrudan runtime sürümleri başlangıçla aynı.
- `npx expo-doctor`: başlangıçta 20/20 başarılı. Kurulum sonrasında iki tekrar `exp.host` için EAI_AGAIN DNS hatası nedeniyle çevrimiçi Expo config şema kontrolünü tamamlayamadı. Diğer kontroller hata bildirmedi. `app.json` değişmedi; son çevrimiçi şema doğrulaması ağ düzeldiğinde tekrarlanmalı.
- `npm audit --json`: 3 high; kurulumun son audit özeti de aynı. Ayrıntılar yukarıda.
- `npx expo export --platform android --output-dir .expo/phase0-export`: başarılı; 1647 modül, Hermes bytecode üretildi. İlk denemede sandbox geçici dizinine yazma izni engellendi; izinli tekrar başarılı oldu. Export cihaz açılışını doğrulamaz. Çıktı git dışında `.expo` altında tutulur.

## Değişen dosyalar

- `src/app/index.tsx`, `explore.tsx`: ince route girişleri.
- `src/features/foundation/*`: iki altyapı ekranı.
- `src/components/app-tabs.tsx`, `app-tabs.web.tsx`: Türkçe sekmeler ve web ref düzeltmesi.
- `src/components/ui/{button,card,screen,empty-state,error-state}.tsx`: ortak bileşenler.
- `src/theme/palette.ts`, `src/constants/theme.ts`, `src/hooks/use-color-scheme.web.ts`: tema temeli.
- `src/localization/tr.ts`, `src/types/common.ts`: metinler ve ortak tipler.
- `src/{domain,data,services,store}/README.md`: katman sorumlulukları.
- `package.json`, `package-lock.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `tsconfig.json`: araçlar ve format.
- `tests/foundation.test.mjs`, `README.md`, `docs/decisions.md`, bu rapor: doğrulama ve kullanım belgeleri.

## Kabul durumu

- [x] Ölçeklenebilir katman ve route temeli.
- [x] Ortak UI, tema, Türkçe metin ve tip temeli.
- [x] Lint, typecheck ve temel testler temiz.
- [x] Güvenlik bulguları nedenleri ve takip planıyla kayıtlı.
- [ ] Son Expo Doctor çevrimiçi şema kontrolü (DNS erişimi gerekli).
- [ ] Android cihaz açılışı ve manuel UI kontrolleri.

## Sonraki adım

### Devam kontrolü — 27 Ekim 2026

Expo Doctor yeniden çalıştırıldı; `exp.host` için aynı EAI_AGAIN DNS hatası devam ediyor. Çevrimiçi şema kontrolü doğrulanmış sayılmadı. Android araç envanterinde PATH üzerinde `adb` ve varsayılan `%LOCALAPPDATA%/Android/Sdk` altında adb/emulator bulunamadı. Bu ortamda cihaz açılış kontrolü gerçekleştirilemedi; kabul maddesi açık bırakıldı. Faz 1'e geçilmedi.

Cihaz kontrol listesini tamamla. Ayrı bir istekle Faz 1'e başlanabilir: tek aktif odaklanma oturumu, lifecycle/saat politikası, yerel saklama ve geri yükleme, deterministik oturum testleri. Bu teslim bu davranışları içermez.

---

# Faz 1 — Odaklanma MVP'si

27 Ekim 2026: Kullanıcının “faz 1 e geç” isteği üzerine uygulandı. Yukarıdaki Faz 0 kaydı tarihsel rapordur. Faz 2'ye geçilmedi.

## Tamamlanan işler

- Odaklan sekmesinde 15/25/50 dakika ve 1–180 tam dakika özel süre seçimi.
- Tek aktif oturum; başlat, duraklat, sürdür, onayla erken bitir. Hedef dolunca otomatik tamamlanma.
- Son oturum özeti; geçmişte tamamlanan/iptal edilen kayıtlar, tamamlanan oturum sayısı ve toplam geçerli süre.
- Saf TypeScript oturum kuralları; tam sayı milisaniye süreleri, UTC başlangıç/bitiş ve checkpoint, tekrarlı tamamlama koruması.
- Ön planda monotonik süre; AppState checkpoint/rebase; arka plan veya kapatıp açma sonrası UTC üzerinden restore. Duraklatılmış süre ilerlemez.
- AsyncStorage ile sürümlü tek kayıt zarfı; schema/ID doğrulama, yükleme sırasında yazma engeli, eş zamanlı eylem kilidi, yazma sonrası UI commit ve hatada retry.
- Bozuk veya desteklenmeyen kayıt sessizce sıfırlanmaz. Son başarısız eylem bellekte retry için korunur.
- Expo web streaming hydration sırasında ilk snapshot tutarlılığı düzeltildi ve regresyon testi eklendi.

## Değişen / yeni dosyalar

- `src/domain/focus/session.ts`: modeller, süre ve durum geçişleri, decoder.
- `src/store/focus-store.ts`, `src/services/focus-clock.ts`: kalıcı store, tek yazma kilidi, monotonik saat adaptörü.
- `src/features/focus/`: provider/lifecycle, metinler, sayaç, geçmiş, özet ve storage hata durumu.
- `src/app/{_layout,index,explore}.tsx`: provider ve ekran girişleri.
- `src/localization/tr.ts`, `src/components/app-tabs.web.tsx`: sekme etiketleri ve web navigasyonundaki şablon doküman bağlantısının kaldırılması.
- `tsconfig.json`: Node'un saf TS testlerinde kullanılan `.ts` importları için `allowImportingTsExtensions`; strict modu korunur.
- `package.json`, `package-lock.json`: yalnızca AsyncStorage 2.2.0 yeni runtime bağımlılığı.
- `tests/focus.test.mjs`: 18 yeni test; tema testleriyle toplam 20.
- `README.md`, `docs/decisions.md`, katman README'leri, bu rapor ve `docs/screenshots/phase1-web-history.png`.

## Bağımlılık ve araçlar

`npx expo install @react-native-async-storage/async-storage` ile SDK 58'in önerdiği 2.2.0 kuruldu. Gerekçe: process sonlanması ve yeniden açılışta oturum/geçmiş kaydını korumak. Yeni state, timer, tarih, test veya bildirim paketi eklenmedi. `app.json`, Expo/React/React Native sürümleri ve native dizinler değiştirilmedi.

Kaynaklar: [SDK 58](https://docs.expo.dev/versions/v58.0.0/), [SDK 58 AsyncStorage](https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/), [AsyncStorage kullanımı](https://react-native-async-storage.github.io/2.0/Usage/), [AppState](https://reactnative.dev/docs/appstate), [React server snapshot](https://react.dev/reference/react/useSyncExternalStore).

## Çalıştırılan kontroller

| Kontrol                                                               | Sonuç                                                                                                          |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                                                        | Başarılı, hata/uyarı yok                                                                                       |
| `npm run typecheck`                                                   | Başarılı                                                                                                       |
| `npm test`                                                            | 20/20 başarılı                                                                                                 |
| `npm run format:check`                                                | Başarılı                                                                                                       |
| `npx expo install --check`                                            | Dependencies are up to date                                                                                    |
| `npx expo export --platform android --output-dir .expo/phase1-export` | Başarılı; 1661 modül, 3.9 MB Hermes bundle                                                                     |
| `npx expo-doctor`                                                     | Çevrimiçi config şema kontrolü `exp.host` EAI_AGAIN nedeniyle tamamlanamadı; diğer kontroller sorun bildirmedi |
| `npm audit --json`                                                    | Önceki aynı 3 high / 0 critical; `expo → @expo/cli → zod`                                                      |
| `git diff --check`                                                    | Başarılı                                                                                                       |

Node test runner'ın CommonJS projedeki TS modüllerini yorumlaması için bilgilendirme uyarısı devam eder; test hatası değildir. Audit için force fix veya SDK düşürme yapılmadı. Güvenlik takip planı Faz 0 bölümündedir.

## Gerçek web akışının doğrulanması

Expo web geliştirme sunucusunda localhost:8081 üzerinden UI → store → AsyncStorage → yeniden yükleme → UI sınırları kontrol edildi. API/backend bu fazda yoktur.

1. Özel süre 1 dakika seçildi, oturum başlatıldı, birkaç saniye sonra duraklatıldı.
2. Kalan süre 00:57 iken sayfa yenilendi; oturum 00:57 ve duraklatılmış olarak geri geldi.
3. Sürdürüldü ve gerçek süre beklenerek tamamlandı: özet 01:00 geçen / 01:00 geçerli süre gösterdi.
4. 25 dakikalık ikinci oturum başlatıldı, erken bitirme onayı verildi: 00:09 geçen / 00:00 geçerli süreyle iptal edildi.
5. Geçmişte iki kayıt, 1 tamamlanan oturum ve toplam 01:00 doğrulandı. Sayfa yenilenince kayıtlar aynı kaldı.
6. Son temiz reload sonrasındaki browser error/warn logları boştu. İlk denemede bulunan hydration uyuşmazlığı düzeltildi; sabit server snapshot için test eklendi. Kod güncellemesinin Fast Refresh sırasında ürettiği eski context hatası son temiz yüklemede tekrarlanmadı.

Ekran kanıtı gizlilik nedeniyle yalnızca yerelde saklanır; GitHub reposuna dahil değildir.

Bu ekran görüntüsü geliştirme ortamında gerçekten başlatılan test oturumlarını gösterir; uygulamaya fixture veya sahte istatistik eklenmedi. 25 dakikalık tamamlanma gerçek cihazda beklenmedi, sahte saatle saf domain/store testlerinde doğrulandı.

## Kurallar ve bilinen sınırlar

- Tamamlanan oturum yalnızca hedef süresi kadar `creditedSeconds` alır; erken iptal 0. Para, RP veya ödül dağıtımı yoktur; Faz 2'ye aittir.
- Arka planda JS çalışması zorunlu değildir. Bitiş, uygulamaya dönüldüğünde veya yeniden açıldığında hesaplanıp saklanır. Bildirim özelliği isteğe bağlı kapsamdan bu teslimde alınmadı; izin istenmez, notification paketi yoktur.
- Cihaz saati geri alınırsa son checkpoint'teki süre korunarak pause edilir; kullanıcı sürdürür. Cihazın UTC saatini ileri alma, cold start veya background dönüşünde gerçek zamandan ayırt edilemez. Yerel kayıt çalışma kanıtı değildir.
- Veriler yalnızca cihazda, şifrelenmemiş AsyncStorage'dadır. Uygulama verilerinin silinmesi geçmişi siler. Sunucu hesabı, senkronizasyon, leaderboard veya başka cihaza taşıma yoktur.
- Tek aktif oturum garantisi aynı app runtime içindedir. Webde aynı origin'in birden fazla sekmesi arasında yazma kilidi yoktur; tek uygulama sekmesi kullanılmalı.
- Disk yazması başarısız olduğunda eylem başarı olarak gösterilmez. Hata sırasında process sonlandırılırsa yalnızca son başarılı disk snapshot'ı geri gelir. Çok büyük geçmiş için ileride sorgulanabilir depolama değerlendirilmeli; kota hataları retry arayüzüne düşer.
- Android gerçek cihaz/emülatör ve iOS lifecycle testleri yapılmadı. Android SDK/adb bu ortamda bulunmuyor. Bundle üretimi cihaz testinin yerine geçmez.

## Manuel Android kabul listesi

- [ ] SDK 58 uyumlu Expo Go ile `npm start` QR kodunu aç veya AsyncStorage içeren development build kullan.
- [ ] 25 dakika seç → başlat → tamamlanınca yalnızca tek geçmiş kaydı ve 25:00 geçerli süre gör.
- [ ] Çalışan oturumu 1–2 dakika arka plana gönder; dönünce geçen süre doğru olsun.
- [ ] Çalışan uygulamayı process'ten kapatıp aç; süre/tek aktif oturum korunsun. Süre kapalıyken dolmuşsa tek completion kaydı oluşsun.
- [ ] Duraklatılmış oturumu kapatıp aç; kalan süre aynı kalsın. Sürdürülünce kaldığı yerden işlesin.
- [ ] Erken bitir onayından vazgeç; oturum devam etsin. Onayla bitir; iptal ve 0 geçerli süre gör.
- [ ] Uçak modunda aynı akış, büyük yazı, küçük ekran, açık/koyu tema, ekran okuyucu ve sekme/Android geri hareketini kontrol et.

## Kabul durumu ve sonraki adım

- [x] Sayaç ve geçmiş akışı, yerel kalıcılık, tek aktif oturum, idempotent tamamlama.
- [x] Saf testlerde 25 dakika, pause/resume, cold restore, rollback, erken iptal, çift dokunma, okuma/yazma hatası ve retry.
- [x] Webde gerçek süreli kısa oturum ve reload testi; lint/typecheck/test/format ve Android bundle temiz.
- [ ] Android'de 25 dakikalık gerçek oturum ve native lifecycle kabulü.
- [ ] Expo Doctor çevrimiçi şema doğrulaması, DNS erişimi düzeldiğinde.

Faz 1 kodu hazır; cihaz kabulü bekliyor. Kullanıcı ayrıca istemeden Faz 2'ye geçilmez. Sonraki iş cihaz listesini tamamlamak, ardından istenirse saf ekonomi motorunu ayrı bir fazda geliştirmektir.

## Faz 1 devam kontrolü — 29 Ekim 2026

Lint, TypeScript, 20 test ve format kontrolü yeniden başarılı oldu. Android SDK/adb varsayılan konumda veya PATH üzerinde bulunmadı; çalışan emülatör/adb process'i de yok. Cihaz kabulü doğrulanmış sayılmadı.

Expo Doctor bu kez çevrimiçi şema kontrolünü tamamladı; ilk denemede 19/20 geçti ve tek hata SDK 58 patch sürüm uyumsuzluklarıydı. Önceki DNS engeli bu çalıştırmada görülmedi. `npx expo install --fix` ile aynı SDK içinde önerilen uyumlu patch seti uygulandı; major SDK yükseltmesi veya audit force fix yapılmadı. Uzayan ilk indirme durduruldu; 30 saniyelik fetch timeout ve tek retry ile tekrar kurulum başarıyla tamamlandı.

| Paket              | Önce    | Hedef patch |
| ------------------ | ------- | ----------- |
| @expo/ui           | 58.0.24 | 58.0.25     |
| expo               | 58.0.20 | 58.0.21     |
| expo-constants     | 58.0.13 | 58.0.14     |
| expo-font          | 58.0.10 | 58.0.11     |
| expo-image         | 58.0.17 | 58.0.18     |
| expo-linking       | 58.0.14 | 58.0.15     |
| expo-router        | 58.0.27 | 58.0.28     |
| expo-splash-screen | 58.0.11 | 58.0.12     |
| expo-system-ui     | 58.0.6  | 58.0.7      |
| react-native       | 0.88.0  | 0.88.1      |

`app.json` ve oturum kayıt formatı korunur. Development build kullanılıyorsa native sürüm değişikliklerini almak için build yeniden üretilmelidir. Bu devam çalışması Faz 2'yi içermez.

Güncelleme sonrası Expo Doctor **20/20 başarılı**; önceki çevrimiçi şema doğrulama kabul maddesi artık kapalıdır. Lint, typecheck ve 20 test yeniden geçti. CLI'ın otomatik eklediği gereksiz `expo-image` config plugin girdisi kaldırıldı; `app.json` önceki hâliyle korundu.

Son format kontrolü başarılı. `npx expo export --platform android --output-dir .expo/phase1-patch-export` güncel paketlerle başarılı oldu: 1661 modül, 3.9 MB Hermes bundle. Native cihaz açılışı hâlâ doğrulanmadı; bir sonraki kabul işi Android cihazda 25 dakikalık oturum ve background/restore kontrolüdür.

29 Ekim son audit raporu: **3 high, 5 low, 0 critical**. High zinciri aynı Zod bellek tüketimi advisory'sidir. Low kayıtların kökü `deepmerge` üzerinden `@expo/config` ve build araçlarına taşınan [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) prototype poisoning bulgusudur. Sekiz kayıt sekiz ayrı kök açık anlamına gelmez. npm'nin önerdiği Expo 51'e major düşüş uygulanmadı; SDK 58 uyumlu upstream düzeltmeler takip edilmeli. SDK uyumluluğunun temiz olması audit bulgularının çözüldüğü anlamına gelmez.

### A53 bağlantı kontrolü — 29 Ekim 2026

Samsung A53 (SM-A536E) USB bağlantısındaki Windows Kod 10 hatası sürücü hazırlığından sonra giderildi. Android SDK platform-tools/adb 37.0.1 bulundu; doğrudan başlatılan yerel ADB sunucusunda cihaz `device` / yetkili olarak doğrulandı. Önceki “SDK/adb yok” tespiti artık geçerli değildir.

Telefonda Expo Go 57.0.9 kurulu olduğu okundu; proje SDK 58 kullanıyor. Metro localhost:8083 başlatıldı, USB reverse yönlendirmesi ve proje açma intent'i başarılı döndü. Sonraki ADB ekran/aygıt sorguları yanıt vermediği için uygulamanın gerçekten açıldığı veya native oturum testlerinin geçtiği iddia edilmedi. SDK 58 uyumlu Expo Go doğrulaması ve cihaz kabul testi hâlâ açık.

### A53 native kısa kabul testi — 29 Ekim 2026

Expo Go 58.0.5 sürümü ve Samsung A53 / SM-A536E yetkili ADB bağlantısı doğrulandı. USB reverse üzerinden localhost:8083 projesi açıldı; gerçek Android arayüzü görüntü ve UI hierarchy ile incelendi. Önceki Expo Go 57 uyumluluk engeli giderildi.

- [x] Uygulama gerçek A53 üzerinde açıldı; splash kapanıp Odaklan ekranı geldi.
- [x] Özel süre 1 dakika seçilip gerçek sayaç başlatıldı.
- [x] 00:41 kala duraklatıldı. Expo Go process'i veri silmeden durdurulup yeniden açıldı; aynı 00:41 ve duraklatılmış durum geri geldi.
- [x] Sürdürülüp Android ana ekranına geçildi; süre arka planda ilerledi. Process yeniden kapatılıp açılınca dolan süre tamamlanmış oturum olarak geri geldi.
- [x] Özet: planlanan 1 dakika, geçen 01:00, geçerli 01:00. Geçmiş sekmesi: tamamlanan oturum 1, toplam geçerli süre 01:00, yalnızca tek kayıt.
- [x] Native sekme geçişi ve koyu tema görünümü kontrol edildi. Diğer tema/ekran okuyucu ayarları değiştirilmedi.
- [ ] Gerçek cihazda 25 dakikalık uzun oturum, native erken iptal, uçak modu ve kapsamlı erişilebilirlik kontrolleri hâlâ açık. Bir dakikalık test bunların yerine geçmez.

Cihazda görülen bir UI sorunu giderildi: özel süre için klavye açıldıktan sonra başlatılan oturum eski ScrollView konumunu koruyor ve başlığı kısmen ekran dışında bırakıyordu. `focus-screen.tsx` içinde aktif oturum / hazırlık-özet görünümüne bağlı kararlı bir React key ile yeni akışta kaydırma konumu sıfırlandı; pause/resume aynı key'i korur. Cold restore sonrası tamamlanma özeti ve geçmiş başlığı görünür biçimde doğrulandı. Oturum kuralları ve kayıt şeması değişmedi.

Düzeltme sonrası lint, strict typecheck ve 20 test başarılı. Ekran kanıtı: yerelde saklanan A53 geçmiş ekranı (GitHub paylaşımına dahil değil). Kayıt cihazda gerçekten çalıştırılan test oturumudur; fixture eklenmedi. Expo Go ve Metro cihaz üzerinde sonraki manuel testlere hazır bırakıldı.

---

# Faz 2 — Saf ekonomi motoru ve kalıcı şehir durumu

29 Ekim 2026: Kullanıcının “devam edelim gerekiyorsa faz 2 ye geç” isteğiyle uygulandı. Faz 3 ve sonrası uygulanmadı. Faz 1'in uzun süreli cihaz kontrolü açık kalmakla birlikte kısa native sayaç/restore testi önceki bölümde başarılıdır.

## Tamamlanan maddeler

- Saf TypeScript `CityState`, tam sayı coin/RP/emek hesapları, bonus snapshot ve taşınan dört ayrı kalan.
- Session ID başına bir kez ödeme yapan immutable reward ledger; çelişen aynı ID'yi reddetme.
- Kazanılmış 60 dakikalık şehir dönemleri; sıra ve idempotency kontrolü; vergi, finanse edilebilir gider, memnuniyet ve nüfus fonksiyonları.
- Güvenli sayı sınırları, negatif bütçe/ödül engelleri; deterministic seeded bölünmüş süre testi.
- Uygulama kayıt zarfı version 2; focus + city + ledger tek yazmada commit. Yazma hatası/retry çift ödeme üretmez.
- V1 geçmiş ve aktif oturumu kaybetmeden migration; eski kayıt anahtarı yedek olarak korunur. Geçmiş tamamlanmış oturumların temel ödülleri bir kez verilir.
- V2 yüklenirken ledger ve kaynaklar geçmişten replay edilerek doğrulanır; bozuk v2'ye eski v1 üzerinden sessiz geri dönüş yapılmaz.
- Native/web Şehir sekmesi; kaynaklar, RP/dönem için kalan süreler, son dönem raporu. Oturum özeti/geçmiş gerçek ledger ödülünü gösterir.

## Değişen / yeni dosyalar

- `src/domain/economy/balance.ts`, `city.ts`, `rewards.ts`: ekonomik sözleşme ve saf fonksiyonlar.
- `src/domain/focus/session.ts`: geriye uyumlu oturum başı bonus snapshot alanı.
- `src/services/application-save.ts`: version 2 decoder, migration ve settlement/replay.
- `src/store/focus-store.ts`: yeni anahtar, eski kayıt fallback'i ve ekonomiyle ortak commit.
- `src/features/city/{city-copy.ts,city-screen.tsx}`, `src/app/city.tsx`: şehir özeti.
- `src/components/app-tabs.tsx`, `app-tabs.web.tsx`, `src/localization/tr.ts`: üçüncü sekme.
- `src/features/focus/{focus-copy.ts,focus-screen.tsx,history-screen.tsx,session-summary.tsx}`: gerçek ödül bilgisi. Geçmişte ledger lookup için Map kullanılır.
- `tests/economy.test.mjs`: 24 yeni test; `tests/focus.test.mjs`: mevcut persisted-save kontrolleri yeni zarfa uyarlandı.
- README, katman README'leri, `docs/balance.md`, decisions ve bu rapor. Native kanıt `docs/screenshots/phase2-a53-city.png`.

## Bağımlılıklar ve Expo uyumu

Yeni paket kurulmadı; mevcut AsyncStorage ve Node test runner yeterli. Bu fazda `package.json`, SDK/runtime sürümleri veya `app.json` değiştirilmedi. Önceki SDK 58 patch seti korundu. Native dizin oluşturulmadı, backend/harita/render paketi eklenmedi.

## Komutlar ve test sonuçları

| Kontrol                                                               | Sonuç                                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------- |
| `npm run lint`                                                        | Başarılı                                                   |
| `npm run typecheck`                                                   | Başarılı                                                   |
| `npm test`                                                            | 44/44 başarılı: 24 ekonomi/kayıt geçişi + önceki 20        |
| `npm run format:check`                                                | Başarılı                                                   |
| `npx expo-doctor`                                                     | 20/20 başarılı                                             |
| `npx expo export --platform android --output-dir .expo/phase2-export` | Başarılı; 1668 modül, 3.9 MB Hermes bundle                 |
| `npx expo export --platform web --output-dir .expo/phase2-web-export` | Başarılı; web ve server render, city route üretildi        |
| `npm audit --json`                                                    | Önceki aynı 3 high +5 low, 0 critical; force fix yapılmadı |

Node'un TypeScript modülleri için verdiği MODULE_TYPELESS_PACKAGE_JSON uyarısı test hatası değildir. Proje module tipini sırf bu uyarı için değiştirmedik. Güvenlik advisory nedenleri ve SDK uyumlu düzeltme takip planı yukarıdaki bakım bölümündedir.

## A53 gerçek cihaz doğrulaması

SM-A536E / Expo Go 58.0.5 üzerinde uygulama veri silmeden tamamen kapatılıp yeni kodla açıldı.

1. Faz 1'de kaydedilen 1 dakikalık gerçek oturum korundu. Migration sonrası şehir: 2 para, 0 RP, 01:00 emek, 1 işlenmiş oturum; sonraki temel RP 09:00, sonraki dönem 59:00.
2. Yeni 1 dakikalık oturum gerçek süreyle tamamlandı; özette +2 para / +0 temel RP / +0 bonus RP / +01:00 emek görüldü.
3. Uygulama process'i tekrar kapatılıp açıldı. Şehirde toplam 4 para, 0 RP, 02:00 emek ve 2 işlenmiş oturum korundu; sonraki RP 08:00, dönem 58:00. Migration veya completion tekrar ödeme yapmadı.
4. Üç native sekme arasında gezinme, şehir özeti ve koyu tema görüntüsü doğrulandı. Oturum kaydı veya cihaz saati test için değiştirilmedi.

Ekran kanıtı gizlilik nedeniyle yalnızca yerelde saklanır; GitHub reposuna dahil değildir.

UI Automation çalışan sayacı okurken bir denemede idle bekleme hatası verdi; o çıktının eski XML'i doğrulama kanıtı sayılmadı. Güncel screenshot ile tamamlanma, ardından idle şehir ekranının yeni XML'i ile toplamlar doğrulandı. Görülen rakamlar gerçek yerel test oturumlarıdır; fixture üretim state'ine eklenmedi.

## Kabul kriterleri

- [x] 2×25 dakika ile 1×50 dakika aynı temel kaynakları üretir.
- [x] 25+20+30 dakika = 150 para, 7 temel RP +300 saniye RP kalanı, 1 dönem +900 saniye dönem kalanı, 4500 saniye emek.
- [x] Aynı session veya dönem ikinci kez işlendiğinde yeni ödeme/işlem yok.
- [x] Bakiyeler negatif olmaz; eksik bütçede gider önceliği ve fonlanmayan hizmetler açıklanır.
- [x] Aktif oturum yokken üç gün sonra açılış yeni ekonomik dönem, borç veya nüfus kaybı üretmez.
- [x] Saniye/bonus kalanları, saat geri alma sonrası kayıt sırası, bozuk kayıt, okuma/yazma hatası, migration/retry ve expired active migration testleri geçti.
- [x] A53'te gerçek v1→v2 kayıt geçişi, yeni ödül ve yeniden açılışta çift ödeme olmaması doğrulandı.

Uzun 25/75 dakikalık fiziksel bekleme Faz 2 doğrulamasında yapılmadı; bu hesaplar deterministik saatli saf testlerde doğrulandı. iOS gerçek cihazı, webde yeni fazın etkileşimli UI testi ve kapsamlı erişilebilirlik/çok büyük geçmiş performans ölçümü bu teslimde yapılmadı; web build doğrulandı.

## Bilinen sınırlar ve sonraki adım

Motorun hizmet, kapasite ve bonus fonksiyonları test edilebilir girdilerle hazırdır; gerçek uygulama henüz boş altyapı kullanır. Bina ve yol türetimi, grafik harita, emek harcama ve politika değiştirme UI'si sonraki fazlara aittir. Yeni v2 replay sözleşmesi harcamayı desteklemez; bunlar eklenirken yeni kayıt sürümü gerekir. Ekonomi olaylarının sırası, hizmet finansmanı yaklaşımı ve yuvarlama kuralları `docs/balance.md` içinde belgeli.

Yerel ledger çalışma kanıtı değildir. Tek app runtime içinde tek yazma kilidi vardır; sunucu veya çoklu browser-tab kilidi yoktur. V1 backup otomatik silinmez; eski uygulamaya downgrade ederek yeni kayıt üretmek desteklenmez. Uygulama verilerinin silinmesi kayıtları siler.

Faz 2 tamamlandı. Sıradaki Faz 3, 12×12 debug grid, bina/footprint kataloğu, çakışma ve yol bağlantısı prototipidir. Bu teslimde başlanmadı.

---

# Faz 3 — İnşa edilebilir 2D grid prototipi

29 Ekim 2026: Kullanıcının “faz 3 e geçelim” isteğiyle uygulandı. Faz 4 ve sonrası uygulanmadı.

## Tamamlanan maddeler

- 12×12 top-down debug grid, sıfır tabanlı koordinatlar, ortada 8×8 açık arazi, kalan hücreler kilitli.
- Tek ücretsiz ve sabit 3×3 başlangıç belediyesi; konut, park ve santral kataloğu ve çok hücreli footprint'ler.
- Bütün footprint için açık arazi/sınır/çakışma/yol/bakiye kontrolü. Geçerli, uyarılı ve geçersiz önizleme renk yanında metinle de anlatılır.
- Satın alma önizleme → onay → tek kayıt ile harita/cüzdan ortak commit. İptal veya reddetme ücret kesmez.
- Yol ekleme/kaldırma ve belediye footprint'inden dört yönlü BFS. Diyagonal temas bağlantı değildir; döngüler visited kümesiyle güvenli işlenir.
- Hücreye dokunup bina ayrıntısı ve bağlantı uyarısı. Belediye dışındaki planlar ücretsiz taşınır; kendi eski alanıyla örtüşebilir, diğer yapı/yollara taşınamaz. Geçersiz taşıma eski konumu korur.
- Application save version 3; v1/v2 kaynaklar ve focus geçmişi korunur. Eski anahtarlar değiştirilmez. Harita ve harcamalar reward-count sıralı işlem günlüğünden replay edilerek doğrulanır.
- 48×48 hücre hedefleri ve koordinat/içerik/bağlantı erişilebilirlik etiketleri. Dar ekranda yatay harita, dikey sayfa kaydırması.

## Değişen / yeni dosyalar

- `src/domain/map/{catalog,placement,world}.ts`: katalog, örnek modelleri, footprint, BFS, taşıma, ödeme ve işlem replay'i.
- `src/services/application-save.ts`: v1/v2→v3 migration ve map/cüzdan tutarlılık doğrulaması.
- `src/store/focus-store.ts`: v3 anahtarı, legacy sırası, map komutları, ortak commit ve UI hata durumu.
- `src/features/city/{map-copy,map-editor,debug-grid}.tsx/ts`: araçlar, grid, önizleme, onay, inceleme ve taşıma arayüzü.
- `src/features/city/{city-screen.tsx,city-copy.ts}`: harita entegrasyonu ve güncel kapsam metni.
- `src/theme/palette.ts`: metinli önizlemeler için açık/koyu uyarı ve geçersiz yüzey renkleri.
- `tests/map.test.mjs`: 29 yeni test; `tests/economy.test.mjs`: güncel kayıt sürümü beklentisi ve test adı düzeltmesi.
- README, katman README'leri, `docs/map.md`, balance, decisions ve bu rapor. Native kanıt `docs/screenshots/phase3-a53-map.png`.

## Bağımlılıklar

Yeni paket yok. Mevcut React Native Pressable/ScrollView yeterli. Expo SDK, React Native sürümleri, `app.json` ve native dizinler değiştirilmedi. İzometrik renderer, gesture/camera veya görsel asset kütüphanesi eklenmedi. Görünüm programatik sembol/grid kullanır.

## Kontroller

| Kontrol                                                               | Sonuç                                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run lint`                                                        | Başarılı                                                                  |
| `npm run typecheck`                                                   | Başarılı                                                                  |
| `npm test`                                                            | 73/73 başarılı: önceki 44 +29 harita/kayıt testi                          |
| `npm run format:check`                                                | Başarılı                                                                  |
| `npx expo-doctor`                                                     | 20/20 başarılı                                                            |
| `npx expo export --platform android --output-dir .expo/phase3-export` | Başarılı; 1674 modül, 3.9 MB Hermes bundle                                |
| `npx expo export --platform web --output-dir .expo/phase3-web-export` | Başarılı; web ve server render                                            |
| `npm audit --json`                                                    | Aynı 3 high +5 low /0 critical; yeni paket eklenmedi, force fix yapılmadı |
| `git diff --check`                                                    | Başarılı                                                                  |

Node test runner MODULE_TYPELESS_PACKAGE_JSON bilgilendirme uyarısı devam eder; test hatası değildir. Audit kök nedenleri ve SDK uyumlu upstream düzeltme planı önceki bakım bölümünde belgelenmiştir.

## Otomatik kabul kanıtları

- Bütün footprint kontrolü: sınır taşması, kilitli bir hücreye taşma, bina/yol çakışması, yetersiz bakiye ve geçersiz taşıma reddedilir; orijinal map ve cüzdan değişmez.
- Konut, park ve santral doğru fiyat/footprint ile, yalnızca test fixture'larında kazanılmış 600 paradan satın alınır; kalan para 130. Plan ID/durum/hedef süreleri korunur, emek harcanmaz.
- Belediye-yol, yol-yol ve bina-yol için köşe teması bağlantı sayılmaz. Döngülü ağ biter, alternatif yol kaldırmadan sonra korunur. Ana bağlantı kaldırılınca veya konut uzağa taşınınca uyarı oluşur.
- Önizleme ve iptal yazma yapmaz. Çift onay ve disk yazma hatası/retry en fazla tek satın alma üretir. Harita ve para birlikte commit edilir.
- Cold reload; bina konumları, taşımalar, yollar, bağlantı ve net para aynı kalır. Sonraki focus ödülü eski satın almayı iade etmez.
- Harita tamperi, aynı event ID, sıra dışı/gelecekteki reward count ve değiştirilmiş net bakiye reddedilir. Bozuk v3 veya bozuk legacy v2, daha eski yedeğe sessiz dönüş yapmaz.

## A53 gerçek cihaz doğrulaması

SM-A536E / Expo Go 58.0.5 üzerinde uygulama veri silmeden kapatılıp yeni sürümle açıldı.

1. V2→v3 migration sonrası kullanılabilir para 4 olarak korundu. Başlangıç belediyesi ve grid açıldı.
2. Konut aracı seçilip (2,2) boş parseli önizlendi: “100 para gerekiyor /yeterli şehir paran yok” sonucu ve disabled onay düğmesi UI hierarchy'de doğrulandı. İptal edildi; para yine 4 kaldı.
3. Yol aracıyla (3,4) seçildi: “Geçerli yerleşim”, bedel 0 ve açık onay düğmesi doğrulandı. Onay sonrası para 4, RP 0, emek 02:00 kaldı.
4. Uygulama process'i kapatılıp tekrar açıldı. (3,4) hücresi “Yol. Belediyeye bağlı yol erişimi var.” olarak geri geldi; belediye yanındaki konum korundu.
5. Dikey gezinti ve yatay kaydırma ile 9. ve 11. sütunlara erişim doğrulandı. Hücreler basılabilir, etiketli ve koyu temada okunabilir.

Ekran kanıtı gizlilik nedeniyle yalnızca yerelde saklanır; GitHub reposuna dahil değildir.

Gerçek bakiyeye sahte para yazılmadı. Bu nedenle pozitif bina satın alma ve taşıma A53'te denenmedi; bunlar saf domain/store fixture testlerinde doğrulandı. Fiziksel cihazda bir yol ücretsiz olarak gerçekten eklendi ve örnek olarak bırakıldı. Webde etkileşimli harita testi ve iOS gerçek cihaz testi yapılmadı; web build doğrulandı.

## Kabul durumu

- [x] 12×12 grid, katalog, footprint, açık arazi ve çakışma.
- [x] Yanlış yerleşim/iptal para düşmez.
- [x] Yol ağı dört yönlüdür; çapraz temas geçersizdir.
- [x] Konut bağlantıdan ayrılırsa uyarı yeniden hesaplanır.
- [x] Kayıt yükleme aynı harita ve net cüzdanı getirir.
- [x] Typecheck/lint/test/format, SDK uyumu ve Android/web build temiz.
- [x] A53 migration, yetersiz bakiye, iptal, yol ekleme ve cold reload doğrulandı.

## Bilinen sınırlar ve sonraki adım

Bu bir tap tabanlı debug prototipidir. Önizleme/inceleme paneli haritanın altında olduğu için sayfa kaydırılır. Sürükleme, izometrik çizim, kamera pan/zoom, arazi açma, bina silme/iade ve yükseltme yoktur. Yeni yapılar construction planı olarak kalır; emek tahsisi/tamamlama ve ekonomi hizmet aktivasyonu sonraki fazdadır. Yollar ve plan taşıma şu an ücretsizdir; bu fiyat/şema sözleşmesi değişirse migration gerekir.

Mevcut `afterRewardCount` replay'i, bu fazın boş hizmet ekonomisi ve tamamlanmamış planları için geçerlidir. Aktif hizmet gelir/gideri ve inşaat tamamlaması eklendiğinde tam olay sırası için yeni şema gerekir. Tek runtime yazma kilidi vardır; yerel veri sunucu doğrulaması değildir. Çok büyük geçmiş/işlem günlüğü ayrıca profillenmelidir. Önceki uzun 25 dakika native oturum ve kapsamlı erişilebilirlik testleri tarihsel açık maddelerdir; bu teslimde kapatılmış sayılmadı.

Faz 3 tamamlandı. Sıradaki Faz 4 izometrik görünüm, hit-test ve kamera prototipidir; bu teslimde başlanmadı.

# Faz 4 — İzometrik şehir prototipi

Tarih: 29 Ekim 2026. Kod uygulandı; aşağıdaki manuel kabul maddeleri açık olduğundan sonraki faza geçilmedi.

## Tamamlananlar ve dosyalar

- src/domain/map/projection.ts: 64×32 projection/inverse, kamera hit-test, anchor koruyan zoom/pinch, sınırlı pan ve viewport kontrolü.
- src/features/city/isometric-map.tsx: 144 hücre programatik izometrik çizim, cache/culling, derinlik sıralı bina placeholder'ları, pan/pinch, kamera düğmeleri ve renk + metin önizleme.
- src/features/city/sprite-registry.ts: dört bina türü ve üç seviye için değiştirilebilir görsel tanımları. Seviye açma/upgrade uygulanmadı.
- src/features/city/map-fallback.tsx: React render hatasında aynı state'i 2D grid ile gösteren boundary.
- map-editor.tsx: izometrik/2D geçişi ve mevcut onay akışı. city-screen.tsx: harita gesture'ı boyunca sayfa scroll kilidi.
- tests/projection.test.mjs: yedi yeni test. README, decisions ve docs/isometric.md güncellendi; screenshot docs/screenshots/phase4-a53-isometric.png.
- İnşaat planlarında ortak native opacity animasyonu; Reduce Motion ve background kontrolü. Emek tüketme/tamamlama eklenmedi.

## Bağımlılıklar ve kontroller

Yeni bağımlılık yok. package.json, package-lock.json, app.json ve v3 kayıt şeması bu fazda değiştirilmedi.

- npm run lint: başarılı.
- npm run typecheck: başarılı.
- npm test: 80/80 başarılı (önceki 73 + 7 projection/kamera testi).
- npm run format:check: başarılı.
- npx expo-doctor: 20/20 başarılı.
- Android Hermes ve web export başarılı. İlk sandbox denemeleri Hermes/dosya izinlerinde durdu; normal izinlerle tekrar doğrulandı. Güncel export logları .expo/phase4-android-export.log ve .expo/phase4-web-export.log içindedir.
- npm audit: önceki 3 high + 5 low, 0 critical; force fix yapılmadı. Ağ erişimi olmayan sandbox denemesi sonuç sayılmadı, normal ağ erişimiyle doğrulandı.

## A53 doğrulaması

- Cold reload mevcut belediye, (3,4) yol ve 4 para bakiyesini korudu.
- Aynı (2,2) hücresi %50, %78 ve pan sonrasında doğru seçildi. Kamera hareketi kendi başına hücre seçmedi.
- Konut önizlemesi kırmızı ve metinli; 100 para gerektiği için onay disabled. İptal sonrası para 4 kaldı; gerçek kayda sahte bakiye eklenmedi.
- 2D alternatif açıldı; (3,4) yol hücresi belediyeye bağlı olarak okundu.
- Görsel incelemede ilk transform düzeni düzeltildi; temiz açılıştaki elmas hücre ve kırmızı footprint ekran görüntüsünde doğrulandı.

Ekran kanıtı gizlilik nedeniyle yalnızca yerelde saklanır; GitHub reposuna dahil değildir.

## Güvenlik ve performans

SECURITY.md kapsamında gesture girdileri ve mevcut onay/store sınırı incelendi. Kamera/preview kayda veya cüzdana yazmaz. Geçersiz koordinatlar komut üretmez; çift onay, retry, corrupt-save regresyonları geçti. Resmî Codex Security taraması yapılmadı.

Expo Go geliştirme oturumundan 443 frame örneğinde %9.71 janky, p50 9 ms / p90 17 ms / p95 27 ms / p99 48 ms görüldü. Açılış ve ekran kontrollerini de içerir; yalnızca harita veya release/JS FPS ölçümü değildir. Cache, sabit 144 hücre sınırı ve çizim culling'i var; yayın ve düşük seviye cihaz profili hâlâ gereklidir.

## Kabul ve manuel kontrol listesi

- [x] Kamera sonrası doğru hücre: tüm hücreler/farklı zoom-pan kombinasyonları otomatik; (2,2) A53 üzerinde doğrulandı.
- [x] Geçerli/uyarılı/geçersiz önizleme domain sonucuna bağlı; kırmızı native kanıtı var.
- [x] 2D alternatif gerçek cihazda aynı kayıtla açıldı.
- [x] TypeScript/lint/test ve platform export'ları başarılı.
- [ ] Fiziksel iki parmak pinch ve parmak sayısı geçişleri: ADB tek parmak testinden ayrı olarak cihazda denenmeli. Matematiği otomatik test edildi.
- [ ] Düşük seviye cihaz/yayın performansı kabulü: mevcut dev ölçümü yeterli kanıt değildir.
- [ ] TalkBack, iOS ve gerçek web gesture testi; render exception fallback enjeksiyonu yapılmadı.

Bilinen sınırlar: placeholder görseller, tap tabanlı yerleştirme, harita altındaki onay paneli, sınırlı derinlik sırası; drag yerleştirme ve gerçek inşaat ilerlemesi yok. Canlı kayıtta sadece belediye olduğundan diğer türlerin inşaat animasyonu cihazda görülmedi. Önceki fazların uzun oturum ve geniş erişilebilirlik açıkları bu teslimde kapatılmış sayılmadı.

Sonraki adım: Faz 4'ün açık kabul maddelerini cihazda tamamla; ardından Faz 5 inşaat/yükseltme/araştırma. Faz 5 kodu yazılmadı.
