import React, { useEffect, useState } from "react";
import api from "@/lib/api";

const AdSense = ({ slotId, style = { display: "block" }, format = "auto" }) => {
  const [adSenseConfig, setAdSenseConfig] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get("/settings/adsense");
        if (response.data.success) {
          setAdSenseConfig(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching AdSense config:", error);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    // Check if script is loaded AND clientId is present
    const isScriptLoaded = document.querySelector(
      `script[src*="adsbygoogle.js"]`,
    );

    if (adSenseConfig?.clientId && isScriptLoaded) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense Push Error:", e);
      }
    }
  }, [adSenseConfig]);

  if (!adSenseConfig?.clientId) {
    return (
      <div className="w-full h-full min-h-[90px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center">
        AdSense Placeholder
        <br />
        <span className="text-[10px] mt-1">(Configure in Admin Panel)</span>
      </div>
    );
  }

  return (
    <div className="adsense-container my-8 overflow-hidden flex justify-center">
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={adSenseConfig.clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdSense;
