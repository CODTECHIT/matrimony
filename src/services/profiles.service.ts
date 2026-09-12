import { api } from "@/lib/api-client";
import { env } from "@/lib/env";
import type { ApiListResponse, Interest, Profile, ProfileFilters } from "@/types";
import {
  delay,
  filterProfiles,
  findProfile,
  mockState,
  recommendedProfiles,
  shortlistedProfiles,
} from "@/mocks/adapter";
import { mockInterestsReceived, mockInterestsSent } from "@/mocks/data";

export const profilesService = {
  async list(filters: ProfileFilters = {}): Promise<ApiListResponse<Profile>> {
    if (env.useMockApi) return delay(filterProfiles(filters));
    return api.get("/profiles", { query: filters as Record<string, string | number | undefined> });
  },

  async recommended(currentUser?: { gender?: string } | null): Promise<Profile[]> {
    if (env.useMockApi) return delay(recommendedProfiles(currentUser));
    return api.get("/profiles/recommended");
  },

  async byId(id: string): Promise<Profile> {
    if (env.useMockApi) {
      const profile = findProfile(id);
      if (!profile) throw new Error("Profile not found");
      return delay(profile);
    }
    return api.get(`/profiles/${id}`);
  },

  async myProfile(): Promise<Profile> {
    if (env.useMockApi) return delay(filterProfiles({ pageSize: 1 }).items[0] as Profile);
    return api.get("/profiles/me");
  },

  async updateMyProfile(payload: Partial<Profile> & Record<string, unknown>): Promise<Profile> {
    if (env.useMockApi) {
      const current = filterProfiles({ pageSize: 1 }).items[0] as Profile;
      return delay({ ...current, ...payload } as Profile);
    }
    return api.patch("/profiles/me", payload);
  },

  async uploadPhoto(file: File): Promise<{ url: string }> {
    if (env.useMockApi) return delay({ url: URL.createObjectURL(file) });

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Photo size must be less than 10MB");
    }

    // Convert image file to base64 for reliable backend transmission
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });

    return api.post<{ url: string }>("/profiles/me/photos/upload", {
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      base64,
    });
  },

  async deletePhoto(photoUrl: string): Promise<{ ok: boolean }> {
    if (env.useMockApi) return delay({ ok: true });
    return api.delete<{ ok: boolean }>("/profiles/me/photos", {
      body: { photoUrl },
    });
  },

  async uploadVideo(file: File): Promise<{ url: string }> {
    if (env.useMockApi) return delay({ url: URL.createObjectURL(file) });

    try {
      // 1. Request presigned upload URL from backend (AWS S3) for video
      const presign = await api.post<{ uploadUrl: string; fileUrl: string; key: string }>(
        "/profiles/me/media/presign",
        { fileName: file.name, contentType: file.type || "video/mp4", mediaType: "video" },
      );

      // 2. Upload video file directly to AWS S3 bucket
      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "video/mp4" },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Direct S3 video upload failed");

      // 3. Register CloudFront/S3 public video URL on profile
      await api.post("/profiles/me/videos", { videoUrl: presign.fileUrl });

      return { url: presign.fileUrl };
    } catch {
      throw new Error("Video upload to S3 failed");
    }
  },

  async toggleShortlist(id: string): Promise<{ shortlisted: boolean }> {
    if (env.useMockApi) return delay({ shortlisted: mockState.toggleShortlist(id) }, 180);
    return api.post(`/profiles/${id}/shortlist`);
  },

  async shortlisted(): Promise<Profile[]> {
    if (env.useMockApi) return delay(shortlistedProfiles());
    return api.get("/profiles/shortlisted");
  },

  async sendInterest(id: string): Promise<{ sent: boolean }> {
    if (env.useMockApi) {
      mockState.sendInterest(id);
      return delay({ sent: true }, 200);
    }
    return api.post(`/profiles/${id}/interest`);
  },

  async interestsSent(): Promise<Interest[]> {
    if (env.useMockApi) return delay(mockInterestsSent);
    return api.get("/interests/sent");
  },

  async interestsReceived(): Promise<Interest[]> {
    if (env.useMockApi) return delay(mockInterestsReceived);
    return api.get("/interests/received");
  },

  async respondToInterest(id: string, action: "accept" | "decline") {
    if (env.useMockApi) return delay({ ok: true }, 200);
    return api.post<{ ok: boolean }>(`/interests/${id}/${action}`);
  },
};
