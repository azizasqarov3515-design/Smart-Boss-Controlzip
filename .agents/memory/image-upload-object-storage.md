---
name: Image upload depends on object storage
description: Why smartboss image upload fails with "Object storage sozlanmagan" and how to fix it
---

The smartboss mobile app uploads product and customer images via FormData POST to `/api/upload/product-image` (api-server). The server stores the file in the Replit GCS bucket and serves it back through `/api/product-image/:uuid`.

**Rule:** Image upload only works when object storage is provisioned, i.e. `DEFAULT_OBJECT_STORAGE_BUCKET_ID` (a runtime-managed secret) is set. Provision with `setupObjectStorage()` in the code_execution sandbox, then restart the api-server so it picks up the env var.

**Why:** The upload/serve routes have a local-disk fallback that activates when the bucket id is empty. That fallback writes to `process.cwd()/uploads/`, which is ephemeral — files vanish on restart/redeploy, and serving a missing file returns HTTP 500 `{"error":"Object storage sozlanmagan"}`. The error surfaces in the app as a camera/upload failure even though the camera and Android permissions are fine.

**How to apply:** If image upload reports "Object storage sozlanmagan" (or images disappear after a restart), check that the bucket secret exists; if not, run `setupObjectStorage()` and restart the api-server. Object storage secrets are global (available in both dev and production), so provisioning once covers deployment too.
