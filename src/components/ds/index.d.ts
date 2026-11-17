/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ComponentType, ReactNode } from "react";

type Loose = { [key: string]: any; children?: ReactNode; className?: string };

export const cx: (...parts: unknown[]) => string;
export const Logo: ComponentType<Loose & { theme?: "light" | "blue" }>;
export const Button: ComponentType<Loose & { type?: "primary" | "secondary" | "ghost" | "onblue"; size?: "m" | "s"; href?: string; icon?: ReactNode; trailingIcon?: ReactNode; htmlType?: "button" | "submit" | "reset" }>;
export const IconButton: ComponentType<Loose & { label: string }>;
export const Eyebrow: ComponentType<Loose & { as?: any }>;
export const Badge: ComponentType<Loose & { tone?: "verified" | "live" | "open" | "sponsored" | "sample" | "new" | "pending" | "closing" | "closed"; icon?: ReactNode }>;
export const Rating: ComponentType<Loose & { value?: number; count?: number }>;
export const fieldClass: string;
export const labelClass: string;
export const Field: ComponentType<Loose & { label?: ReactNode; optional?: boolean; helper?: ReactNode; error?: ReactNode }>;
export const Chip: ComponentType<Loose & { selected?: boolean }>;
export const Container: ComponentType<Loose & { as?: any }>;
export const BarContainer: ComponentType<Loose & { as?: any }>;
