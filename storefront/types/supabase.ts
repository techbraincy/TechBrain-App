// This file is a stub. Once your Supabase project is set up, replace this
// with the generated types from:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
//
// Until then, this keeps TypeScript happy with loose typing.

export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: any[]
      }
    }
    Views: {
      [key: string]: {
        Row: Record<string, any>
        Relationships: any[]
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: {
      [key: string]: string
    }
  }
}
