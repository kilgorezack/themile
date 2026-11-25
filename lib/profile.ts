"use client";

import type { User } from "firebase/auth";
import { firebaseApp } from "./firebase";

/**
 * Firestore `users/{uid}`, shared with the Milecast iOS app. Field names,
 * allowed values, labels and defaults mirror `Profile.swift` in
 * kilgorezack/Milecast-iOS and are enforced by `firestore.rules`.
 */
export type Method = "fly" | "spin" | "bait";
export type Style = "wade" | "boat" | "bank";
export type Experience = "new" | "some" | "lifer";
export type Frequency = "few" | "monthly" | "weekly";

export interface Profile {
  firstName: string;
  lastName: string;
  displayName?: string;
  email?: string;
  photoURL?: string | null;
  fishing: {
    methods: Method[];
    styles: Style[];
    experience?: Experience;
    frequency?: Frequency;
    isGuide: boolean;
    /** not editable in either app yet; kept as-is on save */
    homeBase?: string;
  };
  alerts: { flow: boolean; calm: boolean; lightning: boolean; outlook: boolean };
  /** "free" | "one", written by the server only */
  plan?: string;
  /** "free" | "one_monthly" | "one_annual", written by the server only */
  tier?: string;
  /** whether the document exists yet */
  exists: boolean;
}

export const METHODS: { id: Method; label: string }[] = [
  { id: "fly", label: "Fly" },
  { id: "spin", label: "Spin & lures" },
  { id: "bait", label: "Bait" },
];
export const STYLES: { id: Style; label: string }[] = [
  { id: "wade", label: "Wading" },
  { id: "boat", label: "Drift boat" },
  { id: "bank", label: "From the bank" },
];
export const EXPERIENCE: { id: Experience; label: string }[] = [
  { id: "new", label: "New to it" },
  { id: "some", label: "A few seasons" },
  { id: "lifer", label: "A lifetime" },
];
export const FREQUENCY: { id: Frequency; label: string }[] = [
  { id: "few", label: "A few times a year" },
  { id: "monthly", label: "Monthly" },
  { id: "weekly", label: "Weekly or more" },
];
export const ALERTS: { id: keyof Profile["alerts"]; label: string }[] = [
  { id: "flow", label: "Flow changes" },
  { id: "calm", label: "Calm windows" },
  { id: "lightning", label: "Lightning nearby" },
  { id: "outlook", label: "Weekend outlook" },
];

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
const pickList = <T extends string>(v: unknown, allowed: readonly T[]): T[] =>
  Array.isArray(v) ? (v.filter((x) => (allowed as readonly string[]).includes(x)) as T[]) : [];
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** Reads a Firestore document the same way the iOS app does, prefilling blanks from the sign-in account. */
export function readProfile(data: Record<string, unknown> | undefined, user: User): Profile {
  const d = data ?? {};
  const f = (d.fishing ?? {}) as Record<string, unknown>;
  const a = (d.alerts ?? {}) as Record<string, unknown>;
  const p: Profile = {
    firstName: str(d.firstName) ?? "",
    lastName: str(d.lastName) ?? "",
    displayName: str(d.displayName),
    email: str(d.email),
    photoURL: str(d.photoURL) ?? null,
    fishing: {
      methods: pickList(f.methods, ["fly", "spin", "bait"] as const),
      styles: pickList(f.styles, ["wade", "boat", "bank"] as const),
      experience: pick(f.experience, ["new", "some", "lifer"] as const),
      frequency: pick(f.frequency, ["few", "monthly", "weekly"] as const),
      isGuide: bool(f.isGuide, false),
      homeBase: str(f.homeBase),
    },
    // Same defaults as the app: on, on, on, off.
    alerts: {
      flow: bool(a.flow, true),
      calm: bool(a.calm, true),
      lightning: bool(a.lightning, true),
      outlook: bool(a.outlook, false),
    },
    plan: str(d.plan),
    tier: str(d.tier),
    exists: data !== undefined,
  };
  if (!p.email && user.email) p.email = user.email;
  if (!p.firstName && !p.lastName && user.displayName) {
    const [first, ...rest] = user.displayName.trim().split(/\s+/);
    p.firstName = first ?? "";
    p.lastName = rest.join(" ");
  }
  if (!p.photoURL && user.photoURL) p.photoURL = user.photoURL;
  return p;
}

