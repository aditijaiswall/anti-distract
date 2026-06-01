import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LogIn, Compass, Code } from 'lucide-react';
import { motion } from 'framer-motion';

const Auth = () => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (provider) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-[#161616] border border-[#222] rounded-2xl shadow-2xl"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#4caf50] mb-2">AntiDistract</h1>
          <p className="text-[#888] text-sm">Sign in to sync your focus data and view deep analysis.</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => handleLogin('google')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-black font-bold rounded-xl transition-all hover:bg-[#f0f0f0] active:scale-95 disabled:opacity-50"
          >
            <Compass size={20} className="text-[#4caf50]" />
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <button
            onClick={() => handleLogin('github')}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#24292e] text-white font-bold rounded-xl transition-all hover:bg-[#2f363d] active:scale-95 disabled:opacity-50"
          >
            <Code size={20} className="text-white" />
            {loading ? 'Connecting...' : 'Continue with GitHub'}
          </button>
        </div>

        <p className="mt-8 text-center text-[#666] text-xs">
          By signing in, you agree to our Terms of Focus and Privacy.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
