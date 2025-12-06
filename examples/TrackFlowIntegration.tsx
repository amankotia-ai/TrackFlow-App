// TrackFlowIntegration.tsx
// Example of how to integrate the fixed UnifiedWorkflowSystem into a React/Next.js app

import { useEffect, useRef } from 'react';

interface TrackFlowConfig {
  apiEndpoint?: string;
  apiKey?: string;
  debug?: boolean;
  hideContentDuringInit?: boolean;
  progressive?: boolean;
}

export function TrackFlowIntegration({ config }: { config?: TrackFlowConfig }) {
  const systemRef = useRef<any>(null);

  useEffect(() => {
    // Load the script dynamically
    const script = document.createElement('script');
    script.src = '/js/unifiedWorkflowSystem.js'; // Or use CDN link
    script.async = true;

    script.onload = () => {
      // @ts-ignore - UnifiedWorkflowSystem is loaded from external script
      if (window.UnifiedWorkflowSystem) {
        // @ts-ignore
        systemRef.current = new window.UnifiedWorkflowSystem({
          apiEndpoint: config?.apiEndpoint || 'https://trackflow-app-production.up.railway.app',
          apiKey: config?.apiKey,
          debug: config?.debug || false,
          hideContentDuringInit: config?.hideContentDuringInit || true,
          progressive: config?.progressive || true
        });

        console.log('✅ TrackFlow initialized successfully');
      }
    };

    script.onerror = () => {
      console.error('❌ Failed to load TrackFlow script');
    };

    document.body.appendChild(script);

    // Cleanup
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [config]);

  return null; // This component doesn't render anything
}

// Usage in your app:
// 
// import { TrackFlowIntegration } from './components/TrackFlowIntegration';
// 
// function App() {
//   return (
//     <>
//       <TrackFlowIntegration 
//         config={{
//           debug: process.env.NODE_ENV === 'development',
//           apiEndpoint: 'https://trackflow-app-production.up.railway.app'
//         }}
//       />
//       {/* Rest of your app */}
//     </>
//   );
// }






