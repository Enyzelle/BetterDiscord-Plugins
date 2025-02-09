# BetterDiscord Plugins

A collection of useful BetterDiscord plugins that enhance your Discord experience.

## Plugins

### 🎵 ListenAlong

Enable Spotify listen along functionality without requiring Spotify Premium.

**Features:**
- Enables Spotify listen along without Premium subscription
- Seamless integration with Discord's existing Spotify features
- Automatic library dependency installation
- User-friendly error handling

### 🎥 StreamUnblocker

Remove Discord's streaming quality restrictions and stream at high quality without Nitro.

**Features:**
- Stream at 1440p resolution
- Enable 60 FPS streaming
- Increased bitrate up to 8000kbps
- High-quality screen sharing
- Configurable notifications

### 🌈 ColoredNameEverywhere

Customize your display name with various color effects that show up everywhere in Discord.

**Features:**
- Multiple color effects:
  - Gradient (two-color blend)
  - Rainbow (animated color cycle)
  - Breathing (pulsing animation)
  - Plain Color (solid color)
- Works in all Discord locations:
  - Member list
  - Chat messages
  - User popouts
  - Full user profiles
- Live preview in settings
- Customizable animation speed
- Supports display names and global names

**Troubleshooting:**
If colors aren't showing up properly:
1. Make sure you're using your display name (not username#tag)
2. Try reloading Discord (Ctrl+R)
3. Check if the plugin is enabled
4. Try different color modes
5. If using gradient mode, ensure both colors are different
6. For server-specific issues, check if you have a nickname set

Common fixes:

```css
/* Add to custom CSS if colors aren't showing */
[class="name-"],
[class="username-"],
[class="nickname-"] {
background: none !important;
-webkit-text-fill-color: initial !important;
}

```

## Installation

1. Make sure you have [BetterDiscord](https://betterdiscord.app/) installed
2. Download the desired plugin:
   - [ListenAlong.plugin.js](https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ListenAlong/ListenAlong.plugin.js)
   - [StreamUnblocker.plugin.js](https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/StreamUnblocker/StreamUnblocker.plugin.js)
   - [ColoredNameEverywhere.plugin.js](https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ColoredNameEverywhere/ColoredNameEverywhere.plugin.js)
3. Place the downloaded file in your BetterDiscord plugins folder:
   - Windows: `%appdata%/BetterDiscord/plugins`
   - Linux: `~/.config/BetterDiscord/plugins`
   - Mac: `~/Library/Application Support/BetterDiscord/plugins`

## Dependencies

All plugins require the EnyzelleLibrary to function. The library will be automatically downloaded when you first run any plugin.

## Support

If you encounter any issues or have suggestions:
- Open an issue on GitHub
- Join our Discord community (coming soon)

### Known Issues and Fixes

**ColoredNameEverywhere:**
- If colors only show in settings: Try switching color modes
- If animations are laggy: Reduce animation speed
- If colors conflict with roles: Enable "Override role colors" in settings
- For server nicknames: Make sure to set display name

**ListenAlong:**
- If listen along button is missing: Restart Discord
- If premium prompt appears: Reload the plugin

**StreamUnblocker:**
- If quality options are missing: Toggle the plugin
- If FPS is locked: Check Discord's performance mode setting

## License

These plugins are licensed under MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Enyzelle**
- GitHub: [@Enyzelle](https://github.com/Enyzelle)
- Discord: Enyzelle#0001

## Disclaimer

These plugins are not affiliated with Discord, Spotify, or BetterDiscord. Use at your own risk.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
