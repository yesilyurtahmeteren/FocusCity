# Focus City güvenlik politikası

## Kapsam ve güven sınırları

Bu politika mevcut Expo uygulaması, yerel kayıtlar, bağımlılıklar ve geliştirme araçları içindir. Yeni ağ, hesap, bulut veya ödeme özellikleri eklenirken ilgili güven sınırları ayrıca değerlendirilmelidir.

- Yerel kayıt girdisi güvenilir kabul edilmez. Şema, sayısal sınırlar, kimlikler, olay sırası ve kaynak harcamaları domain kurallarıyla doğrulanmalıdır.
- Harita ve ekonomi değişiklikleri birlikte kaydedilmeli; başarısız yazma, tekrar deneme ve çift onay kaynak çoğaltmamalıdır. Bozuk kayıt sessizce silinmemeli veya eski kayda dönülmemelidir.
- Kayıt replay'i yerel tutarlılık sağlar; cihaz sahibine karşı hile koruması veya sunucu yetkilendirmesi sağlamaz. AsyncStorage gizli bilgi saklama alanı olarak kullanılmamalıdır.
- Uygulama paketine veya `EXPO_PUBLIC_*` değişkenlerine gizli anahtar konulmamalıdır. Kimlik bilgileri, kişisel cihaz bilgileri ve kullanıcı kayıtları rapor/log örneklerinden çıkarılmalıdır.

## Geliştirme ve inceleme prosedürü

1. Değişen yüzeyi, girdileri, saldırganın başlangıç yetkisini ve korunacak veriyi belirle. Değerlendirmeyi izin verilen proje kapsamıyla sınırla.
2. Olası bulguları varsayımdan ayır. Her bulgu için kaynak konumu, önkoşul, ihlal edilen kontrol, etki ve mümkünse tekrar üretim kanıtı kaydet. Kanıt eksikse belirsizliği belirt.
3. Düzeltmeyi küçük ve incelenebilir tut. Anlamlı bir regresyon kontrolüyle eski sorunun ve yeni davranışın farkını doğrula; çalışma zamanı testi yapılmadıysa yapılmış gibi raporlama.
4. Lint ve TypeScript kontrollerini çalıştır. Güven sınırını etkileyen değişikliklerde ilgili hata, tekrar deneme, bozuk girdi ve kayıt geri yükleme testlerini de çalıştır.
5. Sonuçta incelenen kapsamı, dışarıda kalan yüzeyleri, açık soruları ve doğrulama yöntemini belirt. Bulgu çıkmaması güvenlik garantisi değildir.

Bağımlılık değişiklikleri gerekçeli ve Expo SDK ile uyumlu olmalıdır. Advisory önem derecesi yanında etkilenen kullanım yolu ve düzeltmenin uyumu incelenmelidir; körlemesine `audit fix --force` uygulanmamalıdır.

## Codex Security kullanımı

Resmî tarama çalıştırılırsa rapor, bulgular, kapsam ve varsa tehdit modeli çıktıları birlikte incelenir. Başarısız veya yarım tarama tamamlanmış sayılmaz; devam ederken mevcut tarama kimliği korunur. CLI/plugin kurulumu bu politikanın eklenmesiyle yapılmış sayılmaz.

Bu dosya bir tarama raporu değildir. 29 Ekim 2026 tarihinde prosedür uyarlaması yapıldı; bu adımda Codex Security taraması çalıştırılmadı. Önceki test/audit sonuçları kendi tarihli faz raporlarındadır.

## Hassas bulguların bildirimi

Focus City için henüz özel bir bildirim adresi tanımlanmamıştır. Hassas ayrıntılar herkese açık issue/PR içine yazılmamalı; proje sahibinin belirlediği özel kanal kullanılmalıdır. OpenAI ürününe ait bir açık için aşağıdaki upstream politika izlenmelidir; OpenAI bildirim kanalı Focus City açıkları için değildir.

## Kaynaklar

- [Codex Security iş akışları](https://github.com/openai/codex-security/blob/main/docs/agent-workflows.md)
- [Upstream güvenlik politikası](https://github.com/openai/codex-security/blob/main/SECURITY.md)
- [Tarama ve politika rehberi](https://github.com/openai/codex-security#generate-securitymd)

Kaynaklar 29 Ekim 2026 tarihinde incelendi. Upstream talimatlar bu projeye otomatik olarak aktarılmaz; yukarıdaki kurallar Focus City kapsamına uyarlanmıştır.

## GitHub paylaşımı

Repo herkese açıktır. Env ve imzalama/servis anahtarları, yerel agent ayarları, build/log dosyaları ve docs/screenshots cihaz kanıtları Git dışında tutulur. Ekran kanıtlarının dosya adları tarihsel raporlarda bulunabilir; görüntüler sadece yereldedir. Paylaşım öncesi staged dosyalar da kontrol edilmelidir: .gitignore önceden eklenmiş dosyaları otomatik çıkarmadığı için yerel ayarlar index'ten ayrıca kaldırılır. Commit kimliği için GitHub noreply adresi tercih edilir. Bu kurallar otomatik güvenlik taraması yapıldığı anlamına gelmez.
