/**
 * @name StreamUnblocker
 * @author Enyzelle
 * @description Removes Discord's streaming quality restrictions. Stream at 1440p60 without Nitro!
 * @version 1.0.0
 * @website https://github.com/Enyzelle/BetterDiscord-Plugins
 * @source https://github.com/Enyzelle/BetterDiscord-Plugins/main/StreamUnblocker/StreamUnblocker.plugin.js
 * @updateUrl https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/StreamUnblocker/StreamUnblocker.plugin.js
 * @require https://raw.githubusercontent.com/Enyzelle/EnyzelleLibrary/main/EnyzelleLibrary.plugin.js
 */

const config = {
    info: {
        name: "StreamUnblocker",
        authors: [
            {
                name: "Enyzelle",
                discord_id: "1317482100290752604",
                github_username: "Enyzelle"
            }
        ],
        version: "1.0.0",
        description: "Removes Discord's streaming quality restrictions. Stream at 1440p60 without Nitro!",
        github: "https://github.com/Enyzelle/BetterDiscord-Plugins",
        github_raw: "https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/StreamUnblocker/StreamUnblocker.plugin.js",
        dependencies: ["EnyzelleLibrary"]
    },
    changelog: [
        {
            title: "Initial Release",
            items: [
                "Unlocked 1440p streaming",
                "Unlocked 60 FPS streaming",
                "Increased bitrate to 8000kbps",
                "Added screen share quality unlock"
            ]

        }
    ],
    defaultConfig: [
        {
            type: "switch",
            id: "showToasts",
            name: "Show Notifications",
            note: "Shows a toast notification when the plugin enables high quality streaming",
            value: true
        }
    ],
    main: "index.js"
};

