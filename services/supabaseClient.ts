// Placeholder for Supabase Client
// Currently used to satisfy imports in the application
// Can be expanded later with actual Supabase initialization if needed

const supabase = {
  auth: {
    signIn: async () => ({ data: {}, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  },
  from: (table: string) => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null }),
  }),
};

export default supabase;
