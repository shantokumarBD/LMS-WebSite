import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  CircleDollarSign,
  Save,
  Loader2,
  Globe,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const AdminAdSense = () => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [adsenseData, setAdsenseData] = useState({
    clientId: "",
    autoAdsEnabled: true,
  });

  useEffect(() => {
    const fetchAdSense = async () => {
      try {
        const response = await api.get("/settings/adsense");
        if (response.data.success && response.data.data) {
          setAdsenseData({
            clientId: response.data.data.clientId || "",
            autoAdsEnabled: response.data.data.autoAdsEnabled ?? true,
          });
        }
      } catch (error) {
        console.error("Error fetching AdSense settings:", error);
      } finally {
        setFetching(false);
      }
    };
    fetchAdSense();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await api.put("/settings/adsense", { data: adsenseData });
      if (response.data.success) {
        toast.success("AdSense settings updated successfully");
      }
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-3">
          <div className="bg-amber-600 p-2 rounded-xl shadow-lg shadow-black/20 text-white">
            <CircleDollarSign className="w-6 h-6" />
          </div>
          Google AdSense Settings
        </h1>
        <p className="text-gray-400 mt-1 text-sm font-medium">
          Monetize your knowledge hub with automated ads
        </p>
      </div>

      <div className="bg-amber-600/10 border border-amber-600/20 rounded-2xl p-6 flex gap-4 items-start">
        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-amber-500 font-bold text-sm uppercase tracking-wider">
            How to start earning?
          </p>
          <p className="text-amber-500/80 text-sm font-medium">
            Enter your AdSense Publisher ID (e.g., ca-pub-XXXXXXXXXXXXXXXX).
            Make sure your domain is approved in your AdSense console.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[#1e293b]/20 border border-gray-800 rounded-[32px] p-8 lg:p-12 space-y-10"
      >
        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Globe className="w-3 h-3" /> AdSense Publisher ID (Client ID)
            </label>
            <input
              type="text"
              value={adsenseData.clientId}
              onChange={(e) =>
                setAdsenseData({ ...adsenseData, clientId: e.target.value })
              }
              placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              className="w-full bg-[#1e293b]/50 border border-gray-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all font-bold placeholder:text-gray-600 tracking-wider"
            />
            <p className="text-[10px] text-gray-500 font-medium italic mt-2 ml-1">
              Note: Changes may take up to 24 hours to propagate on Google's
              network.
            </p>
          </div>

          <div className="pt-6 border-t border-gray-800/50">
            <label className="flex items-center justify-between cursor-pointer group bg-gray-800/20 hover:bg-gray-800/40 p-5 rounded-2xl transition-all border border-transparent hover:border-gray-700">
              <div className="flex gap-4">
                <div className="bg-emerald-600/10 p-3 rounded-xl text-emerald-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-white font-bold tracking-tight">
                    Enable Auto Ads
                  </p>
                  <p className="text-gray-500 text-xs font-medium">
                    Recommended: Let Google decide optimal ad placements
                  </p>
                </div>
              </div>
              <div
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${adsenseData.autoAdsEnabled ? "bg-emerald-600" : "bg-gray-700"}`}
              >
                <input
                  type="checkbox"
                  className="hidden"
                  checked={adsenseData.autoAdsEnabled}
                  onChange={(e) =>
                    setAdsenseData({
                      ...adsenseData,
                      autoAdsEnabled: e.target.checked,
                    })
                  }
                />
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${adsenseData.autoAdsEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm px-10 py-4 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Update AdSense Policy
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAdSense;
