# tuc translator User Manual

---

## 1. Interface Features & Operation Guide

### 1. Getting Started

After opening the web page for the first time, complete the following steps:

1. **Enter Your Name**: Enter your display name (e.g., `Barret`, your job title, or seat number).
2. **Enter Gemini API Key**: Enter your Google AI Studio API key (format: `AIza...`).
3. **Create or Join a Room**:
   - Click "Create New Room" to start a translation session.
   - Or paste an invitation link shared by others into the URL bar to join directly.

> [!IMPORTANT]
> **Strict Admission Mechanism**: When entering a meeting room, the system will detect if you have a valid API Key (personal or shared). If neither is available, the setup guide will pop up automatically. If you choose to cancel, you will be unable to enter the room or view any translations.

> [!NOTE]
> The API Key is stored locally in your browser and will not be uploaded to any server.

---

### 2. Language Selection Bar (Control Panel)

The horizontal bar in the center of the screen, from left to right:

| Element | Description |
|---|---|
| 🏳️ Left Flag | The language you speak (source language) |
| 🌐 Left Dropdown | Select "My Language" (Local); cannot be changed while recording |
| ⇄ Center Arrow Button | Quickly swap left/right languages; disabled while recording |
| 🌐 Right Dropdown | Select "Other Party's Language" (Client); cannot be changed while recording |
| 🏳️ Right Flag | The other party's language flag |
| 🔴 **LIVE Red Badge** | Real-time voice connection is active, translating via Gemini Live API |
| ⚡ **Local Amber Badge** | Fallback mode, using local speech recognition; translation still works normally |
| 🎙️ Record Button | 🔵 Blue = not recording, click to start; 🔴 Flashing red border = recording, click to stop |

> [!IMPORTANT]
> Languages must be set **before starting recording**. You cannot switch languages while recording.

---

### 3. Translation Chat Box

- Each message displays: speaker name (e.g., `Barret`), original text, and translated text.
- Status bar at the top:
  - 🔴 **Listening...** = Gemini Live is processing audio in real-time
  - 🟡 **Local Mode Listening...** = Fallback mode; recognition and translation still work normally
- Top-right buttons:
  - **Share**: Copy or share all conversation records
  - **Clear**: Delete all conversation records (only the room creator can do this)

---

### 4. Text Input Bar (Bottom of Screen)

When voice is unavailable or you need precise text input:

1. Click the direction button on the left to switch translation direction (Local → Client or Client → Local).
2. Type your message in the text box.
3. Press Enter or click the send button to translate.

> [!NOTE]
> Text input is available at any time, **no need to start recording first**.

---

### 5. Voice Output Settings (Floating Button, Bottom Right)

Click the circular button (speaker icon) at the bottom right to open playback settings:

| Option | Description |
|---|---|
| **Mute** | No voice playback for translations |
| **Myself Only** | Play translated audio only on your device |
| **All** | All participants can hear the audio playback |
| **Others Only** | Only other participants hear it; you won't hear playback |

---

### 6. Top Toolbar

The top left displays the brand logo **TUC** (red bold) and subtitle (default: Equipment Department). The right toolbar, in order:

| Icon | Function |
|---|---|
| 📋 Room ID + Copy Button | Copy the invitation link to share with others |
| 📱 QR Code Icon | Display a QR code for others to scan and join |
| 🚪 Logout Icon | Leave the current room (room creator can choose "End Meeting Room") |
| 👥 User Count (xx/100) | Current number of online users |
| 🌙 / ☀️ Moon / Sun Icon | Toggle Dark / Light mode |
| 🔒 Lock Icon | Admin settings (visible only to the room creator) |
| 🟢 **System Ready** | System is operating normally |

---

### 7. Admin Settings (Lock Icon)

Accessible only to the room creator, includes:

- **Quotas Limitation**: View current API Key RPM / RPD usage dashboard.
- **API Key Settings**: Change Gemini API Key or Google Cloud API Key.
- **API Tier Switch**: Free Tier or Tier 1 (pay-as-you-go) quota mapping.
- **Header Title Settings**: Customize left brand name (default: `TUC`) and subtitle (default: `Equipment Department`).

---

### 8. Why do I need a personal API Key? (BYOK)

This system follows the **BYOK (Bring Your Own Key)** model, providing several key advantages:

