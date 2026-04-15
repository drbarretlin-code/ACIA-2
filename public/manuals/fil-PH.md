# ACIA-2 AI Real-Time Translation System - Gabay sa Paggamit

---

## 1. Mga Feature ng Interface at Gabay sa Operasyon

### 1. Pagsisimula

Pagkatapos buksan ang web page sa unang pagkakataon, kumpletuhin ang mga sumusunod na hakbang:

1. **Ilagay ang Iyong Pangalan**: Ilagay ang iyong display name (halimbawa: `Barret`, titulo ng trabaho, o numero ng upuan).
2. **Ilagay ang Gemini API Key**: Ilagay ang iyong Google AI Studio API key (format: `AIza...`).
3. **Gumawa o Sumali sa Room**:
   - I-click ang "Gumawa ng Bagong Room" para simulan ang translation session.
   - O i-paste ang invitation link na ibinigay ng iba para direktang sumali.

> [!NOTE]
> Ang API Key ay naka-store lang sa iyong browser at hindi ia-upload sa anumang server.

---

### 2. Language Selection Bar (Control Panel)

Ang horizontal bar sa gitna ng screen, mula kaliwa pakanan:

| Elemento | Paglalarawan |
|---|---|
| 🏳️ Kaliwang Bandila | Ang wikang sinasalita mo (source language) |
| 🌐 Kaliwang Dropdown | Piliin ang "Aking Wika" (Local); hindi mababago habang nagre-record |
| ⇄ Gitnang Arrow Button | Mabilis na magpalit ng kaliwa/kanang wika; hindi magagamit habang nagre-record |
| 🌐 Kanang Dropdown | Piliin ang "Wika ng Kabilang Partido" (Client); hindi mababago habang nagre-record |
| 🏳️ Kanang Bandila | Bandila ng wika ng kabilang partido |
| 🔴 **LIVE Red Badge** | Aktibo ang real-time voice connection, nagta-translate sa pamamagitan ng Gemini Live API |
| ⚡ **Local Amber Badge** | Fallback mode, gumagamit ng local speech recognition; gumagana pa rin ang translation |
| 🎙️ Record Button | 🔵 Asul = hindi nagre-record, i-click para magsimula; 🔴 Kumukurap na pulang border = nagre-record, i-click para ihinto |

> [!IMPORTANT]
> Ang mga wika ay dapat i-set **bago magsimulang mag-record**. Hindi mo mababago ang wika habang nagre-record.

---

### 3. Translation Chat Box

- Bawat mensahe ay nagpapakita ng: pangalan ng nagsasalita (halimbawa: `Barret`), orihinal na teksto, at isinalin na teksto.
- Status bar sa itaas:
  - 🔴 **Nakikinig...** = Real-time na pinoproseso ng Gemini Live ang audio
  - 🟡 **Local Mode Nakikinig...** = Fallback mode; gumagana pa rin ang recognition at translation
- Mga button sa kanang itaas:
  - **Share**: Kopyahin o ibahagi lahat ng conversation records
  - **Clear**: Burahin lahat ng conversation records (ang room creator lang ang makakagawa nito)

---

### 4. Text Input Bar (Ibaba ng Screen)

Kapag hindi available ang boses o kailangan ng tumpak na text input:

1. I-click ang direction button sa kaliwa para baguhin ang direksyon ng translation (Local → Client o Client → Local).
2. I-type ang iyong mensahe sa text box.
3. Pindutin ang Enter o i-click ang send button para mag-translate.

> [!NOTE]
> Ang text input ay available anumang oras, **hindi kailangang mag-record muna**.

---

### 5. Voice Output Settings (Floating Button, Kanang Ibaba)

I-click ang bilog na button (speaker icon) sa kanang ibaba para buksan ang playback settings:

| Opsyon | Paglalarawan |
|---|---|
| **Mute** | Walang voice playback para sa translations |
| **Sarili Ko Lang** | I-play ang translated audio sa iyong device lang |
| **Lahat** | Lahat ng participants ay makakarinig ng audio playback |
| **Iba Lang** | Ang ibang participants lang ang makakarinig; hindi mo maririnig |

---

### 6. Top Toolbar

Ang kaliwang itaas ay nagpapakita ng brand logo na **TUC** (pulang bold) at subtitle (default: Equipment Department). Kanang toolbar, sa pagkakasunod-sunod:

