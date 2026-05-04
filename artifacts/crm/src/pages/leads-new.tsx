import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitLead } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { CONTACT_SOURCE_LABELS } from "@/lib/constants";

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email().optional().or(z.literal("")),
  serviceRequested: z.string().min(1, "Please select a service"),
  notes: z.string().optional(),
  source: z.string().optional(),
});

export default function LeadsNew() {
  const [submitted, setSubmitted] = useState(false);
  const searchParams = new URLSearchParams(window.location.search);
  const sourceParam = searchParams.get("source") || "website";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      serviceRequested: "",
      notes: "",
      source: sourceParam,
    },
  });

  const submitLead = useSubmitLead();
  const [submitError, setSubmitError] = useState<string | null>(null);

  function onSubmit(values: z.infer<typeof formSchema>) {
    setSubmitError(null);
    const validSources = ["google_ads", "facebook", "instagram", "website", "referral", "yelp", "nextdoor", "other"];
    const safeValues = {
      ...values,
      source: validSources.includes(values.source ?? "") ? values.source : "website",
    };
    submitLead.mutate({ data: safeValues as any }, {
      onSuccess: () => {
        setSubmitted(true);
      },
      onError: () => {
        setSubmitError("Something went wrong. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-lg text-center py-12">
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">Request Received</h2>
            <p className="text-muted-foreground">
              Thank you for reaching out. We will get back to you shortly to confirm your detailing appointment.
            </p>
          </CardContent>
          <CardFooter className="justify-center mt-6">
            <Button variant="outline" onClick={() => { form.reset(); setSubmitted(false); }}>
              Submit Another Request
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-0 shadow-xl overflow-hidden">
        <div className="bg-primary p-6 text-primary-foreground text-center">
          <h1 className="text-3xl font-bold tracking-tight">Premium Auto Detailing</h1>
          <p className="mt-2 text-primary-foreground/80 text-sm">Request a quote or book a service today.</p>
        </div>
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="(555) 123-4567" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="serviceRequested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Required *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="Select a service package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Interior Detail">Interior Detail</SelectItem>
                        <SelectItem value="Exterior Detail">Exterior Detail</SelectItem>
                        <SelectItem value="Full Detail Package">Full Detail Package</SelectItem>
                        <SelectItem value="Ceramic Coating">Ceramic Coating</SelectItem>
                        <SelectItem value="Paint Correction">Paint Correction</SelectItem>
                        <SelectItem value="Other">Other (Please specify below)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Details & Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Make, model, year, and any specific concerns (e.g. pet hair, stains)..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden field for source tracking */}
              <input type="hidden" {...form.register("source")} />

              {submitError && (
                <p className="text-sm text-red-600 text-center">{submitError}</p>
              )}

              <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={submitLead.isPending}>
                {submitLead.isPending ? "Submitting Request..." : "Request Service"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}