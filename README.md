# Focus City

React Native 0.88.1, Expo SDK 58, React 19.3 ve TypeScript ile geliştirilen mobil uygulama. Android önceliklidir; iOS ve web yapısı korunur. **Faz 0–4 kodu uygulanmıştır:** altyapı, odaklanma MVP'si, ekonomi, 2D yerleşim ve izometrik görünüm. Faz 4 fiziksel pinch ve kapsamlı performans kabulü henüz açıktır; inşaat ilerlemesi Faz 5 kapsamındadır.

Şehir haritasında tek parmakla pan, iki parmakla zoom veya yakınlaştırma düğmeleri kullanılabilir. Haritayı ortala kamerayı sıfırlar. Erişilebilir hücre düğmeleri için **2D grid** görünümüne geçin. Önizleme ve onay paneli haritanın altındadır. Ayrıntılar: [izometrik görünüm](docs/isometric.md), [güvenlik politikası](SECURITY.md).

## Başlatma

Node.js 24 ve npm kullanın; kilit dosyası `package-lock.json`.

```powershell
npm ci
npm start
npm run android
npm run ios
npm run web
```

Android komutu Metro'yu başlatıp bağlı cihaz/emülatörde açmayı dener. Gerçek cihazda SDK 58 uyumlu Expo Go ile Metro QR kodunu açın. iOS cihaz testi Windows üzerinde Expo Go ile yapılabilir; iOS Simulator macOS gerektirir. Yeni native paket eklenirse development build gereksinimini değerlendirin.

## Kalite komutları

```powershell
npm run typecheck
npm run lint
npm test
npm run format:check
npm run format
npx expo install --check
npx expo-doctor
npm audit
```

`format` dosyalara yazar. Testler Node 24'ün yerleşik TypeScript desteğini kullanır; ek test paketi gerekmez. Oturum kuralları, saf ekonomi, footprint/çakışma, yol BFS, ledger, v1/v2→v3 migration, saat adaptörü, kalıcı store geçişleri ve tema kontrastı test edilir; cihaz/render testi yerine geçmez.

## Odaklanma MVP'si

Odaklan sekmesinde 15/25/50 dakika veya 1–180 dakika arasında özel süre seçin. Tek oturumu başlatın, duraklatın ve sürdürün. Süre tamamlandığında özet, geçmiş ve ekonomi kaydı birlikte oluşur. Erken bitirme onay gerektirir ve sıfır geçerli süreyle iptal kaydı oluşturur; ödül vermez.

Çalışan sayaç arka planda ve kapalı uygulamada da ilerler; duraklatılmış sayaç ilerlemez. Ön planda monotonik saat, yeniden açılışta UTC checkpoint kullanılır. Saat geri alınmışsa çalışan oturum duraklatılır; ileri saat değişiklikleri yeniden açılışta gerçek geçen süreden ayırt edilemez. Cihaz kayıtları çalışma kanıtı değildir.

Oturumlar AsyncStorage 2.2.0 ile yalnızca bu cihazda saklanır. SDK 58 dokümanında bu paket Expo Go'ya dahildir; mevcut development build kullanıyorsanız paketi içeren yeni development build üretin. Kayıt hatasında yeniden deneme sunulur; bozuk veya gelecekteki sürüme ait kayıt sessizce silinmez. Uygulama verisini silmek geçmişi siler. Bildirim ve sunucu senkronizasyonu yoktur. Webde aynı origin için tek açık uygulama sekmesi kullanın; çoklu sekme yazma kilidi bu fazın kapsamı dışındadır.

## Ekonomi ve şehir özeti

Şehir sekmesi gerçek yerel oturumlarından gelen para, RP, emek, sonraki RP/dönem için gereken süre ve son dönem raporunu gösterir. Her geçerli dakika 2 şehir parası ve 1 dakika emek; her 10 dakika 1 temel RP; her 60 dakika 1 şehir dönemi kazandırır. Kalanlar tam sayılarla saklanır. Örneğin 25+20+30 dakika: 150 para, 7 temel RP +5 dakika RP kalanı, 1 dönem +15 dakika dönem kalanı, 75 dakika ayrılmamış emek.

Şehir başlangıcında ücretsiz ve sabit belediye binası vardır; nüfus/vergi/gider sıfırdır. Satın alınan konut, park ve santral henüz inşaat planıdır; tamamlanmış hizmet veya RP bonusu üretmez. Saf motor nüfus, vergi, memnuniyet ve hizmet bütçesi hesaplarını test edilebilir girdilerle destekler; bu prototipte işletilebilir altyapı henüz bağlanmadı. Eğitim binaları ve politika arayüzü yoktur.