| Icon | Function |
|---|---|
| 📋 Room ID + Copy Button | Kopyahin ang invitation link para ibahagi |
| 📱 QR Code Icon | Ipakita ang QR Code para ma-scan at makasali |
| 🚪 Logout Icon | Umalis sa kasalukuyang room |
| 👥 User Count (xx/100) | Kasalukuyang bilang ng online users |
| 🌙 / ☀️ Moon / Sun Icon | I-toggle ang Dark / Light mode |
| 🔒 Lock Icon | Admin settings (nakikita lang ng room creator) |
| 🟢 **System Ready** | Normal na gumagana ang sistema |

---

### 7. Admin Settings (Lock Icon)

Accessible lang sa room creator:

- **Quotas Limitation**: Tingnan ang RPM / RPD usage dashboard.
- **API Key Settings**: Baguhin ang Gemini API Key o Google Cloud API Key.
- **API Tier Switch**: Free Tier o Tier 1 (bayad ayon sa paggamit).
- **Header Title Settings**: I-customize ang brand name (default: `TUC`) at subtitle (default: `Equipment Department`).

---

## 2. Mga Limitasyon sa Paggamit

### 1. API Quota Limits

Gumagamit ang system ng Google Gemini API. Mga limitasyon ng Free Tier:

| Item | Free Tier Limit |
|---|---|
| **Connections per Minute (RPM)** | 2 |
| **Connections per Day (RPD)** | 50 |
| **Maximum Single Connection Duration** | 3 oras (sapilitang disconnect) |
| **Idle Auto-Disconnect** | Tatanungin pagkatapos ng 1 oras; auto-disconnect pagkatapos ng 3 minuto na walang tugon |

Oras ng quota reset:
- RPM: Rolling reset bawat minuto
- RPD: Nire-reset araw-araw ng 15:00 (taglamig) o 16:00 (tag-init) oras ng Thailand

---

### 2. Browser Compatibility

| Feature | Chrome | Safari (iOS/Mac) | Firefox |
|---|---|---|---|
| Real-time Voice Translation | Full Support | Full Support | **Hindi Suportado** |
| Fallback Local Speech Recognition | Suportado | Suportado | **Hindi Suportado** |
| Text Input Translation | Suportado | Suportado | Suportado |
| QR Code Sharing | Suportado | Suportado | Suportado |

> [!CAUTION]
> **Ang mga Firefox user ay text input mode lang ang magagamit.** Hindi available ang voice features.

---

### 3. Language Support

Suportado ng sistema ang 37 na wika. Sa **fallback mode (Local STT)**, maaaring mas mababa ang accuracy para sa ilang wika. Inirerekomenda ang Chrome o Safari para sa:
- Arabic
- Hebrew
- Filipino

---

### 4. Mga Tala para sa iOS Device

> [!WARNING]
> **Pag-switch ng app sa background o pag-lock ng screen**: Ma-i-interrupt ang microphone ng iOS system. Susubukan ng sistema na i-restart ang recording sa loob ng 2 segundo pagbalik mo sa app.

- **Habang tumatanggap ng tawag**: Magpo-pause ang recording. Manu-manong i-restart ang recording pagkatapos ibaba ang tawag.

---

## 3. Mga Normal na Scenario ng Paggamit at Pag-iwas sa Quota Limits

### Pangunahing Impormasyon

Ang "bilang ng koneksyon" ng Gemini Live ay kinakalkula bilang: **bawat pagsisimula ng recording o auto-reconnect = 1 request**.

- **Isang tuloy-tuloy na meeting** = gumagamit ng **1 RPD**
- **Isang auto-reconnection** = karagdagang **1 RPD at 1 RPM**

---

### Mga Rekomendasyon

> [!IMPORTANT]
> **I-set ang mga wika bago mag-record**: Ang pag-switch ng wika ay nagti-trigger ng reconnection, bawat switch ay +1 RPD.

> [!IMPORTANT]
> **Iwasan ang pag-start/stop ng recording ng higit sa 2 beses sa loob ng 1 minuto**: Ang Free Tier ay 2 connections lang per minute ang pinapayagan.

1. **Panatilihing stable ang internet connection**: Mas stable ang Wi-Fi kaysa mobile data.
2. **Tuloy-tuloy na mag-record para sa mahabang meetings**: Huwag ihinto ang recording dahil lang sa maikling pause.
3. **Normal lang ang makita ang ⚡ Local**: Gumagana pa rin ang translation. Awtomatikong babalik sa 🔴 LIVE kapag matagumpay ang reconnection.

---

*Ang gabay na ito ay isinulat batay sa system version 2026-04-15.*
