const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: "/scram/scramjet.wasm.wasm",
		all: "/scram/scramjet.all.js",
		sync: "/scram/scramjet.sync.js",
	},
	flags: {
		rewriterLogs: false,
		scramitize: false,
		cleanErrors: true,
		sourcemaps: true,
	},
});

scramjet.init();
navigator.serviceWorker.register("./sw.js");

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
connection.setTransport(store.transport, [{ wisp: store.wispurl }]);

const QUICK_LINKS = [
	{ label: "Google", url: "https://www.google.com/" },
	{ label: "YouTube", url: "https://www.youtube.com/" },
	{ label: "Reddit", url: "https://www.reddit.com/" },
	{ label: "Discord", url: "https://discord.com/" },
];

function normalizeUrl(value) {
	const trimmed = value.trim();
	if (!trimmed) return "";
	if (!trimmed.startsWith("http")) {
		return "https://" + trimmed;
	}

	return trimmed;
}

function getTransportLabel(transport) {
	switch (transport) {
		case "/baremod/index.mjs":
			return "Bare Server 3";
		case "/libcurl/index.mjs":
			return "libcurl.js";
		default:
			return "Epoxy";
	}
}

function BrowserApp() {
	this.css = `
		:scope {
			--bg-0: #f7f9ff;
			--bg-1: #edf2ff;
			--panel: rgba(255, 255, 255, 0.76);
			--panel-strong: rgba(255, 255, 255, 0.92);
			--panel-soft: rgba(98, 115, 255, 0.08);
			--border: rgba(104, 123, 191, 0.16);
			--border-strong: rgba(114, 95, 255, 0.34);
			--text-0: #18213d;
			--text-1: rgba(36, 50, 88, 0.76);
			--text-2: rgba(70, 87, 129, 0.6);
			--accent: #4f7cff;
			--accent-strong: #8452ff;
			--accent-soft: rgba(90, 112, 255, 0.14);
			--shadow: 0 28px 80px rgba(88, 108, 176, 0.18);
			box-sizing: border-box;
			display: flex;
			height: 100vh;
			width: 100vw;
			padding: 24px;
			color: var(--text-0);
			background:
				radial-gradient(circle at top left, rgba(100, 125, 255, 0.2), transparent 28%),
				radial-gradient(circle at 78% 18%, rgba(151, 112, 255, 0.16), transparent 22%),
				linear-gradient(145deg, var(--bg-0) 0%, #f2f5ff 30%, var(--bg-1) 100%);
			overflow: hidden;
		}

		* {
			box-sizing: border-box;
		}

		a {
			color: inherit;
			text-decoration: none;
		}

		button,
		input {
			font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		}

		.shell-frame {
			position: relative;
			display: flex;
			flex: 1;
			min-height: 0;
			min-width: 0;
			border: 1px solid rgba(120, 137, 205, 0.14);
			border-radius: 28px;
			background:
				linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(243, 247, 255, 0.64)),
				rgba(246, 249, 255, 0.72);
			backdrop-filter: blur(18px);
			box-shadow: var(--shadow);
			overflow: hidden;
		}

		.shell-frame::before {
			content: "";
			position: absolute;
			inset: 0;
			background:
				radial-gradient(circle at 20% 14%, rgba(94, 121, 255, 0.14), transparent 26%),
				radial-gradient(circle at 82% 78%, rgba(151, 112, 255, 0.1), transparent 24%);
			pointer-events: none;
		}

		.landing-shell {
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			flex: 1;
			min-width: 0;
			padding: 48px;
		}

		.landing-main,
		.preview-column {
			min-width: 0;
		}

		.landing-main {
			display: flex;
			align-items: center;
			justify-content: center;
			width: min(840px, 100%);
			padding: 0;
		}

		.landing-toolbar {
			position: absolute;
			top: 28px;
			right: 30px;
			z-index: 2;
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.landing-status {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.kicker {
			display: inline-flex;
			align-items: center;
			gap: 10px;
			align-self: center;
			padding: 9px 14px;
			border: 1px solid rgba(102, 124, 255, 0.2);
			border-radius: 999px;
			background: rgba(91, 115, 255, 0.08);
			color: #4d64cb;
			font-family: "IBM Plex Mono", monospace;
			font-size: 0.75rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
		}

		.kicker::before {
			content: "";
			width: 8px;
			height: 8px;
			border-radius: 999px;
			background: linear-gradient(180deg, var(--accent), var(--accent-strong));
			box-shadow: 0 0 14px rgba(105, 99, 255, 0.35);
		}

		.hero-copy {
			display: grid;
			width: 100%;
			justify-items: center;
			gap: 0;
			text-align: center;
		}

		.brand-mark {
			width: 112px;
			max-width: 100%;
			filter: drop-shadow(0 18px 42px rgba(99, 120, 255, 0.2));
		}

		.landing-title {
			margin: 0;
			font-family: "Inter Tight", "Inter", sans-serif;
			font-size: clamp(2.4rem, 4vw, 3.5rem);
			line-height: 1.02;
			letter-spacing: -0.06em;
			max-width: 12ch;
		}

		.landing-subtitle {
			max-width: 46ch;
			margin: 0;
			color: var(--text-1);
			font-size: 0.98rem;
			line-height: 1.6;
		}

		.launch-panel {
			display: flex;
			flex-direction: column;
			gap: 0;
			width: min(840px, 100%);
			padding: 0;
			border: none;
			border-radius: 0;
			background: transparent;
			box-shadow: none;
		}

		.launch-label {
			display: none;
		}

		.launch-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr);
			gap: 0;
			align-items: center;
		}

		.landing-input,
		.bar,
		.endpoint-input {
			width: 100%;
			border: 1px solid rgba(116, 135, 200, 0.18);
			outline: none;
			color: var(--text-0);
			background: rgba(255, 255, 255, 0.92);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.82),
				0 0 0 0 rgba(95, 114, 255, 0);
			transition:
				border-color 160ms ease,
				box-shadow 160ms ease,
				transform 160ms ease;
		}

		.landing-input:focus,
		.bar:focus,
		.endpoint-input:focus {
			border-color: rgba(95, 114, 255, 0.5);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.82),
				0 0 0 4px rgba(95, 114, 255, 0.14);
		}

		.landing-input {
			height: 72px;
			padding: 0 28px;
			border-radius: 999px;
			font-size: 1.04rem;
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.82),
				0 16px 36px rgba(95, 114, 255, 0.1);
		}

		.primary-button,
		.quick-link,
		.nav button,
		.transport-button,
		.ghost-button {
			border: none;
			border-radius: 18px;
			cursor: pointer;
			transition:
				transform 140ms ease,
				background 140ms ease,
				border-color 140ms ease,
				opacity 140ms ease;
		}

		.primary-button:hover,
		.quick-link:hover,
		.nav button:hover,
		.transport-button:hover,
		.ghost-button:hover {
			transform: translateY(-1px);
		}

		.primary-button {
			height: 68px;
			padding: 0 26px;
			font-weight: 700;
			font-size: 0.98rem;
			color: white;
			background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
			box-shadow: 0 18px 34px rgba(108, 94, 255, 0.26);
		}

		.launch-button {
			display: none;
		}

		.launch-button::before {
			content: "Open";
			font-size: 0.98rem;
		}

		.quick-links,
		.site-chips {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
			justify-content: center;
		}

		.route-guide {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
		}

		.route-card {
			display: grid;
			gap: 10px;
			padding: 14px;
			border: 1px solid rgba(113, 133, 199, 0.12);
			border-radius: 18px;
			background: rgba(255, 255, 255, 0.68);
		}

		.route-card p {
			margin: 0;
			color: var(--text-2);
			font-size: 0.88rem;
			line-height: 1.6;
		}

		.route-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: fit-content;
			padding: 8px 12px;
			border-radius: 999px;
			font-family: "IBM Plex Mono", monospace;
			font-size: 0.72rem;
			letter-spacing: 0.03em;
		}

		.route-badge-direct {
			border: 1px solid rgba(79, 124, 255, 0.16);
			background: rgba(79, 124, 255, 0.1);
			color: #4064c9;
		}

		.route-badge-page {
			border: 1px solid rgba(132, 82, 255, 0.16);
			background: rgba(132, 82, 255, 0.1);
			color: #6a4ed2;
		}

		.quick-link {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: 108px;
			padding: 12px 16px;
			border: 1px solid rgba(113, 133, 199, 0.14);
			background: rgba(255, 255, 255, 0.76);
			color: var(--text-0);
			font-weight: 600;
		}

		.launch-meta {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			gap: 14px;
			color: var(--text-2);
			font-size: 0.84rem;
		}

		.transport-pill,
		.preview-badge,
		.site-chip {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			padding: 8px 12px;
			border-radius: 999px;
			font-family: "IBM Plex Mono", monospace;
			font-size: 0.73rem;
			letter-spacing: 0.02em;
		}

		.transport-pill,
		.site-chip {
			border: 1px solid rgba(113, 133, 199, 0.14);
			background: rgba(255, 255, 255, 0.78);
			color: #425498;
		}

		.preview-badge {
			border: 1px solid rgba(110, 102, 255, 0.18);
			background: rgba(106, 119, 255, 0.09);
			color: #5a55cb;
		}

		.preview-column {
			position: relative;
			display: none;
			flex-direction: column;
			justify-content: space-between;
			padding: 12px;
			border: 1px solid var(--border);
			border-radius: 28px;
			background:
				linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(244, 247, 255, 0.74)),
				var(--panel-strong);
			overflow: hidden;
		}

		.route-guide,
		.launch-meta,
		.landing-toolbar,
		.kicker,
		.brand-mark,
		.landing-title,
		.landing-subtitle,
		.quick-links {
			display: none;
		}

		.preview-column::before {
			content: "";
			position: absolute;
			inset: auto -8% -18% auto;
			width: 280px;
			height: 280px;
			border-radius: 999px;
			background: radial-gradient(circle, rgba(128, 120, 255, 0.18), transparent 64%);
			pointer-events: none;
		}

		.preview-header {
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			padding: 10px 12px 14px;
		}

		.ghost-button {
			padding: 10px 14px;
			border: 1px solid rgba(113, 133, 199, 0.14);
			background: rgba(255, 255, 255, 0.78);
			color: var(--text-0);
			font-weight: 600;
		}

		.preview-card {
			position: relative;
			z-index: 1;
			display: flex;
			flex-direction: column;
			gap: 18px;
			padding: 18px;
			border: 1px solid rgba(113, 133, 199, 0.16);
			border-radius: 24px;
			background: rgba(250, 252, 255, 0.84);
			box-shadow:
				inset 0 1px 0 rgba(255, 255, 255, 0.74),
				0 18px 36px rgba(112, 128, 191, 0.08);
		}

		.browser-preview {
			display: flex;
			flex-direction: column;
			border: 1px solid rgba(113, 133, 199, 0.14);
			border-radius: 20px;
			background: linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%);
			overflow: hidden;
		}

		.browser-preview-header {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			gap: 12px;
			align-items: center;
			padding: 14px 16px;
			border-bottom: 1px solid rgba(113, 133, 199, 0.1);
			background: rgba(243, 246, 255, 0.96);
		}

		.preview-dots {
			display: flex;
			gap: 8px;
		}

		.preview-dots span {
			width: 9px;
			height: 9px;
			border-radius: 999px;
			background: rgba(124, 137, 185, 0.18);
		}

		.preview-dots span:nth-child(1) {
			background: #5d8fff;
		}

		.preview-dots span:nth-child(2) {
			background: #7c6dff;
		}

		.preview-dots span:nth-child(3) {
			background: #b6c3ff;
		}

		.preview-url {
			min-width: 0;
			padding: 11px 14px;
			border: 1px solid rgba(113, 133, 199, 0.12);
			border-radius: 14px;
			background: rgba(255, 255, 255, 0.88);
			color: var(--text-2);
			font-family: "IBM Plex Mono", monospace;
			font-size: 0.75rem;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.preview-body {
			display: flex;
			flex-direction: column;
			gap: 18px;
			padding: 20px;
		}

		.preview-body h2 {
			margin: 0;
			font-family: "Inter Tight", "Inter", sans-serif;
			font-size: 1.8rem;
			letter-spacing: -0.05em;
		}

		.preview-body p {
			margin: 0;
			color: var(--text-1);
			line-height: 1.65;
		}

		.preview-notes {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 12px;
		}

		.note-card {
			padding: 14px;
			border: 1px solid rgba(113, 133, 199, 0.12);
			border-radius: 18px;
			background: rgba(255, 255, 255, 0.76);
		}

		.note-card strong {
			display: block;
			margin-bottom: 8px;
			font-size: 0.92rem;
		}

		.note-card span {
			color: var(--text-2);
			font-size: 0.88rem;
			line-height: 1.55;
		}

		.preview-footer {
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 14px;
			padding: 14px 6px 6px;
			color: var(--text-2);
			font-size: 0.82rem;
		}

		.preview-footer a {
			font-family: "IBM Plex Mono", monospace;
			color: #5a55cb;
		}

		.browser-shell {
			position: relative;
			z-index: 1;
			display: flex;
			flex: 1;
			flex-direction: column;
			min-height: 0;
			min-width: 0;
			width: 100%;
			height: 100%;
			padding: 18px;
			gap: 16px;
		}

		.nav {
			display: grid;
			grid-template-columns: auto auto auto auto minmax(0, 1fr) auto auto;
			gap: 10px;
			align-items: center;
			width: 100%;
			padding: 12px;
			border: 1px solid rgba(113, 133, 199, 0.14);
			border-radius: 22px;
			background:
				linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(245, 248, 255, 0.78)),
				rgba(255, 255, 255, 0.82);
		}

		.nav button {
			height: 46px;
			padding: 0 14px;
			border: 1px solid rgba(113, 133, 199, 0.14);
			background: rgba(255, 255, 255, 0.78);
			color: var(--text-0);
			font-weight: 600;
		}

		.bar {
			height: 46px;
			padding: 0 16px;
			border-radius: 14px;
			font-size: 0.94rem;
		}

		.nav-route-toggle {
			display: inline-grid;
			grid-template-columns: repeat(2, auto);
			gap: 6px;
			align-items: center;
			padding: 6px;
			border: 1px solid rgba(113, 133, 199, 0.14);
			border-radius: 16px;
			background: rgba(255, 255, 255, 0.74);
		}

		.nav-route {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: 102px;
			height: 34px;
			padding: 0 12px;
			border-radius: 12px;
			color: var(--text-2);
			font-family: "IBM Plex Mono", monospace;
			font-size: 0.72rem;
			letter-spacing: 0.03em;
			transition:
				background 140ms ease,
				color 140ms ease,
				box-shadow 140ms ease;
		}

		.nav-route.is-active {
			background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%);
			color: white;
			box-shadow: 0 10px 24px rgba(108, 94, 255, 0.2);
		}

		.frame-shell {
			display: flex;
			flex: 1 1 auto;
			min-height: 0;
			min-width: 0;
			width: 100%;
			height: 100%;
			border: 1px solid rgba(113, 133, 199, 0.14);
			border-radius: 24px;
			background: rgba(255, 255, 255, 0.8);
			overflow: hidden;
		}

		iframe {
			flex: 1;
			width: 100%;
			height: 100%;
			min-height: 0;
			border: none;
			display: block;
			background: white;
		}

		dialog.cfg {
			width: min(560px, calc(100vw - 48px));
			padding: 22px;
			border: 1px solid rgba(113, 133, 199, 0.16);
			border-radius: 24px;
			background:
				linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 255, 0.86)),
				rgba(255, 255, 255, 0.94);
			color: var(--text-0);
			box-shadow: var(--shadow);
		}

		dialog.cfg::backdrop {
			background: rgba(44, 56, 107, 0.18);
			backdrop-filter: blur(8px);
		}

		.cfg-inner {
			display: flex;
			flex-direction: column;
			gap: 18px;
		}

		.cfg-top {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 20px;
		}

		.cfg-title {
			margin: 0;
			font-family: "Inter Tight", "Inter", sans-serif;
			font-size: 1.5rem;
			letter-spacing: -0.04em;
		}

		.cfg-copy {
			margin: 8px 0 0;
			color: var(--text-1);
			line-height: 1.6;
		}

		.transport-row {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 10px;
		}

		.transport-button {
			padding: 14px 12px;
			border: 1px solid rgba(113, 133, 199, 0.14);
			background: rgba(255, 255, 255, 0.8);
			color: var(--text-0);
			font-weight: 600;
		}

		.endpoint-grid {
			display: grid;
			gap: 14px;
		}

		.endpoint-group {
			display: grid;
			gap: 8px;
		}

		.endpoint-group label {
			color: var(--text-2);
			font-size: 0.84rem;
		}

		.endpoint-input {
			height: 48px;
			padding: 0 14px;
			border-radius: 14px;
			font-size: 0.92rem;
		}

		.cfg-footer {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 14px;
			padding-top: 8px;
		}

		.cfg-footer span {
			color: var(--text-2);
			font-family: "IBM Plex Mono", monospace;
			font-size: 0.75rem;
		}
	`;

	this.mode = "landing";
	this.url = store.url || "";
	this.transportLabel = getTransportLabel(store.transport);
	this.previewTransportUrl =
		"proxy://launch/" +
		this.transportLabel.toLowerCase().replace(/\s+/g, "-");
	this.landingStyle = "display:flex;";
	this.browserStyle = "display:none;";
	this.navigationMode = "direct";
	this.pendingNavigationMode = null;
	this.directNavigationClass = "nav-route is-active";
	this.pageNavigationClass = "nav-route";

	const app = this;
	const frame = scramjet.createFrame();

	this.syncMode = () => {
		const browsing = this.mode === "browsing";
		this.landingStyle = browsing ? "display:none;" : "display:flex;";
		this.browserStyle = browsing ? "display:flex;" : "display:none;";
	};

	this.syncTransport = () => {
		this.transportLabel = getTransportLabel(store.transport);
		this.previewTransportUrl =
			"proxy://launch/" +
			this.transportLabel.toLowerCase().replace(/\s+/g, "-");
	};

	this.syncRootLayout = () => {
		if (!this.root) return;

		Object.assign(this.root.style, {
			boxSizing: "border-box",
			display: "flex",
			width: "100vw",
			height: "100vh",
			minWidth: "0",
			minHeight: "0",
			padding: "24px",
			overflow: "hidden",
			background:
				"radial-gradient(circle at top left, rgba(100, 125, 255, 0.2), transparent 28%), " +
				"radial-gradient(circle at 78% 18%, rgba(151, 112, 255, 0.16), transparent 22%), " +
				"linear-gradient(145deg, #f7f9ff 0%, #f2f5ff 30%, #edf2ff 100%)",
			color: "#18213d",
		});
	};

	this.syncNavigationMode = () => {
		const direct = this.navigationMode === "direct";
		this.directNavigationClass = direct ? "nav-route is-active" : "nav-route";
		this.pageNavigationClass = direct ? "nav-route" : "nav-route is-active";
	};

	this.beginNavigation = (mode) => {
		this.pendingNavigationMode = mode;
		this.navigationMode = mode;
		this.syncNavigationMode();
	};

	this.focusInput = () => {
		const selector = this.mode === "landing" ? ".landing-input" : ".bar";
		const input = this.root?.querySelector(selector);
		if (input) input.focus();
	};

	this.navigate = (value = this.url) => {
		const normalized = normalizeUrl(value);
		if (!normalized) return;

		this.url = normalized;
		store.url = normalized;
		this.mode = "browsing";
		this.syncMode();
		this.beginNavigation("direct");
		frame.go(normalized);
	};

	this.useQuickLink = (value) => {
		this.url = value;
		this.navigate(value);
	};

	this.openExternal = () => {
		const normalized = normalizeUrl(this.url);
		if (!normalized) return;

		this.url = normalized;
		store.url = normalized;
		window.open(scramjet.encodeUrl(normalized));
	};

	this.back = () => {
		this.beginNavigation("page");
		frame.back();
	};

	this.forward = () => {
		this.beginNavigation("page");
		frame.forward();
	};

	this.mount = () => {
		this.syncRootLayout();
		this.syncMode();
		this.syncTransport();
		this.syncNavigationMode();
		requestAnimationFrame(() => this.focusInput());
	};

	frame.addEventListener("urlchange", (event) => {
		if (!event.url) return;

		this.url = event.url;
		store.url = event.url;
		this.navigationMode = this.pendingNavigationMode || "page";
		this.pendingNavigationMode = null;
		this.syncNavigationMode();
		if (this.mode !== "browsing") {
			this.mode = "browsing";
			this.syncMode();
		}
	});

	function Config() {
		function handleModalClose(modal) {
			modal.close();
			requestAnimationFrame(() => app.focusInput());
		}

		function applyTransport(transport, args) {
			connection.setTransport(transport, args);
			store.transport = transport;
			app.syncTransport();
		}

		return html`
			<dialog class="cfg">
				<div class="cfg-inner">
					<div class="cfg-top">
						<div>
							<h2 class="cfg-title">연결 설정</h2>
							<p class="cfg-copy">
								초기 화면에서는 최소 정보만 보여주고, 상세한 transport와 endpoint는 여기에서만 수정합니다.
							</p>
						</div>
						<button class="ghost-button" on:click=${() => handleModalClose(this.root)}>
							닫기
						</button>
					</div>

					<div class="transport-row">
						<button
							class="transport-button"
							on:click=${() => applyTransport("/baremod/index.mjs", [store.bareurl])}
						>
							Bare Server 3
						</button>
						<button
							class="transport-button"
							on:click=${() =>
								applyTransport("/libcurl/index.mjs", [{ wisp: store.wispurl }])}
						>
							libcurl.js
						</button>
						<button
							class="transport-button"
							on:click=${() => applyTransport("/epoxy/index.mjs", [{ wisp: store.wispurl }])}
						>
							Epoxy
						</button>
					</div>

					<div class="endpoint-grid">
						<div class="endpoint-group">
							<label for="wisp_url_input">Wisp URL</label>
							<input
								id="wisp_url_input"
								class="endpoint-input"
								bind:value=${use(store.wispurl)}
								spellcheck="false"
							></input>
						</div>
						<div class="endpoint-group">
							<label for="bare_url_input">Bare URL</label>
							<input
								id="bare_url_input"
								class="endpoint-input"
								bind:value=${use(store.bareurl)}
								spellcheck="false"
							></input>
						</div>
					</div>

					<div class="cfg-footer">
						<span>현재 transport · ${use(app.transportLabel)}</span>
						<button class="primary-button" on:click=${() => handleModalClose(this.root)}>
							완료
						</button>
					</div>
				</div>
			</dialog>
		`;
	}

	const cfg = h(Config);
	document.body.appendChild(cfg);

	return html`
		<div>
			<div class="shell-frame">
				<section class="landing-shell" style=${use(this.landingStyle)}>
				<div class="landing-toolbar">
					<div class="landing-status">
						<span class="transport-pill">${use(this.transportLabel)}</span>
					</div>
					<button class="ghost-button" on:click=${() => cfg.showModal()}>
						Config
					</button>
				</div>
				<div class="landing-main">
					<div class="hero-copy">
						<div class="kicker">New Tab</div>
						<img class="brand-mark" src="/assets/scramjet.png" alt="Scramjet" />
						<h1 class="landing-title">
							제한된 웹을 바로 여는 데스크톱 프록시 탐색 화면
						</h1>
						<p class="landing-subtitle">
							첫 진입에서는 주소 입력에만 집중하고, 이동이 시작되면 즉시 브라우저 모드로 축소됩니다.
							불필요한 설정은 숨기고 필요한 연결 정보만 별도 모달에 남겼습니다.
						</p>

						<div class="launch-panel">
							<span class="launch-label">주소를 입력하고 바로 시작</span>
							<div class="launch-row">
								<input
									class="landing-input"
									placeholder="https://example.com"
									autocomplete="off"
									autocapitalize="off"
									autocorrect="off"
									bind:value=${use(this.url)}
									on:input=${(event) => {
										this.url = event.target.value;
									}}
									on:keyup=${(event) => {
										if (event.key === "Enter") {
											this.navigate();
										}
									}}
								></input>
								<button class="primary-button launch-button" on:click=${() => this.navigate()}>
									탐색 시작
								</button>
							</div>
							<div class="quick-links">
								<button class="quick-link" on:click=${() => this.useQuickLink(QUICK_LINKS[0].url)}>
									${QUICK_LINKS[0].label}
								</button>
								<button class="quick-link" on:click=${() => this.useQuickLink(QUICK_LINKS[1].url)}>
									${QUICK_LINKS[1].label}
								</button>
								<button class="quick-link" on:click=${() => this.useQuickLink(QUICK_LINKS[2].url)}>
									${QUICK_LINKS[2].label}
								</button>
								<button class="quick-link" on:click=${() => this.useQuickLink(QUICK_LINKS[3].url)}>
									${QUICK_LINKS[3].label}
								</button>
							</div>
							<div class="route-guide">
								<div class="route-card">
									<span class="route-badge route-badge-direct">Direct URL</span>
									<p>Type an address or use quick links to jump straight to a fresh destination.</p>
								</div>
								<div class="route-card">
									<span class="route-badge route-badge-page">In-page</span>
									<p>Links, search results, and app drawers keep browsing inside the current page flow.</p>
								</div>
							</div>
							<div class="launch-meta">
								<span>첫 이동 전까지는 랜딩 화면만 보이고, 이동 후에는 브라우저 셸로 전환됩니다.</span>
								<span class="transport-pill">현재 transport · ${use(this.transportLabel)}</span>
							</div>
						</div>
					</div>
				</div>

				<aside class="preview-column">
					<div class="preview-header">
						<button class="ghost-button" on:click=${() => cfg.showModal()}>
							설정 열기
						</button>
					</div>

					<div class="preview-card">
						<div class="browser-preview">
							<div class="browser-preview-header">
								<div class="preview-dots">
									<span></span>
									<span></span>
									<span></span>
								</div>
								<div class="preview-url">${use(this.previewTransportUrl)}</div>
							</div>
							<div class="preview-body">
								<span class="preview-badge">Desktop-first Landing</span>
								<h2>입력은 크게, 설정은 조용하게</h2>
								<p>
									초기 접속에서는 핵심 행동만 남기고, 탐색이 시작되면 브라우저 UI로 축소합니다.
									설정은 필요할 때만 모달에서 여는 구조입니다.
								</p>
								<div class="site-chips">
									<span class="site-chip">Google</span>
									<span class="site-chip">YouTube</span>
									<span class="site-chip">Reddit</span>
									<span class="site-chip">Discord</span>
									<span class="site-chip">Spotify</span>
									<span class="site-chip">Docs</span>
								</div>
								<div class="preview-notes">
									<div class="note-card">
										<strong>빠른 진입</strong>
										<span>URL 입력과 프리셋 링크만 전면에 두고 첫 행동을 단순화했습니다.</span>
									</div>
									<div class="note-card">
										<strong>축소 전환</strong>
										<span>첫 이동 후에는 브랜딩 섹션을 숨기고 브라우저 chrome만 남깁니다.</span>
									</div>
								</div>
							</div>
						</div>

					</div>
				</aside>
			</section>

				<div class="browser-shell" style=${use(this.browserStyle)}>
					<div class="nav">
						<button on:click=${() => cfg.showModal()}>config</button>
						<button on:click=${() => this.back()}>&lt;-</button>
						<button on:click=${() => this.forward()}>&gt;</button>
						<button on:click=${() => frame.reload()}>&#x21bb;</button>
						<input
							class="bar"
							placeholder="https://example.com"
							autocomplete="off"
							autocapitalize="off"
							autocorrect="off"
							bind:value=${use(this.url)}
							on:input=${(event) => {
								this.url = event.target.value;
							}}
							on:keyup=${(event) => {
								if (event.key === "Enter") {
									this.navigate();
								}
							}}
						></input>
						<button on:click=${() => this.openExternal()}>open</button>
						<div class="nav-route-toggle" aria-label="Navigation source">
							<span class=${use(this.directNavigationClass)}>Direct URL</span>
							<span class=${use(this.pageNavigationClass)}>In-page</span>
						</div>
					</div>
					<div class="frame-shell">${frame.frame}</div>
				</div>
			</div>
		</div>
	`;
}

window.addEventListener("load", async () => {
	const root = document.getElementById("app");
	try {
		root.replaceWith(h(BrowserApp));
	} catch (error) {
		root.replaceWith(document.createTextNode("" + error));
		throw error;
	}

	function b64(buffer) {
		let binary = "";
		const bytes = new Uint8Array(buffer);
		const length = bytes.byteLength;
		for (let index = 0; index < length; index++) {
			binary += String.fromCharCode(bytes[index]);
		}

		return btoa(binary);
	}

	const arraybuffer = await (await fetch("/assets/scramjet.png")).arrayBuffer();
	console.log(
		"%cb",
		`
			background-image: url(data:image/png;base64,${b64(arraybuffer)});
			color: transparent;
			padding-left: 200px;
			padding-bottom: 100px;
			background-size: contain;
			background-position: center center;
			background-repeat: no-repeat;
		`
	);
});
