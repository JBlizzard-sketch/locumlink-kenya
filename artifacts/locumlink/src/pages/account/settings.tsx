import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useChangePassword, useGetMe,
  useGetNotificationPreferences, useUpdateNotificationPreferences,
  getGetNotificationPreferencesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Phone, Calendar, KeyRound, CheckCircle2, Eye, EyeOff, User, Bell, Loader2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function roleLabel(role?: string) {
  const map: Record<string, string> = {
    locum: "Locum Professional",
    clinic_admin: "Clinic Administrator",
    clinic_hr: "Clinic HR",
    clinic_scheduler: "Clinic Scheduler",
    platform_admin: "Platform Administrator",
  };
  return role ? (map[role] ?? role) : "—";
}

function profileLink(role?: string) {
  if (role === "locum") return { href: "/locum/profile", label: "Edit Locum Profile" };
  if (role === "clinic_admin" || role === "clinic_hr") return { href: "/clinic/profile", label: "Edit Clinic Profile" };
  return null;
}

const EVENT_PREFS: { key: string; label: string; desc: string }[] = [
  { key: "newShiftMatch",       label: "New shift matches",        desc: "When a new shift matches your profile" },
  { key: "applicationUpdate",   label: "Application updates",      desc: "When a clinic shortlists, confirms or rejects you" },
  { key: "bookingConfirmation", label: "Booking confirmations",    desc: "When a booking is created or updated" },
  { key: "paymentUpdate",       label: "Payment updates",          desc: "When a payment is released to your M-Pesa" },
  { key: "shiftReminder",       label: "Shift reminders",          desc: "Reminders before an upcoming shift" },
  { key: "ratingReceived",      label: "Ratings received",         desc: "When a clinic leaves you a rating" },
  { key: "credentialExpiry",    label: "Credential expiry alerts", desc: "When a document is about to expire" },
];

function NotificationPreferencesCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useGetNotificationPreferences({
    query: { queryKey: getGetNotificationPreferencesQueryKey() },
  });
  const updatePrefs = useUpdateNotificationPreferences();

  const toggle = async (key: string, value: boolean) => {
    try {
      await updatePrefs.mutateAsync({ data: { [key]: value } as any });
      queryClient.invalidateQueries({ queryKey: getGetNotificationPreferencesQueryKey() });
    } catch {
      toast({ title: "Failed to update preference", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which events you want to be notified about and how.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading preferences…</span>
          </div>
        ) : (
          <>
            {/* Event toggles */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Events</p>
              {EVENT_PREFS.map(({ key, label, desc }) => {
                const checked = prefs == null ? true : Boolean((prefs as any)[key]);
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(v) => toggle(key, v)}
                      disabled={updatePrefs.isPending}
                    />
                  </div>
                );
              })}
            </div>

            <Separator />

            {/* Channel toggles */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery Channels</p>
              {[
                { key: "preferSms",      label: "SMS",       desc: "Receive notifications via text message" },
                { key: "preferWhatsapp", label: "WhatsApp",  desc: "Receive notifications via WhatsApp" },
                { key: "preferEmail",    label: "Email",     desc: "Receive notifications via email" },
              ].map(({ key, label, desc }) => {
                const checked = prefs == null ? false : Boolean((prefs as any)[key]);
                return (
                  <div key={key} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={(v) => toggle(key, v)}
                      disabled={updatePrefs.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AccountSettings() {
  const { data: user, isLoading } = useGetMe({ query: { queryKey: ["me"] } });
  const changePassword = useChangePassword();
  const { toast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      await changePassword.mutateAsync({
        data: { currentPassword: data.currentPassword, newPassword: data.newPassword },
      });
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
      form.reset();
      setPasswordChanged(true);
      setTimeout(() => setPasswordChanged(false), 4000);
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Failed to change password";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const link = profileLink(user?.role);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and security.</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            Account Information
          </CardTitle>
          <CardDescription>Your profile details on LocumLink Kenya.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{user?.email}</p>
                  <Badge variant="secondary" className="mt-1 text-xs capitalize">
                    {roleLabel(user?.role)}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-20 shrink-0">Email</span>
                  <span className="font-medium">{user?.email ?? "—"}</span>
                  {user?.isEmailVerified === "true" && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs ml-auto">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-20 shrink-0">Phone</span>
                  <span className="font-medium">{user?.phone ?? "—"}</span>
                  {user?.isPhoneVerified === "true" && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs ml-auto">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground w-20 shrink-0">Role</span>
                  <span className="font-medium capitalize">{roleLabel(user?.role)}</span>
                </div>
                {user?.createdAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground w-20 shrink-0">Joined</span>
                    <span className="font-medium">
                      {format(new Date(user.createdAt), "d MMMM yyyy")}
                    </span>
                  </div>
                )}
              </div>

              {link && (
                <>
                  <Separator />
                  <Link href={link.href}>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      {link.label}
                    </Button>
                  </Link>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <NotificationPreferencesCard />

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password. You'll need to enter your current password to confirm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordChanged ? (
            <div className="flex items-center gap-3 py-4 text-green-700 bg-green-50 rounded-lg px-4">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Password changed successfully!</span>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrent ? "text" : "password"}
                            placeholder="Enter your current password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowCurrent((v) => !v)}
                          >
                            {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNew ? "text" : "password"}
                            placeholder="Minimum 8 characters"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setShowNew((v) => !v)}
                          >
                            {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </FormControl>
                      {field.value && (
                        <div className="flex gap-1 mt-1">
                          {[
                            field.value.length >= 8,
                            /[A-Z]/.test(field.value),
                            /[0-9]/.test(field.value),
                            /[^A-Za-z0-9]/.test(field.value),
                          ].map((ok, i) => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${ok ? "bg-green-500" : "bg-muted"}`}
                            />
                          ))}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Repeat your new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {form.formState.isSubmitting ? "Saving..." : "Change Password"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>

      {/* Password Recovery */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Password Recovery</CardTitle>
          <CardDescription>
            If you've forgotten your password, you can reset it without signing in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button variant="outline" size="sm">
              Go to password reset
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
