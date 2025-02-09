/**
 * @name ColoredNameEverywhere
 * @author Enyzelle
 * @description Customize your username with various color effects across Discord
 * @version 1.0.0
 * @website https://github.com/Enyzelle/BetterDiscord-Plugins
 * @source https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ColoredNameEverywhere/ColoredNameEverywhere.plugin.js
 * @updateUrl https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ColoredNameEverywhere/ColoredNameEverywhere.plugin.js
 * @require https://raw.githubusercontent.com/Enyzelle/EnyzelleLibrary/main/EnyzelleLibrary.plugin.js
 */

const config = {
    info: {
        name: "ColoredNameEverywhere",
        authors: [{
            name: "Enyzelle",
            discord_id: "1317482100290752604",
            github_username: "Enyzelle"
        }],
        version: "1.0.0",
        description: "Customize your username with various color effects across Discord",
        github: "https://github.com/Enyzelle/BetterDiscord-Plugins",
        github_raw: "https://raw.githubusercontent.com/Enyzelle/BetterDiscord-Plugins/main/ColoredNameEverywhere/ColoredNameEverywhere.plugin.js",
        dependencies: ["EnyzelleLibrary"]
    }
};

module.exports = class ColoredNameEverywhere {
    constructor() {
        this.initialized = false;
        this._config = config;
        this.defaultSettings = {
            colorMode: "gradient",
            primaryColor: "#ff0000",
            secondaryColor: "#00ff00",
            animationSpeed: 5,
            enabled: true
        };
        this.style = document.createElement("style");
    }

    start() {
        if (!window.EnyLib) {
            this.showLibraryMissingDialog();
            return;
        }
        
        try {
            this.initialize();
            EnyLib.ui.showToast("ColoredNameEverywhere started!", {type: "success"});
        } catch (err) {
            console.error("ColoredNameEverywhere: Failed to start -", err);
            EnyLib.ui.showToast("Failed to start ColoredNameEverywhere", {type: "error"});
        }
    }

    stop() {
        if (this.style?.parentElement) {
            this.style.parentElement.removeChild(this.style);
        }
        BdApi.Patcher.unpatchAll("ColoredNameEverywhere");
        this.initialized = false;
    }

    initialize() {
        if (this.initialized) return;
        
        // Get current user
        const currentUser = BdApi.Webpack.getModule(m => m?.getCurrentUser)?.getCurrentUser();
        if (!currentUser) throw new Error("Could not get current user");
        
        // Save user ID for later use
        this.currentUserId = currentUser.id;
        
        // Initialize settings if not exists
        if (!BdApi.Data.load("ColoredNameEverywhere", "settings")) {
            BdApi.Data.save("ColoredNameEverywhere", "settings", this.defaultSettings);
        }

        // Inject CSS
        this.injectStyles();
        
        // Patch Discord components
        this.patchMessageUsername();
        this.patchMemberList();
        this.patchUserPopout();
        this.patchUserProfile();

        this.initialized = true;
    }

    getSettings() {
        return Object.assign({}, this.defaultSettings, BdApi.Data.load("ColoredNameEverywhere", "settings"));
    }

    saveSettings(settings) {
        BdApi.Data.save("ColoredNameEverywhere", "settings", settings);
        this.updateStyles();
    }

    injectStyles() {
        document.head.appendChild(this.style);
        this.updateStyles();
    }

    updateStyles() {
        const settings = this.getSettings();
        if (!settings.enabled) {
            this.style.textContent = "";
            return;
        }

        let css = `
            /* Base styles for colored username */
            .colored-username,
            .colored-username span {
                display: inline !important;
                font-weight: 600 !important;
                -webkit-text-fill-color: transparent !important;
                -webkit-background-clip: text !important;
                background-clip: text !important;
                position: relative !important;
                z-index: 1 !important;
            }

            /* Force override Discord styles */
            [class*="name-"],
            [class*="username-"],
            [class*="nickname-"],
            [class*="title-"],
            [class*="displayName-"],
            [class*="nameTag-"],
            [class*="customStatus-"],
            [class*="headerText-"] {
                background: none !important;
                -webkit-text-fill-color: initial !important;
            }

            /* Specific overrides for different contexts */
            .member-,
            .username-,
            .nickname-,
            .name-,
            .title-,
            .displayName-,
            .nameTag-,
            .customStatus-,
            .headerText- {
                color: inherit !important;
                background: none !important;
            }

            /* Override any Discord color transitions */
            .colored-username,
            .colored-username * {
                transition: none !important;
            }
        `;

        switch (settings.colorMode) {
            case "gradient":
                css += `
                    .colored-username,
                    .colored-username span {
                        background-image: linear-gradient(90deg, ${settings.primaryColor}, ${settings.secondaryColor}) !important;
                    }
                `;
                break;
            case "rainbow":
                css += `
                    @keyframes rainbow {
                        0% { background-image: linear-gradient(90deg, #ff0000, #ff00ff); }
                        20% { background-image: linear-gradient(90deg, #ff00ff, #0000ff); }
                        40% { background-image: linear-gradient(90deg, #0000ff, #00ffff); }
                        60% { background-image: linear-gradient(90deg, #00ffff, #00ff00); }
                        80% { background-image: linear-gradient(90deg, #00ff00, #ffff00); }
                        100% { background-image: linear-gradient(90deg, #ffff00, #ff0000); }
                    }
                    .colored-username,
                    .colored-username span {
                        animation: rainbow ${11-settings.animationSpeed}s linear infinite !important;
                    }
                `;
                break;
            case "breathing":
                css += `
                    @keyframes breathing {
                        0%, 100% { 
                            background-image: linear-gradient(90deg, ${settings.primaryColor}, ${settings.primaryColor});
                            opacity: 1;
                        }
                        50% { 
                            background-image: linear-gradient(90deg, ${settings.primaryColor}, ${settings.primaryColor});
                            opacity: 0.5;
                        }
                    }
                    .colored-username,
                    .colored-username span {
                        animation: breathing ${11-settings.animationSpeed}s ease-in-out infinite !important;
                    }
                `;
                break;
            case "plain":
                css += `
                    .colored-username,
                    .colored-username span {
                        background-image: linear-gradient(90deg, ${settings.primaryColor}, ${settings.primaryColor}) !important;
                    }
                `;
                break;
        }

        // Additional overrides for specific Discord elements
        css += `
            /* Member list overrides */
            .member- .colored-username {
                width: auto !important;
                height: auto !important;
            }

            /* Chat message overrides */
            .message- .colored-username {
                display: inline !important;
            }

            /* Profile and popout overrides */
            .headerText- .colored-username,
            .nameTag- .colored-username {
                display: inline-block !important;
            }

            /* Force color application */
            .colored-username::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: -1;
            }
        `;

        this.style.textContent = css;
    }

    patchMessageUsername() {
        const MessageModule = BdApi.Webpack.getModule(m => m?.default?.toString?.().includes("messageContent"));
        if (!MessageModule?.default) return;

        BdApi.Patcher.after("ColoredNameEverywhere", MessageModule, "default", (_, [props], ret) => {
            if (props?.message?.author?.id === this.currentUserId) {
                // Target the display name in chat
                const displayName = ret?.props?.children?.find?.(c => 
                    c?.props?.className?.includes("name-") || // Matches display name
                    c?.props?.className?.includes("title-") || // Matches nickname
                    c?.props?.className?.includes("roleColor-") // Matches colored names
                );
                if (displayName) {
                    displayName.props.className += " colored-username";
                    displayName.props.children = BdApi.React.createElement("span", {
                        className: "colored-username"
                    }, typeof displayName.props.children === 'string' ? displayName.props.children : props.message.author.globalName || props.message.author.username);
                }
            }
            return ret;
        });
    }

    patchMemberList() {
        const MemberModule = BdApi.Webpack.getModule(m => m?.default?.displayName === "MemberListItem");
        if (!MemberModule?.default) return;

        BdApi.Patcher.after("ColoredNameEverywhere", MemberModule, "default", (_, [props], ret) => {
            if (props?.user?.id === this.currentUserId) {
                // Target the display name in member list
                const nameWrapper = ret?.props?.children?.find?.(c => 
                    c?.props?.className?.includes("layout-") ||
                    c?.props?.className?.includes("member-")
                );
                if (nameWrapper) {
                    const displayName = nameWrapper.props.children?.find?.(c =>
                        c?.props?.className?.includes("name-") ||
                        c?.props?.className?.includes("nickname-")
                    );
                    if (displayName) {
                        displayName.props.className += " colored-username";
                        displayName.props.children = BdApi.React.createElement("span", {
                            className: "colored-username"
                        }, props.user.globalName || props.user.username);
                    }
                }
            }
            return ret;
        });
    }

    patchUserPopout() {
        const PopoutModule = BdApi.Webpack.getModule(m => m?.default?.displayName === "UserPopoutContainer");
        if (!PopoutModule?.default) return;

        BdApi.Patcher.after("ColoredNameEverywhere", PopoutModule, "default", (_, [props], ret) => {
            if (props?.user?.id === this.currentUserId) {
                // Target the display name in user popout
                const header = ret?.props?.children?.find?.(c => 
                    c?.props?.className?.includes("header-") ||
                    c?.props?.className?.includes("headerText-")
                );
                if (header) {
                    const displayName = header?.props?.children?.find?.(c => 
                        c?.props?.className?.includes("nickname-") || 
                        c?.props?.className?.includes("headerText-") ||
                        c?.props?.className?.includes("displayName-")
                    );
                    if (displayName) {
                        displayName.props.className += " colored-username";
                        displayName.props.children = BdApi.React.createElement("span", {
                            className: "colored-username"
                        }, props.user.globalName || props.user.username);
                    }
                }
            }
            return ret;
        });
    }

    patchUserProfile() {
        const ProfileModule = BdApi.Webpack.getModule(m => m?.default?.displayName === "UserProfileModal");
        if (!ProfileModule?.default) return;

        BdApi.Patcher.after("ColoredNameEverywhere", ProfileModule, "default", (_, [props], ret) => {
            if (props?.user?.id === this.currentUserId) {
                // Target the display name in profile modal
                const nameSection = ret?.props?.children?.find?.(c => 
                    c?.props?.className?.includes("nameTag-") ||
                    c?.props?.className?.includes("nameSection-")
                );
                if (nameSection) {
                    const displayName = nameSection?.props?.children?.find?.(c => 
                        c?.props?.className?.includes("customStatus-") || 
                        c?.props?.className?.includes("displayName-") ||
                        c?.props?.className?.includes("nameTag-")
                    );
                    if (displayName) {
                        displayName.props.className += " colored-username";
                        displayName.props.children = BdApi.React.createElement("span", {
                            className: "colored-username"
                        }, props.user.globalName || props.user.username);
                    }
                }
            }
            return ret;
        });
    }

    getSettingsPanel() {
        const settings = this.getSettings();
        const currentUser = BdApi.Webpack.getModule(m => m?.getCurrentUser)?.getCurrentUser();
        const displayName = currentUser?.globalName || currentUser?.username;
        
        const panel = document.createElement("div");
        panel.className = "colored-name-settings";
        panel.innerHTML = `
            <style>
                .colored-name-settings {
                    padding: 16px;
                    color: var(--text-normal);
                }
                .preview-section {
                    background: var(--background-secondary);
                    padding: 16px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .preview-username {
                    font-size: 24px;
                    margin: 10px 0;
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
            </style>
            <div class="preview-section">
                <h3>Preview</h3>
                <div class="preview-username colored-username">${displayName || "Display Name"}</div>
            </div>
            <div class="settings-section">
                <div class="setting-item">
                    <label>Effect Type</label>
                    <select id="colorMode">
                        <option value="gradient">Gradient</option>
                        <option value="rainbow">Rainbow</option>
                        <option value="breathing">Breathing</option>
                        <option value="plain">Plain Color</option>
                    </select>
                    <div class="note">Choose how your username will be colored</div>
                </div>
                <div class="setting-item">
                    <label>Primary Color</label>
                    <input type="color" id="primaryColor">
                    <div class="note">Main color or gradient start color</div>
                </div>
                <div class="setting-item" id="secondaryColorContainer">
                    <label>Secondary Color</label>
                    <input type="color" id="secondaryColor">
                    <div class="note">Gradient end color</div>
                </div>
                <div class="setting-item">
                    <label>Animation Speed</label>
                    <input type="range" id="animationSpeed" min="1" max="10" step="1">
                    <div class="note">Speed of animations (for Rainbow and Breathing effects)</div>
                </div>
            </div>
        `;

        // Set initial values
        panel.querySelector("#colorMode").value = settings.colorMode;
        panel.querySelector("#primaryColor").value = settings.primaryColor;
        panel.querySelector("#secondaryColor").value = settings.secondaryColor;
        panel.querySelector("#animationSpeed").value = settings.animationSpeed;

        // Add event listeners
        const updateSettings = () => {
            const newSettings = {
                colorMode: panel.querySelector("#colorMode").value,
                primaryColor: panel.querySelector("#primaryColor").value,
                secondaryColor: panel.querySelector("#secondaryColor").value,
                animationSpeed: parseInt(panel.querySelector("#animationSpeed").value),
                enabled: true
            };
            this.saveSettings(newSettings);
        };

        panel.querySelectorAll("select, input").forEach(element => {
            element.addEventListener("change", updateSettings);
            element.addEventListener("input", updateSettings);
        });

        // Show/hide secondary color based on mode
        const updateSecondaryColorVisibility = () => {
            const container = panel.querySelector("#secondaryColorContainer");
            container.style.display = panel.querySelector("#colorMode").value === "gradient" ? "block" : "none";
        };
        panel.querySelector("#colorMode").addEventListener("change", updateSecondaryColorVisibility);
        updateSecondaryColorVisibility();

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