export const fullName = (p: Pick<Profile, "firstName" | "lastName">) =>
  [p.firstName.trim(), p.lastName.trim()].filter(Boolean).join(" ");

async function db() {
  const { getFirestore } = await import("firebase/firestore");
  return getFirestore(firebaseApp());
}

/** Live updates of the signed-in user's profile, so edits in the app show up here right away. */
export async function watchProfile(user: User, onChange: (p: Profile) => void, onError: (e: unknown) => void) {
  const { doc, onSnapshot } = await import("firebase/firestore");
  const ref = doc(await db(), "users", user.uid);
  return onSnapshot(
    ref,
    (snap) => {
      // A missing document read only from the local cache may just not have arrived yet.
      if (!snap.exists() && snap.metadata.fromCache) return;
      onChange(readProfile(snap.exists() ? snap.data() : undefined, user));
    },
    onError,
  );
}

/**
 * Saves the editable fields with a merge, like the app's `saveProfile()`:
 * `plan` is never written, `createdAt`/`createdVia` only on first save.
 * Also updates the Firebase Auth name and photo so both apps show the same.
 */
export async function saveProfile(user: User, p: Profile) {
  const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
  const { updateProfile } = await import("firebase/auth");
  const name = fullName(p);
  const fishing: Record<string, unknown> = {
    methods: p.fishing.methods,
    styles: p.fishing.styles,
    isGuide: p.fishing.isGuide,
  };
  if (p.fishing.experience) fishing.experience = p.fishing.experience;
  if (p.fishing.frequency) fishing.frequency = p.fishing.frequency;
  if (p.fishing.homeBase) fishing.homeBase = p.fishing.homeBase;

  const data: Record<string, unknown> = {
    firstName: p.firstName.trim(),
    lastName: p.lastName.trim(),
    fishing,
    alerts: { ...p.alerts },
    updatedAt: serverTimestamp(),
  };
  if (name) data.displayName = name;
  if (p.email) data.email = p.email;
  if (p.photoURL) data.photoURL = p.photoURL;
  if (!p.exists) {
    data.createdAt = serverTimestamp();
    data.createdVia = "web";
  }
  // `fishing` and `alerts` are written whole (as the app does), so a cleared
  // experience or frequency is removed rather than merged back in.
  await setDoc(doc(await db(), "users", user.uid), data, { mergeFields: Object.keys(data) });
  await updateProfile(user, { displayName: name || null, photoURL: p.photoURL || null }).catch(() => {});
}

/**
 * Same as the app's AvatarUploader: center-crop to a square, 512×512, JPEG
 * under ~300 KB, uploaded to users/{uid}/avatar.jpg. Returns the URL to save
 * as photoURL, with a version so caches pick up the new photo.
 */
export async function uploadAvatar(user: User, file: File): Promise<string> {
  const jpeg = await prepareAvatar(file);
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
  const r = ref(getStorage(firebaseApp()), `users/${user.uid}/avatar.jpg`);
  await uploadBytes(r, jpeg, { contentType: "image/jpeg", cacheControl: "public, max-age=86400" });
  const url = new URL(await getDownloadURL(r));
  url.searchParams.set("v", String(Math.floor(Date.now() / 1000)));
  return url.toString();
}

const SIDE = 512;
const TARGET = 300 * 1024;

async function prepareAvatar(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That photo couldn't be read. Try a JPEG or PNG.");
  }
  const edge = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIDE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // JPEG has no transparency
  ctx.fillRect(0, 0, SIDE, SIDE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - edge) / 2, (bitmap.height - edge) / 2, edge, edge, 0, 0, SIDE, SIDE);
  bitmap.close();
  const encode = (q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
  let last: Blob | null = null;
  for (const q of [0.8, 0.7, 0.6, 0.5, 0.4, 0.3]) {
    last = await encode(q);
    if (last && last.size <= TARGET) return last;
  }
  if (last && last.size < 1_000_000) return last;
  throw new Error("That photo is too detailed to shrink. Try another.");
}
