// hrm/src/components/profile/useProfilePhoto.js
//
// Custom hook + utilities for profile photo upload, edit, and delete.

// ── Storage backend: Supabase Storage ────────────────────────────────────────
//   Bucket : "profile-photos"   (change STORAGE_BUCKET below if yours differs)
//   Path   : avatars/{userId}.jpg
//
// ── One-time Supabase dashboard setup ────────────────────────────────────────
//   1. Storage → New bucket → name "profile-photos" → toggle Public ✓
//      (public so image URLs work without auth headers in <img> tags)
//   2. Storage → Policies → "profile-photos":
//        SELECT  → allow anon (so any browser can display the image)
//        INSERT / UPDATE / DELETE → allow authenticated role
//      If you use service-role calls from the backend instead, skip step 2.
//
// Exports:
//   useProfilePhoto(userId, canEdit)  – hook returning photo state + handlers
//   ProfilePhotoAvatar                – drop-in avatar component

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// ↑ Adjust the path to your Supabase client.
//   Minimal supabaseClient.js:
//     import { createClient } from "@supabase/supabase-js";
//     export const supabase = createClient(
//       import.meta.env.VITE_SUPABASE_URL,
//       import.meta.env.VITE_SUPABASE_ANON_KEY,
//     );

// ─── Config ───────────────────────────────────────────────────────────────────

/** Supabase Storage bucket name. Must match what you created in the dashboard. */
const STORAGE_BUCKET = "profile-photos";
const PHOTO_SYNC_PREFIX = "hrm_profile_photo_updated_";
const PHOTO_SYNC_EVENT = "hrm:profile-photo-updated";

/**
 * Storage path for a given user.
 * Always the same path per user → upsert overwrites cleanly, no orphaned files.
 */
function storagePath(userId) {
  return `avatars/${userId}.jpg`;
}

function notifyPhotoUpdated(userId) {
  const stamp = String(Date.now());
  try {
    localStorage.setItem(`${PHOTO_SYNC_PREFIX}${userId}`, stamp);
  } catch {
    // Ignore storage write failures and still dispatch the in-tab event.
  }

  window.dispatchEvent(
    new CustomEvent(PHOTO_SYNC_EVENT, {
      detail: { userId: String(userId), stamp },
    })
  );
}

// ─── Supabase Storage helpers ─────────────────────────────────────────────────

/**
 * Returns the public URL of the stored photo, or null if no file exists yet.
 *
 * Strategy:
 *   - list() with a prefix search is the cheapest way to check existence.
 *   - getPublicUrl() constructs the URL without a network round-trip.
 *   - We append the file's updated_at timestamp as a cache-buster so the
 *     browser always shows the latest version after an upload.
 */
async function fetchPhotoUrl(userId) {
  // Check whether the file exists in the bucket
  const { data: files, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list("avatars", { search: `${userId}.jpg` });

  if (error || !files?.length) return null;   // no file stored yet

  // Build the public URL (no expiry, works for public buckets)
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath(userId));

  // Cache-bust with the last-modified timestamp so stale images aren't shown
  const ts      = files[0]?.updated_at || files[0]?.created_at || "";
  const buster  = ts ? `?t=${encodeURIComponent(ts)}` : "";

  return data.publicUrl + buster;
}

/**
 * Uploads a JPEG Blob to Supabase Storage via upsert.
 * Returns the new public URL on success, throws on failure.
 */
async function uploadPhotoToSupabase(userId, blob) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath(userId), blob, {
      contentType:  "image/jpeg",
      upsert:       true,    // overwrite the previous photo for this user
      cacheControl: "3600",  // CDN hint – 1 h; cache-buster handles freshness
    });

  if (error) throw new Error(error.message);

  // Re-fetch so the returned URL includes the fresh cache-buster timestamp
  const url = await fetchPhotoUrl(userId);
  return url;
}

/**
 * Removes the stored photo from Supabase Storage.
 * Supabase remove() takes an array of paths.
 */
async function deletePhotoFromSupabase(userId) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath(userId)]);

  if (error) throw new Error(error.message);
}

// ─── Image compression ────────────────────────────────────────────────────────

/**
 * Resizes and JPEG-compresses a File to a Blob before uploading.
 * Keeps the largest dimension ≤ maxPx (default 400 px).
 * Returns a Blob – better for binary uploads than a base-64 string.
 */
function compressImageToBlob(file, maxPx = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload  = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image"));
      img.onload  = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w     = Math.round(img.width  * scale);
        const h     = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width  = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);

        // toBlob is more memory-efficient than toDataURL for binary uploads
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Canvas toBlob failed"));
          },
          "image/jpeg",
          quality,
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── useProfilePhoto hook ─────────────────────────────────────────────────────

