import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DynamicField } from "@/components/forms/DynamicField";
import { profileSections } from "@/config/profile-fields";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { profilesService } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import type { MaritalStatus } from "@/types";

export const Route = createFileRoute("/app/my-profile/edit")({
  head: () => ({
    meta: [
      { title: "Edit profile — YFJ Matrimony" },
      {
        name: "description",
        content: "Update your matrimony profile details, photos and family information.",
      },
      { property: "og:title", content: "Edit profile — YFJ Matrimony" },
      { property: "og:description", content: "Keep your profile complete and accurate." },
    ],
  }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const query = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const profile = await profilesService.myProfile();

      // Format marital status to EXACTLY match select options in profileSections:
      // ["Never married", "Divorced", "Widowed", "Awaiting divorce"]
      const formatMaritalStatus = (raw?: string) => {
        if (!raw) return "Never married";
        const clean = raw.toLowerCase().replace(/_/g, " ");
        if (clean.includes("awaiting")) return "Awaiting divorce";
        if (clean.includes("divorce")) return "Divorced";
        if (clean.includes("widow")) return "Widowed";
        return "Never married";
      };

      const defaultDob = profile.dateOfBirth
        ? (profile.dateOfBirth.split("T")[0] ?? "")
        : profile.age
          ? `${new Date().getFullYear() - profile.age}-01-01`
          : "";

      const mobileNumber = profile.contact?.mobile || user?.mobile || "";

      setValues((prev) => ({
        ...prev,
        fullName: profile.fullName || user?.fullName || "",
        gender:
          (profile.gender || user?.gender || "").toLowerCase() === "female" ? "Female" : "Male",
        dateOfBirth: defaultDob,
        mobile: mobileNumber,
        height: profile.height || "",
        maritalStatus: formatMaritalStatus(profile.maritalStatus),
        religion: profile.religion || "",
        caste: profile.caste || "",
        motherTongue: profile.motherTongue || "",
        education: profile.education || "",
        occupation: profile.occupation || "",
        employmentStatus: profile.employmentStatus || "",
        incomeRange: profile.incomeRange || "",
        city: profile.city || "",
        state: profile.state || "",
        country: profile.country || "India",
        about: profile.about || "",
        fatherOccupation: profile.family?.fatherOccupation || "",
        motherOccupation: profile.family?.motherOccupation || "",
        siblings: profile.family?.siblings || "",
        familyType: profile.family?.familyType || "",
        familyValues: profile.family?.familyValues || "",
      }));
      setPhotos((prev) => (prev.length ? prev : profile.photos));
      return profile;
    },
  });

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const { url } = await profilesService.uploadPhoto(file);
      setPhotos((prev) => [...prev, url]);
      toast.success("Photo uploaded successfully!");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to upload photo. Please try a different image.";
      toast.error(message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async (photoUrl: string) => {
    try {
      await profilesService.deletePhoto(photoUrl);
      setPhotos((prev) => prev.filter((p) => p !== photoUrl));
      toast.success("Photo removed");
    } catch {
      toast.error("Failed to remove photo");
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    for (const section of profileSections) {
      for (const field of section.fields) {
        if (field.required && !values[field.name]?.trim()) {
          nextErrors[field.name] = `${field.label} is required`;
        }
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fill in the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const maritalVal = values["maritalStatus"];
      const normalizedMaritalStatus: MaritalStatus = maritalVal
        ? (maritalVal.toLowerCase().replace(/\s+/g, "_") as MaritalStatus)
        : "never_married";

      const payload = {
        ...values,
        photos,
        maritalStatus: normalizedMaritalStatus,
      };
      await profilesService.updateMyProfile(payload);
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
      void navigate({ to: "/app/my-profile" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "We couldn't save your changes. Please try again.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (query.isPending) return <LoadingState label="Loading your profile" />;
  if (query.isError) return <ErrorState onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app/my-profile">
          <ArrowLeft /> Back to profile
        </Link>
      </Button>

      <PageHeader
        eyebrow="Account"
        title="Edit profile"
        description="Complete profiles receive up to 3× more responses."
      />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold">Photos</h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {photos.map((photo, index) => (
            <div
              key={photo}
              className="relative group aspect-square rounded-2xl overflow-hidden border border-border/40 bg-muted"
            >
              <img
                src={photo}
                alt={`Profile photo ${index + 1}`}
                loading="lazy"
                width={200}
                height={200}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => void removePhoto(photo)}
                className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive shadow-xs cursor-pointer"
                title="Remove photo"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <label
            className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border text-xs text-muted-foreground transition-all hover:border-primary/50 hover:bg-muted/30 ${
              uploadingPhoto ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {uploadingPhoto ? (
              <>
                <Loader2 className="size-5 animate-spin text-[#D92662]" />
                <span className="font-medium text-[11px]">Uploading…</span>
              </>
            ) : (
              <>
                <ImagePlus className="size-5 text-muted-foreground" />
                <span className="font-medium">Add photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploadingPhoto}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadPhoto(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <form onSubmit={save} className="space-y-6" noValidate>
        {profileSections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-3xl border border-border bg-card p-5 shadow-card"
          >
            <h2 className="font-display text-lg font-semibold">{section.title}</h2>
            {section.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div key={field.name} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                  <DynamicField
                    field={field}
                    value={values[field.name] ?? ""}
                    error={errors[field.name]}
                    onChange={(value) => setValue(field.name, value)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="flex justify-end gap-3">
          <Button asChild variant="neutral" type="button">
            <Link to="/app/my-profile">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
