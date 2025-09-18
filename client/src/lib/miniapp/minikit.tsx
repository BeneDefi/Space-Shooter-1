import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface UserProfile {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

interface MiniKitContextType {
  isReady: boolean;
  user: UserProfile | null;
  context: any;
  isConnected: boolean;
  signIn: () => Promise<void>;
  shareScore: (score: number) => Promise<void>;
  addToApp: () => Promise<void>;
  notifyReady: () => void;
}

const MiniKitContext = createContext<MiniKitContextType | undefined>(undefined);

interface MiniKitProviderProps {
  children: ReactNode;
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [context, setContext] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // useEffect(() => {
  //   const initMiniKit = () => {
  //     console.log('🚀 Starting MiniKit initialization...');

  //     // Get context in background
  //     const getContextAsync = async () => {
  //       try {
  //         console.log('🔗 Getting context information...');
  //         const contextData = await sdk.context;
  //         console.log('📊 Context data received:', contextData);
  //         setContext(contextData);

  //         // Check if user is already signed in
  //         if (contextData?.user) {
  //           console.log('👤 User found in context:', contextData.user);
  //           setUser({
  //             fid: contextData.user.fid,
  //             username: contextData.user.username,
  //             displayName: contextData.user.displayName,
  //             pfpUrl: contextData.user.pfpUrl
  //           });
  //           setIsConnected(true);
  //         }
  //       } catch (contextError) {
  //         console.log('📱 No Farcaster context (running standalone)');
  //       }
  //     };

  //     // Start context retrieval in background
  //     getContextAsync();

  //     // Mark as ready immediately (don't call sdk.actions.ready() here yet)
  //     setIsReady(true);
  //     console.log('🎉 MiniKit initialization completed');
  //   };

  //   // Initialize immediately
  //   initMiniKit();
  // }, []);

  useEffect(() => {
    const initMiniKit = () => {
      console.log("🚀 Starting MiniKit initialization...");

      // Get context in background (don't block on this)
      const getContextAsync = async () => {
        try {
          console.log("🔗 Getting context information...");
          const contextData = await sdk.context;
          console.log("📊 Context data received:", contextData);
          setContext(contextData);

          // Check if user is already signed in
          if (contextData?.user) {
            console.log("👤 User found in context:", {
              fid: contextData.user.fid,
              username: contextData.user.username, 
              displayName: contextData.user.displayName,
              pfpUrl: contextData.user.pfpUrl
            });
            
            const userData = {
              fid: contextData.user.fid,
              username: contextData.user.username,
              displayName: contextData.user.displayName,
              pfpUrl: contextData.user.pfpUrl
            };
            
            console.log("🖼️ Profile picture URL:", userData.pfpUrl);
            setUser(userData);
            setIsConnected(true);
            
            // Update global context for game authentication
            (window as any).__miniKitContext__ = { user: userData, context: contextData };
          } else {
            console.log("👤 No user found in Farcaster context - setting up test user");
            // Set test user when no Farcaster user is available (standalone mode)
            const testUser = {
              fid: 12345,
              username: "testgamer", 
              displayName: "Test Gamer",
              pfpUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face&facepad=2&fm=jpg&q=80"
            };
            
            console.log("🧪 Setting up test user for demo:", testUser);
            console.log("🖼️ Test profile picture URL:", testUser.pfpUrl);
            setUser(testUser);
            setIsConnected(true);
          }
        } catch (contextError) {
          console.log("📱 SDK context failed (running in standalone):", contextError);
          console.log("🧪 Setting up fallback test user for demo purposes");
          
          const fallbackTestUser = {
            fid: 54321,
            username: "standalonegamer",
            displayName: "Standalone Gamer", 
            pfpUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face&facepad=2&fm=jpg&q=80"
          };
          
          console.log("👤 Fallback test user created:", fallbackTestUser);
          setUser(fallbackTestUser);
          setIsConnected(true);
        }
      };

      // Start context retrieval in background
      getContextAsync();

      // Mark as ready immediately (don't wait for context)
      setIsReady(true);
      console.log("🎉 MiniKit initialization completed");
      
      // Store context globally for game authentication
      (window as any).__miniKitContext__ = { user, context };
    };

    // Initialize immediately
    initMiniKit();
  }, []);

  const signIn = async () => {
    try {
      // Generate a simple nonce for sign in
      const nonce = Math.random().toString(36).substring(7);
      const result = await sdk.actions.signIn({ nonce });
      if (result && typeof result === 'object' && 'user' in result) {
        const user = result.user as any;
        setUser({
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfpUrl: user.pfpUrl
        });
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const shareScore = async (score: number) => {
    try {
      await sdk.actions.composeCast({
        text: `🚀 Just scored ${score.toLocaleString()} points in Galaxiga Classic Space Shooter! Think you can beat my high score? 👾`,
        embeds: [window.location.origin]
      });
    } catch (error) {
      console.error('Failed to share score:', error);
    }
  };

  const addToApp = async () => {
    try {
      await sdk.actions.addMiniApp();
    } catch (error) {
      console.error('Failed to add to app:', error);
    }
  };

  const notifyReady = async () => {
    try {
      console.log("✅ Calling sdk.actions.ready() after app content is loaded...");
      if (sdk?.actions?.ready) {
        await sdk.actions.ready();
        console.log("🎯 sdk.actions.ready() resolved successfully");
      } else {
        console.warn("⚠️ sdk.actions.ready is not available");
      }
    } catch (readyError) {
      console.error("⚠️ sdk.actions.ready() failed:", readyError);
    }
  };

  const value: MiniKitContextType = {
    isReady,
    user,
    context,
    isConnected,
    signIn,
    shareScore,
    addToApp,
    notifyReady
  };

  return (
    <MiniKitContext.Provider value={value}>
      {children}
    </MiniKitContext.Provider>
  );
}

export function useMiniKit() {
  const context = useContext(MiniKitContext);
  if (context === undefined) {
    throw new Error('useMiniKit must be used within a MiniKitProvider');
  }
  return context;
}