/**
 * Manages an employee's profile photo via Supabase Storage.
 *
 * @param {string}  userId   – employee ID (becomes the file name in the bucket)
 * @param {boolean} canEdit  – whether the current viewer may upload/delete
 *
 * Returns:
 *   photoUrl         {string|null}  Supabase public URL (with cache-buster), or null
 *   uploading        {boolean}      true while compressing or uploading/deleting
 *   error            {string|null}  last error message; cleared on next action
 *   fileInputRef     {React ref}    attach to the hidden <input type="file">
 *   openPicker       {fn}           programmatically open the OS file/camera picker
 *   handleFileChange {fn}           onChange handler for the hidden file input
 *   handleDelete     {fn}           deletes photo from Supabase, reverts to initials
 */
export function useProfilePhoto(userId, canEdit = false) {
  // null until the async fetch in useEffect resolves
  const [photoUrl,  setPhotoUrl]  = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);

  // Ref for the hidden <input type="file"> rendered in EmployeeProfile
  const fileInputRef = useRef(null);

  // ── Load the current photo from Supabase on mount / userId change ──────────
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function refreshPhoto() {
      try {
        const url = await fetchPhotoUrl(userId);
        if (!cancelled) setPhotoUrl(url);
      } catch {
        if (!cancelled) setPhotoUrl(null);
      }
    }

    function handlePhotoSync(event) {
      if (String(event?.detail?.userId) === String(userId)) {
        refreshPhoto();
      }
    }

    function handleStorage(event) {
      if (event.key === `${PHOTO_SYNC_PREFIX}${userId}`) {
        refreshPhoto();
      }
    }

    function handleWindowFocus() {
      refreshPhoto();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshPhoto();
      }
    }

    refreshPhoto();

    window.addEventListener(PHOTO_SYNC_EVENT, handlePhotoSync);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Lightweight polling to catch updates made from other active sessions.
    const intervalId = window.setInterval(refreshPhoto, 15000);

    return () => {
      cancelled = true;
      window.removeEventListener(PHOTO_SYNC_EVENT, handlePhotoSync);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [userId]);

  /** Programmatically opens the OS file picker (or camera sheet on mobile). */
  const openPicker = useCallback(() => {
    if (!canEdit) return;
    setError(null);
    fileInputRef.current?.click();
  }, [canEdit]);

  /**
   * Handles the file <input> onChange event.
   * Flow: validate → compress → upload to Supabase → update photoUrl state.
   */
  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";   // reset so same file can be picked again after a delete

    if (!file) return;

    // Validate MIME type – reject non-image files immediately
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPEG, PNG, WebP, etc.)");
      return;
    }

    // Soft cap at 10 MB before we even start compressing
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10 MB");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Step 1 – compress the image client-side before sending to Supabase
      const blob = await compressImageToBlob(file);

      // Step 2 – upsert to Supabase Storage; returns the fresh public URL
      const url = await uploadPhotoToSupabase(userId, blob);

      // Step 3 – update React state so the avatar re-renders immediately
      setPhotoUrl(url);
      notifyPhotoUpdated(userId);
    } catch (err) {
      // Errors from compression or Supabase are surfaced via the error field,
      // which EmployeeProfile forwards to its Toast component.
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [userId]);

  /**
   * Deletes the photo from Supabase Storage and reverts the avatar to initials.
   * Reuses the uploading flag so the spinner shows during the async delete.
   */
  const handleDelete = useCallback(async () => {
    if (!userId) return;

    setUploading(true);
    setError(null);

    try {
      await deletePhotoFromSupabase(userId);
      setPhotoUrl(null);   // triggers the red-initials fallback
      notifyPhotoUpdated(userId);
    } catch (err) {
      setError(err.message || "Could not delete photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [userId]);

  return {
    photoUrl,
    uploading,
    error,
    fileInputRef,
    openPicker,
    handleFileChange,
    handleDelete,
  };
}

// ─── Local helpers (not exported) ─────────────────────────────────────────────

function initials(name) {
  if (!name) return "?";
  return name.split(/[\s._]/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ─── ProfilePhotoAvatar component ─────────────────────────────────────────────
//
// Pure UI component – no Supabase calls here, only renders what the hook gives it.
//
// • photoUrl set  → renders <img> pointed at the Supabase CDN URL
// • photoUrl null → renders red initials circle (#c0392b bg, white text)
// • canEdit true  → hover (desktop) or tap (mobile) shows 📷 / 🗑️ overlay
//
// Props:
//   name      {string}       employee display name
//   size      {number}       avatar diameter in px (default 72)
//   canEdit   {boolean}      show upload / delete overlay when true
//   photoUrl  {string|null}  Supabase CDN URL or null
//   uploading {boolean}      show ⏳ spinner instead of edit overlay
//   onEdit    {fn}           called when 📷 is clicked → triggers file picker
//   onDelete  {fn}           called when 🗑️ is clicked → triggers Supabase delete

export function ProfilePhotoAvatar({
  name,
  size     = 72,
  canEdit  = false,
  photoUrl,
  uploading,
  onEdit,
  onDelete,
}) {
  // Overlay visibility: toggled by tap on mobile; driven by hover on desktop
  const [overlayVisible, setOverlayVisible] = useState(false);

  const fontSize  = Math.round(size * 0.34);
  const iconBtnSz = Math.round(size * 0.32);

  // Tap handler: toggle overlay (mobile-friendly)
  function handleAvatarClick() {
    if (!canEdit) return;
    setOverlayVisible((v) => !v);
  }

  function handleEdit(e) {
    e.stopPropagation();
    setOverlayVisible(false);
    onEdit?.();
  }

  function handleDelete(e) {
    e.stopPropagation();
    setOverlayVisible(false);
    onDelete?.();
  }

  return (
    <div
      onClick={handleAvatarClick}
      onMouseEnter={() => canEdit && setOverlayVisible(true)}
      onMouseLeave={() => canEdit && setOverlayVisible(false)}
      style={{
        position:    "relative",
        width:        size,
        height:       size,
        borderRadius: "50%",
        flexShrink:   0,
        cursor:       canEdit ? "pointer" : "default",
      }}
    >
      {/* ── Base avatar: photo or red initials ── */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          style={{
            width:        size,
            height:       size,
            borderRadius: "50%",
            objectFit:    "cover",
            display:      "block",
            border:       "3px solid #c0392b33",
            boxShadow:    "0 2px 10px rgba(0,0,0,0.1)",
          }}
        />
      ) : (
        // No photo → red (#c0392b) background with white initials (per spec)
        <div
          style={{
            width:          size,
            height:         size,
            borderRadius:   "50%",
            background:     "#c0392b",
            color:          "#fff",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontWeight:     800,
            fontSize:       fontSize,
            border:         "3px solid #c0392b44",
            boxShadow:      "0 2px 10px rgba(0,0,0,0.1)",
            userSelect:     "none",
          }}
        >
          {/* Show ellipsis while any async operation is in progress */}
          {uploading ? "…" : initials(name)}
        </div>
      )}

      {/* ── Edit / Delete overlay (shown on hover or tap when canEdit) ── */}
      {canEdit && overlayVisible && !uploading && (
        <div
          style={{
            position:       "absolute",
            inset:          0,
            borderRadius:   "50%",
            background:     "rgba(0,0,0,0.52)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            6,
            animation:      "photoOverlayIn 0.15s ease",
          }}
        >
          {/* 📷 Upload / change photo */}
          <button
            onClick={handleEdit}
            title="Upload photo"
            style={{
              width:          iconBtnSz,
              height:         iconBtnSz,
              borderRadius:   "50%",
              border:         "none",
              background:     "rgba(255,255,255,0.92)",
              cursor:         "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       Math.round(iconBtnSz * 0.46),
              boxShadow:      "0 1px 6px rgba(0,0,0,0.18)",
              transition:     "transform 0.12s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
            onMouseOut={(e)  => (e.currentTarget.style.transform = "scale(1)")}
          >
            📷
          </button>

          {/* 🗑️ Delete button – only shown when a photo is already stored */}
          {photoUrl && (
            <button
              onClick={handleDelete}
              title="Remove photo"
              style={{
                width:          iconBtnSz,
                height:         iconBtnSz,
                borderRadius:   "50%",
                border:         "none",
                background:     "rgba(192,57,43,0.9)",
                cursor:         "pointer",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                fontSize:       Math.round(iconBtnSz * 0.42),
                boxShadow:      "0 1px 6px rgba(0,0,0,0.18)",
                transition:     "transform 0.12s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.12)")}
              onMouseOut={(e)  => (e.currentTarget.style.transform = "scale(1)")}
            >
              🗑️
            </button>
          )}
        </div>
      )}

      {/* ── Spinner overlay while uploading or deleting ── */}
      {uploading && (
        <div
          style={{
            position:       "absolute",
            inset:          0,
            borderRadius:   "50%",
            background:     "rgba(0,0,0,0.45)",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       Math.round(size * 0.28),
            color:          "#fff",
          }}
        >
          ⏳
        </div>
      )}

      <style>{`
        @keyframes photoOverlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
