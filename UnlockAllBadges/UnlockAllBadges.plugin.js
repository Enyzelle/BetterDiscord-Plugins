/**
 * @name UnlockAllBadges
 * @author Enyzelle
 * @description Display all Discord badges on your profile (visible to BetterDiscord users only)
 * @version 1.0.0
 * @website https://github.com/Enyzelle/BetterDiscord-Plugins
 * @source https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/UnlockAllBadges/UnlockAllBadges.plugin.js
 * @updateUrl https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/UnlockAllBadges/UnlockAllBadges.plugin.js
 * @require https://raw.githubusercontent.com/Enyzelle/EnyzelleLibrary/main/EnyzelleLibrary.plugin.js
 */

const config = {
    info: {
        name: "UnlockAllBadges",
        authors: [{
            name: "Enyzelle",
            discord_id: "1317482100290752604",
            github_username: "Enyzelle"
        }],
        version: "1.0.0",
        description: "Display all Discord badges on your profile (visible to BetterDiscord users only)",
        github: "https://github.com/Enyzelle/BetterDiscord-Plugins",
        github_raw: "https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/UnlockAllBadges/UnlockAllBadges.plugin.js"
    },
    defaultConfig: [{
        type: "switch",
        id: "staffBadges",
        name: "Show Staff Badges",
        note: "Display Discord Staff and System badges",
        value: true
    }, {
        type: "switch",
        id: "eventBadges",
        name: "Show Event Badges",
        note: "Display HypeSquad, Events, and Partner badges",
        value: true
    }, {
        type: "switch",
        id: "devBadges",
        name: "Show Developer Badges",
        note: "Display Developer, Bug Hunter, and Moderator badges",
        value: true
    }, {
        type: "switch",
        id: "specialBadges",
        name: "Show Special Badges",
        note: "Display rare and special event badges",
        value: true
    }]
};

