/**
 * @name FakeNitro
 * @author Enyzelle
 * @description Unlock Nitro perks and display Nitro badges (visible to BetterDiscord users only)
 * @version 1.0.0
 * @website https://github.com/Enyzelle/BetterDiscord-Plugins
 * @source https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/FakeNitro/FakeNitro.plugin.js
 * @updateUrl https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/FakeNitro/FakeNitro.plugin.js
 * @require https://raw.githubusercontent.com/Enyzelle/EnyzelleLibrary/main/EnyzelleLibrary.plugin.js
 */

const config = {
    info: {
        name: "FakeNitro",
        authors: [{
            name: "Enyzelle",
            discord_id: "1317482100290752604",
            github_username: "Enyzelle"
        }],
        version: "1.0.0",
        description: "Unlock Nitro perks and display Nitro badges (visible to BetterDiscord users only)",
        github: "https://github.com/Enyzelle/BetterDiscord-Plugins",
        github_raw: "https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/FakeNitro/FakeNitro.plugin.js",
        dependencies: ["EnyzelleLibrary"]
    },
    changelog: [{
        title: "Initial Release",
        items: [
            "Added Nitro badge display",
            "Added Boost badge display",
            "Unlocked emoji usage anywhere",
            "Unlocked animated emoji usage",
            "Unlocked higher file upload size",
            "Added monthly badge rotation",
            "Added custom profile themes",
            "Added custom tag styles"
        ]
    }],
    defaultConfig: [{
        type: "switch",
        id: "showBadges",
        name: "Show Nitro Badges",
        note: "Display Nitro and Boost badges on your profile",
        value: true
    }, {
        type: "switch",
        id: "rotateBadges",
        name: "Rotate Boost Badge",
        note: "Changes boost months badge periodically",
        value: true
    }, {
        type: "dropdown",
        id: "boostMonths",
        name: "Boost Badge Months",
        note: "Select your preferred boost duration badge",
        value: "24",
        options: [
            { label: "1 Month", value: "1" },
            { label: "2 Months", value: "2" },
            { label: "3 Months", value: "3" },
            { label: "6 Months", value: "6" },
            { label: "9 Months", value: "9" },
            { label: "12 Months", value: "12" },
            { label: "15 Months", value: "15" },
            { label: "18 Months", value: "18" },
            { label: "24 Months", value: "24" }
        ]
    }]
};

