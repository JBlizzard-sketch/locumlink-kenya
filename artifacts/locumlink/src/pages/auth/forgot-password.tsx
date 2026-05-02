import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForgotPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";
import { ActivitySquare, CheckCircle2, Copy, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const forgotPassword = useForgotPassword();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const response = await forgotPassword.mutateAsync({ data });
      setSubmitted(true);
      if (response.resetToken) {
        setResetToken(response.resetToken);
      }
    } catch {
      toast({
        title: "Request failed",
        description: "Could not process your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToken = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      toast({ title: "Token copied to clipboard" });
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
          <h2 className="text-3xl font-bold tracking-tight">Reset your password</h2>
          <p className="text-muted-foreground mt-2">
            Enter your email and we'll generate a reset token for you
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          {!submitted ? (
            <>
              <CardHeader className="pb-0">
                <CardDescription>
                  Enter the email address associated with your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input placeholder="name@example.com" type="email" {...field} />
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
                      {form.formState.isSubmitting ? "Sending..." : "Request reset token"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </>
          ) : (
            <CardContent className="pt-6 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center py-2">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div>
                  <p className="font-semibold text-lg">Reset token generated</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Copy the token below and use it on the reset password page.
                  </p>
                </div>
              </div>

              {resetToken && (
                <Alert className="bg-muted/60">
                  <AlertDescription className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Your reset token (valid for 1 hour)
                    </p>
                    <div className="flex items-start gap-2">
                      <code className="text-xs break-all flex-1 font-mono leading-relaxed">
                        {resetToken}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="shrink-0 h-7 w-7"
                        onClick={copyToken}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Link href={resetToken ? `/reset-password?token=${encodeURIComponent(resetToken)}` : "/reset-password"}>
                <Button className="w-full">
                  Continue to reset password
                </Button>
              </Link>
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
