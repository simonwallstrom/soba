import { Avatar, AvatarFallback, AvatarImage } from "@client/components/ui/avatar";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import { FileEditIcon, ImageUploadIcon, MoreHorizontalIcon } from "@client/components/ui/icons";
import { Input } from "@client/components/ui/input";
import { getInitials } from "@client/features/household/members";
import { useRef } from "react";

import { useInlineEdit } from "./editable-text-row";
import { settingsRowStyles } from "./settings-group";

// You, as your household sees you. Phones get one menu, as two buttons don't fit beside the name.
// Changing the photo does nothing yet.
export function ProfileRow({
  onRename,
  user,
}: {
  onRename: (name: string) => void;
  user: { name: string; email: string; image: string | null };
}) {
  const editRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const edit = useInlineEdit({
    onSave: onRename,
    // Whichever of the two is showing at this width.
    onStop: () => (editRef.current?.checkVisibility() ? editRef : menuRef).current?.focus(),
    value: user.name,
  });

  const avatar = (
    <Avatar>
      {user.image && <AvatarImage alt="" referrerPolicy="no-referrer" src={user.image} />}
      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
    </Avatar>
  );

  if (edit.draft !== null) {
    return (
      <form className={settingsRowStyles} {...edit.formProps}>
        {avatar}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Input aria-label="Name" {...edit.inputProps} />
          <p className="truncate text-sm text-olive-500">{user.email}</p>
        </div>
        <div className="flex shrink-0 gap-2 self-start">
          <Button onClick={edit.stop} type="button" variant="ghost">
            Cancel
          </Button>
          <Button disabled={!edit.canSave} type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className={settingsRowStyles}>
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate leading-4 font-medium">{user.name}</p>
        <p className="truncate text-sm text-olive-500">{user.email}</p>
      </div>
      <div className="flex shrink-0 gap-2 max-sm:hidden">
        <Button onClick={edit.start} ref={editRef}>
          Edit name
        </Button>
        <Button>Change photo</Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Edit profile"
          className={buttonVariants({
            className: "-mr-1 sm:hidden",
            size: "icon",
            variant: "ghost",
          })}
          ref={menuRef}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={edit.start}>
            <FileEditIcon />
            Edit name
          </DropdownMenuItem>
          <DropdownMenuItem>
            <ImageUploadIcon />
            Change photo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