module.exports = class UnlockAllBadges {
    constructor() {
        this.initialized = false;
    }

    getName() { return config.info.name; }
    getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
    getDescription() { return config.info.description; }
    getVersion() { return config.info.version; }

    start() {
        if (!window.EnyLib) {
            this.showLibraryMissingDialog();
            return;
        }
        
        try {
            this.initialize();
            EnyLib.ui.showToast("UnlockAllBadges activated!", {type: "success"});
        } catch (err) {
            console.error("UnlockAllBadges: Failed to start -", err);
            EnyLib.ui.showToast("Failed to start UnlockAllBadges", {type: "error"});
        }
    }

    stop() {
        try {
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            BdApi.Patcher.unpatchAll("UnlockAllBadges");
            this.initialized = false;
        } catch (err) {
            console.error("Error stopping UnlockAllBadges:", err);
        }
    }

    initialize() {
        if (this.initialized) return;

        try {
            const modules = this.getRequiredModules();
            if (!this.validateModules(modules)) {
                // Try alternative module loading method
                setTimeout(() => {
                    const altModules = this.getRequiredModules();
                    if (this.validateModules(altModules)) {
                        this.patchBadges(altModules);
                        this.patchProfile(altModules);
                        setTimeout(() => this.forceUpdateBadges(), 1000);
                        this.initialized = true;
                        console.log("UnlockAllBadges: Successfully initialized with alternative modules");
                    }
                }, 5000);
                return;
            }

            this.patchBadges(modules);
            this.patchProfile(modules);

            // Delay the first update
            setTimeout(() => this.forceUpdateBadges(), 1000);

            // Set up periodic updates with error handling
            this.updateInterval = setInterval(() => {
                try {
                    if (this.initialized) {
                        this.forceUpdateBadges();
                    }
                } catch (err) {
                    console.debug("Periodic update failed:", err);
                }
            }, 30000); // Update every 30 seconds

            this.initialized = true;
            console.log("UnlockAllBadges: Successfully initialized");
        } catch (err) {
            console.error("UnlockAllBadges: Failed to initialize -", err);
        }
    }

    getRequiredModules() {
        try {
            // Find UserStore first as it's more reliable
            const UserStore = BdApi.Webpack.getModule(m => m?.getCurrentUser);
            const UserProfileStore = BdApi.Webpack.getModule(m => m?.getUserProfile);

            // Try to find badge module through webpack filters first
            let BadgeModule = BdApi.Webpack.getModule(m => m?.toString?.().includes('getBadges'), { searchExports: true });
            
            // If not found, try finding through exports
            if (!BadgeModule) {
                BadgeModule = BdApi.Webpack.getModule(m => {
                    if (!m?.exports) return false;
                    const hasGetBadges = m.exports.default?.getBadges || m.exports?.getBadges;
                    const hasBadgeFlags = m.exports.STAFF || m.exports.DISCORD_EMPLOYEE;
                    return hasGetBadges || hasBadgeFlags;
                });
            }

            // If still not found, try finding through webpack cache
            if (!BadgeModule) {
                const wpRequire = window.webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
                const cache = wpRequire.c;
                
                for (const module of Object.values(cache)) {
                    if (!module?.exports) continue;
                    
                    const exports = module.exports;
                    if (exports.getBadges || exports.default?.getBadges || 
                        exports.DISCORD_EMPLOYEE || exports.STAFF) {
                        BadgeModule = module;
                        break;
                    }
                }
            }

            // Get badge flags module
            const BadgeFlags = BdApi.Webpack.getModule(m => m?.STAFF || m?.DISCORD_EMPLOYEE);

            // Log what we found
            console.log("Module search results:", {
                BadgeModule: BadgeModule ? {
                    hasBadges: !!BadgeModule?.exports?.getBadges,
                    hasDefaultBadges: !!BadgeModule?.exports?.default?.getBadges,
                    hasFlags: !!BadgeModule?.exports?.STAFF
                } : false,
                UserStore: !!UserStore,
                UserProfileStore: !!UserProfileStore,
                BadgeFlags: !!BadgeFlags
            });

            return { 
                BadgeModule: BadgeModule?.exports || BadgeModule, 
                UserStore, 
                UserProfileStore, 
                BadgeFlags 
            };
        } catch (err) {
            console.error("Error getting modules:", err);
            return {};
        }
    }

    validateModules(modules) {
        const missing = [];
        
        if (!modules.UserStore) missing.push("UserStore");
        
        // More lenient BadgeModule check
        if (!modules.BadgeModule && !modules.BadgeFlags) {
            missing.push("Badge Modules");
        }
        
        if (missing.length) {
            console.error("UnlockAllBadges: Missing modules:", missing.join(", "));
            EnyLib.ui.showToast(`Missing modules: ${missing.join(", ")}`, {type: "error"});
            return false;
        }

        // Store modules for later use
        this.modules = modules;
        return true;
    }

    patchBadges(modules) {
        try {
            const badgeModule = modules.BadgeModule;
            const badgeFlags = modules.BadgeFlags;

            // Patch any available badge methods
            if (badgeModule) {
                // Try patching default export
                if (badgeModule.default) {
                    if (typeof badgeModule.default.getBadges === 'function') {
                        BdApi.Patcher.after("UnlockAllBadges", badgeModule.default, "getBadges", this.addBadges.bind(this));
                    }
                    if (typeof badgeModule.default.getUserBadges === 'function') {
                        BdApi.Patcher.after("UnlockAllBadges", badgeModule.default, "getUserBadges", this.addBadges.bind(this));
                    }
                }

                // Try patching direct methods
                if (typeof badgeModule.getBadges === 'function') {
                    BdApi.Patcher.after("UnlockAllBadges", badgeModule, "getBadges", this.addBadges.bind(this));
                }
                if (typeof badgeModule.getUserBadges === 'function') {
                    BdApi.Patcher.after("UnlockAllBadges", badgeModule, "getUserBadges", this.addBadges.bind(this));
                }
            }

            // Patch badge flags
            if (badgeFlags) {
                Object.defineProperties(badgeFlags, {
                    STAFF: { value: true, configurable: true },
                    PARTNER: { value: true, configurable: true },
                    HYPESQUAD: { value: true, configurable: true },
                    BUG_HUNTER_LEVEL_1: { value: true, configurable: true },
                    BUG_HUNTER_LEVEL_2: { value: true, configurable: true },
                    VERIFIED_DEVELOPER: { value: true, configurable: true },
                    PREMIUM_EARLY_SUPPORTER: { value: true, configurable: true },
                    ACTIVE_DEVELOPER: { value: true, configurable: true },
                    DISCORD_EMPLOYEE: { value: true, configurable: true },
                    DISCORD_CERTIFIED_MODERATOR: { value: true, configurable: true }
                });
            }

            console.log("Successfully patched badges");
        } catch (err) {
            console.error("Error patching badges:", err);
        }
    }

    patchProfile(modules) {
        if (modules.UserProfileStore) {
            BdApi.Patcher.after("UnlockAllBadges", modules.UserProfileStore, "getUserProfile", (_, [userId], ret) => {
                if (userId === modules.UserStore?.getCurrentUser()?.id) {
                    if (!ret) ret = {};
                    ret.flags = this.getAllFlags();
                }
                return ret;
            });
        }
    }

    addBadges(_, [user], ret) {
        const currentUser = BdApi.Webpack.getModule(m => m?.getCurrentUser)?.getCurrentUser();
        if (!currentUser || user?.id !== currentUser?.id) return ret;

        const badges = new Set(ret || []);
        const settings = this.getSettings();

        // Staff Badges
        if (settings.staffBadges) {
            badges.add("staff");
            badges.add("partner");
            badges.add("certified_moderator");
            badges.add("discord_employee");
            badges.add("system");
        }

        // Event Badges
        if (settings.eventBadges) {
            badges.add("hypesquad");
            badges.add("hypesquad_house_1"); // Bravery
            badges.add("hypesquad_house_2"); // Brilliance
            badges.add("hypesquad_house_3"); // Balance
            badges.add("hypesquad_events");
            badges.add("partner");
        }

        // Developer Badges
        if (settings.devBadges) {
            badges.add("bug_hunter_level_1");
            badges.add("bug_hunter_level_2");
            badges.add("verified_developer");
            badges.add("early_verified_bot_developer");
            badges.add("moderator_programs_alumni");
        }

        // Special Badges
        if (settings.specialBadges) {
            badges.add("active_developer");
            badges.add("premium_early_supporter");
            badges.add("early_supporter");
            badges.add("discord_birthday");
            badges.add("legacy_username");
        }

        return Array.from(badges);
    }

    getAllFlags() {
        const settings = this.getSettings();
        let flags = 0;

        if (settings.staffBadges) {
            flags |= 1; // STAFF
            flags |= 2; // PARTNER
            flags |= 4; // HYPESQUAD
            flags |= 8; // BUG_HUNTER_LEVEL_1
        }

        if (settings.eventBadges) {
            flags |= 64; // HYPESQUAD_ONLINE_HOUSE_1
            flags |= 128; // HYPESQUAD_ONLINE_HOUSE_2
            flags |= 256; // HYPESQUAD_ONLINE_HOUSE_3
        }

        if (settings.devBadges) {
            flags |= 131072; // VERIFIED_DEVELOPER
            flags |= 8192; // EARLY_VERIFIED_BOT_DEVELOPER
            flags |= 262144; // MODERATOR_PROGRAMS_ALUMNI
        }

        if (settings.specialBadges) {
            flags |= 512; // PREMIUM_EARLY_SUPPORTER
            flags |= 4194304; // ACTIVE_DEVELOPER
            flags |= 1048576; // DISCORD_CERTIFIED_MODERATOR
        }

        return flags;
    }

    getSettings() {
        return Object.assign({}, config.defaultConfig.reduce((acc, curr) => {
            acc[curr.id] = curr.value;
            return acc;
        }, {}), BdApi.Data.load("UnlockAllBadges", "settings"));
    }

    saveSettings(settings) {
        BdApi.Data.save("UnlockAllBadges", "settings", settings);
        this.stop();
        this.start();
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

    forceUpdateBadges() {
        try {
            const currentUser = this.modules.UserStore?.getCurrentUser();
            if (!currentUser) return;

            // Get dispatcher more carefully
            const Dispatcher = BdApi.Webpack.getModule(m => m?.dispatch && typeof m.dispatch === 'function');
            const FluxDispatcher = BdApi.Webpack.getModule(m => m?._dispatch && typeof m._dispatch === 'function');

            // Create base update data
            const userData = {
                ...currentUser,
                flags: this.getAllFlags()
            };

            // Safer dispatch method
            const safeDispatch = (dispatcher, event) => {
                try {
                    if (dispatcher && typeof dispatcher.dispatch === 'function') {
                        dispatcher.dispatch(event);
                    }
                } catch (err) {
                    console.debug("Dispatch failed:", err);
                }
            };

            // Single events with error handling
            if (Dispatcher) {
                safeDispatch(Dispatcher, {
                    type: "USER_PROFILE_UPDATE",
                    user: userData
                });
            }

            // Update profile if available
            if (this.modules.UserProfileStore?.getUserProfile) {
                const profile = this.modules.UserProfileStore.getUserProfile(currentUser.id);
                if (profile) {
                    profile.flags = this.getAllFlags();
                    
                    // Force profile update
                    if (Dispatcher) {
                        safeDispatch(Dispatcher, {
                            type: "USER_PROFILE_UPDATE",
                            userId: currentUser.id,
                            profile: profile
                        });
                    }
                }
            }

            // Update flags directly if possible
            const UserFlags = BdApi.Webpack.getModule(m => m?.STAFF || m?.DISCORD_EMPLOYEE);
            if (UserFlags) {
                Object.defineProperties(UserFlags, {
                    STAFF: { value: true, configurable: true },
                    PARTNER: { value: true, configurable: true },
                    HYPESQUAD: { value: true, configurable: true },
                    BUG_HUNTER_LEVEL_1: { value: true, configurable: true },
                    BUG_HUNTER_LEVEL_2: { value: true, configurable: true },
                    VERIFIED_DEVELOPER: { value: true, configurable: true },
                    PREMIUM_EARLY_SUPPORTER: { value: true, configurable: true },
                    ACTIVE_DEVELOPER: { value: true, configurable: true },
                    DISCORD_EMPLOYEE: { value: true, configurable: true }
                });
            }

        } catch (err) {
            console.error("Error in forceUpdateBadges:", err);
        }
    }
}; 