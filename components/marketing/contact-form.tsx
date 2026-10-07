"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.email("Enter a valid email"),
  message: z.string().min(12, "Tell us a little more"),
});

type FormValues = z.infer<typeof schema>;

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", message: "" },
  });

  if (sent) {
    return (
      <div className="glass-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold">Message noted</h2>
        <p className="mt-2 text-sm text-muted-foreground">Thanks. This preview keeps the note in your browser and does not email a team.</p>
        <Button className="mt-4" variant="outline" onClick={() => setSent(false)}>Write another</Button>
      </div>
    );
  }

  return (
    <form
      className="glass-panel space-y-4 rounded-3xl p-6"
      noValidate
      onSubmit={form.handleSubmit(() => setSent(true))}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" {...form.register("name")} />
        {form.formState.errors.name ? <p className="text-xs text-rose-500">{form.formState.errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email ? <p className="text-xs text-rose-500">{form.formState.errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" rows={5} {...form.register("message")} />
        {form.formState.errors.message ? <p className="text-xs text-rose-500">{form.formState.errors.message.message}</p> : null}
      </div>
      <Button type="submit">Send message</Button>
    </form>
  );
}
