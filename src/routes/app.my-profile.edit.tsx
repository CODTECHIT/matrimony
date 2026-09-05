import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DynamicField } from "@/components/forms/DynamicField";
import { profileSections } from "@/config/profile-fields";
import { ErrorState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { profilesService } from "@/services";

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
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const profile = await profilesService.myProfile();
      setValues((prev) => ({
        fullName: profile.fullName,
        height: profile.height,
        religion: profile.religion,
        caste: profile.caste,
        motherTongue: profile.motherTongue,
        education: profile.education,
        occupation: profile.occupation,
        incomeRange: profile.incomeRange,
        city: profile.city,
        about: profile.about,
        ...prev,
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
    try {
      const { url } = await profilesService.uploadPhoto(file);
      setPhotos((prev) => [...prev, url]);
      toast.success("Photo uploaded. It will appear after moderation.");
    } catch {
      toast.error("We couldn't upload that photo. Please try a smaller image.");
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
      await profilesService.updateMyProfile(values);
      toast.success("Profile updated");
      void navigate({ to: "/app/my-profile" });
    } catch {
      toast.error("We couldn't save your changes. Please try again.");
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
            <img
              key={photo}
              src={photo}
              alt={`Profile photo ${index + 1}`}
              loading="lazy"
              width={200}
              height={200}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ))}
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-primary/50">
            <ImagePlus className="size-5" />
            Add photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => void uploadPhoto(event.target.files?.[0])}
            />
          </label>
        </div>
      </section>

      <form onSubmit={save} className="space-y-6" noValidate>
        {profileSections.map((section) => (
          <section
            key={section.id}
            className="rounded-3xl border border-border bg-card p-5 shadow-card"
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
