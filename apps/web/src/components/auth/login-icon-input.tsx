"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface LoginIconInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  leadingIcon: ReactNode;
  trailing?: ReactNode;
  inputClassName?: string;
  fieldClassName?: string;
}

/**
 * Login field with reserved leading (and optional trailing) icon slots.
 * Uses logical inset/padding so LTR and RTL stay aligned without left-only hacks.
 */
export const LoginIconInput = forwardRef<HTMLInputElement, LoginIconInputProps>(
  (
    {
      leadingIcon,
      trailing,
      inputClassName,
      fieldClassName,
      disabled,
      ...props
    },
    ref
  ) => (
    <div
      className={cn(
        "ierp-login-field relative flex w-full items-center",
        fieldClassName
      )}
    >
      <span className="ierp-login-field-leading" aria-hidden>
        {leadingIcon}
      </span>
      <input
        ref={ref}
        disabled={disabled}
        className={cn(
          "ierp-login-input",
          trailing ? "ierp-login-input--has-trailing" : null,
          inputClassName
        )}
        {...props}
      />
      {trailing ? (
        <span className="ierp-login-field-trailing">{trailing}</span>
      ) : null}
    </div>
  )
);
LoginIconInput.displayName = "LoginIconInput";
