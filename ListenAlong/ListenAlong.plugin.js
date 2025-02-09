/**
 * @name ListenAlong
 * @author Enyzelle
 * @description Enable Spotify listen along without premium
 * @version 1.1.1
 * @website https://github.com/Enyzelle/BetterDiscord-Plugins
 * @source https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ListenAlong/ListenAlong.plugin.js
 * @updateUrl https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ListenAlong/ListenAlong.plugin.js
 * @require https://raw.githubusercontent.com/Enyzelle/EnyzelleLibrary/main/EnyzelleLibrary.plugin.js
 */

const config = {
    info: {
        name: "ListenAlong",
        authors: [{
            name: "Enyzelle",
            discord_id: "1317482100290752604",
            github_username: "Enyzelle"
        }],
        version: "1.1.1",
        description: "Enable Spotify listen along without premium",
        github: "https://github.com/Enyzelle/BetterDiscord-Plugins",
        github_raw: "https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ListenAlong/ListenAlong.plugin.js",
        dependencies: ["EnyzelleLibrary"]
    },
    changelog: [
        {
            title: "Improvements",
            items: [
                "Added EnyzelleLibrary support",
                "Improved error handling",
                "Added automatic library installation"
            ]
        }
    ]
};

module.exports = class ListenAlong {
    constructor() {
        this.initialized = false;
        this._config = config;
    }

    start() {
        if (!window.EnyLib) {
            this.showLibraryMissingDialog();
            return;
        }

        try {
            this.initialize();
            EnyLib.ui.showToast("ListenAlong has started!", {type: "success"});
        } catch (err) {
            EnyLib.ui.showToast("Failed to start ListenAlong", {type: "error"});
            console.error("ListenAlong: Failed to start -", err);
        }
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
        try {
            BdApi.Patcher.unpatchAll("ListenAlong");
            this.initialized = false;
            EnyLib.ui.showToast("ListenAlong has stopped!", {type: "success"});
        } catch (err) {
            EnyLib.ui.showToast("Failed to stop ListenAlong", {type: "error"});
            console.error("ListenAlong: Failed to stop -", err);
        }
    }

    initialize() {
        if (this.initialized) return;
        
        // Get the Spotify device store module
        const DeviceStore = BdApi.Webpack.getModule(m => m?.getActiveSocketAndDevice);
        
        // Get the listening along store module
        const ListenStore = BdApi.Webpack.getModule(m => m?.isListeningAlong || m?.getListeningAlongStatus);
        
        if (DeviceStore?.getActiveSocketAndDevice) {
            // Patch the device store to always return premium status
            BdApi.Patcher.after("ListenAlong", DeviceStore, "getActiveSocketAndDevice", 
                (_, args, ret) => {
                    if (ret?.socket) {
                        ret.socket.isPremium = true;
                    }
                    return ret;
                }
            );
            console.log("Successfully patched Spotify device store");
        } else {
            throw new Error("Could not find Spotify device store module");
        }

        // Patch the listening along status
        if (ListenStore) {
            // Patch isListeningAlong check
            if (typeof ListenStore.isListeningAlong === 'function') {
                BdApi.Patcher.after("ListenAlong", ListenStore, "isListeningAlong",
                    (_, args, ret) => {
                        return true; // Always show as listening along
                    }
                );
            }

            // Patch getListeningAlongStatus
            if (typeof ListenStore.getListeningAlongStatus === 'function') {
                BdApi.Patcher.after("ListenAlong", ListenStore, "getListeningAlongStatus",
                    (_, args, ret) => {
                        return { isListeningAlong: true }; // Force listening along status
                    }
                );
            }

            console.log("Successfully patched listening along status");
        }

        this.initialized = true;
    }

    getName() { return config.info.name; }
    getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
    getDescription() { return config.info.description; }
    getVersion() { return config.info.version; }
}; 