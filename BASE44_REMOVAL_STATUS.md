# Base44 removal status

The runtime package and Vite configuration were stripped of Base44 package/plugin wiring.
A self-hosted Express/PostgreSQL API is included.

The original source still contains historical Base44-specific source files. Those files are retained for feature reference rather than silently deleted. Production readiness requires replacing every remaining frontend Base44 SDK call with `src/lib/api.js` calls and completing provider credentials for live M-Pesa/OTP/email integrations. No real provider secret or API credential was available in the supplied project, so these cannot be safely invented.
