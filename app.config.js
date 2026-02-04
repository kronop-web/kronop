const appJson = require('./app.json');
require('dotenv').config();

module.exports = () => ({
  ...appJson.expo,
  extra: {
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sduyduumnvkuxqhjhjof.supabase.co',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkdXlkdXVtbnZrdXhxaGpoam9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjI5OTMsImV4cCI6MjA4NTE5ODk5M30.RoDPoo3mqJccDUpERr_lnEGHjiJXQXhOouzqhuDXtkE',
  },
});


