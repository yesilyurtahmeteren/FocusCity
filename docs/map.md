# Faz 3 — Yerleşim sözleşmesi

Bu faz 2D, dokunma tabanlı debug prototipidir. İzometrik çizim, serbest sürükleme, kamera pan/zoom, bina tamamlama/yükseltme veya ekonomi hizmet aktivasyonu içermez. Yeni paket gerekmedi.

## Harita ve katalog

- Mantıksal harita 12×12. Koordinatlar 0–11, sol üst (0,0). Başlangıç açık arazi x/y 2–9 arasında 64 hücredir. Kilitli alana footprint'in bir hücresi bile taşamaz; arazi açma arayüzü henüz yoktur.
- Başlangıç belediyesi (4,4), 3×3, ücretsiz, sabit ve tek örnektir. İşletme/kapasite etkisi eklenmedi; yol ağı köküdür. Kurulum veya tekrar yükleme yeni belediyeler eklemez.
- Katalog: konut 2×2 /100 para /900 saniye, park 2×2 /120 para /900 saniye, santral 3×3 /250 para /2400 saniye. Bu süreler hedef olarak kaydedilir; henüz emek tahsis edilmez.
- Satın alınan örnekler seviye 1 `construction`, yatırım 0 olarak kalır. Nüfus, RP bonusu veya enerji hizmeti üretmez; tamamlanmamış plan aktif hizmet gibi sunulmaz. Kullanıcının gerçek parası dışında başlangıç parası verilmez.
- Katalog sürümü 1, kayıt sürümü 3. Fiyat/footprint veya başlangıç haritası değişirse eski olay replay'i bozulmaması için migration gerekir.

## Önizleme ve ödeme

Seçilen hücre binanın sol üst köşesidir. Önce bütün footprint sınırlar, açık arazi, binalar ve yollarla çakışma açısından kontrol edilir; sonra bakiye kontrol edilir. Doğrulama UI'da önizlenir, store'da onay sırasında tekrar yapılır. Yanlış yerleşim yazma yapmaz ve para düşmez. Önizleme iptali yalnızca UI durumunu siler; kalıcı olay veya harcama oluşturmaz.

Yeşil geçerli, sarı geçerli ama yol bağlantısı uyarılı, kırmızı geçersiz önizlemedir. Durumlar metinle ve ekran okuyucu etiketleriyle de açıklanır. Yol erişimi zorunlu satın alma koşulu değil, açık bir uyarıdır.

Para, harita ve işlem günlüğü tek AsyncStorage setItem çağrısıyla kaydedilir; başarıdan sonra UI'ya birlikte yansır. Yazma sırasında veya storage hatasında başka eylem engellenir. Retry aynı aday snapshot'ı yeniden yazar; fiyatı yeniden düşmez. Çift onay store yazma kilidine takılır. Hata varken önizleme iptali de engellenir; onaylanmış fakat henüz kaydedilememiş işlemin gizlenmesi önlenir.

## Yol bağlantısı

Yollar tek hücredir, ücretsizdir ve ekleme/kaldırma için ayrı araç + hücre seçimi + onay kullanılır. Aynı hücreye ikinci yol, yapı footprint'ine veya kilitli araziye yol reddedilir. “Yol kaldır” var olmayan yolu kaldıramaz. Bu prototipte yol veya bina taşıma emeği tüketmez.

Belediye footprint'inin dört yönlü dış komşularındaki yol hücreleri BFS kuyruğunun başlangıcıdır. Yol-yol geçişi yalnızca sol/sağ/yukarı/aşağıdır. `visited` kümesi döngüde tekrar gezmeyi engeller. Konut veya diğer bina, footprint'inin herhangi bir hücresinin dört yönlü komşusu bağlı bir yol ise yol erişimine sahiptir. Köşe teması hem belediye-yol hem yol-yol hem bina-yol için bağlantı sayılmaz.

Bağlantı flag'i kalıcı tutulmaz; haritadan türetilir. Yol kaldırıldığında veya yapı taşındığında bağlı ağ ve uyarılar yeniden hesaplanır. Alternatif yol varsa bağlantı korunur. Belediye kökünün kendi erişimi tanım gereği geçerlidir.

## Taşıma