module.exports = class StreamUnblocker {
    constructor() {
        this.patches = [];
        this._config = config;
    }

    start() {
        if (!window.EnyLib) {
            this.showLibraryMissingDialog();
            return;
        }
        this.initialize();
    }

    showLibraryMissingDialog() {
        const downloadLibrary = () => {
            require("request").get("https://raw.githubusercontent.com/Enyzelle/EnyzelleLibrary/main/EnyzelleLibrary.plugin.js", (error, response, body) => {
                if (error) {
                    BdApi.showToast("Failed to download library!", { type: "error" });
                    return;
                }
                
                require("fs").writeFile(
                    require("path").join(BdApi.Plugins.folder, "EnyzelleLibrary.plugin.js"),
                    body, 
                    (err) => {
                        if (err) {
                            BdApi.showToast("Failed to save library!", { type: "error" });
                            return;
                        }
                        BdApi.showToast("Successfully installed EnyzelleLibrary! Please reload Discord.", {
                            type: "success",
                            timeout: 10000
                        });
                    }
                );
            });
        };

        BdApi.showConfirmationModal(
            "Library Missing", 
            `The library plugin EnyzelleLibrary required for ${config.info.name} is missing. Click Download Now to install it.`,
            {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: downloadLibrary
            }
        );
    }

    stop() {
        this.unpatchAll();
    }

    initialize() {
        EnyLib.ui.showToast("StreamUnblocker: Initializing...", { type: "info" });
        
        // Patch multiple modules to fully remove restrictions
        this.patchNitroCheck();
        this.patchStreamQuality();
        this.patchStreamStore();
    }

    patchNitroCheck() {
        // Find and patch the user premium type
        const UserStore = BdApi.Webpack.getModule(m => m?.getCurrentUser);
        if (UserStore?.getCurrentUser) {
            this.patches.push(
                BdApi.Patcher.after('StreamUnblocker', UserStore, 'getCurrentUser', (_, args, ret) => {
                    if (ret) {
                        Object.defineProperty(ret, 'premiumType', { value: 2, configurable: true });
                        Object.defineProperty(ret, 'premium', { value: true, configurable: true });
                    }
                    return ret;
                })
            );
        }

        // Patch premium feature checks
        const FeatureUtils = BdApi.Webpack.getModule(m => m?.canUseHighVideoQuality);
        if (FeatureUtils) {
            const features = [
                'canUseHighVideoQuality',
                'canStreamHighQuality',
                'canStreamMediumQuality',
                'canStream',
                'canStreamQuality'
            ];

            features.forEach(feature => {
                if (typeof FeatureUtils[feature] === 'function') {
                    this.patches.push(
                        BdApi.Patcher.after('StreamUnblocker', FeatureUtils, feature, () => true)
                    );
                }
            });
        }
    }

    patchStreamQuality() {
        const StreamUtils = BdApi.Webpack.getModule(m => m?.getQualityForStreamingFps);
        if (StreamUtils) {
            const highQuality = {
                width: 1920,
                height: 1080,
                framerate: 60,
                bitrate: 8000
            };

            const methods = {
                getQualityForStreamingFps: () => highQuality,
                getMaxStreamFPS: () => 60,
                getUserMaxBitrate: () => 8000,
                getScreenShareQuality: () => highQuality,
                getPremiumStreamingQuality: () => ({
                    resolution: 1080,
                    fps: 60
                })
            };

            Object.entries(methods).forEach(([name, fn]) => {
                if (typeof StreamUtils[name] === 'function') {
                    this.patches.push(
                        BdApi.Patcher.after('StreamUnblocker', StreamUtils, name, () => fn())
                    );
                }
            });
        }
    }

    patchStreamStore() {
        // Patch stream store settings
        const StreamStore = BdApi.Webpack.getModule(m => m?.getStreamQuality);
        if (StreamStore) {
            const methods = {
                getStreamQuality: () => ({
                    resolution: 1080,
                    fps: 60
                }),
                getMaxStreamBitrate: () => 8000
            };

            Object.entries(methods).forEach(([name, fn]) => {
                if (typeof StreamStore[name] === 'function') {
                    this.patches.push(
                        BdApi.Patcher.after('StreamUnblocker', StreamStore, name, () => fn())
                    );
                }
            });
        }

        // Patch stream settings
        const StreamSettings = BdApi.Webpack.getModule(m => m?.default?.getQuality);
        if (StreamSettings?.default) {
            this.patches.push(
                BdApi.Patcher.after('StreamUnblocker', StreamSettings.default, 'getQuality', () => ({
                    resolution: 1080,
                    fps: 60,
                    bitrate: 8000
                }))
            );
        }

        if (this._config.defaultConfig[0].value) {
            EnyLib.ui.showToast('StreamUnblocker: High quality streaming enabled!', {
                type: 'success'
            });
        }
    }

    unpatchAll() {
        this.patches.forEach(unpatch => {
            if (typeof unpatch === 'function') {
                try {
                    unpatch();
                } catch (err) {
                    EnyLib.ui.showToast('StreamUnblocker: Error while unpatching', {
                        type: 'error'
                    });
                    console.error('StreamUnblocker: Error while unpatching:', err);
                }
            }
        });
        this.patches = [];
    }

    getName() { return config.info.name; }
    getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
    getDescription() { return config.info.description; }
    getVersion() { return config.info.version; }

    getSettingsPanel() {
        const panel = document.createElement('div');
        panel.innerHTML = `
            <div style="padding: 16px;">
                <h2 style="color: var(--header-primary); margin-bottom: 10px;">StreamUnblocker Settings</h2>
                <div style="color: var(--text-normal); margin-bottom: 20px;">
                    ✨ All streaming restrictions have been removed.<br>
                    You can now stream at:
                    <ul style="margin-left: 20px; margin-top: 10px;">
                        <li>Up to 1080p resolution</li>
                        <li>60 FPS</li>
                        <li>High bitrate (8000 kbps)</li>
                    </ul>
                </div>
                <div style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px;">
                    Note: The actual quality you can stream at may still be limited by your internet connection and hardware capabilities.
                </div>
                <div style="font-size: 12px; color: var(--text-muted);">
                    Version ${config.info.version} by ${config.info.authors[0].name}<br>
                    <a href="${config.info.github}" style="color: var(--text-link);">GitHub Repository</a>
                </div>
            </div>
        `;
        return panel;
    }
}; 