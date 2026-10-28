import { useEffect, useState } from "react";
import api from "@/lib/api";

export const useAdSenseInit = () => {
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    const fetchAdSenseConfig = async () => {
      try {
        const response = await api.get("/settings/adsense");
        if (response.data.success && response.data.data?.clientId) {
          setClientId(response.data.data.clientId);
        }
      } catch (error) {
        console.error("AdSense Init Error:", error);
      }
    };

    fetchAdSenseConfig();
  }, []);

  useEffect(() => {
    if (!clientId) return;

    // Check if script already exists
    const existingScript = document.querySelector(
      `script[src*="adsbygoogle.js"]`,
    );
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    }
  }, [clientId]);

  return { clientId };
};
