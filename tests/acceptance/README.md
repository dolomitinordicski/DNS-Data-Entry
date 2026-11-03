# Isolated release acceptance

This suite uses only `demo-dns-identity`, Auth at 127.0.0.1:9098 and Firestore at 127.0.0.1:8188. Synthetic organizations are excluded from real DNS records. Never point these tests at production.

The dedicated Vite configuration replaces only the Firebase connection module. Authentication, access loading, persistence services, UI and security rules are real. There is no test login, successful API mock or production emulator switch. External browser requests are blocked. Setup alone bypasses rules to seed fixtures.

`verify-upstream.mjs` checks out the exact Shared Data #232 candidate 8d413e3ff0c472f1f565e26b3911189b05450a25 and compares its Firestore rules with the tested snapshot. It also verifies that #231 is an ancestor and that the Flyer document policy matches the explicit-permission policy of #221. Storage rules added for Flyer do not change the Data Entry Firestore policy. This does not merge a PR or deploy rules.

GitHub Actions `Integrated Data Entry acceptance` builds the production app, checks that test configuration and DEV personas are excluded, then runs Chromium against the two emulators. Browser reports and failure traces are uploaded. The test configuration is separate from the production Vite configuration.

For a clean local checkout with Node 22 and Java 21, follow the installation and emulator command in `.github/workflows/acceptance.yml`. Keep the three emulator environment variables exactly as recorded there. The project safety guard rejects other values.

Common network and area tariffs remain shared reference data for active DNS profiles under the existing policy. Organization overrides are private and checked separately. Account provisioning and the exception list in production are not modified by this suite.

The shared tariff reference policy was explicitly confirmed by the user on 2 November 2026: Data Entry none restricts protected organization records and module access, while common network/area tariffs remain readable reference data.
