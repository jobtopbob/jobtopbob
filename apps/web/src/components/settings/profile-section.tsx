"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";
import { useUploadAvatar, useDeleteAvatar } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SpinnerIcon, UploadSimpleIcon, TrashIcon } from "@phosphor-icons/react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ProfileSection() {
  const { data: session } = authClient.useSession();
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name ?? "");
      setImageUrl(session.user.image ?? "");
    }
  }, [session?.user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Please select a JPEG, PNG, WebP, or GIF image");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be smaller than 5 MB");
      return;
    }

    uploadAvatar.mutate(file, {
      onSuccess: async (data) => {
        setImageUrl(data.url);
        // Sync with Better Auth so the topbar and other session consumers update
        await authClient.updateUser({ image: data.url });
        toast.success("Avatar uploaded");
      },
      onError: (err) => toast.error(err.message),
    });

    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    deleteAvatar.mutate(undefined, {
      onSuccess: async () => {
        setImageUrl("");
        // Sync with Better Auth so the topbar and other session consumers update
        await authClient.updateUser({ image: "" });
        toast.success("Avatar removed");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authClient.updateUser({ name });
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const isUploading = uploadAvatar.isPending;
  const isDeleting = deleteAvatar.isPending;

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-6 rounded-full bg-primary" />
        <h2 className="text-lg font-semibold text-text-primary">Profile Information</h2>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-2">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0 relative">
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full z-10">
                  <SpinnerIcon className="w-5 h-5 animate-spin text-white" />
                </div>
              )}
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt="Avatar"
                  width={80}
                  height={80}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-muted-foreground">
                  {(name || session?.user?.email || "U").charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <UploadSimpleIcon className="w-4 h-4 mr-1.5" />
                  {imageUrl ? "Change picture" : "Upload picture"}
                </Button>
                {imageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <SpinnerIcon className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <TrashIcon className="w-4 h-4 mr-1.5" />
                    )}
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                JPEG, PNG, WebP, or GIF. Max 5 MB.
              </p>
            </div>
          </div>

          <Separator />

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={session?.user?.email ?? ""}
              disabled
              className="opacity-60"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed from here.
            </p>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <SpinnerIcon className="w-4 h-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