Eski kayıtlar ilk açılışta `@focus-city/save/v3` zarfına taşınır; v1/v2 anahtarları yedek olarak değiştirilmeden kalır. V1 tamamlanan oturumların temel ödülü bir kez verilir; v2'nin ödülleri ve mevcut kaynakları korunur. Aktif oturum korunur, iptaller ödül üretmez. Yeni kayıt bozuksa eski yedeğe sessiz dönüş yapılmaz; hata gösterilir. Eski uygulama sürümüne dönerek yazmak desteklenmez. Oturum, şehir, ledger, harita ve harita işlem günlüğü tek kayıt içinde saklanır. Aynı session ID iki kez ödeme yapmaz; bu koruma yereldir, sunucu doğrulaması değildir.

## Yerleşim prototipi

Şehir sekmesinde İncele, Konut, Park, Santral, Yol ekle veya Yol kaldır aracını seçin. Harita 12×12, başlangıç açık alanı x/y 2–9 arasındaki 8×8 bölgedir. Haritayı yatay ve sayfayı dikey kaydırarak gezin. Hücrelerin dokunma hedefi 48 birimdir; koordinatlar sıfırdan başlar.

Seçilen hücre binanın sol üst köşesidir. Tüm footprint açık ve boş olmalı; bina/yol çakışması ve sınır taşması reddedilir. Önizleme yeşil geçerli, sarı bağlantı uyarısı, kırmızı geçersizdir; aynı durum metinle de açıklanır. Para sadece “Değişikliği onayla” sonrasında başarılı kayıtla düşer. İptal veya reddetme para harcamaz.

Konut 100 para/2×2, park 120/2×2, santral 250/3×3. Yerleşenler inşaat planı olarak kalır; emek atama/tamamlama henüz açık değildir. İncele aracında bir yapıya dokunup ayrıntısını görün; belediye dışındaki planları ücretsiz taşıyabilirsiniz. Belediye sabittir. Yollar bu prototipte ücretsiz, tek hücre tıklama + onay ile eklenir/kaldırılır. Yol ağı dört yönlü BFS ile belediye footprint'ine bağlanır; çapraz temas bağlantı değildir. Yol kaldırılması veya taşıma sonrası bağlantı uyarısı yeniden hesaplanır.

Gerçek bakiyeye sahte başlangıç parası eklenmez. Pozitif satın alma testleri yalnızca otomatik test fixture'larında yapılır. Katalog/işlem günlüğü sürüm sözleşmesi için [harita belgesine](docs/map.md) bakın.

## Mimari

- `src/app`: Expo Router route girişleri ve layout. `/` Odaklan, `/explore` Geçmiş, `/city` Şehir.
- `src/features/focus`: sayaç, geçmiş, son oturum özeti ve lifecycle provider. `/` Odaklan, `/explore` Geçmiş ekranıdır.
- `src/features/city`: gerçek şehir kaynaklarının ve dönem sonuçlarının özeti.
- `src/domain/map` ve `src/features/city/{map-editor,debug-grid}`: saf yerleşim/BFS/işlem replay ve 2D grid arayüzü.
- `src/components`: ortak UI ve mevcut şablon bileşenleri.
- `src/theme`, `src/constants`, `src/hooks`: palette, spacing, font ve sistem temasına erişim.
- `src/localization`: Türkçe metinler, varsayılan locale.
- `src/types`: ortak TypeScript sözleşmeleri.
- `src/domain/focus`: React'ten bağımsız oturum kuralları ve sürümlü kayıt doğrulaması.
- `src/domain/economy`: balance, CityState, dönem ve ödül ledger motoru; React veya saat bağımlılığı yoktur.
- `src/services/application-save.ts`: v1/v2→v3 migration ve ledger/şehir/harita tutarlılık doğrulaması.
- `src/data`: gelecek statik kataloglar; `src/services`: dış sistem adaptörleri; `src/store`: durum yönetimi sınırı.
- `assets`: mevcut görseller; `tests`: saf modül kontrolleri; `docs`: kararlar ve faz raporu.

Route dışı kodu `src/app` içine koymayın. Domain modülleri UI veya cihaz servisi import etmemeli. Store tek runtime içinde yazmaları sıralar; UI ancak kayıt başarılı olunca geçişi gösterir. Yeni modülleri ilgili fazın ihtiyacıyla ekleyin. Sahte bakiye veya sıralama gösterilmez.

Güvenlik bulguları, Faz 0–2 sonuçları ve cihaz kontrol listesi için [faz raporu](docs/phase-progress.md), kararlar için [mimari kayıt](docs/decisions.md), ekonomi varsayımları için [denge belgesi](docs/balance.md).
