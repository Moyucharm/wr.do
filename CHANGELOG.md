# Changelog

## Unreleased

### CF Temp compatibility

- Move mailbox creation and mail listing endpoints into the `/compat/cf-temp` namespace, preserving their existing authentication, request, and response contracts.
- Add `GET /compat/cf-temp/api/domains`, authenticated with a WR.DO user API Key in `x-admin-auth`, returning email-enabled domain names as a JSON string array without internal configuration.
- Breaking: remove `/admin/new_address`, `/admin/mails`, and `/api/mails` without forwarding aliases. Update clients to use a Base URL ending in `/compat/cf-temp` and preserve its path prefix. The native `/api/domain` endpoint is unchanged.

## v1.1.8

### Security and self-hosting

- Disable the historical `admin@admin.com` account when it still has the bundled password. Administrators who changed that password remain active.
- Revoke existing sessions for disabled or deleted users.
- Replace first-user promotion at `/api/setup` with explicit administrator bootstrap during deployment.
- Require an instance-specific `AUTH_SECRET` of at least 32 bytes. New instances without an active administrator must provide `BOOTSTRAP_ADMIN_EMAIL` and `BOOTSTRAP_ADMIN_PASSWORD` (at least 16 characters and 8 distinct characters).
- Run the bootstrap on Docker startup and during Vercel builds. The command is also available as `pnpm bootstrap-admin` for local installations.
- Exclude local environment files from Docker builds, and fix horizontal overflow in the mobile dashboard.

### Upgrade notes

Before upgrading, set `AUTH_SECRET` to a unique value generated with `openssl rand -base64 32`. Preserve an existing strong secret to avoid ending current sessions. If the historical administrator still has its bundled password and there is no other active administrator, set `BOOTSTRAP_ADMIN_EMAIL` to your own email address and `BOOTSTRAP_ADMIN_PASSWORD` to a unique password before deployment. Existing users and data are preserved. After the new administrator is created, remove `BOOTSTRAP_ADMIN_PASSWORD` from the deployment environment.

This release also includes the multi-architecture Docker image workflow and dependency updates merged since v1.1.7.
