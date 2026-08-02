"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createFormAction } from "@/app/dashboard/[guildId]/forms/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function CreateFormDialog({ guildId }: { guildId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Form
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new form</DialogTitle>
          <DialogDescription>Give it a name — you can add questions once it&apos;s created.</DialogDescription>
        </DialogHeader>
        <form action={createFormAction} className="flex flex-col gap-4">
          <input type="hidden" name="guildId" value={guildId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="form-name">Name</Label>
            <Input id="form-name" name="name" placeholder="e.g. Staff Application" maxLength={100} required autoFocus />
          </div>
          <DialogFooter>
            <Button type="submit">Create form</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