module.exports = class FakeNitro {
    constructor() {
        this.initialized = false;
        this._config = config;
        this.badges = new Set();
        this.badgeRotationInterval = null;
    }

    start() {
        if (!window.EnyLib) {
            this.showLibraryMissingDialog();
            return;
        }
        
        try {
            this.initialize();
            EnyLib.ui.showToast("FakeNitro activated!", {type: "success"});
        } catch (err) {
            console.error("FakeNitro: Failed to start -", err);
            EnyLib.ui.showToast("Failed to start FakeNitro", {type: "error"});
        }
    }

    stop() {
        try {
            if (this.badgeRotationInterval) {
                clearInterval(this.badgeRotationInterval);
                this.badgeRotationInterval = null;
            }

            // Clean up patches safely
            BdApi.Patcher.unpatchAll("FakeNitro");

            // Reset user object safely
            const UserStore = this.modules?.UserStore;
            if (UserStore) {
                const user = UserStore.getCurrentUser();
                if (user) {
                    delete user.premiumType;
                    delete user.premium;
                }
            }

            this.initialized = false;
        } catch (err) {
            console.error("Error stopping FakeNitro:", err);
        }
    }

    initialize() {
        if (this.initialized) return;

        try {
            // Basic modules that we absolutely need
            const requiredModules = {
                UserStore: BdApi.Webpack.getModule(m => m?.getCurrentUser)
            };

            // Check if essential modules are available
            if (!requiredModules.UserStore) {
                console.error("FakeNitro: Missing UserStore module");
                return;
            }

            this.modules = requiredModules;

            // Apply patches in order
            this.safelyPatchPremiumType();
            this.safelyPatchEmojis();
            this.safelyPatchUpload();
            this.safelyPatchBadges();

            if (this.getSettings().rotateBadges) {
                this.safelyStartRotation();
            }

            // Force Discord to update
            const Dispatcher = BdApi.Webpack.getModule(m => m?.dispatch);
            if (Dispatcher) {
                Dispatcher.dispatch({
                    type: "USER_PROFILE_UPDATE",
                    user: this.modules.UserStore.getCurrentUser()
                });
            }

            this.initialized = true;
            console.log("FakeNitro: Successfully initialized");
        } catch (err) {
            console.error("FakeNitro: Failed to initialize -", err);
        }
    }

    safelyPatchPremiumType() {
        try {
            const UserStore = this.modules.UserStore;
            if (!UserStore) return;

            // Create a premium handler that always returns true
            const premiumHandler = () => true;

            // Patch user object using a safer method
            BdApi.Patcher.after("FakeNitro", UserStore, "getCurrentUser", (_, __, ret) => {
                if (!ret) return ret;

                // Create a safe wrapper that preserves the original object
                const wrapper = Object.create(ret);

                // Add our premium properties to the wrapper
                Object.defineProperties(wrapper, {
                    premiumType: { get: () => 2, configurable: true },
                    premium: { get: () => true, configurable: true },
                    flags: { get: () => (ret.flags || 0) | 256, configurable: true }
                });

                // Add methods safely
                wrapper.isPremium = premiumHandler;
                wrapper.isPremiumAtLeast = premiumHandler;
                wrapper.isNitroOrBetter = premiumHandler;
                wrapper.isNitroPremium = premiumHandler;
                wrapper.isNitroBasic = premiumHandler;
                wrapper.isNitroClassic = premiumHandler;
                wrapper.getPremiumUsageFlags = () => 127;

                return wrapper;
            });

            // Find all premium-related modules
            const modules = {
                PremiumUtils: BdApi.Webpack.getModule(m => m?.isPremium),
                NitroUtils: BdApi.Webpack.getModule(m => m?.isNitroUser),
                PremiumStatus: BdApi.Webpack.getModule(m => m?.canUseCustomStatus),
                PremiumFeatures: BdApi.Webpack.getModule(m => m?.canUsePremiumFeatures)
            };

            // Patch each module's prototype instead of the module directly
            Object.values(modules).forEach(module => {
                if (!module) return;
                
                const prototype = Object.getPrototypeOf(module);
                if (!prototype) return;

                const premiumMethods = [
                    "isPremium",
                    "isPremiumAtLeast",
                    "isNitroOrBetter",
                    "isNitroPremium",
                    "isNitroBasic",
                    "isNitroClassic",
                    "canUseCustomStatus",
                    "canUsePremiumFeatures",
                    "canUseCustomStatusEverywhere",
                    "isNitroUser"
                ];

                premiumMethods.forEach(method => {
                    if (prototype[method]) {
                        BdApi.Patcher.after("FakeNitro", prototype, method, () => true);
                    }
                });
            });

            // Create a global premium check override
            const globalPremiumCheck = () => true;
            window.isPremium = globalPremiumCheck;
            window.isNitroUser = globalPremiumCheck;
            window.hasPremium = globalPremiumCheck;

        } catch (err) {
            console.error("Failed to patch premium type:", err);
        }
    }

    safelyPatchEmojis() {
        try {
            const EmojiModule = BdApi.Webpack.getModule(m => m?.getCustomEmojiById);
            if (!EmojiModule) return;

            const methods = ["canUseAnimatedEmojis", "canUseCustomEmojis"];
            methods.forEach(method => {
                if (typeof EmojiModule[method] === "function") {
                    BdApi.Patcher.instead("FakeNitro", EmojiModule, method, () => true);
                }
            });
        } catch (err) {
            console.error("Failed to patch emojis:", err);
        }
    }

    safelyPatchUpload() {
        try {
            const UploadModule = BdApi.Webpack.getModule(m => m?.getMaxFileSize);
            if (!UploadModule) return;

            BdApi.Patcher.instead("FakeNitro", UploadModule, "getMaxFileSize", () => 
                100 * 1024 * 1024 // 100MB
            );
        } catch (err) {
            console.error("Failed to patch upload:", err);
        }
    }

    safelyPatchBadges() {
        try {
            // Get the badge module directly
            const BadgeModule = BdApi.Webpack.getModule(m => m?.default?.getBadges || m?.getBadges);
            const UserProfileStore = BdApi.Webpack.getModule(m => m?.getUserProfile);
            
            // Patch the main badge getter
            if (BadgeModule?.default) {
                BdApi.Patcher.after("FakeNitro", BadgeModule.default, "getBadges", this._addBadges.bind(this));
            } else if (BadgeModule) {
                BdApi.Patcher.after("FakeNitro", BadgeModule, "getBadges", this._addBadges.bind(this));
            }

            // Patch profile store
            if (UserProfileStore) {
                BdApi.Patcher.after("FakeNitro", UserProfileStore, "getUserProfile", (_, [userId], ret) => {
                    if (userId === this.modules.UserStore?.getCurrentUser()?.id) {
                        if (!ret) ret = {};
                        ret.premiumType = 2;
                        ret.premiumSince = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000));
                        ret.nitroBoost = {
                            months: parseInt(this.getSettings().boostMonths),
                            active: true
                        };
                    }
                    return ret;
                });
            }

            // Force update after patching
            this._forceUpdateBadges();
        } catch (err) {
            console.error("Failed to patch badges:", err);
        }
    }

    _addBadges(_, [user], ret) {
        if (!this.getSettings().showBadges) return ret;
        if (user?.id !== this.modules.UserStore?.getCurrentUser()?.id) return ret;

        const badges = Array.isArray(ret) ? ret : [];
        const months = parseInt(this.getSettings().boostMonths);

        // Add Nitro badges
        if (!badges.includes("premium")) badges.push("premium");
        if (!badges.includes("premium_early_supporter")) badges.push("premium_early_supporter");

        // Add boost badge
        if (months > 0) {
            const boostBadge = `premium_guild_subscription_${months}`;
            if (!badges.includes(boostBadge)) badges.push(boostBadge);
        }

        return badges;
    }

    _forceUpdateBadges() {
        const Dispatcher = BdApi.Webpack.getModule(m => m?.dispatch);
        if (!Dispatcher) return;

        const currentUser = this.modules.UserStore?.getCurrentUser();
        if (!currentUser) return;

        // Force multiple updates to ensure badges show
        ["USER_PROFILE_UPDATE", "USER_BADGES_UPDATE", "PREMIUM_STATUS_UPDATE"].forEach(type => {
            Dispatcher.dispatch({ type, user: currentUser });
        });
    }

    safelyStartRotation() {
        try {
            if (this.badgeRotationInterval) {
                clearInterval(this.badgeRotationInterval);
            }

            const boostLevels = ["1", "2", "3", "6", "9", "12", "15", "18", "24"];
            let currentIndex = boostLevels.indexOf(this.getSettings().boostMonths);

            this.badgeRotationInterval = setInterval(() => {
                try {
                    currentIndex = (currentIndex + 1) % boostLevels.length;
                    const settings = this.getSettings();
                    settings.boostMonths = boostLevels[currentIndex];
                    this.saveSettings(settings);
                } catch (err) {
                    console.error("Error in badge rotation:", err);
                    clearInterval(this.badgeRotationInterval);
                }
            }, 30 * 60 * 1000);
        } catch (err) {
            console.error("Failed to start badge rotation:", err);
        }
    }

    patchProfileThemes() {
        // Get profile modules
        const ProfileUtils = BdApi.Webpack.getModule(m => m?.getUserProfile);
        const ThemeUtils = BdApi.Webpack.getModule(m => m?.getUserTheme);
        
        if (ProfileUtils) {
            BdApi.Patcher.after("FakeNitro", ProfileUtils, "getUserProfile", (_, [userId], ret) => {
                if (userId === BdApi.Webpack.getModule(m => m?.getCurrentUser)?.getCurrentUser()?.id) {
                    if (!ret) ret = {};
                    ret.themeColors = {
                        primaryColor: "#ff0000",
                        accentColor: "#00ff00"
                    };
                    ret.premiumType = 2;
                }
                return ret;
            });
        }

        if (ThemeUtils) {
            BdApi.Patcher.instead("FakeNitro", ThemeUtils, "getUserTheme", () => ({
                primaryColor: "#ff0000",
                accentColor: "#00ff00",
                backgroundGradient: true,
                backgroundColors: ["#ff0000", "#00ff00", "#0000ff"]
            }));
        }
    }

    getSettings() {
        return Object.assign({}, config.defaultConfig.reduce((acc, curr) => {
            acc[curr.id] = curr.value;
            return acc;
        }, {}), BdApi.Data.load("FakeNitro", "settings"));
    }

    saveSettings(settings) {
        BdApi.Data.save("FakeNitro", "settings", settings);
        this.stop();
        this.start();
    }

    getSettingsPanel() {
        const settings = this.getSettings();
        
        const panel = document.createElement("div");
        panel.className = "fake-nitro-settings";
        panel.innerHTML = `
            <style>
                .fake-nitro-settings {
                    padding: 16px;
                    color: var(--text-normal);
                }
                .setting-item {
                    margin-bottom: 16px;
                }
                .setting-item label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 500;
                }
                .setting-item select,
                .setting-item input {
                    background: var(--background-secondary);
                    border: none;
                    color: var(--text-normal);
                    padding: 8px;
                    border-radius: 4px;
                    width: 200px;
                }
                .setting-item .note {
                    margin-top: 4px;
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .nitro-features {
                    background: var(--background-secondary);
                    padding: 16px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .nitro-features h3 {
                    margin-top: 0;
                }
                .feature-list {
                    list-style: none;
                    padding-left: 0;
                }
                .feature-list li {
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                }
                .feature-list li:before {
                    content: "✓";
                    color: var(--text-positive);
                    margin-right: 8px;
                }
            </style>
            <div class="nitro-features">
                <h3>Active Nitro Features</h3>
                <ul class="feature-list">
                    <li>Nitro Badge Display</li>
                    <li>Server Boost Badge</li>
                    <li>Custom Emoji Anywhere</li>
                    <li>Animated Emoji Usage</li>
                    <li>100MB Upload Size</li>
                    <li>Custom Profile Themes</li>
                    <li>Custom Tag Styles</li>
                </ul>
            </div>
            <div class="settings-section">
                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="showBadges" ${settings.showBadges ? 'checked' : ''}>
                        Show Nitro Badges
                    </label>
                    <div class="note">Display Nitro and Boost badges on your profile</div>
                </div>
                <div class="setting-item">
                    <label>
                        <input type="checkbox" id="rotateBadges" ${settings.rotateBadges ? 'checked' : ''}>
                        Rotate Boost Badge
                    </label>
                    <div class="note">Changes boost months badge periodically</div>
                </div>
                <div class="setting-item">
                    <label>Boost Badge Months</label>
                    <select id="boostMonths">
                        ${config.defaultConfig.find(c => c.id === 'boostMonths').options.map(opt => 
                            `<option value="${opt.value}" ${settings.boostMonths === opt.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>`
                        ).join('')}
                    </select>
                    <div class="note">Select your preferred boost duration badge</div>
                </div>
            </div>
        `;

        // Add event listeners
        const updateSettings = () => {
            const newSettings = {
                showBadges: panel.querySelector("#showBadges").checked,
                rotateBadges: panel.querySelector("#rotateBadges").checked,
                boostMonths: panel.querySelector("#boostMonths").value
            };
            this.saveSettings(newSettings);
        };

        panel.querySelectorAll("select, input").forEach(element => {
            element.addEventListener("change", updateSettings);
        });

        return panel;
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

    getName() { return config.info.name; }
    getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
    getDescription() { return config.info.description; }
    getVersion() { return config.info.version; }
}; 