İncele aracında yapıya dokunmak, tür/seviye/durum/hedef süre ve yol erişimi ayrıntısını gösterir. Belediye taşınamaz. Diğer planlar ücretsiz taşınabilir; aynı ID, durum ve yatırım/hedef süreleri korunur. Yeni footprint doğrulaması kendi eski footprint'ini yok sayar; diğer yapılar ve yollar hâlâ engeldir. Geçersiz hedef eski konumu değiştirmez. Onay öncesi iptal veya hata para/konum değiştirmez. Bina silme/iade uygulanmadı.

## Version 3 kayıt ve olay replay'i

Güncel anahtar `@focus-city/save/v3`; önceki v2 ve v1 anahtarları yedek olarak bırakılır. Okuma önceliği v3 → yalnızca yoksa v2 → yalnızca o da yoksa v1. Bozuk yeni kayıt varlığı, eski yedeğe sessizce dönerek değişiklikleri veya ödemeleri kaybettirmez.

Zarf focus, economy ve world içerir. `world.map` haritadır; `world.actions` her onaylanan place/move/add_road/remove_road komutunu benzersiz ID ve `afterRewardCount` ile tutar. Bu sayı, işlemden önce kaç tamamlanmış oturumun ödüllendirildiğini kaydeder. Reddedilen veya iptal edilen UI önizlemesi günlüğe girmez.

Yüklemede:

1. Focus kaydı ve bonus snapshot'larından brüt ekonomi/ödül ledger'ı yeniden oluşturulur; kayıt sırası korunur.
2. Harita başlangıç belediyesinden başlayarak olaylar sırayla replay edilir.
3. Her satın alma, o ana kadar kazanılmış coin prefix'i eksi önceki harcamalarla doğrulanır. Sonraki oturumun parasını geçmiş işlemde kullanmak, azalan/gelecekteki reward count veya yinelenen event ID reddedilir.
4. Footprint ve bağlantı geometrisi aynı saf kurallarla yeniden kurulur. Son net cüzdan brüt ödüller eksi onaylanmış harcamadır.
5. Yeniden kurulan world ve economy, kayıtla eşleşmelidir. Bozulmuş koordinat, ek yol/bina, değiştirilmiş katalog/açık arazi, eksik/tekrar işlem veya tutarsız bakiye hata verir; raw kayıt korunur.

V1 önce temel ödüllere dönüştürülür; v2 mevcut ekonomi replay'iyle doğrulanır; ikisi de kaynaklarını koruyup tek ücretsiz belediyeyle v3'e taşınır. Sonraki yeni odaklanma ödülleri net cüzdana eklenir; eski bina harcamaları geri verilmez. Üretimde ekonomi koşulları bu fazda hâlâ boş olduğundan dönemlerin ek vergi/gider etkisi yoktur. İleride bina aktivasyonu ve hizmetler eklenince focus/map/ekonomi olaylarını tam sırayla işleyecek yeni şema gerekir; v3'e arka kapıdan bakiye veya yapı durumu yazılmamalı.

Bu yerel tutarlılık kontrolüdür; sunucu doğrulaması veya hile koruması değildir. Webde aynı origin'in çoklu sekmeleri için yazma kilidi hâlâ yoktur. Günlük büyüdükçe replay/saklama stratejisi profillenmeli; şu an harita 144 hücreyle sınırlıdır ve değişmeyen geometri indeksi memoize edilir.

## Arayüz ve sınırlar

Hücreler 48×48 birimdir, koordinat ve içerik erişilebilirlik etiketi taşır. Dar ekranda yatay ScrollView, sayfa için dikey ScrollView kullanılır. Önizleme/inceleme paneli haritanın altındadır; kullanıcı panel için aşağı kaydırır. Bu bir debug yerleşim akışıdır; sürükle-bırak ve ürün UX cilası bu fazın kapsamı dışındadır.

Semboller kodla çizilir; telifli sprite/harita görseli veya dış kütüphane eklenmedi. A53 native testte gerçek bakiye 4 olduğu için pozitif bina satın alma fixture eklenerek yapılmadı. Pozitif konut/park/santral ve taşıma akışları yalnızca saf/store otomatik testlerinde kazanılmış para içeren fixture'larla doğrulanır; üretim state'ine sahte kaynak yazılmaz.
