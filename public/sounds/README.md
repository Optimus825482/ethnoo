# Notification Sounds

Bu klasör, push bildirimleri için kullanılan ses dosyalarını içerir.

## Ses Dosyaları

### 1. urgent.mp3 (High Priority)
- **Kullanım**: Yüksek öncelikli bildirimler (yeni buggy talepleri)
- **Süre**: 1-2 saniye
- **Boyut**: < 100KB
- **Özellik**: Dikkat çekici, acil

### 2. notification.mp3 (Normal Priority)
- **Kullanım**: Normal öncelikli bildirimler
- **Süre**: 1-2 saniye
- **Boyut**: < 100KB
- **Özellik**: Standart bildirim sesi

### 3. subtle.mp3 (Low Priority)
- **Kullanım**: Düşük öncelikli bildirimler
- **Süre**: 0.5-1 saniye
- **Boyut**: < 50KB
- **Özellik**: Hafif, dikkat dağıtmayan

## Ses Dosyası Gereksinimleri

- **Format**: MP3, OGG veya WAV
- **Maksimum Boyut**: 100KB
- **Önerilen Süre**: 1-3 saniye
- **Sample Rate**: 44.1kHz veya 48kHz
- **Bit Rate**: 128kbps (MP3 için)

## Ses Dosyası Oluşturma

### Online Araçlar
- [Notification Sounds](https://notificationsounds.com/)
- [FreeSound](https://freesound.org/)
- [Mixkit](https://mixkit.co/free-sound-effects/notification/)

### Ses Düzenleme
- [Audacity](https://www.audacityteam.org/) (Ücretsiz)
- [Adobe Audition](https://www.adobe.com/products/audition.html)

## Fallback

Ses dosyaları yüklenemezse, `common.js` içindeki `playGeneratedSound()` fonksiyonu Web Audio API kullanarak otomatik olarak ses oluşturur.

## Cache

Ses dosyaları Service Worker tarafından otomatik olarak cache'lenir ve offline erişim için saklanır.