1. **Independent Quotas**: Each free key has a limit of 2 connections per minute (RPM). If multiple people share a single key, it's easy to hit this limit, causing everyone to disconnect. Using your own key ensures your connection remains stable and unaffected by others.
2. **Easy and Free Application**: You can get a free key in less than a minute via [Google AI Studio](https://aistudio.google.com/app/apikey). No credit card or complex configuration is required.
3. **Connection Stability**: Having your own dedicated quota ensures you can maintain stable speech recognition and translation during peak times or long meetings.
4. **Data Privacy**: Your API Key and conversation history are stored only in your local browser. The key communicates directly with Google's servers without being forwarded through any third-party centralized servers.

---

## 2. Usage Limitations

### 1. API Quota Limits

This system uses the Google Gemini API. Free Tier account limits are as follows:

| Item | Free Tier Limit |
|---|---|
| **Connections per Minute (RPM)** | 2 |
| **Connections per Day (RPD)** | 50 |
| **Maximum Single Connection Duration** | 3 hours (forced disconnect by system) |
| **Idle Auto-Disconnect** | Prompted after 1 hour; auto-disconnect after 3 minutes with no response |

Quota reset times:
- RPM: Rolling reset every minute (not at fixed intervals)
- RPD: Resets daily at 15:00 (winter) or 16:00 (summer) Thailand time

---

### 2. Browser Compatibility

| Feature | Chrome | Safari (iOS/Mac) | Firefox |
|---|---|---|---|
| Real-time Voice Translation | Full Support | Full Support | **Not Supported** |
| Fallback Local Speech Recognition | Supported | Supported | **Not Supported** |
| Text Input Translation | Supported | Supported | Supported |
| QR Code Sharing | Supported | Supported | Supported |

> [!CAUTION]
> **Firefox users can only use text input mode for translation.** Voice features (both real-time and fallback) are not available.

---

### 3. Language Support

The system supports 37 languages. However, in **fallback mode (Local STT)**, recognition accuracy may be lower for some languages. Chrome or Safari is recommended for:
- Arabic
- Hebrew
- Filipino

---

### 4. iOS Device Notes

> [!WARNING]
> **Switching the app to background or locking the screen**: The microphone will be interrupted by the iOS system. The system will attempt to restart recording within 2 seconds after you return to the app. If it doesn't restart automatically, manually click the record button again.

- **While on a phone call**: Recording will pause. Please manually restart recording after hanging up.

---

## 3. Normal Usage Scenarios & Avoiding Quota Limits

### Background Information

Gemini Live voice "connection count" is calculated as: **each time recording starts, or the system auto-reconnects, counts as 1 request**. It has nothing to do with how long you speak.

- **One continuous meeting** (start recording once, no disconnection) = consumes **1 RPD**
- **One auto-reconnection** = consumes an additional **1 RPD and 1 RPM**

---

### Typical Usage Scenarios

| Behavior | Consumption |
|---|---|
| Start recording once, use continuously for 3 hours | 1 RPD |
| 3-hour limit reached, system disconnects then restarts | +1 RPD |
| Language switch then restart | +1 RPD |
| Internet interruption, system auto-reconnects successfully | +1 RPD (automatic) |

**Estimating 50 RPD per day:**

If each meeting consumes 2-3 connections (including reconnections), you can hold approximately **16-25 meetings per day**.

---

### Recommendations to Avoid Hitting Limits

> [!IMPORTANT]
> **Set languages before starting recording**: Language switching triggers a reconnection, each switch costs +1 RPD. The language selector is locked during recording; you must stop recording first.

> [!IMPORTANT]
> **Avoid starting/stopping recording more than 2 times within 1 minute**: Free Tier allows only 2 connections per minute. If you press start/stop more than 3 times, the API will reject with "API temporarily unavailable" and you'll need to wait 1 minute to retry.

1. **Maintain a stable internet connection**: Intermittent connections trigger auto-reconnection. Wi-Fi is more stable than mobile data.

2. **Keep recording continuous for long meetings**: Don't stop recording just because there's a brief pause. Avoid wasting quota by starting new sessions.

3. **Seeing ⚡ Local (amber badge) is normal**: This means the system has switched to local recognition. **Translation still works.** The system will attempt cloud reconnection in the background and will automatically switch back to 🔴 LIVE mode when successful.

---

### Status Message Explanations

| Status Message | Meaning | Recommended Action |
|---|---|---|
| "Translation session ended, system is automatically reconnecting." | Session expired normally (common after extended use) | Wait for automatic reconnection |
| "API temporarily unavailable (may have reached limit), switched to Local mode." | Hit RPD or RPM limit | Wait for the next minute or next day's quota reset |
| "Connection temporarily interrupted, switched to Local mode. Voice and text input still work normally." | Unstable internet caused disconnection | Continue using; system will attempt recovery automatically |
| "Microphone interrupted, please restart recording." | iOS system interrupted the microphone | Click the record button to restart |

---

*This manual was written based on system version 2026-04-15. Please refer to the actual screen if the interface has been updated.*
