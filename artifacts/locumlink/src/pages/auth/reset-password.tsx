import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useResetPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link, useLocation } from "wouter";
import { ActivitySquare, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  token: z.string().min(10, "Paste the reset token from your email"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

function getTokenFromUrl(): string {
  const search = window.location.search;
  const params = new URLSearchParams(search);
  return params.get("token") ?? "";
}

export default function ResetPassword() {
  const [done, setDone] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const resetPassword = useResetPassword();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: getTokenFromUrl(),
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      await resetPassword.mutateAsync({
        data: { token: data.token, newPassword: data.newPassword },
      });
      setDone(true);
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Invalid or expired reset token";
      toast({
        title: "Reset failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-primary mb-6">
            <ActivitySquare className="h-8 w-8" />
            <span>LocumLink</span>
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Set new password</h2>
          <p className="text-muted-foreground mt-2">
            Paste your reset token and choose a new password
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          {!done ? (
            <>
              <CardHeader className="pb-0">
                <CardDescription>
                  Your reset token is valid for 1 hour.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="token"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reset token</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Paste your reset token here"
                              className="font-mono text-xs"
                              {...field}
                            />
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
                                type={showPw ? "text" : "password"}
                                placeholder="Minimum 8 characters"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                onClick={() => setShowPw((v) => !v)}
                              >
                                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </FormControl>
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
                      className="w-full mt-2"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? "Resetting..." : "Set new password"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : (
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div>
                  <p className="font-semibold text-lg">Password updated!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your password has been reset successfully. Please sign in with your new password.
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={() => setLocation("/login")}>
                Go to sign in
              </Button>
            </CardContent>
          )}

          <CardFooter className="flex justify-center border-t p-4 text-sm">
            <Link href="/login">
              <span className="flex items-center gap-1 text-muted-foreground hover:text-primary cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </span>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
