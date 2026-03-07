// Type definitions for TypeNative go standard library modules

declare module 'go:fmt' {
  export function Println(...args: any[]): void;
  export function Sprintf(format: string, ...args: any[]): string;
}

declare module 'go:strconv' {
  export function FormatBool(value: boolean): string;
}

declare module 'go:strings' {
  export function ToUpper(s: string): string;
  export function ToLower(s: string): string;
}
